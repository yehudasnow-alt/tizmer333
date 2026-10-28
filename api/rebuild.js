/*
 * POST /api/rebuild  (מנהל בלבד)
 * מפעיל בנייה מחדש ב-Vercel (Deploy Hook) כדי לעדכן את דפי המתחמים לגוגל ואת מפת האתר.
 * בנוסף, GitHub Actions מפעיל את אותו Hook כל לילה.
 */
import { env, send, requireEnv, getUser, isAdminEmail } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DEPLOY_HOOK_URL"])) return;
  try {
    const user = await getUser(req);
    if (!user || !(await isAdminEmail(user.email))) return send(res, 401, { error: "unauthorized" });
    const r = await fetch(env("DEPLOY_HOOK_URL"), { method: "POST" });
    if (!r.ok) return send(res, 502, { error: "deploy hook " + r.status });
    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 200) });
  }
}
