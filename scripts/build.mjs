/*
 * בניית האתר לפריסה (Vercel מריץ את זה אוטומטית: node scripts/build.mjs → dist/)
 *
 * 1. מעתיק את האתר ל-dist/
 * 2. אם הוגדרו משתני סביבה SUPABASE_URL + SUPABASE_ANON_KEY – כותב אותם ל-config.js
 *    (רק המפתחות הציבוריים! מפתח ה-Service Role לא נכתב לשום קובץ)
 * 3. יוצר דפים סטטיים לגוגל ולשיתוף בוואטסאפ/פייסבוק:
 *      /zimmer/<id>/            דף מתחם (כותרת, תיאור, תמונה, JSON-LD כולל שאלות נפוצות)
 *      /l/<region>/             דף אזור
 *      /l/<region>/<feature>/   דף אזור + מאפיין (ג׳קוזי, בריכה, לזוגות…)
 *      /l/<region>/<type>/      דף אזור + סוג (וילות ברמת הגולן…)
 *      /a/<area>/               צפון / מרכז / דרום
 *      /t/<type>/               וילות, בקתות, סוויטות…
 *      /s/<settlement>/         דף יישוב (צימרים בעין הוד…)
 *      /places/ ו-/places/<region>/   אטרקציות ומסעדות
 *      /deals/ /lastminute/ /weekend/ /top/ /find/ /join/ /magazine/ …   דפי נחיתה
 *      /magazine/<id>/          כתבה
 *    וגם sitemap.xml ו-robots.txt
 * כל דף כזה טוען את האתר הרגיל ופותח את המסך המתאים.
 * בלי חיבור ל-Supabase הדפים נבנים מנתוני ההדגמה ומסומנים noindex.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist");
const env = (k) => (process.env[k] || "").trim();

/* ------------------------------------------------------------ העתקה */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of ["index.html", "admin.html", "owner.html"]) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.cpSync(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });

/* ------------------------------------------------------------ הגדרות */
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js/config.js"), "utf8"), ctx);
const cfg = Object.assign({}, ctx.window.TAMARA_CONFIG || {});
/* המפתח הציבורי: החדש (sb_publishable_…) או הישן (anon) – שני השמות נתמכים */
const PUBLIC_KEY = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
if (env("SUPABASE_URL") && PUBLIC_KEY) {
  cfg.SUPABASE_URL = env("SUPABASE_URL");
  cfg.SUPABASE_ANON_KEY = PUBLIC_KEY;
}
if (env("CLOUDINARY_CLOUD_NAME")) cfg.CLOUDINARY_CLOUD_NAME = env("CLOUDINARY_CLOUD_NAME");
const pub = { SUPABASE_URL: cfg.SUPABASE_URL || "", SUPABASE_ANON_KEY: cfg.SUPABASE_ANON_KEY || "", CLOUDINARY_CLOUD_NAME: cfg.CLOUDINARY_CLOUD_NAME || "" };
fs.writeFileSync(path.join(OUT, "assets/js/config.js"), `/* נוצר אוטומטית בבנייה – מפתחות ציבוריים בלבד */\nwindow.TAMARA_CONFIG = ${JSON.stringify(pub, null, 2)};\n`);

const SITE = (env("SITE_URL") || (env("VERCEL_PROJECT_PRODUCTION_URL") ? "https://" + env("VERCEL_PROJECT_PRODUCTION_URL") : "")).replace(/\/+$/, "");

