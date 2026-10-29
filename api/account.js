/*
 * POST /api/account  { action, ... }   (מנהל בלבד)
 *   invite  { id }            הזמנת לקוח לממשק המארחים במייל (ואם כבר יש לו חשבון: מייל לקביעת סיסמה)
 *   reset   { email, target } מייל לאיפוס סיסמה ללקוח או למנהל (target: "owner" | "admin")
 *   invite_admin { email }    הזמנת מנהל חדש (אחרי שנוסף לצוות)
 *   link    { id }            קישור כניסה חד-פעמי להעברה בוואטסאפ כשהמייל לא מגיע
 * המפתח הסודי נשאר בשרת; הדפדפן מקבל רק את התוצאה.
 */
import { send, requireEnv, db, siteUrl, readJson, requireAdmin, authApi, isAdminEmail } from "./_lib.js";

const exists = (e) => e && (e.status === 422 || /email_exists|already been registered|already registered/i.test(String(e.code) + " " + e.message));

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  const user = await requireAdmin(req, res);
  if (!user) return;
  const b = await readJson(req);
  const base = siteUrl(req);
  if (!base) return send(res, 503, { error: "חסר SITE_URL בהגדרות השרת" });
  const ownerUrl = `${base}/owner.html`;
  try {
    const client = async () => {
      const id = String(b.id || "").slice(0, 64);
      const a = (await db(`advertisers?select=id,email,name,business&id=eq.${encodeURIComponent(id)}`))[0];
      if (!a) throw Object.assign(new Error("הלקוח לא נמצא"), { status: 404 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email || "")) throw Object.assign(new Error("ללקוח אין אימייל תקין. מוסיפים אימייל בכרטיס הלקוח ושומרים."), { status: 400 });
      return a;
    };

    if (b.action === "invite") {
      const a = await client();
      let sent = "invite";
      try {
        await authApi("invite", { body: { email: a.email.toLowerCase(), data: { kind: "host", name: a.name || "" } }, query: { redirect_to: ownerUrl } });
      } catch (e) {
        if (!exists(e)) throw e;
        /* כבר יש חשבון: שולחים קישור לקביעת סיסמה חדשה */
        await authApi("recover", { body: { email: a.email.toLowerCase() }, query: { redirect_to: `${ownerUrl}?reset=1` } });
        sent = "reset";
      }
      await db(`advertisers?id=eq.${encodeURIComponent(a.id)}`, { method: "PATCH", body: { invited_at: new Date().toISOString() } });
      return send(res, 200, { ok: true, sent, email: a.email });
    }

    if (b.action === "reset") {
      const email = String(b.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "אימייל לא תקין" });
      const to = b.target === "admin" ? `${base}/admin.html?reset=1` : `${ownerUrl}?reset=1`;
      await authApi("recover", { body: { email }, query: { redirect_to: to } });
      return send(res, 200, { ok: true, email });
    }

    if (b.action === "invite_admin") {
      const email = String(b.email || "").trim().toLowerCase();
      if (!(await isAdminEmail(email))) return send(res, 400, { error: "קודם מוסיפים את האימייל לצוות הניהול" });
      let sent = "invite";
      try { await authApi("invite", { body: { email, data: { kind: "admin" } }, query: { redirect_to: `${base}/admin.html` } }); }
      catch (e) {
        if (!exists(e)) throw e;
        await authApi("recover", { body: { email }, query: { redirect_to: `${base}/admin.html?reset=1` } });
        sent = "reset";
      }
      return send(res, 200, { ok: true, sent, email });
    }

    if (b.action === "link") {
      const a = await client();
      const email = a.email.toLowerCase();
      let out, type = "invite";
      try {
        out = await authApi("admin/generate_link", { body: { type: "invite", email, data: { kind: "host", name: a.name || "" }, redirect_to: ownerUrl } });
      } catch (e) {
        if (!exists(e)) throw e;
        type = "recovery";
        out = await authApi("admin/generate_link", { body: { type: "recovery", email, redirect_to: `${ownerUrl}?reset=1` } });
      }
      const link = out.action_link || (out.properties && out.properties.action_link) || "";
      if (!link) return send(res, 502, { error: "לא התקבל קישור מהשרת" });
      return send(res, 200, { ok: true, link, type, email });
    }

    return send(res, 400, { error: "פעולה לא מוכרת" });
  } catch (e) {
    const msg = /rate|too many|429/i.test(String(e.message)) ? "נשלחו יותר מדי מיילים לכתובת הזו. חכו דקה ונסו שוב." : String(e.message || e).slice(0, 300);
    return send(res, e.status && e.status < 500 ? e.status : 500, { error: msg });
  }
}
