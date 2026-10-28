/*
 * כלים משותפים לפונקציות השרת (Vercel). קבצים שמתחילים ב-_ לא הופכים לכתובת.
 * משתני סביבה נדרשים מפורטים ב-README.md.
 */
export const env = (k, d = "") => (process.env[k] || d).trim();

const SB = () => env("SUPABASE_URL").replace(/\/+$/, "");
const SERVICE = () => env("SUPABASE_SERVICE_ROLE_KEY");

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (typeof data === "string") {
    if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(data);
  } else {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  }
}

export function requireEnv(res, keys) {
  const missing = keys.filter((k) => !env(k));
  if (missing.length) { send(res, 503, { error: "missing env: " + missing.join(", ") }); return false; }
  return true;
}

/* קריאה ל-Supabase REST עם מפתח השרת (עוקף RLS – רק מצד השרת!) */
export async function db(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${SB()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE(),
      Authorization: `Bearer ${SERVICE()}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export const rpc = (fn, args) => db(`rpc/${fn}`, { method: "POST", body: args });

/* זיהוי המשתמש מה-Bearer token של Supabase Auth */
export async function getUser(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const r = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: SERVICE(), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.email ? u : null;
}

/* השוואת מייל בלי תלות באותיות גדולות/קטנות, בלי תווים כלליים */
const exactI = (email) => encodeURIComponent(String(email).replace(/[\\%_]/g, "\\$&"));

export async function isAdminEmail(email) {
  if (!email || /[*,()]/.test(email)) return false;
  const rows = await db(`admins?select=email&email=ilike.${exactI(email)}`);
  return rows.length > 0;
}

export async function advertiserIdsOf(email) {
  if (!email || /[*,()]/.test(email)) return [];
  const rows = await db(`advertisers?select=id&email=ilike.${exactI(email)}`);
  return rows.map((r) => r.id);
}

export async function settings() {
  try { const rows = await db("settings?select=data&id=eq.1"); return (rows[0] && rows[0].data) || {}; } catch (e) { return {}; }
}

export function siteUrl(req) {
  const fixed = env("SITE_URL");
  if (fixed) return fixed.replace(/\/+$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host || env("VERCEL_PROJECT_PRODUCTION_URL");
  return host ? `https://${host}` : "";
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (e) { return {}; }
}

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* תאריכים בפורמט YYYY-MM-DD, חישוב ב-UTC כדי שלא יזוזו בגלל אזור זמן */
export const isoAdd = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const todayIL = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
