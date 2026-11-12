/*
 * POST /api/call-webhook?key=CALL_WEBHOOK_SECRET
 * ספק הטלפוניה (מספרים וירטואליים) שולח לכאן דיווח בסוף כל שיחה. נשמר בטבלת calls ומוצג
 * בניהול, בכרטיס הלקוח ובממשק המארחים. שיחה שלא נענתה נשלחת גם למארח במייל, כדי שיחזור לאורח.
 *
 * עובד עם Voicenter (CDR Notification), Twilio (Status Callback) ופורמט כללי. השדות שמזוהים:
 *   המספר הווירטואלי שחויג: did | To | to | called | tracking_phone
 *   המתקשר: caller | From | from | CallerID | caller_id
 *   היעד (הטלפון של המארח): target | ForwardedTo | forwarded_to
 *   סטטוס: status | DialStatus | CallStatus   (ANSWER / NOANSWER / BUSY / completed / no-answer ...)
 *   משך שיחה בשניות: duration | DialCallDuration | CallDuration | billsec
 *   זמן צלצול: dialtime | ring
 *   זמן: time (epoch) | Timestamp | start_time | started_at
 *   מזהה: ivruniqueid | CallSid | call_id | id
 *   הקלטה: record | RecordingUrl | recording
 */
import { env, send, requireEnv, db, settings, siteUrl, esc } from "./_lib.js";
import { layout, sendMail, p, table, row } from "./_mail.js";

const pick = (o, keys) => { for (const k of keys) { const v = o[k]; if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim(); } return ""; };
/* מספר ישראלי בפורמט אחיד: 0XXXXXXXXX */
export const normPhone = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00972")) d = d.slice(5);
  else if (d.startsWith("972")) d = d.slice(3);
  if (d && !d.startsWith("0") && d.length >= 8 && d.length <= 9) d = "0" + d;
  return d;
};
const statusOf = (raw, duration) => {
  const s = String(raw || "").toUpperCase().replace(/[\s_-]/g, "");
  if (/^(BUSY)$/.test(s)) return "busy";
  if (/^(FAILED|CONGESTION|CHANUNAVAIL|ERROR)$/.test(s)) return "failed";
  if (/^(NOANSWER|CANCEL|CANCELED|CANCELLED|ABANDONE|ABANDONED|VOICEMAIL|MISSED)$/.test(s)) return "missed";
  if (/^(ANSWER|ANSWERED|COMPLETED|COMPLETE|SUCCESS)$/.test(s)) return duration > 0 || s.startsWith("ANSWER") ? "answered" : "missed";
  return duration > 0 ? "answered" : "missed";
};
const timeOf = (v) => {
  if (!v) return new Date().toISOString();
  if (/^\d{9,13}$/.test(v)) return new Date(Number(v) * (v.length > 11 ? 1 : 1000)).toISOString();
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();
};

