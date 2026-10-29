/*
 * GET /api/health  – בדיקת חיבורים (לפאנל הניהול → בדיקת מערכת)
 * מחזיר רק אם כל הגדרה קיימת ועובדת, אף פעם לא את הערכים עצמם.
 */
import { env, send, db, rpc } from "./_lib.js";

export default async function handler(req, res) {
  const checks = {};
  const add = (key, label, ok, detail, optional) => (checks[key] = { label, ok: !!ok, detail: detail || "", optional: !!optional });
  const url = env("SUPABASE_URL"), secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
  add("supabase_url", "כתובת Supabase בשרת (SUPABASE_URL)", /^https?:\/\//.test(url), url ? "" : "חסר משתנה סביבה ב-Vercel");
  add("public_key", "מפתח ציבורי (SUPABASE_PUBLISHABLE_KEY)", env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY"), "");
  add("secret_key", "מפתח סודי בשרת (SUPABASE_SECRET_KEY)", secret, secret ? (secret.startsWith("sb_publishable") ? "הודבק המפתח הציבורי במקום הסודי" : "") : "חסר משתנה סביבה ב-Vercel");
  if (url && secret) {
    try { await db("settings?select=id&limit=1"); add("db", "השרת מתחבר למסד הנתונים", true); }
    catch (e) { add("db", "השרת מתחבר למסד הנתונים", false, String(e.message || e).slice(0, 160)); }
    try { const v = await rpc("schema_version", {}); add("schema", "גרסת מסד הנתונים (מצד השרת)", Number(v) >= 4, "גרסה " + v + (Number(v) < 4 ? ": צריך להריץ שוב את supabase/schema.sql" : "")); }
    catch (e) { add("schema", "גרסת מסד הנתונים (מצד השרת)", false, "ישנה: צריך להריץ שוב את supabase/schema.sql"); }
    try { await db("mail_log?select=key&limit=1"); add("mail_log", "יומן מיילים אוטומטיים (תזכורות פעם אחת בלבד)", true); }
    catch (e) { add("mail_log", "יומן מיילים אוטומטיים (תזכורות פעם אחת בלבד)", false, "חסר: צריך להריץ שוב את supabase/schema.sql"); }
  }
  add("resend", "שליחת מיילים (RESEND_API_KEY)", env("RESEND_API_KEY"), env("RESEND_API_KEY") ? "" : "בלי זה לא יוצאים מיילים על פניות");
  add("from", "כתובת השולח (NOTIFY_FROM)", env("NOTIFY_FROM"), env("NOTIFY_FROM") ? "" : "בלי דומיין מאומת ב-Resend המיילים יוצאים רק אליכם", true);
  add("admin_email", "לאן מגיעות פניות (ADMIN_EMAIL)", env("ADMIN_EMAIL"), env("ADMIN_EMAIL") ? "" : "אפשר גם בהגדרות האתר → אימייל להתראות", true);
  add("cron", "משימות אוטומטיות: סנכרון יומנים, תזכורות ומיילים יומיים (CRON_SECRET)", env("CRON_SECRET").length >= 16, env("CRON_SECRET") ? (env("CRON_SECRET").length < 16 ? "קצר מדי" : "") : "חסר: התזכורות והסנכרון האוטומטי לא ירוצו");
  add("site_url", "כתובת האתר (SITE_URL)", env("SITE_URL"), env("SITE_URL") ? "" : "בלי זה הקישורים במיילים ובמפת האתר לא מלאים", true);
  const cl = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter((k) => env(k)).length;
  add("cloudinary", "תמונות ב-Cloudinary", cl === 0 || cl === 3, cl === 0 ? "לא מוגדר: התמונות נשמרות ב-Supabase Storage" : cl === 3 ? "" : "חסר חלק מהמשתנים", true);
  add("deploy_hook", "עדכון דפי גוגל (DEPLOY_HOOK_URL)", env("DEPLOY_HOOK_URL"), env("DEPLOY_HOOK_URL") ? "" : "בלי זה דפי גוגל מתעדכנים רק בכל העלאה", true);
  res.setHeader("Cache-Control", "no-store");
  send(res, 200, { ok: Object.values(checks).every((c) => c.ok || c.optional), checks });
}
