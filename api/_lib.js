/*
 * כלים משותפים לפונקציות השרת (Vercel). קבצים שמתחילים ב-_ לא הופכים לכתובת.
 * משתני סביבה נדרשים מפורטים ב-README.md.
 */
export const env = (k, d = "") => (process.env[k] || d).trim();

const SB = () => env("SUPABASE_URL").replace(/\/+$/, "");
/* מפתח השרת: החדש (sb_secret_…) או הישן (service_role) – שני השמות נתמכים */
const SERVICE = () => env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
/* מפתחות חדשים נשלחים רק ב-apikey; מפתחות ישנים (JWT) גם ב-Authorization */
const keyHeaders = (key) => (key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` });

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
  const missing = keys.filter((k) => (k === "SUPABASE_SERVICE_ROLE_KEY" ? !SERVICE() : !env(k))).map((k) => (k === "SUPABASE_SERVICE_ROLE_KEY" ? "SUPABASE_SECRET_KEY" : k));
  if (missing.length) { send(res, 503, { error: "missing env: " + missing.join(", ") }); return false; }
  return true;
}

/* קריאה ל-Supabase REST עם מפתח השרת (עוקף RLS – רק מצד השרת!) */
export async function db(path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${SB()}/rest/v1/${path}`, {
    method,
    headers: {
      ...keyHeaders(SERVICE()),
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

/* Supabase Storage עם מפתח השרת (רשימת קבצים ומחיקה) */
export async function storageApi(path, { method = "POST", body } = {}) {
  const r = await fetch(`${SB()}/storage/v1/${path}`, { method, headers: { ...keyHeaders(SERVICE()), "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`storage ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/* זיהוי המשתמש מה-Bearer token של Supabase Auth */
export async function getUser(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const r = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: SERVICE(), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !u.email) return null;
  /* רמת האימות של החיבור (aal2 = עבר קוד דו-שלבי) מתוך ה-token שכבר אומת למעלה */
  try { u._aal = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).aal || "aal1"; } catch (e) { u._aal = "aal1"; }
  return u;
}

/* מנהל, כולל דרישת אימות דו-שלבי אם הופעלה לו */
export async function requireAdmin(req, res) {
  const user = await getUser(req);
  if (!user) { send(res, 401, { error: "צריך להתחבר" }); return null; }
  const rows = await db(`admins?select=email,mfa_required&email=ilike.${exactI(user.email)}`).catch(() => []);
  const a = rows[0];
  if (!a) { send(res, 403, { error: "החשבון לא מוגדר כמנהל" }); return null; }
  if (a.mfa_required && user._aal !== "aal2") { send(res, 403, { error: "נדרש קוד אימות דו-שלבי" }); return null; }
  return user;
}

/* קריאה ל-Supabase Auth עם מפתח השרת (הזמנות, קישורי איפוס סיסמה) */
export async function authApi(path, { method = "POST", body, query = {} } = {}) {
  const q = new URLSearchParams(query).toString();
  const key = SERVICE();
  const r = await fetch(`${SB()}/auth/v1/${path}${q ? "?" + q : ""}`, {
    method,
    headers: { ...keyHeaders(key), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let j = {}; try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { msg: text }; }
  if (!r.ok) { const e = new Error(j.msg || j.message || j.error_description || "auth " + r.status); e.code = j.code || j.error_code || ""; e.status = r.status; throw e; }
  return j;
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