/* קבועים (אזורים, מאפיינים, סוגים) מתוך core.js, ונתוני הדגמה מתוך seed.js */
const app = { window: { TAMARA_CONFIG: {} }, console, Intl, Date, Math, JSON };
app.window.window = app.window;
vm.createContext(app);
for (const f of ["core.js", "seed.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, "assets/js", f), "utf8"), app, { filename: f });
const T = app.window.Tamara;

/* ------------------------------------------------------------ נתונים */
async function rest(table, query) {
  const r = await fetch(`${pub.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${table}?${query}`, {
    headers: pub.SUPABASE_ANON_KEY.startsWith("sb_") ? { apikey: pub.SUPABASE_ANON_KEY } : { apikey: pub.SUPABASE_ANON_KEY, Authorization: `Bearer ${pub.SUPABASE_ANON_KEY}` }
  });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
let live = false, listings, articles, reviews, settings, places;
if (pub.SUPABASE_URL && pub.SUPABASE_ANON_KEY) {
  try {
    [listings, articles, reviews, settings, places] = await Promise.all([
      rest("listings", "select=*&active=eq.true&order=created_at.desc&limit=5000"),
      rest("articles", "select=*&published=eq.true&order=created_at.desc&limit=1000"),
      rest("reviews", "select=listing_id,rating&status=eq.approved&limit=20000"),
      rest("settings", "select=data&id=eq.1").then((r) => (r[0] && r[0].data) || {}),
      rest("places", "select=*&active=eq.true&limit=5000").catch(() => [])
    ]);
    live = true;
  } catch (e) {
    console.warn("⚠ לא ניתן לקרוא מ-Supabase, הדפים לגוגל לא נוצרו:", e.message);
  }
}
if (!live) {
  const seed = T.seedData();
  listings = seed.listings.filter((l) => l.active);
  articles = seed.articles.filter((a) => a.published);
  reviews = seed.reviews.filter((r) => r.status === "approved");
  settings = seed.settings || {};
  places = (seed.places || []).filter((p) => p.active !== false);
}
const S = Object.assign({}, T.DEFAULT_SETTINGS, settings);
listings = listings.map(T.normalizeListing);
const noindex = !live;

/* ------------------------------------------------------------ כלים */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const abs = (u) => (!u ? "" : /^https?:\/\//.test(u) ? u : /^data:/.test(u) ? "" : (SITE || "") + "/" + u.replace(/^\/+/, ""));
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
const be = T.inPlace; // "הגליל העליון" → "בגליל העליון"
const regionOf = (k) => T.REGIONS.find((r) => r.key === k);
const typeName = (k) => (T.TYPES.find((t) => t.key === k) || { name: "צימר" }).name;
const amen = (k) => T.AMENITIES.find((a) => a.key === k);
const photosOf = (l) => (l.photos || []).filter((u) => typeof u === "string" && u).map((u) => abs(T.img(u, 1600))).filter(Boolean);
const coverOf = (l) => (l ? photosOf(l)[0] || "" : "");
const ratings = {};
for (const r of reviews) { const x = (ratings[r.listing_id] = ratings[r.listing_id] || { sum: 0, n: 0 }); x.sum += r.rating; x.n++; }
for (const k in ratings) ratings[k].avg = ratings[k].sum / ratings[k].n;

const FEATURES = T.SEO_FEATURES;
const has = (l, f) => (f.audience ? (l.audience || []).includes(f.key) : T.hasAmen(l, f.key));
const money = (n) => "₪" + Math.round(n).toLocaleString("he-IL");
const typesIn = (list) => T.TYPES.filter((t) => list.some((l) => l.type === t.key));
const priceSpan = (list) => { const p = list.map((l) => T.fromPrice(l)).filter((x) => x > 0); return p.length ? { min: Math.min(...p), max: Math.max(...p) } : null; };
const faqLd = (faq) => (faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) } : null);
const faqHtml = (faq) => (faq.length ? `<h2>שאלות נפוצות</h2>${faq.map((x) => `<h3>${esc(x.q)}</h3><p>${esc(x.a)}</p>`).join("")}` : "");
const itemList = (name, list) => ({ "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: list.length, itemListElement: list.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE ? `${SITE}/zimmer/${encodeURIComponent(l.id)}/` : undefined, name: l.name })) });
const crumbsLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, u], i) => ({ "@type": "ListItem", position: i + 1, name, item: u && SITE ? SITE + u : undefined })) });
const crumbsHtml = (items) => `<nav aria-label="פירורי לחם">${items.map(([name, u]) => (u ? `<a href="${u}">${esc(name)}</a>` : esc(name))).join(" › ")}</nav>`;
/* שורת סיכום לדפי רשימה: כמה, מחירים ומה הכי נפוץ (טקסט ייחודי לכל דף, לא תבנית ריקה) */
function summary(list, where) {
  const ps = priceSpan(list);
  const counts = {};
  list.forEach((l) => T.AMENITY_PRIORITY.forEach((k) => { if (T.hasAmen(l, k)) counts[k] = (counts[k] || 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${n} ${amen(k).name}`);
  const rated = list.filter((l) => ratings[l.id]);
  return `${list.length === 1 ? "מתחם אחד" : list.length + " מתחמים"} ${where}${ps ? `, במחירים של ${money(ps.min)}${ps.max > ps.min ? `–${money(ps.max)}` : ""} ללילה` : ""}.${top.length ? ` מתוכם ${top.join(", ")}.` : ""}${rated.length ? ` ${rated.length} מתחמים עם חוות דעת מאומתות של אורחים.` : ""} את הזמינות והמחיר המדויק לתאריכים שלכם רואים בדף של כל מתחם, ופונים ישירות למארחים בלי עמלה.`;
}
const towns = [...new Set(listings.map((l) => String(l.settlement || "").trim()).filter(Boolean))];
const townUrl = (n) => `/s/${T.townSlug(n)}/`;

/* ------------------------------------------------------------ תבנית */
const TEMPLATE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const pages = []; // לאתר-מפה

function page({ file, url, title, description, image, jsonld = [], route = "", body = "", lastmod }) {
  const canonical = SITE ? SITE + url : "";
  const og = [
    `<meta name="description" content="${esc(description)}">`,
    noindex ? `<meta name="robots" content="noindex">` : "",
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : "",
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="he_IL">`,
    `<meta property="og:site_name" content="${esc(S.site_name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : "",
    image ? `<meta property="og:image" content="${esc(image)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    ...jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`)
  ].filter(Boolean).join("\n");
  let html = TEMPLATE
    .replace(/<meta name="description"[^>]*>\n?/, "")
    .replace(/<meta property="og:[^>]*>\n?/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>\n${og}`)
    .replace(/<main id="main" tabindex="-1">[\s\S]*?<\/main>/, `<main id="main" tabindex="-1">${body}</main>`)
    .replace(/<\/footer>/, `</footer>\n${seoNav}`);
  if (url !== "/") {
    /* דפים בתת-תיקייה: כתובות יחסיות מתייחסות לשורש, והמסך המתאים נפתח אוטומטית */
    html = html.replace(/<meta charset="utf-8">/, `<meta charset="utf-8">\n<base href="/">`).replace(
      /<script src="assets\/js\/config.js"><\/script>/,
      `<script>(function(){var r=${JSON.stringify(route)};if(r&&!location.hash)history.replaceState(null,"",location.pathname+location.search+"#"+r);` +
        `window.addEventListener("click",function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;e.preventDefault();var h=a.getAttribute("href").slice(1);if(h==="main"){var m=document.getElementById("main");if(m)m.focus();return;}location.hash=h;});})();</script>\n` +
        `<script src="assets/js/config.js"></script>`
    );
  }
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  pages.push({ url, lastmod });
}

const card = (l) => {
  const r = regionOf(l.region);
  const from = T.fromPrice(l);
  return `<li><a href="/zimmer/${encodeURIComponent(l.id)}/">${esc(l.name)}</a> – ${esc(typeName(l.type))} ${esc(be(l.settlement || (r ? r.name : "")))}${from ? `, החל מ־₪${from.toLocaleString("he-IL")} ללילה` : ""}${l.tagline ? `. ${esc(l.tagline)}` : ""}</li>`;
};

/* קישורי אזורים בתחתית כל דף (גם לגוגל וגם לגולשים) */
const regionsWith = T.REGIONS.filter((r) => listings.some((l) => l.region === r.key));
const seoNav = regionsWith.length
  ? `<nav class="seo-nav" aria-label="צימרים לפי אזור"><div class="wrap"><b>צימרים לפי אזור:</b> ${regionsWith.map((r) => `<a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a>`).join(" · ")}<br><b>עוד:</b> ${[["/deals/", "דילים"], ["/lastminute/", "דקה 90"], ["/weekend/", "פנויים לסופ״ש"], ["/top/", "המומלצים"], ["/places/", "מה עושים באזור"], ["/find/", "מצא לי צימר"], ["/magazine/", "מגזין"]].map(([u, n]) => `<a href="${u}">${n}</a>`).join(" · ")}</div></nav>`
  : "";

/* ------------------------------------------------------------ דף הבית */
const org = { "@context": "https://schema.org", "@type": "Organization", name: S.site_name, url: SITE || undefined, logo: abs("assets/img/logo-512.png") || undefined, telephone: S.phone || undefined, email: S.email || undefined };
const site = { "@context": "https://schema.org", "@type": "WebSite", name: S.site_name, url: SITE || undefined, inLanguage: "he" };
page({
  file: "index.html", url: "/", route: "",
  title: `${S.site_name} – ${S.site_tagline}`,
  description: "צימרים, וילות ובקתות מהגולן ועד הערבה. מחפשים לפי אזור ותאריכים, רואים מחיר כולל ושולחים בקשה ישירות למארחים, בלי עמלות.",
  image: abs(S.hero_image || T.HERO_DEFAULT),
  jsonld: [org, site],
  body: `<div class="wrap page seo-pre"><h1>${esc(S.site_name)} – ${esc(S.site_tagline)}</h1><p>טוען…</p><ul>${listings.slice(0, 40).map(card).join("")}</ul></div>`
});

/* ------------------------------------------------------------ מתחמים */
const nearPlaces = (l, n) => {
  const c = T.coordsOf(l);
  return places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ p, km: T.distKm(c, { lat: Number(p.lat), lng: Number(p.lng) }) })).filter((x) => x.km != null && x.km <= 30).sort((a, b) => a.km - b.km).slice(0, n);
};
for (const l of listings) {
  const r = regionOf(l.region);
  const units = T.unitsOf(l);
  const d = T.detailsOf(l), t = T.termsOf(l), sec = d.sections || {};
  const prices = units.flatMap((u) => [u.price_weekday, u.price_weekend, u.price_holiday]).filter((p) => p > 0);
  const photos = photosOf(l);
  const rt = ratings[l.id];
  const where = l.settlement || (r ? r.name : "");
  const title = `${l.name} – ${typeName(l.type)} ${be(where)} | ${S.site_name}`;
  const description = clip(`${l.tagline ? l.tagline + ". " : ""}${typeName(l.type)} ${be(where)}${r && r.name !== where ? ", " + r.name : ""}, עד ${T.capacity(l)} אורחים${prices.length ? `, החל מ־₪${Math.min(...prices)} ללילה` : ""}. ${l.description}`, 300);
  const url = `/zimmer/${encodeURIComponent(l.id)}/`;
  const faq = T.faqOf(l, rt);
  const near = nearPlaces(l, 8);
  const benefits = T.benefitsOf(l);
  const ld = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: l.name,
    description: clip(l.description || l.tagline, 500),
    url: SITE ? SITE + url : undefined,
    image: photos.slice(0, 8),
    address: { "@type": "PostalAddress", addressLocality: l.settlement || undefined, addressRegion: r ? r.name : undefined, addressCountry: "IL" },
    geo: l.lat != null && l.lng != null ? { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } : undefined,
    numberOfRooms: units.length,
    checkinTime: /^\d{1,2}:\d{2}$/.test(t.checkin || "") ? t.checkin : undefined,
    checkoutTime: /^\d{1,2}:\d{2}$/.test(t.checkout || "") ? t.checkout : undefined,
    petsAllowed: T.hasAmen(l, "pets") || undefined,
    smokingAllowed: t.smoking ? t.smoking !== "no" : undefined,
    priceRange: prices.length ? `₪${Math.min(...prices)}–₪${Math.max(...prices)}` : undefined,
    amenityFeature: (l.amenities || []).map(amen).filter(Boolean).map((a) => ({ "@type": "LocationFeatureSpecification", name: a.name, value: true })),
    containsPlace: units.length > 1 ? units.map((u) => ({ "@type": "Accommodation", name: u.name, occupancy: { "@type": "QuantitativeValue", maxValue: u.guests_max }, numberOfBedrooms: u.bedrooms || undefined, floorSize: u.size ? { "@type": "QuantitativeValue", value: u.size, unitCode: "MTK" } : undefined })) : undefined,
    aggregateRating: rt && rt.n ? { "@type": "AggregateRating", ratingValue: Math.round(rt.avg * 10) / 10, reviewCount: rt.n, bestRating: 5, worstRating: 1 } : undefined
  };
  const crumbItems = [[S.site_name, "/"], r ? [`צימרים ${be(r.name)}`, `/l/${r.key}/`] : null, l.settlement ? [`צימרים ${be(l.settlement)}`, townUrl(l.settlement)] : null, [l.name, ""]].filter(Boolean);
  const sameRegion = listings.filter((x) => x.id !== l.id && x.region === l.region).slice(0, 6);
  const featLinks = r ? FEATURES.filter((f) => has(l, f)).map((f) => `<a href="/l/${r.key}/${f.key}/">צימרים ${esc(f.phrase)} ${esc(be(r.name))}</a>`) : [];
  const secTitles = { location: "לוקיישן", vibe: "אווירה", facilities: "מתקנים", area: "מה עושים באזור" };
  page({
    file: `zimmer/${l.id}/index.html`, url, route: `stay-${l.id}`, title, description, image: photos[0], jsonld: [ld, crumbsLd(crumbItems), faqLd(faq)].filter(Boolean), lastmod: l.updated_at,
    body: `<div class="wrap page seo-pre">
${crumbsHtml(crumbItems)}
<h1>${esc(l.name)}</h1>
${l.tagline ? `<p><b>${esc(l.tagline)}</b></p>` : ""}
<p>${esc(typeName(l.type))} ${esc(be(where))} · עד ${T.capacity(l)} אורחים · ${units.length > 1 ? units.length + " יחידות" : l.bedrooms + " חדרי שינה"}${prices.length ? ` · החל מ־₪${Math.min(...prices)} ללילה` : ""}${rt ? ` · ציון ${T.score10(rt.avg).toFixed(1)} מ־${rt.n} חוות דעת` : ""}${d.host_name ? ` · המארחים: ${esc(d.host_name)}` : ""}</p>
${photos[0] ? `<img src="${esc(photos[0])}" alt="${esc(l.name)}" width="1200" height="800" style="max-width:100%;height:auto">` : ""}
<h2>על המקום</h2><p>${esc(l.description)}</p>
${Object.entries(secTitles).filter(([k]) => sec[k]).map(([k, n]) => `<h3>${n}</h3><p>${esc(sec[k])}</p>`).join("")}
${(d.included || []).length ? `<h2>מה כלול באירוח</h2><ul>${d.included.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
${(l.amenities || []).length ? `<h2>מה יש במתחם</h2><ul>${l.amenities.map(amen).filter(Boolean).map((a) => `<li>${esc(a.name)}</li>`).join("")}</ul>` : ""}
${units.length > 1 ? `<h2>היחידות במתחם</h2><ul>${units.map((u) => `<li><b>${esc(u.name)}</b> – עד ${u.guests_max} אורחים${u.size ? `, ${u.size} מ״ר` : ""}${u.price_weekday ? `, ₪${u.price_weekday} ללילה באמצע השבוע` : ""}${u.desc ? `. ${esc(u.desc)}` : ""}</li>`).join("")}</ul>` : ""}
${(t.packages || []).length || (l.extras || []).length ? `<h2>חבילות ותוספות</h2><ul>${(t.packages || []).concat(l.extras || []).map((x) => `<li>${esc(x.name)}${Number(x.price) ? ` – ₪${x.price} ${esc(T.statusName(T.EXTRA_PER, x.per))}` : ""}</li>`).join("")}</ul>` : ""}
${benefits.length ? `<h2>הטבות</h2><p>${benefits.map((b) => `${b.pct}% הנחה ${esc(b.short)}`).join(" · ")}</p>` : ""}
${(d.rules || []).length ? `<h2>חוקי הבית</h2><ul>${d.rules.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
${faqHtml(faq)}
${near.length ? `<h2>מה יש בסביבה</h2><ul>${near.map(({ p, km }) => `<li>${esc(p.name)} (${esc((T.PLACE_KINDS.find((k) => k.key === p.kind) || { one: "" }).one)}) – ${km < 1 ? "פחות מק״מ" : km.toFixed(1) + " ק״מ"}</li>`).join("")}</ul>` : ""}
${sameRegion.length ? `<h2>עוד ${esc(be(r ? r.name : where))}</h2><ul>${sameRegion.map(card).join("")}</ul>` : ""}
${featLinks.length ? `<p>${featLinks.join(" · ")}</p>` : ""}
</div>`
  });
}

/* ------------------------------------------------------------ אזורים, מאפיינים וסוגים */
for (const r of regionsWith) {
  const inR = listings.filter((l) => l.region === r.key);
  const inRTowns = [...new Set(inR.map((l) => l.settlement).filter(Boolean))];
  const featsR = FEATURES.filter((f) => inR.some((l) => has(l, f)));
  const typesR = typesIn(inR);
  const placesR = places.filter((p) => p.region === r.key);
  const others = regionsWith.filter((x) => x.key !== r.key && x.area === r.area);
  const crumbR = [[S.site_name, "/"], [`צימרים ${be(T.AREAS[r.area] || "")}`.trim(), `/a/${r.area}/`], [`צימרים ${be(r.name)}`, ""]];
  page({
    file: `l/${r.key}/index.html`, url: `/l/${r.key}/`, route: `region-${r.key}`,
    title: `צימרים ${be(r.name)} – ${inR.length} מתחמים | ${S.site_name}`,
    description: clip(`צימרים, וילות וסוויטות ${be(r.name)}: ${r.blurb}. ${inR.length} מתחמים עם מחירים, יומן זמינות ופנייה ישירה למארחים, בלי עמלות.`, 300),
    image: coverOf(inR[0]),
    jsonld: [itemList(`צימרים ${be(r.name)}`, inR), crumbsLd(crumbR)],
    body: `<div class="wrap page seo-pre">${crumbsHtml(crumbR)}<h1>צימרים ${esc(be(r.name))}</h1><p>${esc(r.blurb)}. ${esc(summary(inR, be(r.name)))}</p><ul>${inR.map(card).join("")}</ul>
${inRTowns.length > 1 ? `<h2>לפי יישוב</h2><p>${inRTowns.map((n) => `<a href="${townUrl(n)}">צימרים ${esc(be(n))}</a>`).join(" · ")}</p>` : ""}
${featsR.length ? `<h2>לפי מה שחשוב לכם</h2><p>${featsR.map((f) => `<a href="/l/${r.key}/${f.key}/">צימרים ${esc(f.phrase)} ${esc(be(r.name))}</a>`).join(" · ")}</p>` : ""}
${typesR.length > 1 ? `<p>${typesR.map((ty) => `<a href="/l/${r.key}/${ty.key}/">${esc(ty.plural)} ${esc(be(r.name))}</a>`).join(" · ")}</p>` : ""}
${placesR.length ? `<h2>מה עושים ${esc(be(r.name))}</h2><p>${placesR.slice(0, 12).map((p) => esc(p.name)).join(" · ")}. <a href="/places/${r.key}/">לכל האטרקציות והמסעדות</a></p>` : ""}
${others.length ? `<p>עוד באזור: ${others.map((x) => `<a href="/l/${x.key}/">צימרים ${esc(be(x.name))}</a>`).join(" · ")}</p>` : ""}</div>`
  });
  for (const f of featsR) {
    const inF = inR.filter((l) => has(l, f));
    const otherRegions = regionsWith.filter((x) => x.key !== r.key && listings.some((l) => l.region === x.key && has(l, f)));
    const crumbF = [[S.site_name, "/"], [`צימרים ${be(r.name)}`, `/l/${r.key}/`], [`צימרים ${f.phrase}`, ""]];
    page({
      file: `l/${r.key}/${f.key}/index.html`, url: `/l/${r.key}/${f.key}/`, route: `region-${r.key}/${f.key}`,
      title: `צימרים ${f.phrase} ${be(r.name)} | ${S.site_name}`,
      description: clip(`${inF.length} צימרים ווילות ${f.phrase} ${be(r.name)}. מחירים, תמונות, יומן זמינות ופנייה ישירה למארחים.`, 300),
      image: coverOf(inF[0]),
      jsonld: [itemList(`צימרים ${f.phrase} ${be(r.name)}`, inF), crumbsLd(crumbF)],
      body: `<div class="wrap page seo-pre">${crumbsHtml(crumbF)}<h1>צימרים ${esc(f.phrase)} ${esc(be(r.name))}</h1><p>${esc(summary(inF, `${f.phrase} ${be(r.name)}`))}</p><ul>${inF.map(card).join("")}</ul>
<p>${featsR.filter((x) => x.key !== f.key).map((x) => `<a href="/l/${r.key}/${x.key}/">צימרים ${esc(x.phrase)} ${esc(be(r.name))}</a>`).join(" · ")}</p>
${otherRegions.length ? `<p>צימרים ${esc(f.phrase)} באזורים נוספים: ${otherRegions.map((x) => `<a href="/l/${x.key}/${f.key}/">${esc(x.name)}</a>`).join(" · ")}</p>` : ""}</div>`
    });
  }
  for (const ty of typesR) {
    const inT = inR.filter((l) => l.type === ty.key);
    if (typesR.length < 2 && ty.key === "zimmer") continue;
    const crumbT = [[S.site_name, "/"], [`צימרים ${be(r.name)}`, `/l/${r.key}/`], [ty.plural, ""]];
    page({
      file: `l/${r.key}/${ty.key}/index.html`, url: `/l/${r.key}/${ty.key}/`, route: `region-${r.key}/${ty.key}`,
      title: `${ty.plural} ${be(r.name)} | ${S.site_name}`,
      description: clip(`${inT.length === 1 ? ty.name + " אחת" : inT.length + " " + ty.plural} ${be(r.name)} עם מחירים, תמונות, יומן זמינות ופנייה ישירה למארחים, בלי עמלות.`, 300),
      image: coverOf(inT[0]),
      jsonld: [itemList(`${ty.plural} ${be(r.name)}`, inT), crumbsLd(crumbT)],
      body: `<div class="wrap page seo-pre">${crumbsHtml(crumbT)}<h1>${esc(ty.plural)} ${esc(be(r.name))}</h1><p>${esc(summary(inT, be(r.name)))}</p><ul>${inT.map(card).join("")}</ul><p><a href="/t/${ty.key}/">כל ה${esc(ty.plural)} בארץ</a></p></div>`
    });
  }
}

/* ------------------------------------------------------------ צפון / מרכז / דרום */
for (const [k, name] of Object.entries(T.AREAS)) {
  const regs = regionsWith.filter((r) => r.area === k);
  const inA = listings.filter((l) => regs.some((r) => r.key === l.region));
  if (!inA.length) continue;
  page({
    file: `a/${k}/index.html`, url: `/a/${k}/`, route: `area-${k}`,
    title: `צימרים ${be(name)} – ${inA.length} מתחמים | ${S.site_name}`,
    description: clip(`צימרים, וילות ובקתות ${be(name)}: ${regs.map((r) => r.name).join(", ")}. מחירים, יומן זמינות ופנייה ישירה למארחים.`, 300),
    image: coverOf(inA[0]), jsonld: [itemList(`צימרים ${be(name)}`, inA)],
    body: `<div class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], [`צימרים ${be(name)}`, ""]])}<h1>צימרים ${esc(be(name))}</h1><p>${esc(summary(inA, be(name)))}</p><p>${regs.map((r) => `<a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a>`).join(" · ")}</p><ul>${inA.map(card).join("")}</ul></div>`
  });
}

/* ------------------------------------------------------------ סוגי אירוח */
for (const ty of typesIn(listings)) {
  const inT = listings.filter((l) => l.type === ty.key);
  const regs = regionsWith.filter((r) => inT.some((l) => l.region === r.key));
  page({
    file: `t/${ty.key}/index.html`, url: `/t/${ty.key}/`, route: `type-${ty.key}`,
    title: `${ty.plural} להשכרה – ${inT.length} מקומות | ${S.site_name}`,
    description: clip(`${ty.plural} בכל הארץ: ${regs.map((r) => r.name).join(", ")}. מחירים, תמונות, יומן זמינות ופנייה ישירה למארחים.`, 300),
    image: coverOf(inT[0]), jsonld: [itemList(ty.plural, inT)],
    body: `<div class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], [ty.plural, ""]])}<h1>${esc(ty.plural)}</h1><p>${esc(summary(inT, "בכל הארץ"))}</p><p>${regs.map((r) => `<a href="/l/${r.key}/${ty.key}/">${esc(ty.plural)} ${esc(be(r.name))}</a>`).join(" · ")}</p><ul>${inT.map(card).join("")}</ul></div>`
  });
}

/* ------------------------------------------------------------ יישובים */
const usedSlugs = new Set();
for (const n of towns) {
  const slug = T.townSlug(n);
  if (usedSlugs.has(slug)) continue;
  usedSlugs.add(slug);
  const inS = listings.filter((l) => String(l.settlement || "").trim() === n);
  const r = regionOf(inS[0].region);
  const crumbS = [[S.site_name, "/"], r ? [`צימרים ${be(r.name)}`, `/l/${r.key}/`] : null, [`צימרים ${be(n)}`, ""]].filter(Boolean);
  const placesS = places.filter((p) => String(p.settlement || "").trim() === n || (r && p.region === r.key)).slice(0, 10);
  page({
    file: `s/${slug}/index.html`, url: `/s/${slug}/`, route: `town-${n}`,
    title: `צימרים ${be(n)}${r ? ` (${r.name})` : ""} | ${S.site_name}`,
    description: clip(`${inS.length === 1 ? "מתחם אחד" : inS.length + " צימרים ווילות"} ${be(n)}${r ? ", " + r.name : ""}. מחירים, תמונות, יומן זמינות ופנייה ישירה למארחים, בלי עמלות.`, 300),
    image: coverOf(inS[0]), jsonld: [itemList(`צימרים ${be(n)}`, inS), crumbsLd(crumbS)],
    body: `<div class="wrap page seo-pre">${crumbsHtml(crumbS)}<h1>צימרים ${esc(be(n))}</h1><p>${esc(summary(inS, be(n)))}</p><ul>${inS.map(card).join("")}</ul>
${placesS.length ? `<h2>מה עושים בסביבה</h2><p>${placesS.map((p) => esc(p.name)).join(" · ")}</p>` : ""}
${r ? `<p><a href="/l/${r.key}/">לכל הצימרים ${esc(be(r.name))}</a></p>` : ""}</div>`
  });
}

/* ------------------------------------------------------------ מה עושים באזור */
const placeLd = (p) => ({ "@type": p.kind === "restaurant" ? "Restaurant" : p.kind === "winery" ? "Winery" : p.kind === "spa" ? "DaySpa" : "TouristAttraction", name: p.name, description: p.blurb || undefined, telephone: p.phone || undefined, url: p.url || undefined, address: { "@type": "PostalAddress", addressLocality: p.settlement || undefined, addressCountry: "IL" }, geo: p.lat != null && p.lng != null ? { "@type": "GeoCoordinates", latitude: Number(p.lat), longitude: Number(p.lng) } : undefined });
const placeItem = (p) => `<li><b>${esc(p.name)}</b> – ${esc((T.PLACE_KINDS.find((k) => k.key === p.kind) || { one: "" }).one)}${p.settlement ? ` ${esc(be(p.settlement))}` : ""}${p.blurb ? `. ${esc(p.blurb)}` : ""}</li>`;
if (places.length) {
  const regsP = T.REGIONS.filter((r) => places.some((p) => p.region === r.key));
  page({
    file: "places/index.html", url: "/places/", route: "places",
    title: `מה עושים בחופשה: אטרקציות, מסעדות וטבע | ${S.site_name}`,
    description: clip(`${places.length} אטרקציות, מסעדות, ספא, יקבים ומסלולים ליד הצימר, עם מרחק ממקומות הלינה וניווט ב-Waze.`, 300),
    jsonld: [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: places.slice(0, 200).map((p, i) => ({ "@type": "ListItem", position: i + 1, item: placeLd(p) })) }],
    body: `<div class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], ["מה עושים באזור", ""]])}<h1>מה עושים בחופשה</h1><p>${regsP.map((r) => `<a href="/places/${r.key}/">מה עושים ${esc(be(r.name))}</a>`).join(" · ")}</p><ul>${places.map(placeItem).join("")}</ul></div>`
  });
  for (const r of regsP) {
    const inP = places.filter((p) => p.region === r.key);
    page({
      file: `places/${r.key}/index.html`, url: `/places/${r.key}/`, route: `places-${r.key}`,
      title: `מה עושים ${be(r.name)}: אטרקציות ומסעדות | ${S.site_name}`,
      description: clip(`${inP.length} מקומות ${be(r.name)}: ${inP.slice(0, 6).map((p) => p.name).join(", ")}. עם מרחק מהצימרים באזור וניווט ב-Waze.`, 300),
      jsonld: [{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: inP.map((p, i) => ({ "@type": "ListItem", position: i + 1, item: placeLd(p) })) }],
      body: `<div class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], ["מה עושים באזור", "/places/"], [r.name, ""]])}<h1>מה עושים ${esc(be(r.name))}</h1><ul>${inP.map(placeItem).join("")}</ul><p><a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a></p></div>`
    });
  }
}

/* ------------------------------------------------------------ דפי נחיתה כלליים */
const deals = listings.filter((l) => l.deal_label || Number(l.lastminute_pct) > 0 || T.benefitsOf(l).length);
const lm = listings.filter((l) => Number(l.lastminute_pct) > 0);
const topRated = listings.filter((l) => ratings[l.id]).sort((a, b) => ratings[b.id].avg - ratings[a.id].avg || ratings[b.id].n - ratings[a.id].n).slice(0, 20);
const STATIC = [
  ["deals", "דילים והטבות לצימרים", `דילים, הנחות למילואימניקים ולחיילים, ומבצעי אמצע שבוע. ${deals.length} מתחמים עם הטבה עכשיו.`, deals],
  ["lastminute", "דקה 90: צימרים לסופ״ש הקרוב בהנחה", "מתחמים שעדיין פנויים לסופ״ש הקרוב, במחיר מוזל. מתעדכן כל הזמן לפי היומן של המארחים.", lm],
  ["weekend", "צימרים פנויים לסופ״ש הקרוב", "רואים רק מתחמים שהיומן שלהם פנוי בחמישי ושישי הקרובים.", null],
  ["tonight", "צימרים פנויים הלילה", "חופשה של רגע אחרון: מתחמים שפנויים עוד הלילה.", null],
  ["top", "המקומות שהאורחים הכי אוהבים", "דירוג לפי ממוצע חוות דעת מאומתות. רק אורחים שההזמנה שלהם אושרה יכולים לדרג.", topRated],
  ["find", "מצא לי צימר: שירות חיפוש אישי", "ספרו לנו מה אתם מחפשים, ונחזור עם כמה מקומות שפנויים בתאריכים שלכם ומתאימים לתקציב. בלי עלות.", null],
  ["join", "פרסום צימר באתר", `מפרסמים צימר או וילה ב${S.site_name} ומקבלים פניות ישירות לוואטסאפ ולמייל, עם יומן מסונכרן ל-Booking ו-Airbnb.`, null],
  ["magazine", `מגזין ${S.site_name}: טיפים ורעיונות לחופשה`, "כתבות על אזורים, מסלולים, מסעדות ואיך לבחור צימר.", null],
  ["contact", "צרו קשר", `שאלות על הזמנה, פרסום באתר או משהו אחר. ${S.phone ? "טלפון: " + S.phone + "." : ""}`, null],
  ["about", `אודות ${S.site_name}`, `${S.site_name} מחבר בין אורחים למארחים ישירות, בלי עמלת הזמנה.`, null],
  ["accessibility", "הצהרת נגישות", "פירוט התאמות הנגישות באתר ודרכי פנייה לרכז הנגישות.", null],
  ["terms", "תנאי שימוש ופרטיות", "תנאי השימוש באתר, מדיניות הפרטיות ומה נשמר בדפדפן.", null]
];
for (const [k, h1, desc, list] of STATIC) {
  page({
    file: `${k}/index.html`, url: `/${k}/`, route: k,
    title: `${h1} | ${S.site_name}`, description: clip(desc, 300), image: list && list[0] ? coverOf(list[0]) : abs(S.hero_image || T.HERO_DEFAULT),
    jsonld: list && list.length ? [itemList(h1, list)] : [],
    body: `<div class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], [h1, ""]])}<h1>${esc(h1)}</h1><p>${esc(desc)}</p>${list && list.length ? `<ul>${list.map(card).join("")}</ul>` : ""}${k === "magazine" && articles.length ? `<ul>${articles.map((a) => `<li><a href="/magazine/${encodeURIComponent(a.id)}/">${esc(a.title)}</a> – ${esc(a.excerpt)}</li>`).join("")}</ul>` : ""}</div>`
  });
}

/* ------------------------------------------------------------ מגזין */
for (const a of articles) {
  page({
    file: `magazine/${a.id}/index.html`, url: `/magazine/${encodeURIComponent(a.id)}/`, route: `article-${a.id}`,
    title: `${a.title} | ${S.site_name}`, description: clip(a.excerpt || a.body, 300), image: abs(a.cover), lastmod: a.updated_at,
    jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: clip(a.excerpt, 300), image: abs(a.cover) || undefined, datePublished: a.created_at || undefined, dateModified: a.updated_at || undefined, inLanguage: "he", publisher: { "@type": "Organization", name: S.site_name } }, crumbsLd([[S.site_name, "/"], ["מגזין", "/magazine/"], [a.title, ""]])],
    body: `<article class="wrap page seo-pre">${crumbsHtml([[S.site_name, "/"], ["מגזין", "/magazine/"], [a.title, ""]])}<h1>${esc(a.title)}</h1><p><b>${esc(a.excerpt)}</b></p>${String(a.body || "").split(/\n{2,}/).map((p) => /^#+\s/.test(p) ? `<h2>${esc(p.replace(/^#+\s*/, ""))}</h2>` : `<p>${esc(p)}</p>`).join("")}</article>`
  });
}

/* ------------------------------------------------------------ מפת אתר ו-robots */
if (noindex) {
  fs.writeFileSync(path.join(OUT, "robots.txt"), "# מצב הדגמה: לא לאינדוקס עד לחיבור הנתונים האמיתיים\nUser-agent: *\nDisallow: /\n");
} else {
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nDisallow: /admin.html\nDisallow: /owner.html\nDisallow: /api/\n${SITE ? `Sitemap: ${SITE}/sitemap.xml\n` : ""}`);
  if (SITE) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
      .map((p) => `  <url><loc>${esc(SITE + p.url)}</loc>${p.lastmod ? `<lastmod>${String(p.lastmod).slice(0, 10)}</lastmod>` : ""}</url>`)
      .join("\n")}\n</urlset>\n`;
    fs.writeFileSync(path.join(OUT, "sitemap.xml"), xml);
  }
}
for (const f of ["admin.html", "owner.html"]) {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/<meta charset="utf-8">/, `<meta charset="utf-8">\n<meta name="robots" content="noindex">`));
}

console.log(`✓ dist/ מוכן · ${live ? "נתונים מ-Supabase" : "נתוני הדגמה (noindex)"} · ${pages.length} דפים · ${SITE || "בלי כתובת אתר (SITE_URL)"}`);
