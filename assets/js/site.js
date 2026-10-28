/* תמרה – האתר לאורחים */
(function () {
  "use strict";
  const T = window.Tamara;
  const { $, $$, esc } = T;
  const I = T.icon;
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";

  const LOGO = "assets/img/brand/logo-horizontal-ink.svg";
  const LOGO_FOOT = "assets/img/brand/logo-stacked-white.svg";
  const defaultFilters = () => ({ q: "", place: "", type: "", guests: 0, ci: "", co: "", priceMax: 0, amenities: [], audience: [], deals: false, lastminute: false, sort: "rec", view: "list" });
  const S = {
    listings: [], settings: T.clone(T.DEFAULT_SETTINGS), reviews: [], articles: [], ratings: {},
    loaded: false, error: "",
    saved: new Set(T.storage.get("tamara.saved", [])),
    filters: defaultFilters(),
    showIdx: 0,
    stay: { id: "", unitId: "", ci: "", co: "", guests: 2, extras: [], coupon: "", calStart: null, sent: null, lb: -1, phone: false, video: false },
    moreAmen: false, viewed: new Set(), map: null
  };

  /* ---------------------------------------------------------------- helpers */
  const plural = {
    bedrooms: (n) => (n === 1 ? "חדר שינה" : `${n} חדרי שינה`),
    nights: (n) => (n === 1 ? "לילה אחד" : n === 2 ? "שני לילות" : `${n} לילות`),
    guests: (n) => (n === 1 ? "אורח אחד" : `${n} אורחים`),
    stays: (n) => (n === 1 ? "מתחם אחד" : `${n} מתחמים`),
    reviews: (n) => (n === 1 ? "חוות דעת אחת" : `${n} חוות דעת`)
  };
  const placeLabel = (v) => (!v ? "" : v.startsWith("area:") ? "כל ה" + T.AREAS[v.slice(5)] : T.regionOf(v).name);
  const placeOptions = (sel) => {
    let h = `<option value="">כל הארץ</option>`;
    Object.entries(T.AREAS).forEach(([k, name]) => {
      h += `<optgroup label="${name}"><option value="area:${k}" ${sel === "area:" + k ? "selected" : ""}>כל ה${name}</option>`;
      T.REGIONS.filter((r) => r.area === k).forEach((r) => (h += `<option value="${r.key}" ${sel === r.key ? "selected" : ""}>${esc(r.name)}</option>`));
      h += `</optgroup>`;
    });
    return h;
  };
  const contactPhone = (l) => (l && (l.phone || l.whatsapp)) || S.settings.phone || S.settings.whatsapp || "";
  const contactWA = (l) => (l && (l.whatsapp || l.phone)) || S.settings.whatsapp || S.settings.phone || "";
  const minDate = () => T.iso(T.today());
  const saveSaved = () => T.storage.set("tamara.saved", [...S.saved]);
  const ratingOf = (id) => S.ratings[id] || null;
  const ratingHTML = (id, long) => { const r = ratingOf(id); return r ? `<span class="rating">${T.stars(r.avg)}<b>${r.avg.toFixed(1)}</b>${long ? `<span>(${plural.reviews(r.n)})</span>` : `<span>(${r.n})</span>`}</span>` : ""; };
  const imgAlt = (p, l, i) => (p.real ? `${l.name}${i ? " – תמונה " + (i + 1) : ""}` : "");

  function computeRatings() {
    const r = {};
    S.reviews.forEach((v) => { const x = (r[v.listing_id] = r[v.listing_id] || { sum: 0, n: 0 }); x.sum += Number(v.rating) || 0; x.n++; });
    Object.values(r).forEach((x) => (x.avg = x.sum / x.n));
    S.ratings = r;
  }

  function applyFilters(list, f) {
    const q = (f.q || "").trim();
    const out = list.filter((l) => {
      if (f.place) { if (f.place.startsWith("area:")) { if (T.regionOf(l.region).area !== f.place.slice(5)) return false; } else if (l.region !== f.place) return false; }
      if (f.type && l.type !== f.type) return false;
      if (f.guests && !T.unitsOf(l).some((u) => u.guests_max >= f.guests)) return false;
      if (f.priceMax && T.fromPrice(l) > f.priceMax) return false;
      if (f.amenities.length && !f.amenities.every((a) => l.amenities.includes(a))) return false;
      if (f.audience.length && !f.audience.some((a) => l.audience.includes(a))) return false;
      if (f.deals && !l.deal_label && !T.lastMinuteActive(l)) return false;
      if (f.lastminute && !T.lastMinuteActive(l)) return false;
      if (f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0 && !T.isAvailable(l, f.ci, f.co, f.guests)) return false;
      if (q && !(l.name + " " + l.settlement + " " + l.tagline + " " + T.regionOf(l.region).name).includes(q)) return false;
      return true;
    });
    const rank = (l) => (T.isSponsored(l) ? 4 : 0) + (T.lastMinuteActive(l) ? 2 : 0) + (l.featured ? 1 : 0);
    const by = {
      rec: (a, b) => rank(b) - rank(a) || (ratingOf(b.id) || { avg: 0 }).avg - (ratingOf(a.id) || { avg: 0 }).avg || (b.created_at || "").localeCompare(a.created_at || ""),
      price_asc: (a, b) => T.fromPrice(a) - T.fromPrice(b),
      price_desc: (a, b) => T.fromPrice(b) - T.fromPrice(a),
      rating: (a, b) => (ratingOf(b.id) || { avg: 0 }).avg - (ratingOf(a.id) || { avg: 0 }).avg,
      new: (a, b) => (b.created_at || "").localeCompare(a.created_at || "")
    };
    return out.sort(by[f.sort] || by.rec);
  }

  /* ---------------------------------------------------------------- cards */
  function priceHTML(l) {
    const f = S.filters;
    if (f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0) {
      const units = T.unitsOf(l).filter((u) => !f.guests || u.guests_max >= f.guests);
      const qs = units.map((u) => T.quote(l, f.ci, f.co, { unitId: u.id, guests: f.guests })).filter((q) => q && !q.conflicts.length);
      if (qs.length) { const q = qs.sort((a, b) => a.total - b.total)[0]; return `<span class="price"><b>${T.money(q.total)}</b>ל${plural.nights(q.nights)}<small>${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}${units.length > 1 ? " · החל מ" : ""}</small></span>`; }
    }
    const u = T.unitsOf(l);
    const from = T.fromPrice(l);
    const we = Math.min(...u.map((x) => x.price_weekend || x.price_weekday).filter(Boolean));
    return `<span class="price">${u.length > 1 ? `<span class="from">החל מ־</span>` : ""}<b>${T.money(from)}</b>ללילה<small>סופ״ש ${T.money(we)}</small></span>`;
  }
  function card(l) {
    const reg = T.regionOf(l.region), typ = T.typeOf(l.type);
    const saved = S.saved.has(l.id);
    const lm = T.lastMinuteActive(l);
    const real = (l.photos || []).length > 0;
    return `<article class="card">
      <div class="card-media"><img src="${esc(T.thumbOf(l))}" alt="${real ? esc(l.name) : ""}" loading="lazy">
        <span class="chips-top"><span class="chip">${I("pin")}${esc(l.settlement || reg.name)}</span>${T.isSponsored(l) ? `<span class="chip chip-sp">${I("megaphone")}ממומן</span>` : ""}</span>
        ${lm ? `<span class="chip chip-lm">${I("bolt")}דקה 90 · ‎-${l.lastminute_pct}%</span>` : l.deal_label ? `<span class="chip chip-deal">${I("tag")}${esc(l.deal_label)}</span>` : ""}
      </div>
      <button class="save-btn" type="button" data-act="save" data-id="${esc(l.id)}" aria-pressed="${saved}" aria-label="${saved ? "הסרה מהשמורים" : "שמירה לרשימה"}: ${esc(l.name)}">${I("heart")}</button>
      <div class="card-body">
        <div class="card-head"><h3><a href="#stay-${esc(l.id)}">${esc(l.name)}</a></h3><span class="card-place">${esc(reg.name)}</span></div>
        <p class="card-tag">${esc(l.tagline)}</p>
        <div class="card-meta">${ratingHTML(l.id)}<span>${I("home")}${esc(typ.name)}${T.unitsOf(l).length > 1 ? ` · ${T.unitsOf(l).length} יחידות` : ""}</span><span>${I("users")}עד ${Math.max(...T.unitsOf(l).map((u) => u.guests_max))}</span></div>
        <div class="card-foot">${priceHTML(l)}<span class="go-btn" aria-hidden="true">${I("fwd")}</span></div>
      </div>
    </article>`;
  }
  const grid = (list) => `<div class="grid">${list.map(card).join("")}</div>`;
  const emptyState = (title, text, action) => `<div class="empty">${I("search")}<h3>${title}</h3><p>${text}</p>${action || ""}</div>`;
  const head = (eyebrow, title, sub, link) => `<div class="section-head"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${link || ""}</div>`;

  /* ---------------------------------------------------------------- chrome */
  function header() {
    const n = S.saved.size;
    const wa = S.settings.whatsapp;
    const cur = location.hash.slice(1);
    const nav = [["search", "חיפוש"], ["type-zimmer", "צימרים"], ["type-villa", "וילות"], ["deals", "דילים"], ["magazine", "מגזין"], ["join", "למארחים"]];
    return `<header class="topbar wrap" id="topbar"><div class="topbar-in">
      <a class="brand" href="#" aria-label="${esc(S.settings.site_name)} – לדף הבית"><img src="${LOGO}" alt="${esc(S.settings.site_name)} – ${esc(S.settings.site_tagline)}"></a>
      <nav class="mainnav" aria-label="ניווט ראשי">${nav.map(([h, t]) => `<a href="#${h}" ${cur === h ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
      <div class="top-actions">
        ${wa ? `<a class="btn btn-line hide-m" href="${esc(T.waLink(wa, "שלום, הגעתי מאתר " + S.settings.site_name))}" target="_blank" rel="noopener">${I("chat")}וואטסאפ</a>` : ""}
        <a class="icon-btn saved-count" href="#saved" aria-label="המתחמים ששמרתי (${n})" ${n ? `data-n="${n}"` : ""}>${I("heart")}</a>
        <a class="btn btn-primary hide-m" href="#join">פרסמו אצלנו</a>
        <button class="icon-btn menu-btn" type="button" data-act="menu" aria-expanded="false" aria-controls="mobile-nav" aria-label="תפריט">${I("menu")}</button>
      </div></div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="תפריט נייד">${nav.map(([h, t]) => `<a href="#${h}">${t}</a>`).join("")}<a href="#saved">שמורים</a></nav>
    </header>`;
  }
  function footer() {
    const s = S.settings;
    return `<div class="footer-in wrap">
      <div class="about-col"><a href="#" aria-label="לדף הבית"><img src="${LOGO_FOOT}" alt="${esc(s.site_name)}"></a><p>צימרים, וילות ובקתות מהגולן ועד הערבה. פונים ישירות למארחים, בלי עמלת הזמנה.</p></div>
      <div><h4>אזורים</h4><ul>${T.REGIONS.slice(0, 7).map((r) => `<li><a href="#region-${r.key}">${esc(r.name)}</a></li>`).join("")}</ul></div>
      <div><h4>סוגי אירוח</h4><ul>${T.TYPES.map((t) => `<li><a href="#type-${t.key}">${esc(t.plural)}</a></li>`).join("")}<li><a href="#deals">דילים ודקה 90</a></li></ul></div>
      <div><h4>מידע</h4><ul>
        ${s.phone ? `<li><span dir="ltr">${esc(s.phone)}</span></li>` : ""}${s.email ? `<li>${esc(s.email)}</li>` : ""}
        <li><a href="#about">אודות</a></li><li><a href="#magazine">מגזין</a></li><li><a href="#join">פרסום מתחם באתר</a></li><li><a href="owner.html">כניסת מארחים</a></li>
        <li><a href="#accessibility">הצהרת נגישות</a></li><li><a href="#terms">תנאי שימוש ופרטיות</a></li></ul></div>
      <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.site_name)} – ${esc(s.site_tagline)}</span><a href="admin.html">ניהול האתר</a></div></div>`;
  }

  /* ---------------------------------------------------------------- home */
  function viewHome() {
    const L = S.listings;
    const featured = L.filter((l) => l.featured);
    const lm = L.filter(T.lastMinuteActive);
    const deals = L.filter((l) => l.deal_label).slice(0, 4);
    const newest = L.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 8);
    const regionsUsed = new Set(L.map((l) => l.region));
    const f = S.filters;
    const lmN = T.lastMinuteNights();
    return `<div class="view">
      <section class="wrap page" aria-label="חיפוש">
        <div class="hero">
          <img class="hero-img" src="${esc(S.settings.hero_image || T.HERO_DEFAULT)}" alt="">
          <div class="hero-tab" aria-label="קיצורי אזורים">${Object.entries(T.AREAS).map(([k, n]) => `<a href="#area-${k}">${n}</a>`).join("")}</div>
          <div class="hero-inner">
            <span class="eyebrow">${esc(S.settings.site_tagline)} · מהצפון ועד הדרום</span>
            <h1>${esc(S.settings.hero_title)}</h1>
            <p class="hero-sub">${esc(S.settings.hero_subtitle)}</p>
            <div class="hero-cta"><a class="btn btn-sky btn-lg" href="#lastminute">${I("bolt")}דקה 90 לסופ״ש הקרוב</a><a class="btn btn-glass btn-lg" href="#search">${I("map")}חיפוש במפה</a></div>
            <div class="hero-stats">
              <div><b>${T.num(L.length)}</b><span>מתחמי אירוח</span></div>
              <div><b>${T.num(regionsUsed.size)}</b><span>אזורים בארץ</span></div>
              <div><b>₪0</b><span>עמלת הזמנה לאורחים</span></div>
            </div>
          </div>
        </div>
        <form class="searchbox" data-form="hero-search" role="search">
          <label class="field f-region"><span>לאן נוסעים?</span><select class="select" name="place">${placeOptions(f.place)}</select></label>
          <label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(f.ci)}"></label>
          <label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${minDate()}" value="${esc(f.co)}"></label>
          <div class="field"><span id="g-lbl">אורחים</span><div class="stepper" role="group" aria-labelledby="g-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות אורחים">${I("minus")}</button><input name="guests" type="number" min="1" max="40" value="${f.guests || 2}" aria-labelledby="g-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר אורחים">${I("plus")}</button></div></div>
          <button class="btn btn-primary" type="submit">${I("search")}חיפוש</button>
        </form>
        <div class="quick" aria-label="סינון מהיר">${T.QUICK_FILTERS.map((q, i) => `<button class="filter-chip" type="button" data-act="quick" data-i="${i}">${esc(q.label)}</button>`).join("")}</div>
      </section>

      ${featured.length ? `<section class="section wrap page" aria-labelledby="h-featured">${head("נבחרי העונה", `<span id="h-featured">מתחמים שאורחים חוזרים אליהם</span>`, "", `<a class="link-more" href="#search">לכל המתחמים ${I("fwd")}</a>`)}<div id="showcase">${showcase(featured)}</div></section>` : ""}

      ${lm.length ? `<section class="section wrap page" id="lm-section" aria-labelledby="h-lm"><div class="lm-band">${head(`${I("bolt")} דקה 90`, `<span id="h-lm">פנוי בסופ״ש הקרוב, במחיר מוזל</span>`, `לילות ${lmN.map(T.fmtLong).join(" ו")}. ההנחה חלה על הלילות האלה בלבד.`, `<a class="link-more" href="#lastminute">לכל מבצעי דקה 90 ${I("fwd")}</a>`)}${grid(lm.slice(0, 3))}</div></section>` : ""}

      <section class="section wrap page" aria-labelledby="h-regions">
        ${head("לפי אזור", `<span id="h-regions">מהבזלת בצפון ועד הגרניט באילת</span>`, "")}
        <div class="regions">${T.REGIONS.map((r) => {
          const inReg = L.filter((l) => l.region === r.key);
          const withPhoto = inReg.find((l) => (l.photos || []).length);
          const img = withPhoto ? T.thumbOf(withPhoto) : T.regionScene(r.key);
          return `<a class="region" href="#region-${r.key}"><img src="${esc(img)}" alt="" loading="lazy"><span class="chip">${inReg.length ? plural.stays(inReg.length) : "בקרוב"}</span><span class="region-body"><b>${esc(r.name)}</b><span>${esc(r.blurb)}</span></span></a>`;
        }).join("")}</div>
      </section>

      <section class="section wrap page" aria-labelledby="h-types">
        ${head("סוג אירוח", `<span id="h-types">צימר לזוג או וילה לכל המשפחה</span>`, "")}
        <div class="types">${T.TYPES.map((t) => `<a class="type-tile" href="#type-${t.key}"><b>${esc(t.plural)}</b><span>${L.some((l) => l.type === t.key) ? plural.stays(L.filter((l) => l.type === t.key).length) : "בקרוב"}</span></a>`).join("")}</div>
      </section>

      ${deals.length ? `<section class="section wrap page" aria-labelledby="h-deals">${head("דילים", `<span id="h-deals">הטבות שהמארחים מציעים עכשיו</span>`, "", `<a class="link-more" href="#deals">לכל הדילים ${I("fwd")}</a>`)}${grid(deals)}</section>` : ""}

      <section class="section wrap page" aria-labelledby="h-new">
        ${head("חדש באתר", `<span id="h-new">נוספו לאחרונה</span>`, "", `<a class="link-more" href="#search">לחיפוש מלא ${I("fwd")}</a>`)}
        ${newest.length ? grid(newest) : emptyState("עוד אין מתחמים באתר", "המתחמים הראשונים יופיעו כאן מיד אחרי שיתווספו בפאנל הניהול.")}
      </section>

      ${S.articles.length ? `<section class="section wrap page" aria-labelledby="h-mag">${head("מגזין", `<span id="h-mag">טיפים לפני שמזמינים</span>`, "", `<a class="link-more" href="#magazine">לכל הכתבות ${I("fwd")}</a>`)}<div class="mag-grid">${S.articles.slice(0, 3).map(magCard).join("")}</div></section>` : ""}

      <section class="section wrap page" aria-labelledby="h-how">
        ${head("איך זה עובד", `<span id="h-how">שלושה צעדים, בלי מתווכים</span>`, "ההזמנה נסגרת ישירות מול המארחים. אנחנו לא גובים עמלה מאורחים.")}
        <div class="steps">
          <div class="step"><h3>בוחרים אזור ותאריכים</h3><p>מסננים לפי אורחים, ג׳קוזי, בריכה מחוממת, כשרות או כלבים, ורואים מחיר כולל לתאריכים, כולל חגים ותוספות.</p></div>
          <div class="step"><h3>שולחים בקשה או וואטסאפ</h3><p>הבקשה מגיעה ישירות למארחים עם התאריכים, היחידה ומספר האורחים. אפשר גם לפתוח איתם שיחה בוואטסאפ.</p></div>
          <div class="step"><h3>המארחים חוזרים אליכם</h3><p>מאשרים זמינות, מסכמים מחיר ותשלום ישירות איתם. אחרי החופשה אפשר לכתוב חוות דעת מאומתת.</p></div>
        </div>
      </section>

      <section class="wrap page"><div class="band">
        <img src="assets/img/photos/band.jpg" alt="" loading="lazy">
        <div><span class="eyebrow">למארחים</span><h2>יש לכם צימר או וילה?</h2><p>פרסמו ב${esc(S.settings.site_name)} וקבלו פניות ישירות לוואטסאפ ולמייל, בלי עמלה על הזמנות. מעדכנים מחירים, תמונות ויומן בממשק מארחים, ומסנכרנים עם Booking ו-Airbnb.</p>
          <div class="btns"><a class="btn btn-sky btn-lg" href="#join">להצטרפות</a><a class="btn btn-glass btn-lg" href="owner.html">כניסת מארחים</a></div></div>
        <ul>${["פניות עם תאריכים, יחידה ומספר אורחים, ישר לנייד", "סנכרון יומן iCal למניעת הזמנות כפולות", "מחירי חג ועונה, תוספות ומבצעי דקה 90", "דוח צפיות, לחיצות ופניות לכל מתחם"].map((t) => `<li>${I("check")}<span>${t}</span></li>`).join("")}</ul>
      </div></section>
    </div>`;
  }
  function showcase(list) {
    const i = ((S.showIdx % list.length) + list.length) % list.length;
    const l = list[i];
    const reg = T.regionOf(l.region);
    const p = T.photosOf(l)[0];
    const u = T.unitsOf(l);
    return `<div class="showcase">
      <img src="${esc(p.src)}" alt="${p.real ? esc(l.name) : ""}">
      <div class="show-panel">
        <span class="eyebrow">${esc(T.typeOf(l.type).name)} · ${esc(reg.name)}</span>
        <h3>${esc(l.name)}</h3>
        ${ratingHTML(l.id, true)}
        <p class="muted" style="font-weight:300">${esc(l.tagline)}</p>
        <div class="facts"><div><b>${Math.max(...u.map((x) => x.guests_max))}</b>אורחים</div><div><b>${u.length > 1 ? u.length : l.bedrooms}</b>${u.length > 1 ? "יחידות" : "חדרי שינה"}</div><div><b>${l.min_nights}</b>לילות מינ׳</div></div>
        <div class="book-price"><span class="price"><b>${T.money(T.fromPrice(l))}</b>ללילה</span><span class="we">${esc(l.settlement)}</span></div>
        <a class="btn btn-primary btn-block" href="#stay-${esc(l.id)}">לפרטים ובקשת הזמנה ${I("fwd")}</a>
      </div>
      <div class="show-title"><b>${esc(l.name)}</b><span>${esc(l.settlement)}, ${esc(reg.name)}</span></div>
      ${list.length > 1 ? `<div class="show-nav"><button type="button" data-act="show" data-d="-1" aria-label="המתחם הקודם">${I("chev-r")}</button><span class="dots" aria-hidden="true">${list.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</span><button type="button" data-act="show" data-d="1" aria-label="המתחם הבא">${I("chev-l")}</button><span class="sr" aria-live="polite">${i + 1} מתוך ${list.length}</span></div>` : ""}
    </div>`;
  }
  const magCard = (a) => `<article class="mag-card"><div class="card-media"><img src="${esc(T.img(a.cover, 900) || T.HERO_DEFAULT)}" alt="" loading="lazy"></div><span class="eyebrow plain">מגזין</span><h3><a href="#article-${esc(a.id)}">${esc(a.title)}</a></h3><p>${esc(a.excerpt)}</p></article>`;

  /* ---------------------------------------------------------------- search */
  function searchTitle(f) {
    let t = f.type ? T.typeOf(f.type).plural : "צימרים ווילות";
    if (f.lastminute) t = "דקה 90 לסופ״ש הקרוב";
    else if (f.deals) t = "דילים ומבצעים";
    if (f.place) t += " ב" + placeLabel(f.place).replace(/^כל ה/, "");
    return t;
  }
  function viewSearch() {
    const f = S.filters;
    const maxPrice = Math.max(1000, Math.ceil(Math.max(0, ...S.listings.map(T.fromPrice)) / 500) * 500);
    const amen = S.moreAmen ? T.AMENITIES : T.AMENITIES.slice(0, 10);
    return `<div class="view wrap page">
      <div class="page-head"><div class="crumbs"><a href="#">ראשי</a><span>/</span><span>חיפוש</span></div><span class="eyebrow">חיפוש מתחם</span><h1 id="search-title">${esc(searchTitle(f))}</h1></div>
      <div class="search-layout">
        <form class="filters" id="filters" data-form="filters" aria-label="סינון תוצאות">
          <div class="filters-head"><h2 style="font-size:2rem">סינון</h2><button class="icon-btn" type="button" data-act="filters-close" aria-label="סגירת הסינון">${I("x")}</button></div>
          <fieldset><legend>שם או יישוב</legend><input class="input" type="search" name="q" value="${esc(f.q)}" placeholder="למשל: ראש פינה"></fieldset>
          <fieldset><legend>אזור</legend><select class="select" name="place" aria-label="אזור">${placeOptions(f.place)}</select></fieldset>
          <fieldset><legend>תאריכים</legend><div class="row2"><label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(f.ci)}"></label><label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${minDate()}" value="${esc(f.co)}"></label></div><span class="hint">מתחמים שתפוסים בתאריכים יוסתרו</span></fieldset>
          <fieldset><legend id="fg-lbl">מספר אורחים</legend><div class="stepper" role="group" aria-labelledby="fg-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות">${I("minus")}</button><input name="guests" type="number" min="0" max="40" value="${f.guests || 0}" aria-labelledby="fg-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר">${I("plus")}</button></div></fieldset>
          <fieldset><legend>סוג אירוח</legend><label class="check"><input type="radio" name="type" value="" ${!f.type ? "checked" : ""}>הכל</label>${T.TYPES.map((t) => `<label class="check"><input type="radio" name="type" value="${t.key}" ${f.type === t.key ? "checked" : ""}>${esc(t.plural)}</label>`).join("")}</fieldset>
          <fieldset><legend>מחיר ללילה באמצע שבוע</legend><input type="range" name="priceMax" min="300" max="${maxPrice}" step="50" value="${f.priceMax || maxPrice}" aria-label="מחיר מקסימלי ללילה"><span class="hint">עד <span class="range-out" id="price-out">${f.priceMax && f.priceMax < maxPrice ? T.money(f.priceMax) : "ללא הגבלה"}</span></span></fieldset>
          <fieldset><legend>מתאים ל</legend>${T.AUDIENCE.map((a) => `<label class="check"><input type="checkbox" name="audience" value="${a.key}" ${f.audience.includes(a.key) ? "checked" : ""}>${a.name}</label>`).join("")}</fieldset>
          <fieldset><legend>מה חשוב לכם</legend>${amen.map((a) => `<label class="check"><input type="checkbox" name="amenities" value="${a.key}" ${f.amenities.includes(a.key) ? "checked" : ""}>${esc(a.name)}</label>`).join("")}<button class="btn btn-ghost btn-sm" type="button" data-act="more-amen">${S.moreAmen ? "פחות אפשרויות" : `עוד ${T.AMENITIES.length - 10} אפשרויות`}</button></fieldset>
          <fieldset><label class="check"><input type="checkbox" name="lastminute" ${f.lastminute ? "checked" : ""}>רק דקה 90 לסופ״ש הקרוב</label><label class="check"><input type="checkbox" name="deals" ${f.deals ? "checked" : ""}>רק מתחמים עם דיל</label></fieldset>
          <div class="filters-apply"><button class="btn btn-primary btn-block btn-lg" type="button" data-act="filters-close" id="apply-btn">הצגת תוצאות</button></div>
        </form>
        <div>
          <div class="results-bar">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn btn-line filter-toggle" type="button" data-act="filters-open">${I("sliders")}סינון</button><span class="count" id="count" aria-live="polite"></span></div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <span class="seg-tabs" role="group" aria-label="תצוגה"><button type="button" data-act="view" data-v="list" aria-pressed="${f.view !== "map"}">${I("grid")}רשימה</button><button type="button" data-act="view" data-v="map" aria-pressed="${f.view === "map"}">${I("map")}מפה</button></span>
              <label style="display:flex;align-items:center;gap:8px;font-size:var(--t-s)">מיון<select class="select" form="filters" name="sort" style="width:auto;min-height:40px">
                ${[["rec", "מומלצים"], ["price_asc", "מחיר: מהנמוך"], ["price_desc", "מחיר: מהגבוה"], ["rating", "דירוג אורחים"], ["new", "חדשים באתר"]].map(([k, t]) => `<option value="${k}" ${f.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
            </div>
          </div>
          <div class="active-chips" id="active-chips"></div>
          <div id="results" style="margin-top:16px"></div>
        </div>
      </div>
    </div>`;
  }
  function renderResults() {
    const res = applyFilters(S.listings, S.filters);
    const host = $("#results");
    if (!host) return;
    $("#count").textContent = res.length ? plural.stays(res.length) + " נמצאו" : "לא נמצאו מתחמים";
    const t = $("#search-title"); if (t) t.textContent = searchTitle(S.filters);
    const ab = $("#apply-btn"); if (ab) ab.textContent = res.length ? `הצגת ${plural.stays(res.length)}` : "אין תוצאות";
    if (S.map) { S.map.remove(); S.map = null; }
    if (!res.length) host.innerHTML = emptyState("אין מתחמים שמתאימים לכל הסינונים", "נסו להסיר סינון אחד או לבחור תאריכים אחרים.", `<button class="btn btn-line" type="button" data-act="clear-all">ניקוי כל הסינונים</button>`);
    else if (S.filters.view === "map") { host.innerHTML = `<div class="map-wrap" id="map"></div>`; S.map = mountMap($("#map"), res); }
    else host.innerHTML = grid(res);
    const f = S.filters, chips = [];
    if (f.place) chips.push(["place", "", placeLabel(f.place)]);
    if (f.type) chips.push(["type", "", T.typeOf(f.type).plural]);
    if (f.ci && f.co) chips.push(["dates", "", `${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}`]);
    if (f.guests) chips.push(["guests", "", `${f.guests}+ אורחים`]);
    if (f.priceMax) chips.push(["priceMax", "", `עד ${T.money(f.priceMax)}`]);
    f.audience.forEach((a) => chips.push(["audience", a, T.AUDIENCE.find((x) => x.key === a).name]));
    f.amenities.forEach((a) => chips.push(["amenities", a, T.amenityOf(a).name]));
    if (f.lastminute) chips.push(["lastminute", "", "דקה 90"]);
    if (f.deals) chips.push(["deals", "", "דילים"]);
    if (f.q) chips.push(["q", "", `״${f.q}״`]);
    $("#active-chips").innerHTML = chips.map(([k, v, tx]) => `<button type="button" data-act="unfilter" data-k="${k}" data-v="${esc(v)}" aria-label="הסרת הסינון ${esc(tx)}">${esc(tx)} ${I("x")}</button>`).join("") + (chips.length > 1 ? `<button type="button" data-act="clear-all">ניקוי הכל</button>` : "");
  }
  function readFilters() {
    const form = $("#filters");
    if (!form) return;
    const fd = new FormData(form);
    const maxEl = form.elements.priceMax;
    const pm = Number(fd.get("priceMax"));
    Object.assign(S.filters, {
      q: (fd.get("q") || "").trim(), place: fd.get("place") || "", ci: fd.get("ci") || "", co: fd.get("co") || "",
      guests: Number(fd.get("guests")) || 0, type: fd.get("type") || "", priceMax: maxEl && pm >= Number(maxEl.max) ? 0 : pm,
      audience: fd.getAll("audience"), amenities: fd.getAll("amenities"), deals: !!fd.get("deals"), lastminute: !!fd.get("lastminute"), sort: fd.get("sort") || "rec"
    });
    if (S.filters.ci && S.filters.co && S.filters.co <= S.filters.ci) S.filters.co = "";
    const po = $("#price-out"); if (po) po.textContent = S.filters.priceMax ? T.money(S.filters.priceMax) : "ללא הגבלה";
    try { sessionStorage.setItem("tamara.filters", JSON.stringify(S.filters)); } catch (e) {}
    renderResults();
  }

  /* ---------------------------------------------------------------- map (Leaflet + OpenStreetMap) */
  function mountMap(el, list, opts) {
    opts = opts || {};
    if (!window.L || !el) { if (el) el.innerHTML = `<div class="empty" style="height:100%;border:0">${I("map")}<p>המפה לא נטענה.</p></div>`; return null; }
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: !opts.mini, attributionControl: true });
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
    let errors = 0, offline = false;
    const goOffline = () => {
      if (offline) return;
      offline = true;
      map.removeLayer(tiles);
      el.parentElement.classList.add("map-offline");
      el.classList.add("map-offline");
      T.REGIONS.forEach((r) => L.marker([r.lat, r.lng], { interactive: false, icon: L.divIcon({ className: "tm", html: `<span class="region-label">${esc(r.name)}</span>`, iconSize: [0, 0] }) }).addTo(map));
      const n = document.createElement("div");
      n.className = "map-note";
      n.textContent = "רקע המפה ייטען באתר החי. הסיכות מראות את מיקום המתחמים.";
      el.appendChild(n);
    };
    tiles.on("tileerror", () => { if (++errors >= 2) goOffline(); });
    const pts = [];
    const items = list.map((l) => {
      const lat = l.lat || T.regionOf(l.region).lat, lng = l.lng || T.regionOf(l.region).lng;
      pts.push([lat, lng]);
      return { l, ll: L.latLng(lat, lng) };
    });
    const layer = L.layerGroup().addTo(map);
    const pop = (l) => `<a class="map-pop" href="#stay-${esc(l.id)}"><img src="${esc(T.thumbOf(l))}" alt=""><div><b class="n">${esc(l.name)}</b><span class="muted">${esc(l.settlement)} · ${esc(T.typeOf(l.type).name)}</span>${ratingHTML(l.id)}<span class="price"><b>${T.money(T.fromPrice(l))}</b>ללילה</span></div></a>`;
    /* קיבוץ סיכות קרובות כדי שלא יעלו זו על זו */
    const draw = () => {
      layer.clearLayers();
      const groups = [];
      items.forEach((it) => {
        const p = map.latLngToLayerPoint(it.ll);
        const g = groups.find((x) => x.p.distanceTo(p) < 58);
        if (g) g.items.push(it); else groups.push({ p, items: [it] });
      });
      groups.forEach((g) => {
        if (g.items.length === 1) {
          const l = g.items[0].l;
          const m = L.marker(g.items[0].ll, { icon: L.divIcon({ className: "tm", html: `<span class="pin${T.lastMinuteActive(l) ? " lm" : ""}">${T.money(T.fromPrice(l))}</span>`, iconSize: [0, 0] }), title: l.name, keyboard: true }).addTo(layer);
          if (!opts.mini) m.bindPopup(pop(l), { maxWidth: 260 });
        } else {
          const b = L.latLngBounds(g.items.map((x) => x.ll));
          const min = Math.min(...g.items.map((x) => T.fromPrice(x.l)));
          L.marker(b.getCenter(), { icon: L.divIcon({ className: "tm", html: `<span class="pin cluster">${g.items.length} מתחמים · מ־${T.money(min)}</span>`, iconSize: [0, 0] }), title: `${g.items.length} מתחמים`, keyboard: true })
            .on("click", () => map.fitBounds(b.pad(0.6), { maxZoom: Math.min(map.getZoom() + 3, 14) })).addTo(layer);
        }
      });
    };
    map.on("zoomend", draw);
    if (pts.length === 1) map.setView(pts[0], opts.mini ? 12 : 11);
    else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 });
    else map.setView([31.6, 35], 7);
    draw();
    setTimeout(() => map.invalidateSize(), 50);
    return map;
  }

  /* ---------------------------------------------------------------- stay page */
  function calendarHTML(l) {
    const st = S.stay;
    const unit = T.unitOf(l, st.unitId);
    const start = st.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
    const manual = new Set(unit.blocked_dates || []);
    const synced = new Set(unit.ical_blocked || []);
    const blocked = T.blockedSet(unit);
    const todayISO = minDate();
    const dows = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const limit = st.ci && !st.co ? [...blocked].filter((d) => d >= st.ci).sort()[0] || null : null;
    const month = (offset) => {
      const m = new Date(start.getFullYear(), start.getMonth() + offset, 1);
      let h = `<div class="cal"><h4>${T.fmtMonth(m)}</h4><div class="cal-grid">${dows.map((d) => `<span class="dow">${d}</span>`).join("")}`;
      for (let i = 0; i < m.getDay(); i++) h += `<span></span>`;
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const date = new Date(m.getFullYear(), m.getMonth(), d);
        const iso = T.iso(date);
        const cls = [];
        let disabled = false;
        if (iso < todayISO) { cls.push("past"); disabled = true; }
        if (blocked.has(iso)) {
          cls.push(synced.has(iso) && !manual.has(iso) ? "blocked synced" : "blocked");
          const okAsCheckout = st.ci && !st.co && iso > st.ci && (!limit || iso <= limit);
          if (!okAsCheckout) disabled = true;
        }
        if (st.ci && !st.co && limit && iso > limit) disabled = true;
        if (T.isWeekendNight(date)) cls.push("wknd");
        const hol = T.holidayOf(iso);
        if (hol) cls.push("hol");
        if (iso === todayISO) cls.push("today");
        if (iso === st.ci || iso === st.co) cls.push("sel");
        else if (st.ci && st.co && iso > st.ci && iso < st.co) cls.push("in-range");
        const label = `${T.fmtLong(iso)}${blocked.has(iso) ? ", תפוס" : ""}${hol ? ", " + hol.label : ""}`;
        h += `<button type="button" class="${cls.join(" ")}" data-act="day" data-d="${iso}" ${disabled ? "disabled" : ""} aria-label="${label}" aria-pressed="${iso === st.ci || iso === st.co}">${d}</button>`;
      }
      return h + `</div></div>`;
    };
    return `<div class="cal-wrap">
      <div class="cal-nav"><button class="icon-btn" type="button" data-act="cal" data-d="-1" aria-label="החודש הקודם">${I("chev-r")}</button><span class="hint">${T.unitsOf(l).length > 1 ? `${esc(unit.name)} · ` : ""}${st.ci && !st.co ? "בחרו תאריך עזיבה" : "בחרו תאריך הגעה בלוח"}</span><button class="icon-btn" type="button" data-act="cal" data-d="1" aria-label="החודש הבא">${I("chev-l")}</button></div>
      <div class="cal-months">${month(0)}${month(1)}</div>
      <div class="cal-legend"><span><i class="l-free"></i>פנוי</span><span><i class="l-blocked"></i>תפוס</span><span><i class="l-synced"></i>תפוס (מסונכרן מ-Booking/Airbnb)</span><span><i class="l-hol"></i>חג</span><span><i class="l-sel"></i>התאריכים שלכם</span><span><b>מודגש</b> = לילות סופ״ש</span></div>
    </div>`;
  }
  function bookHTML(l) {
    const st = S.stay;
    const units = T.unitsOf(l);
    const unit = T.unitOf(l, st.unitId);
    if (st.sent && st.sent.listing_id === l.id) {
      const s = st.sent;
      return `<div class="book" id="book"><div class="book-ok">
        <span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:1.8rem">הבקשה נשלחה למארחים</h3>
        <p class="muted">${esc(l.name)}${s.unit_name ? " · " + esc(s.unit_name) : ""} · ${T.fmtShort(s.check_in)} עד ${T.fmtShort(s.check_out)} · ${plural.guests(Number(s.guests))}. המארחים יחזרו אליכם לטלפון ${esc(s.phone)}.</p>
        <a class="btn btn-primary btn-block" href="${esc(T.waLink(contactWA(l), waText(l, s)))}" target="_blank" rel="noopener" data-track="w">${I("chat")}להמשך השיחה בוואטסאפ</a>
        <button class="btn btn-ghost btn-sm" type="button" data-act="book-again">בקשה נוספת</button></div></div>`;
    }
    const q = st.ci && st.co ? T.quote(l, st.ci, st.co, { unitId: unit.id, guests: st.guests, extras: st.extras, coupon: st.coupon }) : null;
    let quote = "";
    if (q) {
      quote = `<div class="quote" aria-live="polite">${q.lines.map((x) => `<div class="${x.amount < 0 ? "neg" : ""}"><span>${esc(x.label)}</span><span>${x.amount < 0 ? "−" : ""}${T.money(Math.abs(x.amount))}</span></div>`).join("")}
        <div class="total"><span>סה״כ משוער</span><b>${T.money(q.total)}</b></div></div>
        ${q.lastMinute ? `<p class="note note-info">${I("bolt")}<span>כולל הנחת דקה 90 של ${l.lastminute_pct}% על לילות הסופ״ש הקרוב.</span></p>` : ""}
        ${q.seasonPct ? `<p class="note note-info">${I("info")}<span>בתאריכים האלה חל מחיר עונה (+${q.seasonPct}%).</span></p>` : ""}
        ${q.conflicts.length ? `<p class="note note-warn">${I("info")}<span>חלק מהלילות תפוסים (${q.conflicts.map(T.fmtShort).join(", ")}). בחרו תאריכים או יחידה אחרת.</span></p>` : q.belowMin ? `<p class="note note-warn">${I("info")}<span>מינימום ${plural.nights(l.min_nights)} במתחם הזה.</span></p>` : q.overCapacity ? `<p class="note note-warn">${I("info")}<span>היחידה מתאימה לעד ${unit.guests_max} אורחים.</span></p>` : `<p class="note note-ok">${I("check")}<span>התאריכים פנויים ביומן המארחים</span></p>`}`;
    }
    const maxG = Math.max(...units.map((x) => x.guests_max));
    const phone = contactPhone(l);
    return `<form class="book" id="book" data-form="book" novalidate>
      <div class="book-price"><span class="price"><b>${T.money(unit.price_weekday)}</b>ללילה</span><span class="we">סופ״ש ${T.money(unit.price_weekend)}${unit.price_holiday ? ` · חג ${T.money(unit.price_holiday)}` : ""}</span></div>
      ${units.length > 1 ? `<label class="field"><span>יחידה</span><select class="select" name="unit">${units.map((u) => `<option value="${esc(u.id)}" ${u.id === unit.id ? "selected" : ""}>${esc(u.name)} · עד ${u.guests_max} · ${T.money(u.price_weekday)}</option>`).join("")}</select></label>` : ""}
      <div class="book-dates"><label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(st.ci)}" required></label><label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${esc(st.ci || minDate())}" value="${esc(st.co)}" required></label></div>
      <label class="field"><span>אורחים${unit.guests_base && l.extra_guest_price ? ` · המחיר כולל ${unit.guests_base}, כל נוסף ${T.money(l.extra_guest_price)} ללילה` : ""}</span><select class="select" name="guests">${Array.from({ length: Math.max(1, maxG) }, (_, i) => `<option value="${i + 1}" ${Number(st.guests) === i + 1 ? "selected" : ""}>${plural.guests(i + 1)}</option>`).join("")}</select></label>
      ${(l.extras || []).length ? `<div class="field"><span>תוספות</span><div class="extras">${l.extras.map((x) => `<label><span><input type="checkbox" name="extras" value="${esc(x.name)}" ${st.extras.includes(x.name) ? "checked" : ""}>${esc(x.name)}</span><em>${T.money(x.price)} ${esc(T.statusName(T.EXTRA_PER, x.per))}</em></label>`).join("")}</div></div>` : ""}
      ${(S.settings.coupons || []).some((c) => c.active !== false) ? `<label class="field"><span>קוד קופון</span><span class="coupon-row"><input class="input" name="coupon" value="${esc(st.coupon)}" autocomplete="off" placeholder="אם יש לכם">${st.coupon ? (T.couponOf(st.coupon) ? `<span class="pill pill-ok">הופעל</span>` : `<span class="pill pill-warn">לא בתוקף</span>`) : ""}</span></label>` : ""}
      ${quote}
      <label class="field"><span>שם מלא</span><input class="input" name="name" autocomplete="name" required></label>
      <label class="field"><span>טלפון נייד</span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" placeholder="050-0000000" required></label>
      <label class="field"><span>אימייל (לא חובה, לאישור בכתב)</span><input class="input" name="email" type="email" autocomplete="email" dir="ltr" style="text-align:right"></label>
      <label class="field"><span>הערות למארחים</span><textarea class="textarea" name="message" rows="2" style="min-height:70px" placeholder="יום הולדת, מיטת תינוק, שעת הגעה…"></textarea></label>
      <label class="check"><input type="checkbox" name="consent" required><span>אני מאשר/ת להעביר את הפרטים למארחי ${esc(l.name)} לצורך חזרה אליי (<a href="#terms">פרטיות</a>)</span></label>
      <p class="err" id="book-err" role="alert"></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">שליחת בקשת הזמנה</button>
      <a class="btn btn-line btn-block" href="${esc(T.waLink(contactWA(l), waText(l, { check_in: st.ci, check_out: st.co, guests: st.guests, unit_name: units.length > 1 ? unit.name : "" })))}" target="_blank" rel="noopener" data-track="w">${I("chat")}שאלה למארחים בוואטסאפ</a>
      ${phone ? `<div class="contact-line"><span>${I("phone")} טלפון</span>${st.phone ? `<b>${esc(phone)}</b><button class="mini-btn" type="button" data-act="copy" data-text="${esc(phone)}" aria-label="העתקת מספר הטלפון">${I("copy")}</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-act="reveal">הצגת מספר</button>`}</div>` : ""}
      <p class="hint">התשלום והאישור הסופי נעשים ישירות מול המארחים. המחיר משוער ועשוי להשתנות.</p>
    </form>`;
  }
  function waText(l, s) {
    const parts = [`שלום, ראיתי את ${l.name} באתר ${S.settings.site_name}.`];
    if (s && s.unit_name) parts.push(`יחידה: ${s.unit_name}.`);
    if (s && s.check_in && s.check_out) parts.push(`תאריכים: ${T.fmtDate(s.check_in)} עד ${T.fmtDate(s.check_out)} (${plural.nights(T.nightsBetween(s.check_in, s.check_out))}).`);
    if (s && s.guests) parts.push(`מספר אורחים: ${s.guests}.`);
    if (s && s.name) parts.push(`שמי ${s.name}.`);
    parts.push("האם פנוי?");
    return parts.join(" ");
  }
  function viewStay(id) {
    const l = S.listings.find((x) => x.id === id);
    if (!l) return `<div class="view wrap page">${emptyState("המתחם לא נמצא", "ייתכן שהוסר מהאתר או שהקישור שגוי.", `<a class="btn btn-primary" href="#search">לכל המתחמים</a>`)}</div>`;
    const st = S.stay;
    if (st.id !== id) {
      const units = T.unitsOf(l);
      const g = Math.max(1, S.filters.guests || 2);
      const fit = units.find((u) => u.guests_max >= g && (!S.filters.ci || !T.quote(l, S.filters.ci, S.filters.co, { unitId: u.id }) || !T.quote(l, S.filters.ci, S.filters.co, { unitId: u.id }).conflicts.length)) || units[0];
      Object.assign(st, { id, unitId: fit.id, ci: S.filters.ci, co: S.filters.co, guests: Math.min(fit.guests_max, g), extras: [], coupon: "", calStart: null, sent: null, phone: false, video: false });
      if (st.ci) { const d = T.parseISO(st.ci); st.calStart = new Date(d.getFullYear(), d.getMonth(), 1); }
    }
    if (!S.viewed.has(id)) { S.viewed.add(id); T.store.track(id, "v"); }
    const reg = T.regionOf(l.region), typ = T.typeOf(l.type);
    const photos = T.photosOf(l);
    const saved = S.saved.has(l.id);
    const units = T.unitsOf(l);
    const revs = S.reviews.filter((r) => r.listing_id === l.id);
    const rt = ratingOf(l.id);
    const similar = S.listings.filter((x) => x.id !== l.id && (x.region === l.region || T.regionOf(x.region).area === reg.area)).slice(0, 3);
    const desc = (l.description || "").split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
    const lm = T.lastMinuteActive(l);
    return `<div class="view wrap page">
      <div class="stay-head">
        <div>
          <div class="crumbs"><a href="#">ראשי</a><span>/</span><a href="#region-${reg.key}">${esc(reg.name)}</a><span>/</span><span>${esc(l.name)}</span></div>
          <span class="eyebrow">${esc(typ.name)} · ${esc(l.settlement)}</span>
          <h1>${esc(l.name)}</h1>
          <div class="sub">${rt ? `<span>${ratingHTML(l.id, true)}</span>` : ""}<span>${I("pin")}${esc(l.settlement)}, ${esc(reg.name)}</span>${l.featured ? `<span>${I("star")}נבחרי העונה</span>` : ""}${T.isSponsored(l) ? `<span class="pill pill-muted">${I("megaphone")}מיקום ממומן</span>` : ""}</div>
        </div>
        <div class="stay-actions">
          <button class="btn btn-line" type="button" data-act="save" data-id="${esc(l.id)}" aria-pressed="${saved}">${I("heart")}${saved ? "נשמר" : "שמירה"}</button>
          <button class="btn btn-line" type="button" data-act="copy-link">${I("link")}העתקת קישור</button>
        </div>
      </div>
      <div class="gallery n${Math.min(5, photos.length)}">${photos.slice(0, 5).map((p, i) => `<button type="button" data-act="lb" data-i="${i}" aria-label="פתיחת תמונה ${i + 1} מתוך ${photos.length}"><img src="${esc(p.src)}" alt="${esc(imgAlt(p, l, i))}" ${i ? 'loading="lazy"' : ""}>${i === 0 && photos.length > 1 ? `<span class="chip all">${I("image")}${photos.length} תמונות</span>` : ""}</button>`).join("")}</div>
      ${photos[0] && photos[0].real ? "" : `<p class="illus-note">${I("info")}איור להמחשה. המארחים יעלו כאן תמונות אמיתיות.</p>`}
      <div class="stay-layout">
        <div>
          <div class="facts-row">
            <div class="fact">${I("users")}<div><b>עד ${Math.max(...units.map((u) => u.guests_max))}</b><span>אורחים</span></div></div>
            ${units.length > 1 ? `<div class="fact">${I("door")}<div><b>${units.length}</b><span>יחידות במתחם</span></div></div>` : `<div class="fact">${I("bed")}<div><b>${l.bedrooms}</b><span>חדרי שינה</span></div></div>`}
            <div class="fact">${I("bath")}<div><b>${l.bathrooms}</b><span>חדרי רחצה</span></div></div>
            <div class="fact">${I("moon")}<div><b>${l.min_nights}</b><span>לילות מינימום</span></div></div>
          </div>
          ${lm ? `<div class="deal-box lm">${I("bolt")}<div><b>דקה 90 · ‎-${l.lastminute_pct}%</b><div>הנחה על לילות ${T.lastMinuteNights().map(T.fmtLong).join(" ו")}, אם עדיין פנויים.</div></div></div>` : ""}
          ${l.deal_label ? `<div class="deal-box">${I("tag")}<div><b>${esc(l.deal_label)}</b><div>${esc(l.deal_text)}</div></div></div>` : ""}
          <section class="stay-section"><h2>על המקום</h2><div class="prose"><p class="lead">${esc(l.tagline)}</p>${desc}</div>
            ${l.audience.length ? `<p class="muted" style="font-size:var(--t-s)">מתאים ל${l.audience.map((a) => T.AUDIENCE.find((x) => x.key === a).name).join(", ")}</p>` : ""}</section>
          ${units.length > 1 ? `<section class="stay-section" id="units"><h2>היחידות במתחם</h2><div class="units">${units.map((u) => `<button type="button" class="unit" data-act="unit" data-id="${esc(u.id)}" aria-pressed="${u.id === S.stay.unitId}"><span><b class="n">${esc(u.name)}</b><span class="meta"><span>${I("users")} עד ${u.guests_max}</span><span>${I("bed")} ${plural.bedrooms(u.bedrooms || 1)}</span>${u.ical_url ? `<span>${I("sync")} יומן מסונכרן</span>` : ""}</span></span><span class="price"><b>${T.money(u.price_weekday)}</b>ללילה<small>סופ״ש ${T.money(u.price_weekend)}</small></span></button>`).join("")}</div></section>` : ""}
          <section class="stay-section"><h2>מה יש במתחם</h2><div class="amen-grid">${l.amenities.map((a) => { const m = T.amenityOf(a); return `<div class="amen">${I(m.icon)}<span>${esc(m.name)}</span></div>`; }).join("") || '<p class="muted">המארחים עוד לא פירטו.</p>'}</div></section>
          ${l.video_url ? `<section class="stay-section"><h2>סרטון</h2><div id="video">${videoHTML(l)}</div></section>` : ""}
          <section class="stay-section" id="avail"><h2>יומן זמינות</h2><div id="cal">${calendarHTML(l)}</div></section>
          <section class="stay-section" id="reviews"><h2>חוות דעת</h2>${revs.length ? `<div class="rev-summary"><span class="big">${rt.avg.toFixed(1)}</span><span>${T.stars(rt.avg, "lg")}<br><span class="muted" style="font-size:var(--t-s)">${plural.reviews(rt.n)} מאורחים שהזמינו דרך האתר</span></span></div>
            <div class="rev-list">${revs.map((r) => `<div class="rev">${T.stars(r.rating)}<p>${esc(r.text)}</p>${r.reply ? `<p class="reply"><b>תגובת המארחים:</b> ${esc(r.reply)}</p>` : ""}<div class="who"><b>${esc(r.name)}</b><span>${r.stay_month ? "התארחו ב" + esc(r.stay_month) : ""}</span></div><span class="verified">${I("shield")}הזמנה מאומתת</span></div>`).join("")}</div>` : `<p class="muted">עוד אין חוות דעת. רק אורחים שהזמינו דרך האתר יכולים לכתוב.</p>`}</section>
          <section class="stay-section" style="border:0"><h2>איך מגיעים</h2><p class="muted">${esc(l.settlement)}, ${esc(reg.name)}. הכתובת המדויקת נמסרת על ידי המארחים לאחר אישור ההזמנה.</p>
            <div class="mini-map" id="mini-map"></div>
            <div class="loc-links"><a class="btn btn-line" href="${esc(T.wazeLink(l.settlement, l.lat, l.lng))}" target="_blank" rel="noopener">${I("nav")}ניווט ב־Waze</a><a class="btn btn-line" href="${esc(T.mapsLink(l.settlement + ", ישראל", l.lat, l.lng))}" target="_blank" rel="noopener">${I("pin")}Google Maps</a></div></section>
        </div>
        <aside aria-label="בקשת הזמנה" id="book-host">${bookHTML(l)}</aside>
      </div>
      ${similar.length ? `<section class="section" aria-labelledby="h-sim">${head("עוד באזור", `<span id="h-sim">מתחמים נוספים ב${esc(T.AREAS[reg.area])}</span>`, "", `<a class="link-more" href="#region-${reg.key}">כל ${esc(reg.name)} ${I("fwd")}</a>`)}${grid(similar)}</section>` : ""}
      <div class="mbar"><span class="price"><b>${T.money(T.fromPrice(l))}</b>ללילה</span><button class="btn btn-primary" type="button" data-act="to-book">בדיקת זמינות</button></div>
    </div>`;
  }
  function videoHTML(l) {
    const embed = T.videoEmbed(l.video_url);
    const poster = `<img src="${esc((T.photosOf(l)[1] || T.photosOf(l)[0] || {}).src || "")}" alt=""><span><i>${I("play")}</i></span>`;
    if (S.stay.video && embed) return `<iframe class="video-frame" src="${esc(embed)}" title="סרטון: ${esc(l.name)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    if (!T.isLive || !embed) return `<a class="video-poster" href="${esc(l.video_url)}" target="_blank" rel="noopener" aria-label="צפייה בסרטון של ${esc(l.name)} (נפתח בחלון חדש)">${poster}</a>`;
    return `<button class="video-poster" type="button" data-act="video" aria-label="הפעלת סרטון של ${esc(l.name)}">${poster}</button>`;
  }
  function refreshBooking() {
    const l = S.listings.find((x) => x.id === S.stay.id);
    if (!l) return;
    const host = $("#book-host");
    const focusName = document.activeElement && document.activeElement.name;
    const keep = {};
    $$("#book input, #book textarea").forEach((el) => { if (["name", "phone", "email", "message"].includes(el.name)) keep[el.name] = el.value; if (el.name === "consent") keep.consent = el.checked; });
    host.innerHTML = bookHTML(l);
    Object.entries(keep).forEach(([k, v]) => { const el = $(`#book [name="${k}"]`); if (el) { if (k === "consent") el.checked = v; else el.value = v; } });
    if (focusName) { const el = $(`#book [name="${focusName}"]`); if (el) { el.focus(); if (el.setSelectionRange && el.type === "text") el.setSelectionRange(el.value.length, el.value.length); } }
    $("#cal").innerHTML = calendarHTML(l);
    $$(".unit").forEach((b) => b.setAttribute("aria-pressed", b.dataset.id === S.stay.unitId));
  }
  function lightbox(i) {
    const l = S.listings.find((x) => x.id === S.stay.id);
    const old = $("#lb");
    if (old) old.remove();
    if (i < 0 || !l) return;
    const photos = T.photosOf(l);
    const n = photos.length;
    const k = ((i % n) + n) % n;
    S.stay.lb = k;
    const el = document.createElement("div");
    el.className = "lightbox";
    el.id = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "גלריית תמונות");
    el.innerHTML = `<div class="lb-top"><span>${esc(l.name)} · ${k + 1}/${n}</span><button class="icon-btn" type="button" data-act="lb-close" aria-label="סגירה">${I("x")}</button></div>
      <div class="lb-stage"><img src="${esc(photos[k].src)}" alt="${esc(imgAlt(photos[k], l, k)) || "איור להמחשה"}"></div>
      <div class="lb-nav"><button class="icon-btn" type="button" data-act="lb-go" data-d="-1" aria-label="הקודמת">${I("chev-r")}</button><button class="icon-btn" type="button" data-act="lb-go" data-d="1" aria-label="הבאה">${I("chev-l")}</button></div>`;
    document.body.appendChild(el);
    $('[data-act="lb-close"]', el).focus();
  }

  /* ---------------------------------------------------------------- join */
  function viewJoin() {
    const p = S.settings.plan_prices || {};
    return `<div class="view wrap page">
      <div class="join-hero">
        <div class="join-copy"><span class="eyebrow">למארחים</span><h1>פרסמו את המתחם שלכם ב${esc(S.settings.site_name)}</h1>
          <p>כרטיס מתחם עם גלריה, יחידות, יומן זמינות ומחירים לאמצע שבוע, סופ״ש וחגים. אורחים שולחים בקשה עם תאריכים ומספר אורחים, והיא מגיעה אליכם ישירות לוואטסאפ ולמייל. אנחנו לא לוקחים עמלה על הזמנות.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary btn-lg" href="#join-form">השארת פרטים</a><a class="btn btn-line btn-lg" href="owner.html">כבר מפרסמים? כניסה</a></div></div>
        <div class="pic"><img src="assets/img/photos/join.jpg" alt=""></div>
      </div>
      <section class="section" aria-labelledby="h-plans">${head("חבילות", `<span id="h-plans">חבילות פרסום</span>`, "מחיר חודשי לכל מתחם, לפני מע״מ. אפשר להתחיל בחודש ניסיון, או לשלם רק על פניות.")}
        <div class="plans">${T.PLANS.map((pl) => `<div class="plan ${pl.key === "pro" ? "pop" : ""}"><h3>${pl.name}</h3><div class="p">${T.money(p[pl.key])}<small> לחודש</small></div><ul>${pl.features.map((f) => `<li>${I("check")}<span>${esc(f)}</span></li>`).join("")}</ul></div>`).join("")}</div>
        <p class="hint" style="margin-top:14px">במסלול תשלום לפי פנייה: ${T.money(S.settings.lead_price_default)} לכל בקשת הזמנה שמגיעה מהאתר.</p></section>
      <section class="section" id="join-form" aria-labelledby="h-jf"><div class="form-card" id="join-card">${joinForm()}</div></section>
    </div>`;
  }
  function joinForm() {
    return `<div><span class="eyebrow">הצטרפות</span><h2 id="h-jf" style="font-size:2.2rem;margin-top:8px">השאירו פרטים ונחזור אליכם</h2><p class="muted" style="margin-top:6px;font-weight:300">נעבור יחד על המתחם, נבנה את הכרטיס ונפתח לכם גישה לממשק המארחים.</p></div>
      <form class="form-grid" data-form="join" novalidate>
        <label class="field"><span>שם מלא</span><input class="input" name="name" autocomplete="name" required></label>
        <label class="field"><span>טלפון</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" autocomplete="tel" required></label>
        <label class="field"><span>אימייל</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" autocomplete="email"></label>
        <label class="field"><span>שם המתחם</span><input class="input" name="business" required></label>
        <label class="field"><span>יישוב</span><input class="input" name="settlement" required></label>
        <label class="field"><span>אזור</span><select class="select" name="region">${T.REGIONS.map((r) => `<option value="${r.key}">${esc(r.name)}</option>`).join("")}</select></label>
        <label class="field"><span>סוג אירוח</span><select class="select" name="type">${T.TYPES.map((t) => `<option value="${t.key}">${esc(t.name)}</option>`).join("")}</select></label>
        <label class="field"><span>מספר יחידות</span><input class="input" name="units" type="number" min="1" value="1" inputmode="numeric"></label>
        <label class="field span2"><span>ספרו לנו בקצרה על המקום</span><textarea class="textarea" name="message"></textarea></label>
        <label class="check span2"><input type="checkbox" name="consent" required><span>אני מאשר/ת שתחזרו אליי בטלפון או בוואטסאפ בנוגע לפרסום</span></label>
        <p class="err span2" id="join-err" role="alert"></p>
        <div class="span2"><button class="btn btn-primary btn-lg" type="submit">שליחת פרטים</button></div>
      </form>`;
  }

  /* ---------------------------------------------------------------- magazine & reviews */
  function viewMagazine() {
    return `<div class="view wrap page"><div class="page-head"><span class="eyebrow">מגזין</span><h1>טיפים, מסלולים ורעיונות לחופשה</h1></div>
      ${S.articles.length ? `<div class="mag-grid">${S.articles.map(magCard).join("")}</div>` : emptyState("עוד אין כתבות", "כתבות חדשות יופיעו כאן.")}</div>`;
  }
  const bodyHTML = (body) => String(body || "").split(/\n{2,}/).map((blk) => {
    const lines = blk.split("\n");
    return lines.map((ln) => (ln.startsWith("## ") ? `<h2>${esc(ln.slice(3))}</h2>` : ln.trim() ? `<p>${esc(ln)}</p>` : "")).join("");
  }).join("");
  function viewArticle(id) {
    const a = S.articles.find((x) => x.id === id);
    if (!a) return `<div class="view wrap page">${emptyState("הכתבה לא נמצאה", "", `<a class="btn btn-primary" href="#magazine">למגזין</a>`)}</div>`;
    const more = S.listings.filter((l) => l.featured).slice(0, 3);
    return `<div class="view wrap page"><article class="article"><div class="crumbs"><a href="#">ראשי</a><span>/</span><a href="#magazine">מגזין</a></div>
      <span class="eyebrow">מגזין</span><h1>${esc(a.title)}</h1><p class="lead">${esc(a.excerpt)}</p>
      ${a.cover ? `<div class="cover"><img src="${esc(T.img(a.cover, 1400))}" alt=""></div>` : ""}${bodyHTML(a.body)}</article>
      ${more.length ? `<section class="section">${head("להשראה", "מתחמים שכדאי להכיר", "")}${grid(more)}</section>` : ""}</div>`;
  }
  async function viewReview(token) {
    const inv = await T.store.reviewInvite(token).catch(() => null);
    if (!inv) return `<div class="view wrap page"><div class="textpage">${emptyState("הקישור לא בתוקף", "ייתכן שכבר כתבתם חוות דעת על השהייה הזאת. תודה!", `<a class="btn btn-primary" href="#">לדף הבית</a>`)}</div></div>`;
    S.reviewToken = token;
    S.reviewRating = 5;
    return `<div class="view wrap page"><div class="form-card" style="max-width:640px;margin:20px auto" id="review-card">
      <div><span class="eyebrow">חוות דעת מאומתת</span><h1 style="font-size:2.4rem;margin-top:8px">איך היה ב${esc(inv.listing_name)}?</h1><p class="muted" style="font-weight:300;margin-top:6px">הקישור הזה נשלח רק לאורחים שהזמינו דרך האתר. חוות הדעת תפורסם אחרי בדיקה קצרה.</p></div>
      <form data-form="review" novalidate style="display:grid;gap:16px">
        <div class="field"><span>הדירוג שלכם</span><div class="star-input" role="radiogroup" aria-label="דירוג מ-1 עד 5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${n === 5}" aria-label="${n} כוכבים" data-act="rate" data-v="${n}" class="on"><svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg></button>`).join("")}</div></div>
        <label class="field"><span>מה הכי אהבתם? מה כדאי לדעת לפני שמגיעים?</span><textarea class="textarea" name="text" maxlength="1500" required></textarea></label>
        <label class="field"><span>שם להצגה</span><input class="input" name="name" value="${esc(String(inv.name || "").replace(/\s*\(דוגמה\)/, ""))}" maxlength="60"></label>
        <p class="err" id="rev-err" role="alert"></p>
        <button class="btn btn-primary btn-lg" type="submit">שליחת חוות הדעת</button>
      </form></div></div>`;
  }

  /* ---------------------------------------------------------------- text pages */
  function viewText(kind) {
    const s = S.settings;
    const contact = [s.phone && `טלפון: <span dir="ltr">${esc(s.phone)}</span>`, s.email && `אימייל: ${esc(s.email)}`].filter(Boolean).join(" · ") || "פרטי הקשר יעודכנו בקרוב.";
    const pages = {
      about: `<span class="eyebrow">אודות</span><h1>${esc(s.site_name)} – ${esc(s.site_tagline)}</h1>
        <p>${esc(s.site_name)} הוא אתר צימרים ווילות ישראלי. אנחנו מרכזים מתחמי אירוח מהגולן ועד הערבה, ומחברים בין אורחים למארחים ישירות.</p>
        <p>כל מתחם מופיע עם מחיר לאמצע שבוע, לסופ״ש ולחגים, יומן זמינות שמסונכרן עם אתרי הזמנות אחרים, ופירוט של מה שיש בו. בקשת הזמנה מגיעה ישירות למארחים, וההזמנה והתשלום נסגרים מולם. אורחים לא משלמים לנו עמלה.</p>
        <p>חוות הדעת באתר נכתבות רק על ידי אורחים שהזמינו דרכנו, ועוברות בדיקה לפני פרסום.</p>
        <h2>יצירת קשר</h2><p>${contact}</p>`,
      accessibility: `<span class="eyebrow">נגישות</span><h1>הצהרת נגישות</h1>
        <p>אנחנו רואים חשיבות במתן שירות שוויוני לכל הגולשים, כולל אנשים עם מוגבלות. האתר תוכנן לפי הנחיות WCAG 2.1 ברמה AA ותקן ישראלי 5568.</p>
        <h2>מה עשינו באתר</h2><ul>
          <li>ניווט מלא במקלדת, סימון בולט של הרכיב שבפוקוס וקישור לדילוג לתוכן.</li>
          <li>תפריט נגישות (הכפתור הכחול בפינת המסך): הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים ועצירת אנימציות.</li>
          <li>תיאור טקסטואלי לתמונות, כותרות מסודרות ותוויות לכל שדות הטפסים.</li>
          <li>התאמה לקוראי מסך ולתצוגה בטלפון.</li></ul>
        <h2>נתקלתם בבעיה?</h2><p>אם משהו באתר לא נגיש לכם, נשמח לשמוע ולתקן. ${s.a11y_coordinator ? `רכז/ת הנגישות: ${esc(s.a11y_coordinator)}. ` : ""}${contact}</p>
        <p class="muted">עודכן לאחרונה: ${T.fmtMonth(new Date())}</p>`,
      terms: `<span class="eyebrow">מידע משפטי</span><h1>תנאי שימוש ופרטיות</h1>
        <h2>השירות</h2><p>${esc(s.site_name)} מציג מתחמי אירוח שמפרסמים בעליהם. המידע על כל מתחם (תיאור, מחירים, זמינות ותמונות) נמסר על ידי המארחים. ההזמנה, התשלום ותנאי הביטול נקבעים ישירות בין האורחים למארחים.</p>
        <h2>מחירים וזמינות</h2><p>המחירים באתר מתעדכנים על ידי המארחים ועשויים להשתנות, והמחיר המוצג במחשבון הוא הערכה. המחיר הסופי והזמינות מאושרים רק מול המארחים. קופונים כפופים לתנאים שמופיעים לצידם.</p>
        <h2>פרטיות</h2><p>כששולחים בקשת הזמנה, חוות דעת או טופס הצטרפות, אנחנו שומרים את השם, הטלפון, האימייל (אם נמסר) ופרטי הבקשה, ומעבירים אותם למארחי המתחם שבחרתם כדי שיחזרו אליכם. אנחנו סופרים צפיות ולחיצות על כל מתחם באופן אנונימי כדי להציג למארחים דוח. איננו מוכרים מידע לצד שלישי. רשימת המתחמים השמורים נשמרת רק בדפדפן שלכם.</p>
        <p>לבקשת עיון או מחיקה של פרטים: ${contact}</p>`
    };
    return `<div class="view wrap page"><article class="textpage">${pages[kind]}</article></div>`;
  }
  function viewSaved() {
    const list = S.listings.filter((l) => S.saved.has(l.id));
    return `<div class="view wrap page"><div class="page-head"><span class="eyebrow">שמורים</span><h1>המתחמים ששמרתם</h1><p>הרשימה נשמרת בדפדפן הזה בלבד.</p></div>
      ${list.length ? grid(list) : emptyState("עוד לא שמרתם מתחמים", "לחצו על הלב בכרטיס של מתחם כדי לשמור אותו כאן.", `<a class="btn btn-primary" href="#search">לחיפוש מתחמים</a>`)}</div>`;
  }

  /* ---------------------------------------------------------------- a11y widget */
  const A11Y = Object.assign({ scale: 1, contrast: false, links: false, still: false }, T.storage.get("tamara.a11y", {}));
  function applyA11y() {
    const r = document.documentElement;
    r.style.setProperty("--fs-scale", A11Y.scale);
    r.classList.toggle("a11y-contrast", A11Y.contrast);
    r.classList.toggle("a11y-links", A11Y.links);
    r.classList.toggle("a11y-still", A11Y.still);
    T.storage.set("tamara.a11y", A11Y);
  }
  function a11yPanel() {
    const sw = (k, label) => `<div class="row"><span>${label}</span><button class="switch" type="button" role="switch" aria-checked="${A11Y[k]}" data-act="a11y" data-k="${k}" aria-label="${label}"></button></div>`;
    return `<h3>התאמות נגישות</h3>
      <div class="row"><span>גודל טקסט</span><span class="seg">${[[1, "רגיל"], [1.15, "גדול"], [1.3, "גדול מאוד"]].map(([v, t]) => `<button type="button" data-act="a11y-scale" data-v="${v}" aria-pressed="${A11Y.scale == v}">${t}</button>`).join("")}</span></div>
      ${sw("contrast", "ניגודיות גבוהה")}${sw("links", "הדגשת קישורים")}${sw("still", "עצירת אנימציות")}
      <a href="#accessibility" class="link-more">הצהרת נגישות</a>`;
  }

  /* ---------------------------------------------------------------- router */
  async function render() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const main = $("#main");
    document.body.classList.remove("has-mbar");
    const old = $("#lb"); if (old) old.remove();
    if (S.map) { S.map.remove(); S.map = null; }
    if (S.miniMap) { S.miniMap.remove(); S.miniMap = null; }
    if (!S.loaded) { main.innerHTML = `<div class="wrap" style="padding-block:120px;text-align:center;color:var(--muted)">טוען…</div>`; return; }
    if (S.error) { main.innerHTML = `<div class="wrap page">${emptyState("לא הצלחנו לטעון את האתר", esc(S.error), `<button class="btn btn-primary" type="button" onclick="location.reload()">ניסיון נוסף</button>`)}</div>`; return; }
    let html, title = S.settings.site_name + " – " + S.settings.site_tagline;
    const preset = (patch) => { S.filters = Object.assign(defaultFilters(), { ci: S.filters.ci, co: S.filters.co, guests: S.filters.guests, view: S.filters.view }, patch); return viewSearch(); };
    if (!hash || hash === "home") html = viewHome();
    else if (hash === "search") html = viewSearch();
    else if (hash === "deals") html = preset({ deals: true });
    else if (hash === "lastminute") html = preset({ lastminute: true });
    else if (hash.startsWith("region-")) {
      /* region-golan או region-golan/jacuzzi (דפי נחיתה לגוגל) */
      const [place, extra] = hash.slice(7).split("/");
      const patch = { place };
      if (extra && T.AMENITIES.some((a) => a.key === extra)) patch.amenities = [extra];
      else if (extra && T.AUDIENCE.some((a) => a.key === extra)) patch.audience = [extra];
      html = preset(patch);
      const r = T.REGIONS.find((x) => x.key === place), f = T.SEO_FEATURES.find((x) => x.key === extra);
      if (r) title = `צימרים ${f ? f.phrase + " " : ""}${T.inPlace(r.name)} | ${S.settings.site_name}`;
    }
    else if (hash.startsWith("area-")) html = preset({ place: "area:" + hash.slice(5) });
    else if (hash.startsWith("type-")) html = preset({ type: hash.slice(5) });
    else if (hash.startsWith("stay-")) {
      html = viewStay(hash.slice(5));
      document.body.classList.add("has-mbar");
      const l = S.listings.find((x) => x.id === hash.slice(5));
      if (l) title = `${l.name} – ${T.typeOf(l.type).name} ב${l.settlement} | ${S.settings.site_name}`;
    } else if (hash === "join") html = viewJoin();
    else if (hash === "saved") html = viewSaved();
    else if (hash === "magazine") html = viewMagazine();
    else if (hash.startsWith("article-")) { html = viewArticle(hash.slice(8)); const a = S.articles.find((x) => x.id === hash.slice(8)); if (a) title = a.title + " | " + S.settings.site_name; }
    else if (hash.startsWith("review-")) html = await viewReview(hash.slice(7));
    else if (["about", "accessibility", "terms"].includes(hash)) html = viewText(hash);
    else if (hash === "main") return;
    else html = viewHome();
    $("#chrome").innerHTML = header();
    main.innerHTML = html;
    document.title = title;
    if ($("#results")) renderResults();
    const mm = $("#mini-map");
    if (mm) { const l = S.listings.find((x) => x.id === S.stay.id); S.miniMap = mountMap(mm, [l], { mini: true }); }
    $("#footer").innerHTML = footer();
  }

  /* ---------------------------------------------------------------- events */
  document.addEventListener("click", async (e) => {
    const tr = e.target.closest("[data-track]");
    if (tr && S.stay.id && location.hash.startsWith("#stay-")) T.store.track(S.stay.id, tr.dataset.track);
    const el = e.target.closest("[data-act]");
    if (!el) {
      const pnl = $("#a11y-panel");
      if (pnl && !pnl.hidden && !e.target.closest("#a11y-panel, #a11y-btn")) { pnl.hidden = true; $("#a11y-btn").setAttribute("aria-expanded", "false"); }
      return;
    }
    const act = el.dataset.act;
    if (act === "save") {
      e.preventDefault();
      const id = el.dataset.id;
      S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id);
      saveSaved();
      const on = S.saved.has(id);
      $$(`[data-act="save"][data-id="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute("aria-pressed", on); if (b.classList.contains("btn")) b.innerHTML = I("heart") + (on ? "נשמר" : "שמירה"); });
      const sc = $(".saved-count");
      if (sc) { S.saved.size ? sc.setAttribute("data-n", S.saved.size) : sc.removeAttribute("data-n"); sc.setAttribute("aria-label", `המתחמים ששמרתי (${S.saved.size})`); }
      T.toast(on ? "נשמר ברשימה שלך" : "הוסר מהרשימה");
    } else if (act === "menu") { const nav = $("#mobile-nav"); nav.classList.toggle("open"); el.setAttribute("aria-expanded", nav.classList.contains("open")); }
    else if (act === "step") {
      const input = el.parentElement.querySelector("input");
      input.value = Math.max(Number(input.min) || 0, Math.min(Number(input.max) || 40, (Number(input.value) || 0) + Number(el.dataset.d)));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (act === "quick") {
      const q = T.QUICK_FILTERS[Number(el.dataset.i)];
      S.filters = Object.assign(defaultFilters(), { amenities: q.amenity ? [q.amenity] : [], audience: q.audience ? [q.audience] : [] });
      location.hash = "search";
    } else if (act === "show") { S.showIdx += Number(el.dataset.d); $("#showcase").innerHTML = showcase(S.listings.filter((l) => l.featured)); }
    else if (act === "view") { S.filters.view = el.dataset.v; $$('[data-act="view"]').forEach((b) => b.setAttribute("aria-pressed", b === el)); renderResults(); }
    else if (act === "more-amen") { readFilters(); S.moreAmen = !S.moreAmen; const sc = $("#filters").scrollTop; $("#main").innerHTML = viewSearch(); renderResults(); $("#filters").scrollTop = sc; }
    else if (act === "unfilter") {
      const f = S.filters, k = el.dataset.k, v = el.dataset.v;
      if (k === "audience" || k === "amenities") f[k] = f[k].filter((x) => x !== v);
      else if (k === "dates") { f.ci = ""; f.co = ""; }
      else f[k] = defaultFilters()[k];
      $("#main").innerHTML = viewSearch(); renderResults();
    } else if (act === "clear-all") { S.filters = Object.assign(defaultFilters(), { view: S.filters.view }); $("#main").innerHTML = viewSearch(); renderResults(); }
    else if (act === "filters-open") { $("#filters").classList.add("open"); document.body.style.overflow = "hidden"; }
    else if (act === "filters-close") { $("#filters").classList.remove("open"); document.body.style.overflow = ""; }
    else if (act === "day") {
      const st = S.stay, d = el.dataset.d;
      if (!st.ci || st.co || d <= st.ci) { st.ci = d; st.co = ""; } else st.co = d;
      refreshBooking();
    } else if (act === "unit") { S.stay.unitId = el.dataset.id; const u = T.unitOf(S.listings.find((x) => x.id === S.stay.id), el.dataset.id); S.stay.guests = Math.min(S.stay.guests, u.guests_max); refreshBooking(); $("#book").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    else if (act === "cal") {
      const st = S.stay;
      const base = st.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
      const next = new Date(base.getFullYear(), base.getMonth() + Number(el.dataset.d), 1);
      if (next >= new Date(T.today().getFullYear(), T.today().getMonth(), 1)) st.calStart = next;
      $("#cal").innerHTML = calendarHTML(S.listings.find((x) => x.id === st.id));
    } else if (act === "lb") lightbox(Number(el.dataset.i));
    else if (act === "lb-go") lightbox(S.stay.lb + Number(el.dataset.d));
    else if (act === "lb-close") lightbox(-1);
    else if (act === "copy") T.copy(el.dataset.text);
    else if (act === "copy-link") T.copy(location.href.split("#")[0] + "#stay-" + S.stay.id);
    else if (act === "reveal") { S.stay.phone = true; T.store.track(S.stay.id, "p"); refreshBooking(); }
    else if (act === "video") {
      const l = S.listings.find((x) => x.id === S.stay.id);
      const embed = T.videoEmbed(l.video_url);
      if (T.isLive && embed) { S.stay.video = true; $("#video").innerHTML = videoHTML(l); }
      else window.open(l.video_url, "_blank", "noopener");
    } else if (act === "to-book") { const b = $("#book"); b.scrollIntoView({ behavior: "smooth", block: "start" }); const i = $("#book [name=ci]"); if (i) setTimeout(() => i.focus({ preventScroll: true }), 400); }
    else if (act === "book-again") { S.stay.sent = null; refreshBooking(); }
    else if (act === "rate") {
      S.reviewRating = Number(el.dataset.v);
      $$('[data-act="rate"]').forEach((b) => { const on = Number(b.dataset.v) <= S.reviewRating; b.classList.toggle("on", on); b.setAttribute("aria-checked", Number(b.dataset.v) === S.reviewRating); });
    } else if (act === "a11y-open") {
      const p = $("#a11y-panel");
      p.hidden = !p.hidden;
      el.setAttribute("aria-expanded", !p.hidden);
      if (!p.hidden) { p.innerHTML = a11yPanel(); $("button", p).focus(); }
    } else if (act === "a11y") { A11Y[el.dataset.k] = !A11Y[el.dataset.k]; applyA11y(); el.setAttribute("aria-checked", A11Y[el.dataset.k]); }
    else if (act === "a11y-scale") { A11Y.scale = Number(el.dataset.v); applyA11y(); $$('[data-act="a11y-scale"]').forEach((b) => b.setAttribute("aria-pressed", b === el)); }
  });
  document.addEventListener("keydown", (e) => {
    if ($("#lb")) { if (e.key === "Escape") lightbox(-1); if (e.key === "ArrowLeft") lightbox(S.stay.lb + 1); if (e.key === "ArrowRight") lightbox(S.stay.lb - 1); }
    else if (e.key === "Escape") {
      const f = $("#filters.open"); if (f) { f.classList.remove("open"); document.body.style.overflow = ""; }
      const p = $("#a11y-panel"); if (p && !p.hidden) { p.hidden = true; $("#a11y-btn").focus(); }
    }
  });
  const onFilterInput = T.debounce(readFilters, 120);
  const onBookInput = (e) => {
    const t = e.target;
    if (!t.closest("#book")) return;
    if (!["ci", "co", "guests", "unit", "extras", "coupon"].includes(t.name)) return;
    const st = S.stay, f = t.form;
    st.ci = f.ci.value; st.co = f.co.value; st.guests = Number(f.guests.value);
    if (f.unit) st.unitId = f.unit.value;
    st.extras = $$('#book input[name="extras"]:checked').map((x) => x.value);
    if (f.coupon) st.coupon = f.coupon.value.trim();
    if (st.co && st.ci && st.co <= st.ci) st.co = "";
    if (t.name === "ci" && st.ci) { const d = T.parseISO(st.ci); st.calStart = new Date(d.getFullYear(), d.getMonth(), 1); }
    refreshBooking();
  };
  const debouncedBook = T.debounce(onBookInput, 350);
  document.addEventListener("input", (e) => {
    if (e.target.closest("#filters") || (e.target.form && e.target.form.id === "filters")) onFilterInput();
    if (e.target.closest("#book")) (e.target.name === "coupon" ? debouncedBook : onBookInput)(e);
  });
  document.addEventListener("change", (e) => { if (e.target.form && e.target.form.id === "filters") onFilterInput(); });
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    const kind = form.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const fd = new FormData(form);
    const phoneOk = (p) => /^0?5\d{8}$|^0\d{8}$|^972\d{8,9}$/.test(String(p).replace(/[\s-]/g, ""));
    const bad = (errId, msg, name) => { $(errId).textContent = msg; const f = name && form.elements[name]; if (f) { f.setAttribute("aria-invalid", "true"); f.focus(); } };
    $$("[aria-invalid]", form).forEach((x) => x.removeAttribute("aria-invalid"));
    if (kind === "hero-search") {
      Object.assign(S.filters, defaultFilters(), { place: fd.get("place") || "", ci: fd.get("ci") || "", co: fd.get("co") || "", guests: Number(fd.get("guests")) || 0 });
      if (S.filters.co && S.filters.co <= S.filters.ci) S.filters.co = "";
      location.hash = "search";
    } else if (kind === "filters") readFilters();
    else if (kind === "book") {
      const l = S.listings.find((x) => x.id === S.stay.id);
      const st = S.stay;
      const unit = T.unitOf(l, st.unitId);
      const q = st.ci && st.co ? T.quote(l, st.ci, st.co, { unitId: unit.id, guests: st.guests, extras: st.extras, coupon: st.coupon }) : null;
      if (!q) return bad("#book-err", "בחרו תאריך הגעה ועזיבה", st.ci ? "co" : "ci");
      if (q.conflicts.length) return bad("#book-err", "חלק מהלילות תפוסים. בחרו תאריכים או יחידה אחרת.", "ci");
      if (!fd.get("name").trim()) return bad("#book-err", "כתבו שם מלא", "name");
      if (!phoneOk(fd.get("phone"))) return bad("#book-err", "מספר הטלפון לא נראה תקין. לדוגמה: 050-1234567", "phone");
      if (!fd.get("consent")) return bad("#book-err", "צריך לאשר העברת פרטים למארחים", "consent");
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.textContent = "שולח…";
      const units = T.unitsOf(l);
      const lead = { listing_id: l.id, listing_name: l.name, unit_id: units.length > 1 ? unit.id : "", unit_name: units.length > 1 ? unit.name : "", name: fd.get("name").trim(), phone: fd.get("phone").trim(), email: (fd.get("email") || "").trim(), check_in: st.ci, check_out: st.co, guests: Number(st.guests), extras: st.extras, coupon: q.coupon ? q.coupon.code : "", est_total: q.total, message: (fd.get("message") || "").trim(), source: "form" };
      try { await T.store.addLead(lead); st.sent = lead; refreshBooking(); T.toast("הבקשה נשלחה"); }
      catch (ex) { btn.disabled = false; btn.textContent = "שליחת בקשת הזמנה"; bad("#book-err", "השליחה לא הצליחה (" + ex.message + "). אפשר לנסות שוב או לפנות בוואטסאפ."); }
    } else if (kind === "join") {
      if (!fd.get("name").trim()) return bad("#join-err", "כתבו שם מלא", "name");
      if (!phoneOk(fd.get("phone"))) return bad("#join-err", "מספר הטלפון לא נראה תקין", "phone");
      if (!fd.get("business").trim()) return bad("#join-err", "מה שם המתחם?", "business");
      if (!fd.get("settlement").trim()) return bad("#join-err", "באיזה יישוב המתחם?", "settlement");
      if (!fd.get("consent")) return bad("#join-err", "צריך לאשר שנחזור אליכם", "consent");
      const app = { name: fd.get("name").trim(), phone: fd.get("phone").trim(), email: (fd.get("email") || "").trim(), business: fd.get("business").trim(), settlement: fd.get("settlement").trim(), region: fd.get("region"), type: fd.get("type"), units: Number(fd.get("units")) || 1, message: (fd.get("message") || "").trim() };
      try { await T.store.addApplication(app); $("#join-card").innerHTML = `<div class="book-ok"><span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">תודה, ${esc(app.name)}!</h3><p class="muted">קיבלנו את הפרטים של ${esc(app.business)}. נחזור אליכם בימים הקרובים לטלפון ${esc(app.phone)}.</p><a class="btn btn-line" href="#">לדף הבית</a></div>`; }
      catch (ex) { bad("#join-err", "השליחה לא הצליחה (" + ex.message + "). נסו שוב בעוד רגע."); }
    } else if (kind === "review") {
      const text = (fd.get("text") || "").trim();
      if (text.length < 10) return bad("#rev-err", "כתבו לפחות משפט אחד", "text");
      try {
        await T.store.submitReview(S.reviewToken, { rating: S.reviewRating, text, name: (fd.get("name") || "").trim() || "אורח" });
        $("#review-card").innerHTML = `<div class="book-ok"><span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">תודה על חוות הדעת!</h3><p class="muted">היא תפורסם אחרי בדיקה קצרה.</p><a class="btn btn-line" href="#">לדף הבית</a></div>`;
      } catch (ex) { bad("#rev-err", ex.message); }
    }
  });
  window.addEventListener("hashchange", () => { if (location.hash.slice(1) === "main") return; render().then(() => { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }); });
  window.addEventListener("scroll", () => { const tb = $("#topbar"); if (tb) tb.classList.toggle("scrolled", window.scrollY > 10); }, { passive: true });

  /* ---------------------------------------------------------------- boot */
  async function load() {
    try {
      const [listings, settings, reviews, articles] = await Promise.all([T.store.listListings(), T.store.getSettings(), T.store.listReviews(), T.store.listArticles()]);
      Object.assign(S, { listings, settings, reviews, articles, error: "" });
      T.SETTINGS = settings;
      computeRatings();
    } catch (e) { S.error = e.message || String(e); }
    S.loaded = true;
  }
  async function boot() {
    try { const f = JSON.parse(sessionStorage.getItem("tamara.filters") || "null"); if (f) S.filters = Object.assign(defaultFilters(), f); } catch (e) {}
    applyA11y();
    if (!T.isLive) $("#demo-bar").innerHTML = `<div class="demo-bar"><span><b>מצב הדגמה</b> · המתחמים, הפניות וחוות הדעת באתר הם לדוגמה, ושינויים נשמרים רק בדפדפן הזה.</span><a href="admin.html">לפאנל הניהול</a><a href="owner.html">לממשק המארחים</a></div>`;
    const btn = document.createElement("button");
    Object.assign(btn, { className: "a11y-btn", id: "a11y-btn", type: "button" });
    btn.dataset.act = "a11y-open";
    btn.setAttribute("aria-label", "תפריט נגישות");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "a11y-panel");
    btn.innerHTML = I("a11y");
    const panel = document.createElement("div");
    Object.assign(panel, { className: "a11y-panel", id: "a11y-panel", hidden: true });
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "התאמות נגישות");
    document.body.append(btn, panel);
    await render();
    await load();
    await render();
    T.store.onChange(async () => {
      await load();
      const h = location.hash.slice(1);
      if (!h || h === "home" || h === "saved" || h === "magazine") render();
      else if ($("#results")) renderResults();
    });
  }
  boot();
})();
