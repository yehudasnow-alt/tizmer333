/*
 * POST /api/cleanup  (מנהל בלבד; ?dry=1 = רק לספור)
 * מוחק מ-Supabase Storage תמונות שלא מופיעות באף מתחם, יחידה, שינוי ממתין, כתבה, מקום או באנר,
 * ושהועלו לפני יותר מיומיים (כדי לא למחוק תמונה של מישהו שעוד לא לחץ "שמירה").
 */
import { send, requireEnv, db, readJson, requireAdmin, storageApi } from "./_lib.js";

const BUCKET = "photos";
const MIN_AGE_DAYS = 2;

async function listAll(prefix, out, depth = 0) {
  for (let offset = 0; ; offset += 1000) {
    const items = await storageApi(`object/list/${BUCKET}`, { body: { prefix, limit: 1000, offset, sortBy: { column: "name", order: "asc" } } });
    for (const it of items || []) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null || it.id === undefined) { if (depth < 4) await listAll(path, out, depth + 1); }
      else out.push({ path, at: it.created_at || it.updated_at || "", size: (it.metadata && it.metadata.size) || 0 });
    }
    if (!items || items.length < 1000) break;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  if (!(await requireAdmin(req, res))) return;
  await readJson(req);
  const query = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const dry = query.dry === "1";
  try {
    /* כל מה שמפנה לתמונה: כל הטקסט של הרשומות, כדי לא לפספס שום שדה */
    const [listings, articles, places, st] = await Promise.all([
      db("listings?select=photos,rooms,pending,details&limit=10000"),
      db("articles?select=cover,body&limit=5000"),
      db("places?select=photo&limit=10000").catch(() => []),
      db("settings?select=data&id=eq.1")
    ]);
    const blob = JSON.stringify([listings, articles, places, st]);
    const used = new Set();
    const re = new RegExp(`/storage/v1/object/public/${BUCKET}/([^"'?#\\s\\\\]+)`, "g");
    let m;
    while ((m = re.exec(blob))) used.add(decodeURIComponent(m[1]));
    const all = await listAll("", []);
    const cutoff = Date.now() - MIN_AGE_DAYS * 864e5;
    const orphans = all.filter((f) => {
      const main = f.path.replace(/-sm(\.[a-z]+)$/i, "$1");
      return !used.has(f.path) && !used.has(main) && (!f.at || Date.parse(f.at) < cutoff);
    });
    const bytes = orphans.reduce((s, f) => s + f.size, 0);
    if (dry) return send(res, 200, { ok: true, dry, total: all.length, used: used.size, orphans: orphans.length, mb: +(bytes / 1048576).toFixed(1) });
    let removed = 0;
    for (let i = 0; i < orphans.length; i += 100) {
      const r = await storageApi(`object/${BUCKET}`, { method: "DELETE", body: { prefixes: orphans.slice(i, i + 100).map((f) => f.path) } });
      removed += Array.isArray(r) ? r.length : 0;
    }
    return send(res, 200, { ok: true, total: all.length, removed, mb: +(bytes / 1048576).toFixed(1) });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}
