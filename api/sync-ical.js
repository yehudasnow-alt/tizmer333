/*
 * GET/POST /api/sync-ical            → מסנכרן את כל המתחמים (Vercel Cron / GitHub Actions)
 * GET/POST /api/sync-ical?listing=ID → מתחם אחד ("סנכרון עכשיו" מהעורך)
 *
 * הרשאה: Authorization: Bearer <CRON_SECRET>, או התחברות של מנהל / של בעל המתחם.
 * לכל יחידה עם קישור iCal: מוריד את היומן, הופך כל אירוע ללילות תפוסים ושומר ב-ical_blocked.
 */
import { env, send, requireEnv, db, rpc, getUser, isAdminEmail, advertiserIdsOf, isoAdd, todayIL } from "./_lib.js";

const MAX_BYTES = 3 * 1024 * 1024;
const HORIZON_DAYS = 730;

/* חסימת כתובות פנימיות (מונע שימוש בשרת לגישה לרשת פנימית) */
function safeUrl(raw) {
  let u = String(raw || "").trim();
  if (/^webcals?:\/\//i.test(u)) u = u.replace(/^webcals?:/i, "https:");
  let url;
  try { url = new URL(u); } catch (e) { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const h = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || !h.includes(".") && !h.includes(":")) return null;
  if (/^(0|10|127)\./.test(h) || /^169\.254\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return null;
  if (h.includes(":") && (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h.startsWith("::ffff:"))) return null;
  return url.toString();
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "TamaraCalendarSync/1.0", Accept: "text/calendar, text/plain, */*" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    if (r.url && !safeUrl(r.url)) throw new Error("redirect blocked");
    const reader = r.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { ctrl.abort(); throw new Error("file too large"); }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  } finally { clearTimeout(t); }
}

const ilDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" });
function toIso(prop) {
  if (!prop) return "";
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return "";
  if (m[7]) return ilDate.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0))));
  return `${m[1]}-${m[2]}-${m[3]}`;
}
function durationDays(s) {
  const m = String(s || "").match(/^P(?:(\d+)W)?(?:(\d+)D)?/);
  return m ? (+(m[1] || 0)) * 7 + (+(m[2] || 0)) : 0;
}

/* מפענח VEVENT-ים ומחזיר רשימת לילות (YYYY-MM-DD) בטווח שבין אתמול לשנתיים קדימה */
export function parseIcs(raw, today = todayIL()) {
  const lines = String(raw).replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(":");
    if (i < 1) continue;
    const name = line.slice(0, i).split(";")[0].toUpperCase();
    cur[name] = { value: line.slice(i + 1) };
  }
  const min = isoAdd(today, -1);
  const max = isoAdd(today, HORIZON_DAYS);
  const out = new Set();
  for (const ev of events) {
    if (ev.STATUS && /CANCELLED/i.test(ev.STATUS.value)) continue;
    const start = toIso(ev.DTSTART);
    if (!start) continue;
    let end = toIso(ev.DTEND);
    if (!end && ev.DURATION) end = isoAdd(start, Math.max(1, durationDays(ev.DURATION.value)));
    if (!end || end <= start) end = isoAdd(start, 1);
    let d = start < min ? min : start;
    let guard = 0;
    while (d < end && d <= max && guard++ < 800) { out.add(d); d = isoAdd(d, 1); }
  }
  return [...out].sort();
}

async function authorize(req, listingId) {
  const secret = env("CRON_SECRET");
  const h = req.headers.authorization || "";
  if (secret && h === `Bearer ${secret}`) return "cron";
  const user = await getUser(req);
  if (!user) return null;
  if (await isAdminEmail(user.email)) return "admin";
  if (!listingId) return null;
  const ids = await advertiserIdsOf(user.email);
  if (!ids.length) return null;
  const rows = await db(`listings?select=owner_id&id=eq.${encodeURIComponent(listingId)}`);
  return rows[0] && ids.includes(rows[0].owner_id) ? "owner" : null;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  const listingId = String((req.query && req.query.listing) || "").slice(0, 64);
  try {
    const who = await authorize(req, listingId);
    if (!who) return send(res, 401, { error: "unauthorized" });

    const filter = listingId ? `&id=eq.${encodeURIComponent(listingId)}` : "";
    const listings = await db(`listings?select=id,ical_url,ical_blocked,rooms${filter}&limit=5000`);
    const jobs = [];
    for (const l of listings) {
      const rooms = Array.isArray(l.rooms) ? l.rooms.filter((r) => r && r.id) : [];
      if (rooms.length) rooms.forEach((r) => jobs.push({ listing: l.id, unit: r.id, url: r.ical_url || "", had: (r.ical_blocked || []).length }));
      else jobs.push({ listing: l.id, unit: "", url: l.ical_url || "", had: (l.ical_blocked || []).length });
    }
    const work = jobs.filter((j) => j.url || j.had);
    const report = { by: who, units: work.length, updated: 0, cleared: 0, errors: [] };

    let next = 0;
    const worker = async () => {
      while (next < work.length) {
        const j = work[next++];
        try {
          if (!j.url) { await rpc("set_ical_blocked", { p_listing: j.listing, p_unit: j.unit, p_dates: [] }); report.cleared++; continue; }
          const url = safeUrl(j.url);
          if (!url) throw new Error("כתובת לא תקינה");
          const text = await fetchText(url);
          if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("הקובץ אינו יומן iCal");
          const nights = parseIcs(text);
          await rpc("set_ical_blocked", { p_listing: j.listing, p_unit: j.unit, p_dates: nights });
          report.updated++;
        } catch (e) {
          report.errors.push({ listing: j.listing, unit: j.unit, error: String(e.message || e).slice(0, 160) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(6, work.length) }, worker));
    return send(res, 200, report);
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}
