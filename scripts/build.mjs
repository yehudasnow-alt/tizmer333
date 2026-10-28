/*
 * בניית האתר לפריסה (Vercel מריץ את זה אוטומטית: node scripts/build.mjs → dist/)
 *
 * 1. מעתיק את האתר ל-dist/
 * 2. אם הוגדרו משתני סביבה SUPABASE_URL + SUPABASE_ANON_KEY – כותב אותם ל-config.js
 *    (רק המפתחות הציבוריים! מפתח ה-Service Role לא נכתב לשום קובץ)
 * 3. יוצר דפים סטטיים לגוגל ולשיתוף בוואטסאפ/פייסבוק:
 *      /zimmer/<id>/            דף מתחם (כותרת, תיאור, תמונה, JSON-LD)
 *      /l/<region>/             דף אזור
 *      /l/<region>/<feature>/   דף אזור + מאפיין (ג׳קוזי, בריכה, לזוגות…)
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
let live = false, listings, articles, reviews, settings;
if (pub.SUPABASE_URL && pub.SUPABASE_ANON_KEY) {
  try {
    [listings, articles, reviews, settings] = await Promise.all([
      rest("listings", "select=*&active=eq.true&order=created_at.desc&limit=5000"),
      rest("articles", "select=*&published=eq.true&order=created_at.desc&limit=1000"),
      rest("reviews", "select=listing_id,rating&status=eq.approved&limit=20000"),
      rest("settings", "select=data&id=eq.1").then((r) => (r[0] && r[0].data) || {})
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

const FEATURES = T.SEO_FEATURES;
const has = (l, f) => (f.audience ? (l.audience || []).includes(f.key) : (l.amenities || []).includes(f.key));

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
  ? `<nav class="seo-nav" aria-label="צימרים לפי אזור"><div class="wrap"><b>צימרים לפי אזור:</b> ${regionsWith.map((r) => `<a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a>`).join(" · ")}</div></nav>`
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
for (const l of listings) {
  const r = regionOf(l.region);
  const units = T.unitsOf(l);
  const prices = units.flatMap((u) => [u.price_weekday, u.price_weekend, u.price_holiday]).filter((p) => p > 0);
  const photos = photosOf(l);
  const rt = ratings[l.id];
  const where = l.settlement || (r ? r.name : "");
  const title = `${l.name} – ${typeName(l.type)} ${be(where)} | ${S.site_name}`;
  const description = clip(`${l.tagline ? l.tagline + ". " : ""}${typeName(l.type)} ${be(where)}${r && r.name !== where ? ", " + r.name : ""}, עד ${l.guests_max} אורחים${prices.length ? `, החל מ־₪${Math.min(...prices)} ללילה` : ""}. ${l.description}`, 300);
  const url = `/zimmer/${encodeURIComponent(l.id)}/`;
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
    petsAllowed: (l.amenities || []).includes("pets") || undefined,
    priceRange: prices.length ? `₪${Math.min(...prices)}–₪${Math.max(...prices)}` : undefined,
    amenityFeature: (l.amenities || []).map(amen).filter(Boolean).map((a) => ({ "@type": "LocationFeatureSpecification", name: a.name, value: true })),
    aggregateRating: rt && rt.n ? { "@type": "AggregateRating", ratingValue: Math.round((rt.sum / rt.n) * 10) / 10, reviewCount: rt.n, bestRating: 5 } : undefined
  };
  const crumbs = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: S.site_name, item: SITE ? SITE + "/" : undefined },
      r ? { "@type": "ListItem", position: 2, name: `צימרים ${be(r.name)}`, item: SITE ? `${SITE}/l/${r.key}/` : undefined } : null,
      { "@type": "ListItem", position: r ? 3 : 2, name: l.name }
    ].filter(Boolean)
  };
  page({
    file: `zimmer/${l.id}/index.html`, url, route: `stay-${l.id}`, title, description, image: photos[0], jsonld: [ld, crumbs], lastmod: l.updated_at,
    body: `<div class="wrap page seo-pre">
<nav aria-label="פירורי לחם"><a href="/">דף הבית</a>${r ? ` › <a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a>` : ""}</nav>
<h1>${esc(l.name)}</h1>
${l.tagline ? `<p><b>${esc(l.tagline)}</b></p>` : ""}
<p>${esc(typeName(l.type))} ${esc(be(where))} · עד ${l.guests_max} אורחים · ${units.length > 1 ? units.length + " יחידות" : l.bedrooms + " חדרי שינה"}${prices.length ? ` · החל מ־₪${Math.min(...prices)} ללילה` : ""}</p>
${photos[0] ? `<img src="${esc(photos[0])}" alt="${esc(l.name)}" width="1200" height="800" style="max-width:100%;height:auto">` : ""}
<p>${esc(l.description)}</p>
${(l.amenities || []).length ? `<ul>${l.amenities.map(amen).filter(Boolean).map((a) => `<li>${esc(a.name)}</li>`).join("")}</ul>` : ""}
${units.length > 1 ? `<h2>היחידות במתחם</h2><ul>${units.map((u) => `<li>${esc(u.name)} – עד ${u.guests_max} אורחים${u.price_weekday ? `, ₪${u.price_weekday} ללילה באמצע השבוע` : ""}</li>`).join("")}</ul>` : ""}
</div>`
  });
}

/* ------------------------------------------------------------ אזורים + מאפיינים */
for (const r of regionsWith) {
  const inR = listings.filter((l) => l.region === r.key);
  page({
    file: `l/${r.key}/index.html`, url: `/l/${r.key}/`, route: `region-${r.key}`,
    title: `צימרים ${be(r.name)} – ${inR.length} מתחמים | ${S.site_name}`,
    description: clip(`צימרים, וילות וסוויטות ${be(r.name)}: ${r.blurb}. ${inR.length} מתחמים עם מחירים, יומן זמינות ופנייה ישירה למארחים, בלי עמלות.`, 300),
    image: coverOf(inR[0]),
    jsonld: [{ "@context": "https://schema.org", "@type": "ItemList", name: `צימרים ${be(r.name)}`, itemListElement: inR.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE ? `${SITE}/zimmer/${encodeURIComponent(l.id)}/` : undefined, name: l.name })) }],
    body: `<div class="wrap page seo-pre"><nav aria-label="פירורי לחם"><a href="/">דף הבית</a></nav><h1>צימרים ${esc(be(r.name))}</h1><p>${esc(r.blurb)}.</p><ul>${inR.map(card).join("")}</ul>
<p>${FEATURES.filter((f) => inR.some((l) => has(l, f))).map((f) => `<a href="/l/${r.key}/${f.key}/">צימרים ${esc(f.phrase)} ${esc(be(r.name))}</a>`).join(" · ")}</p></div>`
  });
  for (const f of FEATURES) {
    const inF = inR.filter((l) => has(l, f));
    if (!inF.length) continue;
    page({
      file: `l/${r.key}/${f.key}/index.html`, url: `/l/${r.key}/${f.key}/`, route: `region-${r.key}/${f.key}`,
      title: `צימרים ${f.phrase} ${be(r.name)} | ${S.site_name}`,
      description: clip(`${inF.length} צימרים ווילות ${f.phrase} ${be(r.name)}. מחירים, תמונות, יומן זמינות ופנייה ישירה למארחים.`, 300),
      image: coverOf(inF[0]),
      body: `<div class="wrap page seo-pre"><nav aria-label="פירורי לחם"><a href="/">דף הבית</a> › <a href="/l/${r.key}/">צימרים ${esc(be(r.name))}</a></nav><h1>צימרים ${esc(f.phrase)} ${esc(be(r.name))}</h1><ul>${inF.map(card).join("")}</ul></div>`
    });
  }
}

/* ------------------------------------------------------------ מגזין */
for (const a of articles) {
  page({
    file: `magazine/${a.id}/index.html`, url: `/magazine/${encodeURIComponent(a.id)}/`, route: `article-${a.id}`,
    title: `${a.title} | ${S.site_name}`, description: clip(a.excerpt || a.body, 300), image: abs(a.cover), lastmod: a.updated_at,
    jsonld: [{ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: clip(a.excerpt, 300), image: abs(a.cover) || undefined, datePublished: a.created_at || undefined, dateModified: a.updated_at || undefined, inLanguage: "he", publisher: { "@type": "Organization", name: S.site_name } }],
    body: `<article class="wrap page seo-pre"><nav aria-label="פירורי לחם"><a href="/">דף הבית</a></nav><h1>${esc(a.title)}</h1><p><b>${esc(a.excerpt)}</b></p>${String(a.body || "").split(/\n{2,}/).map((p) => `<p>${esc(p.replace(/^#+\s*/, ""))}</p>`).join("")}</article>`
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
