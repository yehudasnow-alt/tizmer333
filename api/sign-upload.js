/*
 * POST /api/sign-upload  (Authorization: Bearer <Supabase access token>)
 * חתימה להעלאת תמונה ישירות מהדפדפן ל-Cloudinary. רק מנהל או מארח רשום.
 * הסוד (CLOUDINARY_API_SECRET) נשאר בשרת בלבד.
 */
import crypto from "node:crypto";
import { env, send, requireEnv, getUser, isAdminEmail, advertiserIdsOf } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"])) return;
  try {
    const user = await getUser(req);
    if (!user) return send(res, 401, { error: "unauthorized" });
    const allowed = (await isAdminEmail(user.email)) || (await advertiserIdsOf(user.email)).length > 0;
    if (!allowed) return send(res, 403, { error: "forbidden" });

    const folder = env("CLOUDINARY_FOLDER", "tamara");
    const timestamp = Math.floor(Date.now() / 1000);
    /* הפרמטרים החתומים ממוינים לפי א-ב, ואחריהם הסוד */
    const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${env("CLOUDINARY_API_SECRET")}`).digest("hex");
    return send(res, 200, { signature, timestamp, folder, api_key: env("CLOUDINARY_API_KEY"), cloud_name: env("CLOUDINARY_CLOUD_NAME") }, { "Cache-Control": "no-store" });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 200) });
  }
}