async function body(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  let raw = typeof req.body === "string" ? req.body : "";
  if (!raw && !req.body) { const chunks = []; for await (const c of req) chunks.push(c); raw = Buffer.concat(chunks).toString("utf8"); }
  if (Buffer.isBuffer(req.body)) raw = req.body.toString("utf8");
  try { return JSON.parse(raw); } catch (e) { return Object.fromEntries(new URLSearchParams(raw)); }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CALL_WEBHOOK_SECRET"])) return;
  const query = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const key = String(query.key || req.headers["x-webhook-key"] || "");
  if (key.length < 16 || key !== env("CALL_WEBHOOK_SECRET")) return send(res, 401, { Err: 1, Errdesc: "unauthorized" });
  try {
    const b = await body(req);
    const list = Array.isArray(b) ? b : Array.isArray(b.calls) ? b.calls : [b];
    const out = [];
    for (const c of list.slice(0, 50)) {
      const did = normPhone(pick(c, ["did", "DID", "To", "to", "called", "Called", "tracking_phone"]));
      const target = normPhone(pick(c, ["target", "ForwardedTo", "forwarded_to", "Target"]));
      const duration = Math.max(0, Math.round(Number(pick(c, ["duration", "DialCallDuration", "CallDuration", "billsec", "Duration"])) || 0));
      const rec = {
        tracking_phone: did,
        caller: normPhone(pick(c, ["caller", "From", "from", "CallerID", "callerid", "caller_id", "Caller"])),
        status: statusOf(pick(c, ["status", "DialStatus", "CallStatus", "leg1DialStatusName", "Status"]), duration),
        duration,
        ring: Math.max(0, Math.round(Number(pick(c, ["dialtime", "ring", "RingTime"])) || 0)),
        started_at: timeOf(pick(c, ["time", "Timestamp", "start_time", "started_at", "StartTime", "date"])),
        provider: String(query.provider || (c.CallSid ? "twilio" : c.ivruniqueid ? "voicenter" : "generic")).slice(0, 20),
        provider_id: pick(c, ["ivruniqueid", "CallSid", "call_id", "callId", "id", "uniqueid"]).slice(0, 80) || null,
        recording: pick(c, ["record", "RecordingUrl", "recording", "recording_url"]).slice(0, 500)
      };
      /* איזה מתחם: לפי המספר הווירטואלי, ואם אין – לפי הטלפון של המארח שאליו הועברה השיחה */
      let l = null;
      if (did) l = (await db(`listings?select=id,name,owner_id,phone&tracking_phone=eq.${encodeURIComponent(did)}&limit=1`))[0] || null;
      if (!l && target) {
        const cands = await db(`listings?select=id,name,owner_id,phone,whatsapp&order=active.desc&limit=2000`);
        l = cands.find((x) => normPhone(x.phone) === target) || cands.find((x) => normPhone(x.whatsapp) === target) || null;
      }
      rec.listing_id = l ? l.id : null;
      rec.owner_id = l ? l.owner_id : null;
      const saved = await db("calls?on_conflict=provider,provider_id", { method: "POST", body: [rec], prefer: "resolution=ignore-duplicates,return=representation" });
      const isNew = Array.isArray(saved) && saved.length > 0;
      out.push({ listing: rec.listing_id, status: rec.status, duplicate: !isNew });
      /* שיחה שלא נענתה: מייל למארח עם המספר, כדי שיחזור (אם לא ביקש לוותר על זה) */
      if (isNew && l && l.owner_id && rec.status !== "answered" && rec.caller) {
        try {
          const adv = (await db(`advertisers?select=email,name,prefs&id=eq.${encodeURIComponent(l.owner_id)}`))[0];
          if (adv && adv.email && (adv.prefs || {}).notify_calls !== false) {
            const s = await settings();
            const base = siteUrl(req);
            const when = new Date(rec.started_at).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });
            await sendMail({ to: adv.email, subject: `שיחה שלא נענתה: ${rec.caller} · ${l.name}`, html: layout({ siteName: s.site_name || "תמרה", title: "פספסתם שיחה מאורח", preheader: `${rec.caller} התקשר/ה ל${l.name}`,
              body: table([row("מתחם", esc(l.name)), row("מספר המתקשר", `<a href="tel:${esc(rec.caller)}">${esc(rec.caller)}</a>`), row("מתי", esc(when))].join("")) + p("כדאי לחזור עכשיו: אורחים סוגרים בדרך כלל עם המקום הראשון שעונה להם."),
              cta: base && { href: `${base}/owner.html#calls`, label: "כל השיחות בממשק המארחים" } }) });
          }
        } catch (e) { /* מייל הוא תוספת: השיחה כבר נשמרה */ }
      }
    }
    return send(res, 200, { Err: 0, Errdesc: "OK", ok: true, saved: out });
  } catch (e) {
    return send(res, 500, { Err: 2, Errdesc: String(e.message || e).slice(0, 200) });
  }
}
