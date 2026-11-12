/* יוצר את supabase/demo-content.sql מנתוני ההדגמה (מתחמים, כתבות לפי אזור, אתרים פופולריים).
   הרצה: node tools/make-demo-sql.mjs   (חלופה לכפתורים בפאנל: הגדרות → תחזוקה, מה עושים באזור) */
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
globalThis.window = {};
globalThis.document = { addEventListener() {}, body: null, documentElement: { classList: { contains: () => false } } };
globalThis.MutationObserver = class { observe() {} };
globalThis.localStorage = { getItem: () => null, setItem() {} };
require("../assets/js/core.js");
require("../assets/js/seed.js");
const T = window.Tamara;
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : Array.isArray(v) && v.every((x) => typeof x === "string") && v.__arr ? "" : "'" + String(v).replace(/'/g, "''") + "'");
const js = (v) => "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
const arr = (v) => "array[" + (v || []).map((x) => q(x)).join(",") + "]::text[]";
const LCOLS = { text: ["id", "name", "type", "region", "settlement", "tagline", "description", "deal_label", "deal_text", "video_url", "ical_url"],
  num: ["guests_max", "bedrooms", "bathrooms", "units", "min_nights", "price_weekday", "price_weekend", "price_holiday", "guests_base", "extra_guest_price", "lastminute_pct", "lat", "lng"],
  bool: ["featured", "active", "exclusive", "best_price"], json: ["rooms", "extras", "seasons", "details", "terms", "noise"], arr: ["amenities", "audience", "photos", "blocked_dates"] };
const out = ["-- תוכן הדגמה לאתר החי (נוצר ע״י tools/make-demo-sql.mjs). בטוח להריץ שוב: מה שקיים לא נדרס.",
  "-- למחיקה: delete from public.listings where id like 'demo-%'; delete from public.articles where id like 'demo-%';", "begin;"];
for (const l of T.demoListingsForLive()) {
  const cols = [], vals = [];
  LCOLS.text.forEach((c) => { cols.push(c); vals.push(q(l[c] || "")); });
  LCOLS.num.forEach((c) => { cols.push(c); vals.push(l[c] == null || l[c] === "" ? (c === "lat" || c === "lng" ? "null" : "0") : Number(l[c])); });
  LCOLS.bool.forEach((c) => { cols.push(c); vals.push(!!l[c]); });
  LCOLS.json.forEach((c) => { cols.push(c); vals.push(js(l[c] || (c === "rooms" || c === "extras" || c === "seasons" ? [] : {}))); });
  LCOLS.arr.forEach((c) => { cols.push(c); vals.push(arr(l[c])); });
  out.push(`insert into public.listings (${cols.join(", ")}) values (${vals.join(", ")}) on conflict (id) do nothing;`);
}
for (const a of T.seedData().articles.filter((x) => (x.regions || []).length))
  out.push(`insert into public.articles (id, title, excerpt, body, cover, published, regions) values (${q("demo-" + a.id)}, ${q(a.title)}, ${q(a.excerpt)}, ${q(a.body)}, ${q(a.cover)}, true, ${arr(a.regions)}) on conflict (id) do nothing;`);
for (const p of T.CURATED_PLACES)
  out.push(`insert into public.places (id, name, kind, region, settlement, lat, lng, blurb, active) values (${q(p.id)}, ${q(p.name)}, ${q(p.kind)}, ${q(p.region)}, ${q(p.settlement)}, ${p.lat}, ${p.lng}, ${q(p.blurb)}, true) on conflict (id) do nothing;`);
out.push("commit;", "");
fs.writeFileSync(new URL("../supabase/demo-content.sql", import.meta.url), out.join("\n"));
console.log("wrote supabase/demo-content.sql:", T.demoListingsForLive().length, "listings,", T.CURATED_PLACES.length, "places");
