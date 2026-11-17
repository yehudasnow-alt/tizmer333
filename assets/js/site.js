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
  const PAGE_SIZE = 24;
  const defaultFilters = () => ({
    q: "", place: "", town: "", type: "", guests: 0, children: 0, ci: "", co: "", priceMax: 0, amenities: [], audience: [], benefit: "", units: 0,
    deals: false, lastminute: false, tonight: false, weekend: false, couplesOnly: false, exclusive: false, bestPrice: false, isNew: false, quiet: false, party: false, sort: "rec", view: "list"
  });
  const store = (k, d) => T.storage.get(k, d);
  const S = {
    listings: [], settings: T.clone(T.DEFAULT_SETTINGS), reviews: [], articles: [], places: [], top: [], ratings: {},
    loaded: false, error: "",
    saved: new Set(store("tamara.saved", [])),
    viewedList: store("tamara.viewed", []),
    searches: store("tamara.searches", []),
    myLeads: store("tamara.myleads", []),
    guest: store("tamara.guest", null),
    filters: defaultFilters(), page: 1, lastResults: [],
    showIdx: 0, cardIdx: {}, geo: null,
    stay: { id: "", rooms: [], ci: "", co: "", extras: [], coupon: "", pkg: "", benefit: "", flexible: false, calUnit: "", calStart: null, sent: null, lb: -1, lbCat: "all", phone: false, video: false, revSort: "new", revShow: 6, placeKind: "" },
    viewed: new Set(), map: null, miniMap: null, bigMap: null, placesFilter: { region: "", kind: "" }, me: { leads: null, user: null }
  };

  /* ---------------------------------------------------------------- helpers */
  const plural = {
    bedrooms: (n) => (n === 1 ? "חדר שינה" : `${n} חדרי שינה`),
    nights: (n) => T.nightWord(n),
    guests: (n) => (n === 1 ? "אורח אחד" : `${n} אורחים`),
    adults: (n) => (n === 1 ? "מבוגר אחד" : `${n} מבוגרים`),
    kids: (n) => (n === 1 ? "ילד אחד" : `${n} ילדים`),
    stays: (n) => (n === 1 ? "מתחם אחד" : `${n} מתחמים`),
    units: (n) => (n === 1 ? "יחידה אחת" : `${n} יחידות`),
    reviews: (n) => (n === 1 ? "חוות דעת אחת" : `${n} חוות דעת`)
  };
  const DOW = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const fmtDay = (iso) => { const d = T.parseISO(iso); return `${DOW[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}`; };
  const placeLabel = (v) => (!v ? "" : v.startsWith("area:") ? "כל ה" + T.AREAS[v.slice(5)] : T.regionOf(v).name);
  /* רק מה שיש במלאי: סוג, אזור, מתקן או קהל מופיעים באפשרויות רק אם יש לפחות מתחם פעיל אחד שמתאים.
     כשמארח יוסיף למשל מערה, האפשרות תופיע לבד. מה שכבר נבחר נשאר מוצג כדי שאפשר יהיה לבטל אותו. */
  const has = {
    type: (k) => S.listings.some((l) => l.type === k),
    region: (k) => S.listings.some((l) => l.region === k),
    area: (a) => S.listings.some((l) => T.regionOf(l.region).area === a),
    amen: (k) => S.listings.some((l) => (l.amenities || []).includes(k)),
    aud: (k) => S.listings.some((l) => (l.audience || []).includes(k))
  };
  const placeOptions = (sel, allLabel) => {
    let h = `<option value="">${allLabel || "כל הארץ"}</option>`;
    Object.entries(T.AREAS).forEach(([k, name]) => {
      if (!has.area(k) && sel !== "area:" + k && !T.REGIONS.some((r) => r.area === k && r.key === sel)) return;
      h += `<optgroup label="${name}"><option value="area:${k}" ${sel === "area:" + k ? "selected" : ""}>כל ה${name}</option>`;
      T.REGIONS.filter((r) => r.area === k && (has.region(r.key) || r.key === sel)).forEach((r) => (h += `<option value="${r.key}" ${sel === r.key ? "selected" : ""}>${esc(r.name)}</option>`));
      h += `</optgroup>`;
    });
    return h;
  };
  /* מספר וירטואלי למעקב שיחות (אם הוגדר) מוצג במקום הטלפון של המארח; וואטסאפ נשאר ישיר */
  const contactPhone = (l) => (l && l.tracking_phone ? T.fmtPhone(l.tracking_phone) : "") || (l && (l.phone || l.whatsapp)) || S.settings.phone || S.settings.whatsapp || "";
  const contactWA = (l) => (l && (l.whatsapp || l.phone)) || S.settings.whatsapp || S.settings.phone || "";
  const minDate = () => T.iso(T.today());
  const saveSaved = () => T.storage.set("tamara.saved", [...S.saved]);
  const ratingOf = (id) => S.ratings[id] || null;
  const hasAmen = T.hasAmen;
  const isNewL = (l) => T.isNewListing(l);
  const people = (f) => (Number(f.guests) || 0) + (Number(f.children) || 0);
  const byId = (id) => S.listings.find((x) => x.id === id);
  const imgAlt = (p, l, i) => (p.real ? `${l.name}${p.unit ? " – " + p.unit : ""}${i ? " – תמונה " + (i + 1) : ""}` : "");
  /* ציון מתוך 10 + מילה, כמו באתרי הצימרים המובילים */
  const scoreHTML = (id, long) => {
    const r = ratingOf(id);
    if (!r) return "";
    const s = T.score10(r.avg);
    return long
      ? `<a class="score-line" href="#reviews"><b class="score">${s.toFixed(1)}</b><span><b>${T.scoreLabel(s)}</b> · ${plural.reviews(r.n)}</span></a>`
      : `<span class="score-mini" title="${plural.reviews(r.n)}"><b class="score">${s.toFixed(1)}</b>${T.scoreLabel(s)}<span>(${r.n})</span></span>`;
  };
  const ratingHTML = (id) => scoreHTML(id);
  const shareUrl = (id) => (T.isLive ? `${location.origin}/zimmer/${encodeURIComponent(id)}/` : location.href.split("#")[0] + "#stay-" + id);

  function computeRatings() {
    const r = {};
    S.reviews.forEach((v) => {
      const x = (r[v.listing_id] = r[v.listing_id] || { sum: 0, n: 0, cats: {}, catN: {} });
      x.sum += Number(v.rating) || 0; x.n++;
      Object.entries(v.scores || {}).forEach(([k, val]) => { x.cats[k] = (x.cats[k] || 0) + Number(val); x.catN[k] = (x.catN[k] || 0) + 1; });
    });
    Object.values(r).forEach((x) => { x.avg = x.sum / x.n; Object.keys(x.cats).forEach((k) => (x.cats[k] = x.cats[k] / x.catN[k])); });
    S.ratings = r;
  }

  /* ---------------------------------------------------------------- filters */
  function matches(l, f) {
    if (f.place) { if (f.place.startsWith("area:")) { if (T.regionOf(l.region).area !== f.place.slice(5)) return false; } else if (l.region !== f.place) return false; }
    if (f.town && l.settlement !== f.town) return false;
    if (f.type && l.type !== f.type) return false;
    const p = people(f);
    if (p && T.capacity(l) < p) return false;
    if (f.units && T.unitsOf(l).length < f.units) return false;
    if (f.priceMax && T.fromPrice(l) > f.priceMax) return false;
    if (f.amenities.length && !f.amenities.every((a) => hasAmen(l, a))) return false;
    if (f.audience.length && !f.audience.some((a) => (l.audience || []).includes(a))) return false;
    if (f.benefit && !T.benefitsOf(l).some((b) => b.key === f.benefit)) return false;
    if (f.couplesOnly && !T.termsOf(l).couples_only) return false;
    if (f.quiet) { const nz = T.noiseOf(l); if (!(nz.level && nz.level.key === "quiet")) return false; }
    if (f.party && !T.noiseOf(l).party) return false;
    if (f.exclusive && !l.exclusive) return false;
    if (f.bestPrice && !l.best_price) return false;
    if (f.isNew && !isNewL(l)) return false;
    if (f.deals && !l.deal_label && !T.lastMinuteActive(l) && !T.benefitsOf(l).length) return false;
    if (f.lastminute && !T.lastMinuteActive(l)) return false;
    if (f.tonight && !T.freeTonight(l)) return false;
    if (f.weekend && !T.freeWeekend(l)) return false;
    if (f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0 && !T.isAvailable(l, f.ci, f.co, p)) return false;
    const q = (f.q || "").trim();
    if (q && !(l.name + " " + l.settlement + " " + l.tagline + " " + T.regionOf(l.region).name + " " + T.typeOf(l.type).name).includes(q)) return false;
    return true;
  }
  function applyFilters(list, f) {
    const out = list.filter((l) => matches(l, f));
    const rank = (l) => (T.isSponsored(l) ? 4 : 0) + (T.lastMinuteActive(l) ? 2 : 0) + (l.featured ? 1 : 0);
    const avg = (l) => (ratingOf(l.id) || { avg: 0 }).avg;
    const dist = (l) => (S.geo ? T.distKm(S.geo, T.coordsOf(l)) : 0);
    const topIdx = (l) => { const i = S.top.indexOf(l.id); return i < 0 ? 999 : i; };
    const by = {
      rec: (a, b) => rank(b) - rank(a) || avg(b) - avg(a) || (b.created_at || "").localeCompare(a.created_at || ""),
      price_asc: (a, b) => T.fromPrice(a) - T.fromPrice(b),
      price_desc: (a, b) => T.fromPrice(b) - T.fromPrice(a),
      we_asc: (a, b) => T.weekendFrom(a) - T.weekendFrom(b),
      rating: (a, b) => avg(b) - avg(a) || (ratingOf(b.id) || { n: 0 }).n - (ratingOf(a.id) || { n: 0 }).n,
      reviews: (a, b) => (ratingOf(b.id) || { n: 0 }).n - (ratingOf(a.id) || { n: 0 }).n,
      popular: (a, b) => topIdx(a) - topIdx(b),
      near: (a, b) => dist(a) - dist(b),
      new: (a, b) => (b.created_at || "").localeCompare(a.created_at || "")
    };
    return out.sort(by[f.sort] || by.rec);
  }
  /* כמה מתחמים יישארו אם מוסיפים את הסינון הזה (המספר שליד כל אפשרות) */
  const countWith = (patch) => S.listings.filter((l) => matches(l, Object.assign({}, S.filters, patch))).length;
  const cntKey = (key) => {
    const [k, v] = key.split(":");
    const f = S.filters;
    if (k === "amenities") return countWith({ amenities: [...new Set([...f.amenities, v])] });
    if (k === "audience") return countWith({ audience: [v] });
    if (k === "type") return countWith({ type: v });
    if (k === "units") return countWith({ units: Number(v) });
    if (k === "benefit") return countWith({ benefit: v });
    return countWith({ [k]: true });
  };
  const cnt = (key) => `<span class="n" data-cnt="${esc(key)}">${cntKey(key)}</span>`;
  function updateCounts() {
    $$("[data-cnt]").forEach((el) => {
      const n = cntKey(el.dataset.cnt);
      el.textContent = n;
      const input = el.closest("label") && el.closest("label").querySelector("input");
      if (input) { const off = n === 0 && !input.checked; input.disabled = off; el.closest("label").classList.toggle("off", off); }
    });
  }

  /* ---------------------------------------------------------------- cards */
  function priceHTML(l) {
    const f = S.filters;
    if (f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0) {
      const p = people(f);
      const units = T.freeUnits(l, f.ci, f.co).filter((u) => !p || u.guests_max >= p);
      const qs = units.map((u) => T.quote(l, f.ci, f.co, { unitId: u.id, guests: f.guests || 2, children: f.children, benefit: f.benefit })).filter((q) => q && q.total > 0);
      if (qs.length) { const q = qs.sort((a, b) => a.total - b.total)[0]; return `<span class="price">${units.length > 1 ? `<span class="from">החל מ־</span>` : ""}<b>${T.money(q.total)}</b>ל${plural.nights(q.nights)}<small>${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}${q.benefit ? ` · כולל ${q.benefit.pct}% הטבה` : ""}</small></span>`; }
    }
    const u = T.unitsOf(l);
    const from = T.fromPrice(l);
    if (!from) return `<span class="price"><b class="call">לבירור מחיר</b><small>מתקשרים למארחים</small></span>`;
    const we = T.weekendFrom(l);
    const lm = T.lastMinuteActive(l);
    const p2 = Math.min(...u.map((x) => x.p2_weekday).filter(Boolean));
    const weTxt = lm ? `<s>${T.money(we)}</s> ${T.money(Math.round(we * (1 - l.lastminute_pct / 100)))}` : T.money(we);
    return `<span class="price">${u.length > 1 ? `<span class="from">החל מ־</span>` : ""}<b>${T.money(from)}</b>ללילה<small>סופ״ש ${weTxt}${Number.isFinite(p2) ? ` · מ־2 לילות ${T.money(p2)}` : ""}</small></span>`;
  }
  function freeNightsHTML(l) {
    const fn = T.nextFreeNights(l, 14, 3);
    if (!fn.length) return `<p class="fn-none">${I("calendar")}מלא בשבועיים הקרובים</p>`;
    const tonightFull = fn[0].ci !== minDate();
    return `<div class="fn" aria-label="תאריכים פנויים קרובים">${tonightFull ? `<span class="fn-full">היום: מלא</span>` : ""}${fn.map((x) => `<a href="#stay-${esc(l.id)}" data-act="quick-dates" data-ci="${x.ci}" data-co="${x.co}" aria-label="פנוי מ${T.fmtLong(x.ci)}, ${plural.nights(x.nights)}, ${T.money(x.total)}">${fmtDay(x.ci)}${x.nights > 1 ? ` · ${x.nights} לילות` : ""} · ${T.money(x.total)}</a>`).join("")}</div>`;
  }
  function card(l, opts) {
    opts = opts || {};
    const reg = T.regionOf(l.region), typ = T.typeOf(l.type);
    const saved = S.saved.has(l.id);
    const lm = T.lastMinuteActive(l);
    const units = T.unitsOf(l);
    const photos = T.photosOf(l);
    const n = photos.length;
    const i = (((S.cardIdx[l.id] || 0) % n) + n) % n;
    const src = i === 0 ? T.thumbOf(l) : photos[i].thumb;
    const d = T.detailsOf(l);
    const ribbon = d.ribbon || (T.termsOf(l).couples_only ? "זוגות בלבד" : "");
    const badges = T.badgesOf(l, { ratings: S.ratings, top: S.top, settings: S.settings }).filter((b) => !(b.k === "couples" && ribbon === "זוגות בלבד"));
    const amen = T.AMENITY_PRIORITY.filter((a) => hasAmen(l, a)).slice(0, 4).map(T.amenityOf);
    const f = S.filters;
    const dated = f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0;
    const freeU = dated ? T.freeUnits(l, f.ci, f.co) : [];
    const freeN = freeU.length, freeCap = freeU.reduce((s, u) => s + (Number(u.guests_max) || 0), 0);
    const km = opts.km != null ? opts.km : S.geo ? T.distKm(S.geo, T.coordsOf(l)) : null;
    return `<article class="card">
      <div class="card-media${n > 1 ? " has-pg" : ""}">${n > 1 ? `<div class="pg-strip" style="transform:translateX(${i * 100}%)">${photos.map((p, j) => { const u = esc(j === 0 ? T.thumbOf(l) : p.thumb); return `<img ${j === i ? `src="${u}"` : `data-src="${u}"`} alt="${p.real ? esc(imgAlt(p, l, j)) : ""}" loading="lazy" draggable="false">`; }).join("")}</div>` : `<img src="${esc(src)}" alt="${photos[i].real ? esc(imgAlt(photos[i], l, i)) : ""}" loading="lazy">`}
        <span class="chips-top"><span class="chip">${I("pin")}${esc(l.settlement || reg.name)}</span>${T.isSponsored(l) ? `<span class="chip chip-sp">${I("megaphone")}ממומן</span>` : ""}</span>
        ${ribbon ? `<span class="ribbon">${esc(ribbon)}</span>` : ""}
        ${lm ? `<span class="chip chip-lm">${I("bolt")}דקה 90 · ‎-${l.lastminute_pct}%</span>` : l.deal_label ? `<span class="chip chip-deal">${I("tag")}${esc(l.deal_label)}</span>` : ""}
        ${n > 1 ? `<span class="cm-nav"><button type="button" data-act="cimg" data-id="${esc(l.id)}" data-d="-1" aria-label="התמונה הקודמת של ${esc(l.name)}">${I("chev-r")}</button><button type="button" data-act="cimg" data-id="${esc(l.id)}" data-d="1" aria-label="התמונה הבאה של ${esc(l.name)}">${I("chev-l")}</button></span>${n <= 8 ? `<span class="pg-dots" data-w="14" aria-hidden="true"><i class="pg-act"></i>${photos.map((_, j) => `<b class="${j === i ? "on" : ""}"></b>`).join("")}</span>` : `<span class="cm-count" aria-hidden="true">${i + 1}/${n}</span>`}` : ""}
      </div>
      <button class="save-btn" type="button" data-act="save" data-id="${esc(l.id)}" aria-pressed="${saved}" aria-label="${saved ? "הסרה מהמועדפים" : "הוספה למועדפים"}: ${esc(l.name)}">${I("heart")}</button>
      <div class="card-body">
        <div class="card-head"><h3><a href="#stay-${esc(l.id)}">${esc(l.name)}</a></h3><span class="card-place">${esc(reg.name)}</span></div>
        <p class="card-tag">${esc(l.tagline)}</p>
        <div class="card-meta">${scoreHTML(l.id)}<span>${I("home")}${esc(typ.name)}${units.length > 1 ? ` · ${units.length} יחידות` : ""}</span><span>${I("users")}עד ${T.capacity(l)}</span>${km != null ? `<span>${I("nav")}${T.kmText(km)}${opts.km != null ? " מכאן" : " ממך"}</span>` : ""}</div>
        ${amen.length ? `<div class="card-amen">${amen.map((a) => `<span>${T.pic(a.pic)}${esc(a.name)}</span>`).join("")}</div>` : ""}
        ${badges.length ? `<div class="badges">${badges.slice(0, 3).map((b) => `<span class="badge b-${b.k}">${I(b.icon)}${esc(b.t)}</span>`).join("")}</div>` : ""}
        ${opts.near ? opts.near : opts.noFree ? "" : dated ? (units.length > 1 && freeN ? `<p class="avail-line">${I("check")}${freeN === units.length ? "כל היחידות פנויות" : plural.units(freeN) + " פנויות"} בתאריכים שלכם${freeN < units.length ? ` · עד ${freeCap} אורחים` : ""}</p>` : "") : freeNightsHTML(l)}
        <div class="card-foot">${priceHTML(l)}<span class="go-btn" aria-hidden="true">${I("fwd")}</span></div>
      </div>
    </article>`;
  }
  const grid = (list, opts) => `<div class="grid">${list.map((l) => card(l, opts)).join("")}</div>`;
  const rail = (list) => `<div class="rail">${list.map((l) => card(l, { noFree: true })).join("")}</div>`;
  const emptyState = (title, text, action) => `<div class="empty">${I("search")}<h3>${title}</h3><p>${text}</p>${action || ""}</div>`;
  const head = (eyebrow, title, sub, link) => `<div class="section-head"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${link || ""}</div>`;
  const railSection = (id, eyebrow, title, sub, list, href) => (list.length >= 2 ? `<section class="section wrap page" aria-labelledby="h-${id}">${head(eyebrow, `<span id="h-${id}">${title}</span>`, sub, href ? `<a class="link-more" href="${href}">לכל המתחמים ${I("fwd")}</a>` : "")}${rail(list.slice(0, 8))}</section>` : "");

  /* ---------------------------------------------------------------- chrome */
  const topTowns = () => {
    const m = {};
    S.listings.forEach((l) => { if (l.settlement) m[l.settlement] = (m[l.settlement] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "he")).slice(0, 12);
  };
  /* חיפוש מהיר מופיע רק אם יש לו לפחות תוצאה אחת (פנוי הלילה/בסופ״ש תלויים ביומן ונשארים תמיד) */
  const quickOk = (q) => (q.amenity ? has.amen(q.amenity) : q.audience ? has.aud(q.audience) : q.benefit ? S.listings.some((l) => T.benefitsOf(l).some((b) => b.key === q.benefit)) : true);
  const quickIdx = (pred) => T.QUICK_FILTERS.findIndex(pred);
  /* סוגי האירוח בתפריט העליון: כל סוג נפתח לרשימה (הכול, צפון, מרכז, דרום) */
  const NAV_TYPES = [
    { key: "zimmer", label: "צימרים", all: "כל הצימרים" },
    { key: "villa", label: "וילות", all: "כל הווילות" },
    { key: "cabin", label: "בקתות עץ", all: "כל בקתות העץ" },
    { key: "suite", label: "סוויטות", all: "כל הסוויטות" },
    { key: "compound", label: "מתחמי אירוח", all: "כל מתחמי האירוח" }
  ];
  /* שם הסוג בחיפוש: "מתחמי אירוח" כמו בתפריט, שאר הסוגים בשם הרגיל */
  const typePlural = (k) => (NAV_TYPES.find((x) => x.key === k) || {}).label || T.typeOf(k).plural;
  function typeMenu(key) {
    const t = NAV_TYPES.find((x) => x.key === key);
    const of = S.listings.filter((l) => l.type === key);
    const n = (c) => (c ? `<span>${c}</span>` : "");
    return `<a href="#type-${key}" class="tdd-all">${T.pic("type-" + key)}<b>${esc(t.all)}</b>${n(of.length)}</a>` +
      Object.entries(T.AREAS).filter(([a]) => of.some((l) => T.regionOf(l.region).area === a)).map(([a, name]) => `<a href="#type-${key}/${a}">${T.pic(T.AREA_PIC[a])}${esc(t.label)} ב${esc(name)}${n(of.filter((l) => T.regionOf(l.region).area === a).length)}</a>`).join("");
  }
  function header() {
    const n = S.saved.size;
    const nv = S.viewedList.filter((id) => byId(id)).length;
    const cur = location.hash.slice(1);
    const nav = [["deals", "דילים"], ["weekend", "פנויים לסופ״ש"]];
    /* בריחוף המילה מתגלגלת למעלה ומתחלפת בעותק שלה */
    const roll = (t) => `<span class="roll"><span data-t="${esc(t)}">${esc(t)}</span></span>`;
    const me = S.me.user && S.me.user.email ? String(S.me.user.name || S.me.user.email).split(/[\s@]/)[0] : "";
    return `<header class="topbar wrap" id="topbar"><div class="topbar-in">
      <a class="brand" href="#" aria-label="${esc(S.settings.site_name)} – לדף הבית"><img src="${LOGO}" alt="${esc(S.settings.site_name)} – ${esc(S.settings.site_tagline)}"></a>
      <nav class="mainnav" aria-label="ניווט ראשי"><a href="#search" ${cur === "search" ? 'aria-current="page"' : ""}>${roll("חיפוש")}</a>${NAV_TYPES.filter((x) => has.type(x.key)).map((x) => `<div class="nav-dd"><button class="nav-dd-btn" type="button" data-act="tdd" aria-expanded="false" aria-controls="tdd-${x.key}" ${cur === "type-" + x.key || cur.startsWith("type-" + x.key + "/") ? 'data-cur="1"' : ""}>${roll(x.label)}${I("chev-d")}</button><div class="tdd" id="tdd-${x.key}" hidden>${typeMenu(x.key)}</div></div>`).join("")}${nav.map(([h, t]) => `<a href="#${h}" ${cur === h ? 'aria-current="page"' : ""}>${roll(t)}</a>`).join("")}</nav>
      <div class="top-actions">
        <a class="icon-btn saved-count viewed-count hide-s" href="#me-viewed" aria-label="נצפו לאחרונה (${nv})" title="נצפו לאחרונה" ${nv ? `data-n="${nv}"` : ""}>${I("history")}</a>
        <a class="icon-btn saved-count" href="#me" aria-label="המועדפים שלי (${n})" title="המועדפים שלי" ${n ? `data-n="${n}"` : ""}>${I("heart")}</a>
        <a class="me-pill hide-s" href="#me-leads" aria-label="האזור האישי">${I("user")}<span>${me ? esc(me) : "האזור האישי"}</span></a>
        <button class="icon-btn menu-btn" type="button" data-act="menu" aria-expanded="false" aria-controls="mobile-nav" aria-label="תפריט"><span class="tog" aria-hidden="true"><i></i><i></i></span></button>
      </div></div>
      <nav class="mobile-nav" id="mobile-nav" aria-label="תפריט נייד">
        <a href="#search">חיפוש</a><a href="#deals">דילים ודקה 90</a><a href="#weekend">פנויים לסופ״ש</a>
        <details><summary>סוגי אירוח</summary>${T.TYPES.filter((t) => has.type(t.key)).map((t) => `<a href="#type-${t.key}">${esc(typePlural(t.key))}</a>`).join("")}</details>
        <details><summary>צימרים לפי אזור</summary>${T.REGIONS.filter((r) => has.region(r.key)).map((r) => `<a href="#region-${r.key}">${esc(r.name)}</a>`).join("")}</details>
        <details><summary>גולשים מחפשים</summary>${T.QUICK_FILTERS.map((q, i) => (quickOk(q) ? `<a href="#quick-${i}">${esc(q.label)}</a>` : "")).join("")}</details>
        <a href="#me-leads">האזור האישי</a><a href="#me">המועדפים שלי</a><a href="#me-viewed">נצפו לאחרונה</a><a href="#top">הכי מומלצים</a><a href="#contact">צרו קשר</a><a class="mn-host" href="#join">${I("megaphone")}פרסמו אצלנו</a>
      </nav>
    </header>`;
  }
  function socialLinks() {
    const s = S.settings.social || {};
    const names = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };
    const items = Object.entries(names).filter(([k]) => s[k]);
    return items.length ? `<p class="social">${items.map(([k, n]) => `<a href="${esc(s[k])}" target="_blank" rel="noopener">${I("external")}${n}</a>`).join("")}</p>` : "";
  }
  function footer() {
    const s = S.settings;
    const L = S.listings;
    const combos = [];
    T.SEO_FEATURES.forEach((f) => T.REGIONS.forEach((r) => { const n = L.filter((l) => l.region === r.key && (f.audience ? (l.audience || []).includes(f.key) : hasAmen(l, f.key))).length; if (n) combos.push({ f, r, n }); }));
    combos.sort((a, b) => b.n - a.n);
    return `<div class="footer-host wrap"><div><span class="eyebrow">למארחים</span><b>יש לכם צימר או וילה? מפרסמים אצלנו ומקבלים פניות ישירות.</b></div><span class="fh-act"><a class="btn btn-sky" href="#join">${I("megaphone")}פרסמו אצלנו</a><a class="btn btn-glass" href="owner.html">${I("key")}כניסת מארחים</a></span></div>
      <div class="footer-in wrap">
      <div class="about-col"><a href="#" aria-label="לדף הבית"><img src="${LOGO_FOOT}" alt="${esc(s.site_name)}"></a><p>צימרים, וילות ובקתות מהגולן ועד הערבה. פונים ישירות למארחים, בלי עמלת הזמנה.</p>
        ${s.phone ? `<p><a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a></p>` : ""}${s.email ? `<p>${esc(s.email)}</p>` : ""}${socialLinks()}</div>
      <div><h4>צימרים לפי אזור</h4><ul>${T.REGIONS.filter((r) => has.region(r.key)).map((r) => `<li><a href="#region-${r.key}">צימרים ${esc(T.inPlace(r.name))}</a></li>`).join("")}</ul></div>
      <div><h4>חיפושים פופולריים</h4><ul>${T.QUICK_FILTERS.map((q, i) => [q, i]).filter(([q]) => quickOk(q)).slice(0, 7).map(([q, i]) => `<li><a href="#quick-${i}">${esc(q.label)}</a></li>`).join("")}${combos.slice(0, 5).map((c) => `<li><a href="#region-${c.r.key}/${c.f.key}">צימרים ${esc(c.f.phrase)} ${esc(T.inPlace(c.r.name))}</a></li>`).join("")}</ul></div>
      <div><h4>סוגי אירוח</h4><ul>${T.TYPES.filter((t) => has.type(t.key)).map((t) => `<li><a href="#type-${t.key}">${esc(t.plural)}</a></li>`).join("")}<li><a href="#deals">דילים ודקה 90</a></li><li><a href="#weekend">פנויים לסופ״ש הקרוב</a></li></ul></div>
      <div><h4>מידע</h4><ul>
        <li><a href="#about">אודות</a></li><li><a href="#contact">צרו קשר</a></li><li><a href="#places">אטרקציות ומסעדות</a></li><li><a href="#magazine">מגזין</a></li><li><a href="#top">המומלצים ביותר</a></li>
        <li><a href="#join">פרסום מתחם באתר</a></li><li><a href="owner.html">כניסת מארחים</a></li><li><a href="#terms-hosts">הסכם פרסום למארחים</a></li><li><a href="#accessibility">הצהרת נגישות</a></li><li><a href="#terms">תנאי שימוש, פרטיות ועוגיות</a></li></ul></div>
      <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.site_name)} – ${esc(s.site_tagline)}</span><a href="admin.html">ניהול האתר</a></div></div>`;
  }
  function floating() {
    const s = S.settings;
    const old = $("#float-host");
    const host = old || Object.assign(document.createElement("div"), { id: "float-host" });
    let h = "";
    if (s.whatsapp && s.wa_float !== false) h += `<a class="wa-float" href="${esc(T.waLink(s.whatsapp, "שלום, הגעתי מאתר " + s.site_name + " ואשמח לעזרה במציאת מקום"))}" target="_blank" rel="noopener" aria-label="שיחה איתנו בוואטסאפ">${I("chat")}<span>צריכים עזרה?</span></a>`;
    if (s.cookie_banner !== false && !store("tamara.cookies", false)) h += `<div class="cookie-bar" role="region" aria-label="הודעה על עוגיות"><p>האתר שומר בדפדפן רק מה שצריך כדי לעבוד (מועדפים, נצפו לאחרונה וחיפושים), וסופר צפיות בלי לזהות אתכם. <a href="#terms">פרטים</a></p><button class="btn btn-primary btn-sm" type="button" data-act="cookie-ok">הבנתי</button></div>`;
    host.innerHTML = h;
    if (!old) document.body.appendChild(host);
  }

  /* ---------------------------------------------------------------- home */
  function guestsPop(f, inline) {
    const g = Number(f.guests) || 2, c = Number(f.children) || 0;
    return `<details class="field guests-pop${inline ? " inline" : ""}"><summary><span>אורחים</span><b class="gsum">${plural.adults(g)}${c ? " · " + plural.kids(c) : ""}</b></summary>
      <div class="pop">
        <div class="pop-row"><span id="ga-lbl">מבוגרים</span><div class="stepper" role="group" aria-labelledby="ga-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות מבוגרים">${I("minus")}</button><input name="guests" type="number" min="1" max="40" value="${g}" aria-labelledby="ga-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר מבוגרים">${I("plus")}</button></div></div>
        <div class="pop-row"><span id="gc-lbl">ילדים</span><div class="stepper" role="group" aria-labelledby="gc-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות ילדים">${I("minus")}</button><input name="children" type="number" min="0" max="20" value="${c}" aria-labelledby="gc-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר ילדים">${I("plus")}</button></div></div>
      </div></details>`;
  }
  function topRated(n) {
    return S.listings.filter((l) => ratingOf(l.id)).map((l) => ({ l, r: ratingOf(l.id) })).sort((a, b) => b.r.avg - a.r.avg || b.r.n - a.r.n).slice(0, n || 5);
  }
  const rankList = (rows) => `<ol class="rank">${rows.map(({ l, r }, i) => `<li><span class="rk">${i + 1}</span><a href="#stay-${esc(l.id)}"><img src="${esc(T.thumbOf(l))}" alt="" loading="lazy"><span><b>${esc(l.name)}</b><small>${esc(T.typeOf(l.type).name)} · ${esc(l.settlement)}, ${esc(T.regionOf(l.region).name)}</small></span></a><span class="rk-score"><b class="score">${T.score10(r.avg).toFixed(1)}</b><small>${plural.reviews(r.n)}</small></span></li>`).join("")}</ol>`;
  function recentReviews(n) {
    return S.reviews.filter((r) => byId(r.listing_id)).slice(0, n || 3).map((r) => {
      const l = byId(r.listing_id);
      return `<article class="rev rev-card"><div class="rev-top"><b class="score">${T.score10(r.rating).toFixed(0)}</b><span><b>${esc(r.title || l.name)}</b><a href="#stay-${esc(l.id)}">${esc(l.name)} · ${esc(l.settlement)}</a></span></div><p>${esc(r.text)}</p><div class="who"><b>${esc(r.name)}</b><span>${r.stay_month ? "התארחו ב" + esc(r.stay_month) : ""}</span></div><span class="verified">${I("shield")}הזמנה מאומתת</span></article>`;
    }).join("");
  }
  function newsletterBand() {
    return `<section class="wrap page"><div class="news-band"><div>${T.pic("newsletter", "pic-xl")}<span class="eyebrow">דילים למייל</span><h2>דקה 90 ומבצעים, לפני כולם</h2><p>פעם בשבוע: מתחמים שהתפנו לסופ״ש הקרוב והנחות שמארחים פותחים רק לנרשמים.</p></div>
      <form class="news-form" data-form="subscribe" novalidate>${HP}<label class="field"><span>אימייל</span><input class="input" name="email" type="email" dir="ltr" autocomplete="email" required placeholder="name@example.com"></label><label class="field"><span>אזור מועדף (לא חובה)</span><select class="select" name="region">${placeOptions("", "כל הארץ")}</select></label><button class="btn btn-primary btn-lg" type="submit">${I("send")}הרשמה</button><p class="hint">בהרשמה אתם מאשרים לקבל מאיתנו דיוור שיווקי במייל. נשלח מייל לאישור, ואפשר להסיר את עצמכם בכל רגע. <a href="#terms">פרטיות</a></p></form></div></section>`;
  }
  /* דף הבית – בנייה מחדש בהדרגה (נובמבר 2026): כרגע רק הפתיח עם החיפוש, הרשמה לדילים והפס למארחים.
     שאר הקטעים (מסלולים, אזורים, מגזין וכו') הוסרו מדף הבית; הפונקציות שלהם נשארו בקוד לשימוש בהמשך. */
  /* בחירה בתיבת החיפוש: חלון קטן עם פינות עגולות במקום רשימה נפתחת של הדפדפן */
  const placeName = (v) => (!v ? "כל הארץ" : v.startsWith("area:") ? T.AREAS[v.slice(5)] : T.regionOf(v).name);
  const TYPE_ICON = { zimmer: "home", villa: "pool", cabin: "tree", suite: "bed", compound: "users", boutique: "star", loft: "door", apartment: "key", cave: "mountain" };
  function typePick(sel) {
    const c = (k) => S.listings.filter((l) => l.type === k).length;
    return `<details class="field pick pick-type"><summary><span>מה מחפשים?</span><b class="psum">${esc(sel ? typePlural(sel) : "כל סוגי האירוח")}</b></summary>
      <div class="pop pick-pop"><input type="hidden" name="type" value="${esc(sel || "")}">
        <div class="pick-grid" role="listbox" aria-label="סוג אירוח">
          <button type="button" class="pick-opt${sel ? "" : " on"}" data-act="pick" data-v="" data-l="כל סוגי האירוח" role="option" aria-selected="${!sel}">${T.pic("type-all", "pic-l")}<span>הכל</span></button>
          ${T.TYPES.filter((x) => has.type(x.key) || sel === x.key).map((x) => `<button type="button" class="pick-opt${sel === x.key ? " on" : ""}" data-act="pick" data-v="${x.key}" data-l="${esc(typePlural(x.key))}" role="option" aria-selected="${sel === x.key}">${T.pic(x.pic, "pic-l")}<span>${esc(typePlural(x.key))}</span>${c(x.key) ? `<small>${c(x.key)}</small>` : ""}</button>`).join("")}
        </div></div></details>`;
  }
  function placePick(sel) {
    const inArea = (a) => S.listings.filter((l) => T.regionOf(l.region).area === a).length;
    const opt = (v, label, extra) => `<button type="button" class="pick-opt${sel === v ? " on" : ""}" data-act="pick" data-v="${v}" data-l="${esc(label)}" role="option" aria-selected="${sel === v}">${extra || ""}<span>${esc(label)}</span></button>`;
    const openArea = (a) => sel === "area:" + a || T.REGIONS.some((r) => r.area === a && r.key === sel);
    return `<details class="field pick pick-place"><summary><span>לאן נוסעים?</span><b class="psum">${esc(placeName(sel))}</b></summary>
      <div class="pop pick-pop"><input type="hidden" name="place" value="${esc(sel || "")}">
        <div class="pick-list" role="listbox" aria-label="אזור">
          ${opt("", "כל הארץ", T.pic("area-all", "pic-l"))}
          ${Object.entries(T.AREAS).filter(([a]) => has.area(a) || openArea(a)).map(([a, name]) => `<div class="pick-area${openArea(a) ? " open" : ""}">
            <div class="pick-row">${opt("area:" + a, name, T.pic(T.AREA_PIC[a], "pic-l"))}<small class="pick-n">${inArea(a) || ""}</small><button type="button" class="pick-exp" data-act="pick-exp" aria-expanded="${openArea(a)}" aria-label="אזורים ב${esc(name)}">${I("chev-d")}</button></div>
            <div class="pick-sub"><div>${T.REGIONS.filter((r) => r.area === a && (has.region(r.key) || r.key === sel)).map((r) => opt(r.key, r.name, T.pic(r.pic))).join("")}</div></div>
          </div>`).join("")}
        </div></div></details>`;
  }
  function viewHome() {
    const f = S.filters;
    const ht = T.heroTitle(S.settings);
    T.applyHeroFonts(S.settings);
    return `<div class="view home-lean">
      <section class="hf${S.homeAgain ? " hf-again" : ""}${ht.align ? " hf-al-" + ht.align : ""}" aria-label="חיפוש" style="${esc(T.heroVars(S.settings))}">
        <div class="hf-media"><div class="hf-par"><img src="assets/video/hero-poster${innerWidth < 900 ? "-720" : ""}.jpg" alt="" fetchpriority="high"><video class="hf-video" muted playsinline loop autoplay preload="auto" aria-hidden="true" tabindex="-1"></video></div></div>
        <div class="hf-inner">
          <h1 class="hf-title" style="${esc(ht.style)}"><span class="sr">${esc(S.settings.hero_title)} – </span>${ht.html}</h1>
          <form class="searchbox" data-form="hero-search" role="search">
            ${typePick(f.type)}
            ${placePick(f.place)}
            <label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(f.ci)}"></label>
            <label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${minDate()}" value="${esc(f.co)}"></label>
            ${guestsPop(f)}
            <button class="btn btn-primary" type="submit">${I("search")}חיפוש</button>
          </form>
        </div>
      </section>

      ${newsletterBand()}

      <section class="wrap page"><div class="band">
        <img src="assets/img/photos/band.jpg" alt="" loading="lazy">
        <div><span class="eyebrow">למארחים</span><h2>יש לכם צימר או וילה?</h2><p>פרסמו ב${esc(S.settings.site_name)} וקבלו פניות ישירות לוואטסאפ ולמייל, בלי עמלה על הזמנות. מעדכנים מחירים, תמונות ויומן בממשק מארחים, ומסנכרנים עם Booking ו-Airbnb.</p>
          <div class="btns"><a class="btn btn-sky btn-lg" href="#join">להצטרפות</a><a class="btn btn-glass btn-lg" href="owner.html">כניסת מארחים</a></div></div>
        <ul>${[["direct", "פניות עם תאריכים, יחידות ומספר אורחים, ישר לנייד"], ["weekend", "סנכרון יומן iCal למניעת הזמנות כפולות"], ["deals", "מחירי חג ועונה, חבילות, הטבות ודקה 90"], ["verified", "דוח צפיות, לחיצות ופניות לכל מתחם"]].map(([p, t]) => `<li>${T.pic(p, "pic-l")}<span>${t}</span></li>`).join("")}</ul>
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
        ${scoreHTML(l.id)}
        <p class="muted" style="font-weight:300">${esc(l.tagline)}</p>
        <div class="facts"><div><b>${T.capacity(l)}</b>אורחים</div><div><b>${u.length > 1 ? u.length : l.bedrooms}</b>${u.length > 1 ? "יחידות" : "חדרי שינה"}</div><div><b>${l.min_nights}</b>לילות מינ׳</div></div>
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
    else if (f.deals) t = "דילים והטבות";
    else if (f.weekend) t = "פנויים לסופ״ש הקרוב";
    else if (f.tonight) t = "פנויים הלילה";
    else if (f.couplesOnly) t = "צימרים לזוגות בלבד";
    else if (f.party) t = "צימרים שמותר בהם להרעיש";
    else if (f.quiet) t = "צימרים בסביבה שקטה";
    else if (f.amenities.length === 1 && !f.type) { const sf = T.SEO_FEATURES.find((x) => x.key === f.amenities[0]); t = "צימרים " + (sf ? sf.phrase : "עם " + T.amenityOf(f.amenities[0]).name); }
    else if (f.audience.length === 1 && !f.type) t = "צימרים ל" + (T.AUDIENCE.find((a) => a.key === f.audience[0]) || { name: "" }).name;
    if (f.town) t += " ב" + f.town;
    else if (f.place) t += " " + T.inPlace(placeLabel(f.place).replace(/^כל ה/, "ה"));
    return t;
  }
  const chk = (name, value, checked, label, key) => `<label class="check"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""}><span>${label}</span>${key ? cnt(key) : ""}</label>`;
  function viewSearch() {
    const f = S.filters;
    const maxPrice = Math.max(1000, Math.ceil(Math.max(0, ...S.listings.map(T.fromPrice)) / 500) * 500);
    const groups = T.AMENITY_GROUPS.map((g, gi) => {
      const items = T.AMENITIES.filter((a) => a.group === g.key && (has.amen(a.key) || f.amenities.includes(a.key)));
      if (!items.length) return "";
      const open = gi < 2 || items.some((a) => f.amenities.includes(a.key));
      return `<details class="fgroup" ${open ? "open" : ""}><summary>${T.pic(g.pic)}${esc(g.name)}</summary>${items.map((a) => chk("amenities", a.key, f.amenities.includes(a.key), T.pic(a.pic) + esc(a.name), "amenities:" + a.key)).join("")}</details>`;
    }).join("");
    return `<div class="view wrap page">
      <div class="page-head"><div class="crumbs"><a href="#">ראשי</a><span>›</span><span>חיפוש</span></div><span class="eyebrow">חיפוש מתחם</span><h1 id="search-title">${esc(searchTitle(f))}</h1></div>
      <div class="search-layout">
        <form class="filters" id="filters" data-form="filters" aria-label="סינון תוצאות">
          <div class="filters-head"><h2 style="font-size:2rem">סינון</h2><button class="icon-btn" type="button" data-act="filters-close" aria-label="סגירת הסינון">${I("x")}</button></div>
          <fieldset><legend>שם, יישוב או מילה</legend><input class="input" type="search" name="q" value="${esc(f.q)}" placeholder="למשל: ראש פינה, ג׳קוזי">${f.town ? `<span class="hint">יישוב: ${esc(f.town)} <button class="btn btn-ghost btn-sm" type="button" data-act="unfilter" data-k="town">הסרה</button></span>` : ""}</fieldset>
          <fieldset><legend>אזור</legend><select class="select" name="place" aria-label="אזור">${placeOptions(f.place)}</select></fieldset>
          <fieldset><legend>תאריכים</legend><div class="row2"><label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(f.ci)}"></label><label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${minDate()}" value="${esc(f.co)}"></label></div>
            ${chk("tonight", "1", f.tonight, "פנוי הלילה", "tonight")}${chk("weekend", "1", f.weekend, `פנוי בסופ״ש הקרוב (${T.lastMinuteNights().map(fmtDay).join(", ")})`, "weekend")}<span class="hint">מתחמים שתפוסים בתאריכים יוסתרו</span></fieldset>
          <fieldset><legend>מי מגיע</legend><div class="row2">
            <div class="field"><span id="fa-lbl">מבוגרים</span><div class="stepper" role="group" aria-labelledby="fa-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות">${I("minus")}</button><input name="guests" type="number" min="0" max="40" value="${f.guests || 0}" aria-labelledby="fa-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר">${I("plus")}</button></div></div>
            <div class="field"><span id="fk-lbl">ילדים</span><div class="stepper" role="group" aria-labelledby="fk-lbl"><button type="button" data-act="step" data-d="-1" aria-label="פחות">${I("minus")}</button><input name="children" type="number" min="0" max="20" value="${f.children || 0}" aria-labelledby="fk-lbl" inputmode="numeric"><button type="button" data-act="step" data-d="1" aria-label="יותר">${I("plus")}</button></div></div></div>
            ${T.AUDIENCE.filter((a) => has.aud(a.key) || f.audience.includes(a.key)).map((a) => chk("audience", a.key, f.audience.includes(a.key), T.pic(a.pic) + a.name, "audience:" + a.key)).join("")}${chk("couplesOnly", "1", f.couplesOnly, "לזוגות בלבד (בלי ילדים)", "couplesOnly")}${chk("quiet", "1", f.quiet, "סביבה שקטה", "quiet")}${chk("party", "1", f.party, "מותר להרעיש (מוזיקה, קריוקי, מסיבות)", "party")}</fieldset>
          <fieldset><legend>הטבה שמגיעה לכם</legend><select class="select" name="benefit" aria-label="הטבה"><option value="">ללא</option>${T.BENEFITS.filter((b) => f.benefit === b.key || S.listings.some((l) => T.benefitsOf(l).some((x) => x.key === b.key))).map((b) => `<option value="${b.key}" ${f.benefit === b.key ? "selected" : ""}>${esc(b.name)} (${cntKey("benefit:" + b.key)})</option>`).join("")}</select><span class="hint">המחירים בתוצאות יכללו את ההנחה</span></fieldset>
          <fieldset><legend>סוג אירוח</legend><label class="check"><input type="radio" name="type" value="" ${!f.type ? "checked" : ""}><span>הכל</span></label>${T.TYPES.filter((t) => has.type(t.key) || f.type === t.key).map((t) => `<label class="check"><input type="radio" name="type" value="${t.key}" ${f.type === t.key ? "checked" : ""}><span>${esc(t.plural)}</span>${cnt("type:" + t.key)}</label>`).join("")}</fieldset>
          <fieldset><legend>מספר יחידות במתחם</legend><div class="pill-pick"><label><input type="radio" name="units" value="0" ${!f.units ? "checked" : ""}><span>הכל</span></label>${T.UNIT_COUNTS.map((u) => `<label><input type="radio" name="units" value="${u}" ${f.units === u ? "checked" : ""}><span>${u}+</span></label>`).join("")}</div></fieldset>
          <fieldset><legend>מחיר ללילה באמצע שבוע</legend><input type="range" name="priceMax" min="300" max="${maxPrice}" step="50" value="${f.priceMax || maxPrice}" aria-label="מחיר מקסימלי ללילה"><span class="hint">עד <span class="range-out" id="price-out">${f.priceMax && f.priceMax < maxPrice ? T.money(f.priceMax) : "ללא הגבלה"}</span></span></fieldset>
          <fieldset><legend>מה חשוב לכם</legend>${groups}</fieldset>
          <fieldset><legend>מבצעים ותוויות</legend>${chk("lastminute", "1", f.lastminute, "דקה 90 לסופ״ש הקרוב", "lastminute")}${chk("deals", "1", f.deals, "דילים והטבות", "deals")}${chk("exclusive", "1", f.exclusive, "בלעדי לאתר", "exclusive")}${chk("bestPrice", "1", f.bestPrice, "מתחייבים למחיר הכי טוב", "bestPrice")}${chk("isNew", "1", f.isNew, "חדשים באתר", "isNew")}</fieldset>
          <div class="filters-apply"><button class="btn btn-primary btn-block btn-lg" type="button" data-act="filters-close" id="apply-btn">הצגת תוצאות</button></div>
        </form>
        <div>
          <div class="results-bar">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn btn-line filter-toggle" type="button" data-act="filters-open">${I("sliders")}סינון</button><span class="count" id="count" aria-live="polite"></span></div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <span class="seg-tabs" role="group" aria-label="תצוגה"><button type="button" data-act="view" data-v="list" aria-pressed="${f.view !== "map"}">${I("grid")}רשימה</button><button type="button" data-act="view" data-v="map" aria-pressed="${f.view === "map"}">${I("map")}מפה</button></span>
              <label style="display:flex;align-items:center;gap:8px;font-size:var(--t-s)">מיון<select class="select" form="filters" name="sort" style="width:auto;min-height:40px">
                ${[["rec", "מומלצים"], ["price_asc", "מחיר אמצ״ש: מהנמוך"], ["we_asc", "מחיר סופ״ש: מהנמוך"], ["price_desc", "מחיר: מהגבוה"], ["rating", "ציון אורחים"], ["reviews", "הכי הרבה חוות דעת"], ["popular", "הכי נצפים"], ["near", "הכי קרוב אליי"], ["new", "חדשים באתר"]].map(([k, t]) => `<option value="${k}" ${f.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
            </div>
          </div>
          <div class="active-chips" id="active-chips"></div>
          <div id="results" style="margin-top:16px"></div>
          <div id="seo-text"></div>
        </div>
      </div>
    </div>`;
  }
  /* אין תוצאה מדויקת: מסבירים למה, ומציגים מתחמים שמתאימים לשאר הסינונים,
     עם מה שפנוי בתאריכים שנבחרו ומתי הם פנויים לכל הקבוצה */
  function nearMiss(f) {
    const dated = f.ci && f.co && T.nightsBetween(f.ci, f.co) > 0;
    const p = people(f);
    if (!dated) {
      if (!p) return "";
      const fit = S.listings.filter((l) => matches(l, Object.assign({}, f, { guests: 0, children: 0 })));
      if (!fit.length) return "";
      const max = Math.max(...fit.map((l) => T.capacity(l)));
      return emptyState(`אין מתחם ל־${plural.guests(p)} עם הסינונים האלה`, `הגדול ביותר שמתאים לשאר מה שבחרתם מתאים לעד ${plural.guests(max)}.`, `<button class="btn btn-line" type="button" data-act="unfilter" data-k="people" data-v="">ניקוי מספר האורחים</button>`);
    }
    const loose = Object.assign({}, f, { ci: "", co: "", tonight: false, weekend: false });
    const cands = S.listings.filter((l) => matches(l, loose)).slice(0, 6);
    if (!cands.length) return "";
    const range = `${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}`;
    const cards = cands.map((l) => {
      const free = T.freeUnits(l, f.ci, f.co);
      const cap = free.reduce((s, u) => s + (Number(u.guests_max) || 0), 0);
      const alt = T.nearestFit(l, f.ci, f.co, p);
      const now = !free.length ? "תפוס בתאריכים שלכם" : p ? `בתאריכים שלכם ${free.length === 1 ? "פנויה" : "פנויות"} ${plural.units(free.length)} לעד ${plural.guests(cap)}` : `${plural.units(free.length)} ${free.length === 1 ? "פנויה" : "פנויות"} בתאריכים שלכם`;
      const near = `<p class="near-line">${I("info")}<span>${now}</span></p>` + (alt ? `<div class="fn"><a href="#stay-${esc(l.id)}" data-act="quick-dates" data-ci="${alt.ci}" data-co="${alt.co}">${I("calendar")}פנוי${p ? " לכולם" : ""} ב־${T.fmtShort(alt.ci)}–${T.fmtShort(alt.co)}</a></div>` : "");
      return card(l, { near });
    });
    return `<div class="near-head">${I("search")}<div><h3>${p ? `אין מתחם פנוי ל־${plural.guests(p)} ב־${range}` : `אין מתחם פנוי ב־${range}`}</h3><p>אלה מתאימים לשאר מה שחיפשתם. ליד כל אחד: מה פנוי בתאריכים שלכם, ומתי הוא פנוי${p ? " לכל הקבוצה" : ""}.</p></div><button class="btn btn-line" type="button" data-act="unfilter" data-k="dates" data-v="">ניקוי התאריכים</button></div><div class="grid">${cards.join("")}</div>`;
  }
  function renderResults() {
    setTimeout(() => reveal($("#results") || document), 0);
    const res = applyFilters(S.listings, S.filters);
    S.lastResults = res.map((l) => l.id);
    const host = $("#results");
    if (!host) return;
    $("#count").textContent = res.length ? `${plural.stays(res.length)} (${res.length} תוצאות)` : "לא נמצאו מתחמים";
    const t = $("#search-title"); if (t) t.textContent = searchTitle(S.filters);
    const ab = $("#apply-btn"); if (ab) ab.textContent = res.length ? `הצגת ${plural.stays(res.length)}` : "אין תוצאות";
    if (S.map) { S.map.remove(); S.map = null; }
    const nm = !res.length ? nearMiss(S.filters) : "";
    if (nm) host.innerHTML = nm;
    else if (!res.length) host.innerHTML = emptyState("אין מתחמים שמתאימים לכל הסינונים", "נסו להסיר סינון אחד או לבחור תאריכים אחרים.", `<span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn btn-line" type="button" data-act="clear-all">ניקוי כל הסינונים</button></span>`);
    else if (S.filters.view === "map") { host.innerHTML = `<div class="map-wrap" id="map"></div>`; S.map = mountMap($("#map"), res); }
    else {
      const shown = res.slice(0, S.page * PAGE_SIZE);
      host.innerHTML = grid(shown) + (res.length > shown.length ? `<div class="load-more"><span class="hint">מוצגים ${shown.length} מתוך ${res.length}</span><button class="btn btn-line btn-lg" type="button" data-act="more">טעינת עוד מתחמים</button></div>` : "");
    }
    const f = S.filters, chips = [];
    if (f.place) chips.push(["place", "", placeLabel(f.place)]);
    if (f.town) chips.push(["town", "", f.town]);
    if (f.type) chips.push(["type", "", T.typeOf(f.type).plural]);
    if (f.ci && f.co) chips.push(["dates", "", `${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}`]);
    if (f.guests || f.children) chips.push(["people", "", `${f.guests ? plural.adults(f.guests) : ""}${f.guests && f.children ? " · " : ""}${f.children ? plural.kids(f.children) : ""}`]);
    if (f.units) chips.push(["units", "", `${f.units}+ יחידות`]);
    if (f.priceMax) chips.push(["priceMax", "", `עד ${T.money(f.priceMax)}`]);
    if (f.benefit) chips.push(["benefit", "", "הטבה ל" + T.benefitOf(f.benefit).name]);
    f.audience.forEach((a) => chips.push(["audience", a, (T.AUDIENCE.find((x) => x.key === a) || { name: a }).name]));
    f.amenities.forEach((a) => chips.push(["amenities", a, T.amenityOf(a).name]));
    [["tonight", "פנוי הלילה"], ["weekend", "פנוי בסופ״ש"], ["couplesOnly", "לזוגות בלבד"], ["quiet", "סביבה שקטה"], ["party", "מותר להרעיש"], ["lastminute", "דקה 90"], ["deals", "דילים"], ["exclusive", "בלעדי"], ["bestPrice", "מחיר הכי טוב"], ["isNew", "חדשים"]].forEach(([k, tx]) => { if (f[k]) chips.push([k, "", tx]); });
    if (f.q) chips.push(["q", "", `״${f.q}״`]);
    $("#active-chips").innerHTML = chips.map(([k, v, tx]) => `<button type="button" data-act="unfilter" data-k="${k}" data-v="${esc(v)}" aria-label="הסרת הסינון ${esc(tx)}">${esc(tx)} ${I("x")}</button>`).join("") + (chips.length > 1 ? `<button type="button" data-act="clear-all">ניקוי הכל</button>` : "");
    updateCounts();
    const seo = $("#seo-text");
    if (seo) seo.innerHTML = seoBlock(f, res);
  }
  /* טקסט וקישורים קשורים מתחת לתוצאות (כמו בדפי האזורים של אתרי הצימרים) */
  function seoBlock(f, res) {
    const r = f.place && !f.place.startsWith("area:") ? T.regionOf(f.place) : null;
    if (!r && !f.type && !f.amenities.length) return "";
    const related = [];
    if (r) {
      T.SEO_FEATURES.forEach((sf) => { const n = S.listings.filter((l) => l.region === r.key && (sf.audience ? (l.audience || []).includes(sf.key) : hasAmen(l, sf.key))).length; if (n) related.push([`#region-${r.key}/${sf.key}`, `צימרים ${sf.phrase} ${T.inPlace(r.name)}`]); });
      T.REGIONS.filter((x) => x.area === r.area && x.key !== r.key && has.region(x.key)).forEach((x) => related.push([`#region-${x.key}`, `צימרים ${T.inPlace(x.name)}`]));
    } else {
      T.REGIONS.filter((x) => has.region(x.key)).forEach((x) => related.push([`#region-${x.key}`, `צימרים ${T.inPlace(x.name)}`]));
    }
    const avgPrice = res.length ? Math.round(res.reduce((s, l) => s + T.fromPrice(l), 0) / res.length / 10) * 10 : 0;
    return `<section class="seo-block">${r ? `<h2>${esc(searchTitle(f))}</h2><p>${esc(r.blurb)}. ${res.length ? `באזור ${plural.stays(res.length)} שמתאימים לחיפוש, במחיר ממוצע של כ־${T.money(avgPrice)} ללילה באמצע שבוע. ` : ""}לכל מתחם יש יומן זמינות, מחירון מלא ואפשרות לשלוח בקשה ישירות למארחים, בלי עמלה.</p>` : ""}
      ${related.length ? `<h3>חיפושים קשורים</h3><p class="related">${related.slice(0, 14).map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join("")}</p>` : ""}</section>`;
  }
  function readFilters() {
    const form = $("#filters");
    if (!form) return;
    const fd = new FormData(form);
    const maxEl = form.elements.priceMax;
    const pm = Number(fd.get("priceMax"));
    const prevSort = S.filters.sort;
    Object.assign(S.filters, {
      q: (fd.get("q") || "").trim(), place: fd.get("place") || "", ci: fd.get("ci") || "", co: fd.get("co") || "",
      guests: Number(fd.get("guests")) || 0, children: Number(fd.get("children")) || 0, type: fd.get("type") || "", priceMax: maxEl && pm >= Number(maxEl.max) ? 0 : pm,
      audience: fd.getAll("audience"), amenities: fd.getAll("amenities"), benefit: fd.get("benefit") || "", units: Number(fd.get("units")) || 0,
      deals: !!fd.get("deals"), lastminute: !!fd.get("lastminute"), tonight: !!fd.get("tonight"), weekend: !!fd.get("weekend"),
      couplesOnly: !!fd.get("couplesOnly"), quiet: !!fd.get("quiet"), party: !!fd.get("party"), exclusive: !!fd.get("exclusive"), bestPrice: !!fd.get("bestPrice"), isNew: !!fd.get("isNew"), sort: fd.get("sort") || "rec"
    });
    if (S.filters.ci && S.filters.co && S.filters.co <= S.filters.ci) S.filters.co = "";
    S.page = 1;
    const po = $("#price-out"); if (po) po.textContent = S.filters.priceMax ? T.money(S.filters.priceMax) : "ללא הגבלה";
    try { sessionStorage.setItem("tamara.filters", JSON.stringify(S.filters)); } catch (e) {}
    if (S.filters.sort === "near" && !S.geo && prevSort !== "near") return locate();
    rememberSearch();
    renderResults();
  }
  /* מיון לפי מרחק: מיקום הדפדפן (רק אם הגולש מאשר) */
  function locate() {
    if (!navigator.geolocation) { T.toast("הדפדפן לא תומך באיתור מיקום"); S.filters.sort = "rec"; renderResults(); return; }
    T.toast("מאתרים את המיקום שלכם…");
    navigator.geolocation.getCurrentPosition(
      (p) => { S.geo = { lat: p.coords.latitude, lng: p.coords.longitude }; renderResults(); },
      () => { T.toast("לא הצלחנו לאתר מיקום. ממיינים לפי מומלצים."); S.filters.sort = "rec"; const s = $('select[name="sort"]'); if (s) s.value = "rec"; renderResults(); },
      { timeout: 10000, maximumAge: 600000 }
    );
  }
  /* חיפושים אחרונים (לאזור האישי) */
  const rememberSearch = T.debounce(() => {
    const f = S.filters;
    if (!(f.place || f.town || (f.ci && f.co) || f.amenities.length || f.type || f.audience.length)) return;
    const item = { f: Object.assign({}, f, { view: "list", sort: f.sort === "near" ? "rec" : f.sort }), label: searchTitle(f), dates: f.ci && f.co ? `${T.fmtShort(f.ci)}–${T.fmtShort(f.co)}` : "", at: new Date().toISOString() };
    S.searches = [item].concat(S.searches.filter((x) => !(x.label === item.label && x.dates === item.dates))).slice(0, 10);
    T.storage.set("tamara.searches", S.searches);
  }, 1500);

  /* ---------------------------------------------------------------- map (Leaflet + OpenStreetMap) */
  /* מפות של מסכים קודמים שכבר לא בדף: משחררים אותן (מאזיני resize וזיכרון), כדי שגלישה ארוכה לא תכביד */
  const liveMaps = [];
  function mountMap(el, list, opts) {
    opts = opts || {};
    if (!window.L || !el) { if (el) el.innerHTML = `<div class="empty" style="height:100%;border:0">${I("map")}<p>המפה לא נטענה.</p></div>`; return null; }
    for (let i = liveMaps.length - 1; i >= 0; i--) if (!liveMaps[i].getContainer().isConnected) { try { liveMaps[i].off(); liveMaps[i].remove(); } catch (e) {} liveMaps.splice(i, 1); }
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: !opts.mini, attributionControl: true });
    liveMaps.push(map);
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
      const c = T.coordsOf(l);
      pts.push([c.lat, c.lng]);
      return { l, ll: L.latLng(c.lat, c.lng) };
    });
    (opts.places || []).forEach((p) => { if (p.lat != null) { pts.push([p.lat, p.lng]); L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "tm", html: `<span class="pin pin-place">${I((T.PLACE_KINDS.find((k) => k.key === p.kind) || { icon: "pin" }).icon)}</span>`, iconSize: [0, 0] }), title: p.name }).bindPopup(`<div class="map-pop"><div><b class="n">${esc(p.name)}</b><span class="muted">${esc(p.settlement)}</span></div></div>`).addTo(map); } });
    const layer = L.layerGroup().addTo(map);
    const pop = (l) => `<a class="map-pop" href="#stay-${esc(l.id)}"><img src="${esc(T.thumbOf(l))}" alt=""><div><b class="n">${esc(l.name)}</b><span class="muted">${esc(l.settlement)} · ${esc(T.typeOf(l.type).name)}</span>${scoreHTML(l.id)}<span class="price"><b>${T.money(T.fromPrice(l))}</b>ללילה</span></div></a>`;
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
    else if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: opts.zoom || 11 });
    else map.setView([31.6, 35], 7);
    draw();
    setTimeout(() => map.invalidateSize(), 50);
    return map;
  }

  /* ---------------------------------------------------------------- stay page */
  const stayL = () => byId(S.stay.id);
  const calUnitOf = (l) => T.unitOf(l, S.stay.calUnit || (S.stay.rooms[0] || {}).unitId);
  function calendarHTML(l) {
    const st = S.stay;
    const units = T.unitsOf(l);
    const unit = calUnitOf(l);
    const start = st.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
    const manual = new Set(unit.blocked_dates || []);
    const synced = new Set(unit.ical_blocked || []);
    const blocked = T.blockedSet(unit);
    const todayISO = minDate();
    const limit = st.ci && !st.co ? [...blocked].filter((d) => d >= st.ci).sort()[0] || null : null;
    const month = (offset) => {
      const m = new Date(start.getFullYear(), start.getMonth() + offset, 1);
      let h = `<div class="dp-month"><div class="dp-mtitle">${T.fmtMonth(m)}</div><div class="dp-grid">${DOW.map((d) => `<span class="dp-dow">${d}</span>`).join("")}`;
      for (let i = 0; i < m.getDay(); i++) h += `<span class="dp-c dp-pad" aria-hidden="true"></span>`;
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const date = new Date(m.getFullYear(), m.getMonth(), d);
        const iso = T.iso(date);
        const cls = ["dp-c"];
        let disabled = false;
        if (iso < todayISO) { cls.push("off"); disabled = true; }
        if (blocked.has(iso)) {
          cls.push(synced.has(iso) && !manual.has(iso) ? "booked synced" : "booked");
          const okAsCheckout = st.ci && !st.co && iso > st.ci && (!limit || iso <= limit);
          if (!okAsCheckout) { disabled = true; cls.push("off"); }
        }
        if (st.ci && !st.co && limit && iso > limit) { disabled = true; cls.push("off"); }
        if (T.isWeekendNight(date)) cls.push("wknd");
        const hol = T.holidayOf(iso);
        if (hol) cls.push("hol");
        if (iso === todayISO) cls.push("today");
        if (iso === st.ci) cls.push("s-start");
        if (iso === st.co) cls.push("s-end");
        if (st.ci && !st.co && iso === st.ci) cls.push("s-one");
        if (st.ci && st.co && iso > st.ci && iso < st.co) cls.push("s-in");
        const label = `${T.fmtLong(iso)}${blocked.has(iso) ? ", תפוס" : ""}${hol ? ", " + hol.label : ""}`;
        h += `<span class="${cls.join(" ")}" data-iso="${iso}"><button type="button" class="dp-d" data-act="day" data-d="${iso}" ${disabled ? "disabled" : ""} aria-label="${label}" aria-pressed="${iso === st.ci || iso === st.co}">${d}</button></span>`;
      }
      return h + `</div></div>`;
    };
    const nN = st.ci && st.co ? T.nightsBetween(st.ci, st.co) : 0;
    return `<div class="cal-wrap dp-inline">
      ${units.length > 1 ? `<div class="seg-tabs cal-units" role="group" aria-label="יומן של יחידה">${units.map((u) => `<button type="button" data-act="cal-unit" data-id="${esc(u.id)}" aria-pressed="${u.id === unit.id}">${esc(u.name)}</button>`).join("")}</div>` : ""}
      <div class="dp-top"><div class="dp-chips"><span class="dp-chip ${!st.ci || st.co ? "on" : ""}"><small>הגעה</small><b>${st.ci ? T.fmtShort(st.ci) : "בחרו יום"}</b></span><span class="dp-to" aria-hidden="true">${I("fwd")}</span><span class="dp-chip ${st.ci && !st.co ? "on" : ""}"><small>עזיבה</small><b>${st.co ? T.fmtShort(st.co) : "בחרו יום"}</b></span>${nN ? `<em class="dp-n">${plural.nights(nN)}</em>` : ""}</div>
        <div class="dp-nav"><button class="dp-arrow" type="button" data-act="cal" data-d="-1" aria-label="החודש הקודם">${I("chev-r")}</button><button class="dp-arrow" type="button" data-act="cal" data-d="1" aria-label="החודש הבא">${I("chev-l")}</button></div></div>
      <div class="dp-months" style="--n:2">${month(0)}${month(1)}</div>
      <div class="dp-foot"><div class="dp-legend"><span><i class="lg-sel"></i>התאריכים שלכם</span><span><i class="lg-free"></i>פנוי</span><span><i class="lg-off"></i>תפוס</span><span><i class="lg-hol"></i>חג</span></div><span class="dp-hint" aria-live="polite">${units.length > 1 ? `${esc(unit.name)} · ` : ""}${st.ci && !st.co ? "עכשיו בחרו תאריך עזיבה" : st.ci && st.co ? "אפשר לשנות בלחיצה על יום אחר" : "בחרו תאריך הגעה בלוח"}</span>${st.ci ? `<button class="dp-clear" type="button" data-act="cal-clear">ניקוי</button>` : ""}</div>
    </div>`;
  }
  const opts = (from, to, sel, fmt) => Array.from({ length: to - from + 1 }, (_, k) => from + k).map((v) => `<option value="${v}" ${Number(sel) === v ? "selected" : ""}>${fmt(v)}</option>`).join("");
  function stayQuote(l) {
    const st = S.stay;
    return st.ci && st.co ? T.quote(l, st.ci, st.co, { rooms: st.rooms, extras: st.extras, coupon: st.coupon, pkg: st.pkg, benefit: st.benefit }) : null;
  }
  function bookHTML(l) {
    const st = S.stay;
    const units = T.unitsOf(l);
    const t = T.termsOf(l);
    const d = T.detailsOf(l);
    const main = T.unitOf(l, st.rooms[0].unitId);
    if (st.sent && st.sent.listing_id === l.id) {
      const s = st.sent;
      return `<div class="book" id="book"><div class="book-ok">
        <span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:1.8rem">הבקשה נשלחה למארחים</h3>
        <p class="muted">${esc(l.name)}${s.unit_name ? " · " + esc(s.unit_name) : ""} · ${T.fmtShort(s.check_in)} עד ${T.fmtShort(s.check_out)} · ${plural.adults(Number(s.guests))}${s.children ? " ו" + plural.kids(s.children) : ""}. המארחים יחזרו אליכם לטלפון ${esc(s.phone)}.</p>
        <a class="btn btn-primary btn-block" href="${esc(T.waLink(contactWA(l), waText(l, s)))}" target="_blank" rel="noopener" data-track="w">${I("chat")}להמשך השיחה בוואטסאפ</a>
        <a class="btn btn-line btn-block" href="#me-leads">${I("user")}הפניות שלי</a>
        <button class="btn btn-ghost btn-sm" type="button" data-act="book-again">בקשה נוספת</button></div></div>`;
    }
    const q = stayQuote(l);
    let quote = "";
    if (q) {
      const alt = q.conflicts.length ? T.altDates(l, st.ci, st.co, st.rooms.map((r) => r.unitId)) : null;
      quote = `<div class="quote" aria-live="polite">${q.lines.map((x) => `<div class="${x.amount < 0 ? "neg" : ""}"><span>${esc(x.label)}</span><span>${x.amount < 0 ? "−" : ""}${T.money(Math.abs(x.amount))}</span></div>`).join("")}
        <div class="total"><span>סה״כ משוער</span><b>${T.money(q.total)}</b></div></div>
        ${q.lastMinute ? `<p class="note note-info">${I("bolt")}<span>כולל הנחת דקה 90 של ${l.lastminute_pct}% על לילות הסופ״ש הקרוב.</span></p>` : ""}
        ${q.seasonPct ? `<p class="note note-info">${I("info")}<span>בתאריכים האלה חל מחיר עונה (+${q.seasonPct}%).</span></p>` : ""}
        ${q.conflicts.length ? `<div class="note note-warn">${I("info")}<span>תפוס בתאריכים האלה (${q.conflicts.map(T.fmtShort).join(", ")}). גמישים? אפשר לנסות:
            <span class="alt">${alt.units.slice(0, 3).map((u) => `<button type="button" data-act="alt-unit" data-id="${esc(u.id)}">${esc(u.name)} באותם תאריכים</button>`).join("")}${alt.dates.map((x) => `<button type="button" data-act="alt-dates" data-ci="${x.ci}" data-co="${x.co}">${fmtDay(x.ci)}–${fmtDay(x.co)}</button>`).join("")}</span></span></div>`
          : q.belowMin ? `<p class="note note-warn">${I("info")}<span>מינימום ${plural.nights(q.minNeeded)}${q.minReason ? " " + q.minReason : ""} במתחם הזה.</span></p>`
          : q.overCapacity ? `<p class="note note-warn">${I("info")}<span>יותר אורחים ממה שהיחידה מתאימה לו. בחרו יחידה גדולה יותר${units.length > 1 ? " או הוסיפו יחידה" : ""}.</span></p>`
          : `<p class="note note-ok">${I("check")}<span>התאריכים פנויים ביומן המארחים</span></p>`}`;
    }
    const used = new Set(st.rooms.map((r) => r.unitId));
    const roomRow = (r, i) => {
      const u = T.unitOf(l, r.unitId);
      return `<div class="book-room" data-row="${i}">
        ${units.length > 1 ? `<label class="field"><span>${st.rooms.length > 1 ? `יחידה ${i + 1}` : "יחידה"}</span><select class="select" name="unit-${i}">${units.map((x) => `<option value="${esc(x.id)}" ${x.id === u.id ? "selected" : ""} ${used.has(x.id) && x.id !== u.id ? "disabled" : ""}>${esc(x.name)} · עד ${x.guests_max} · ${T.money(x.price_weekday)}</option>`).join("")}</select></label>` : ""}
        <div class="book-row"><label class="field"><span>מבוגרים</span><select class="select" name="adults-${i}">${opts(1, Math.max(1, u.guests_max), r.guests, plural.adults)}</select></label>
        <label class="field"><span>ילדים${t.kids === "none" ? " (מבוגרים בלבד)" : t.kids === "age" && t.kids_age ? ` (מגיל ${t.kids_age})` : ""}</span><select class="select" name="kids-${i}" ${t.kids === "none" ? "disabled" : ""}>${opts(0, Math.max(0, u.guests_max - 1), r.children, (v) => (v ? plural.kids(v) : "ללא"))}</select></label></div>
        ${st.rooms.length > 1 ? `<button class="mini-btn" type="button" data-act="room-del" data-i="${i}" aria-label="הסרת היחידה">${I("x")}</button>` : ""}</div>`;
    };
    const phone = contactPhone(l);
    const host = d.host_name;
    const g = S.guest || {};
    const benefits = T.benefitsOf(l);
    return `<form class="book" id="book" data-form="book" novalidate>
      <div class="book-price"><span class="price">${units.length > 1 ? `<span class="from">החל מ־</span>` : ""}<b>${T.money(units.length > 1 ? T.fromPrice(l) : main.price_weekday)}</b>ללילה</span><span class="we">סופ״ש ${T.money(units.length > 1 ? T.weekendFrom(l) : main.price_weekend)}${main.price_holiday && units.length === 1 ? ` · חג ${T.money(main.price_holiday)}` : ""}</span></div>
      <div class="book-dates"><label class="field"><span>הגעה</span><input class="input" type="date" name="ci" min="${minDate()}" value="${esc(st.ci)}" required></label><label class="field"><span>עזיבה</span><input class="input" type="date" name="co" min="${esc(st.ci || minDate())}" value="${esc(st.co)}" required></label></div>
      <label class="check"><input type="checkbox" name="flexible" ${st.flexible ? "checked" : ""}><span>התאריכים שלנו גמישים (כמה ימים לפני או אחרי)</span></label>
      <div class="book-rooms">${st.rooms.map(roomRow).join("")}${units.length > 1 && st.rooms.length < units.length ? `<button class="btn btn-ghost btn-sm" type="button" data-act="room-add">${I("plus")}הזמנת יחידה נוספת</button>` : ""}</div>
      ${main.guests_base && l.extra_guest_price ? `<p class="hint">המחיר כולל ${main.guests_base} אורחים. כל מבוגר נוסף ${T.money(l.extra_guest_price)} ללילה${t.extra_child_price ? `, ילד ${T.money(t.extra_child_price)}` : ""}.</p>` : ""}
      ${(t.packages || []).length ? `<div class="field"><span>מה כלול</span><div class="extras"><label><span><input type="radio" name="pkg" value="" ${!st.pkg ? "checked" : ""}>לינה בלבד</span><em></em></label>${t.packages.map((p) => `<label><span><input type="radio" name="pkg" value="${esc(p.name)}" ${st.pkg === p.name ? "checked" : ""}>${esc(p.name)}</span><em>+${T.money(p.price)} ${esc(T.statusName(T.EXTRA_PER, p.per))}</em></label>`).join("")}</div></div>` : ""}
      ${(l.extras || []).length ? `<div class="field"><span>תוספות ושירותים</span><div class="extras">${l.extras.map((x) => `<label><span><input type="checkbox" name="extras" value="${esc(x.name)}" ${st.extras.includes(x.name) ? "checked" : ""}>${esc(x.name)}</span><em>${Number(x.price) ? `${T.money(x.price)} ${esc(T.statusName(T.EXTRA_PER, x.per))}` : "בתיאום"}</em></label>`).join("")}</div></div>` : ""}
      ${benefits.length ? `<label class="field"><span>מגיעה לכם הטבה?</span><select class="select" name="benefit"><option value="">ללא</option>${benefits.map((b) => `<option value="${b.key}" ${st.benefit === b.key ? "selected" : ""}>${esc(b.name)} · ${b.pct}% הנחה</option>`).join("")}</select></label>` : ""}
      ${(S.settings.coupons || []).some((c) => c.active !== false) ? `<label class="field"><span>קוד קופון</span><span class="coupon-row"><input class="input" name="coupon" value="${esc(st.coupon)}" autocomplete="off" placeholder="אם יש לכם">${st.coupon ? (T.couponOf(st.coupon) ? `<span class="pill pill-ok">הופעל</span>` : `<span class="pill pill-warn">לא בתוקף</span>`) : ""}</span></label>` : ""}
      ${quote}
      <label class="field"><span>שם מלא</span><input class="input" name="name" autocomplete="name" value="${esc(g.name || "")}" required></label>
      <label class="field"><span>טלפון נייד</span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" placeholder="050-0000000" value="${esc(g.phone || "")}" required></label>
      <label class="field"><span>אימייל (לא חובה, לאישור בכתב ולאזור האישי)</span><input class="input" name="email" type="email" autocomplete="email" dir="ltr" style="text-align:right" value="${esc(g.email || "")}"></label>
      <label class="field"><span>הערות למארחים</span><textarea class="textarea" name="message" rows="2" style="min-height:70px" placeholder="יום הולדת, מיטת תינוק, שעת הגעה…"></textarea></label>
      <label class="check"><input type="checkbox" name="remember" ${S.guest ? "checked" : ""}><span>לזכור את הפרטים שלי בדפדפן הזה, כדי שלא אצטרך למלא שוב</span></label>
      ${HP}<label class="check"><input type="checkbox" name="consent" required><span>אני מאשר/ת להעביר את הפרטים למארחי ${esc(l.name)} לצורך חזרה אליי, ומסכים/ה ל<a href="#terms" target="_blank" rel="noopener">תנאי השימוש והפרטיות</a></span></label>
      <p class="err" id="book-err" role="alert"></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">שליחת בקשת הזמנה</button>
      <a class="btn btn-line btn-block" href="${esc(T.waLink(contactWA(l), waText(l, { check_in: st.ci, check_out: st.co, guests: st.rooms.reduce((s2, r) => s2 + r.guests, 0), children: st.rooms.reduce((s2, r) => s2 + r.children, 0), unit_name: units.length > 1 ? st.rooms.map((r) => T.unitOf(l, r.unitId).name).join(", ") : "" })))}" target="_blank" rel="noopener" data-track="w">${I("chat")}שאלה למארחים בוואטסאפ</a>
      ${phone ? `<div class="contact-line"><span>${I("phone")} ${host ? `לשיחה עם ${esc(host)}` : "טלפון"}</span>${st.phone ? `<b><a href="tel:${esc(phone)}" data-track="c">${esc(phone)}</a></b><button class="mini-btn" type="button" data-act="copy" data-text="${esc(phone)}" aria-label="העתקת מספר הטלפון">${I("copy")}</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-act="reveal">הצגת מספר</button>`}</div>` : ""}
      <p class="hint">התשלום והאישור הסופי נעשים ישירות מול המארחים. המחיר משוער ועשוי להשתנות.</p>
    </form>`;
  }
  function waText(l, s) {
    const parts = [`שלום, ראיתי את ${l.name} באתר ${S.settings.site_name}.`];
    if (s && s.unit_name) parts.push(`יחידה: ${s.unit_name}.`);
    if (s && s.check_in && s.check_out) parts.push(`תאריכים: ${T.fmtDate(s.check_in)} עד ${T.fmtDate(s.check_out)} (${plural.nights(T.nightsBetween(s.check_in, s.check_out))}).`);
    if (s && s.guests) parts.push(`מבוגרים: ${s.guests}${s.children ? `, ילדים: ${s.children}` : ""}.`);
    if (s && s.name) parts.push(`שמי ${s.name}.`);
    parts.push("האם פנוי?");
    return parts.join(" ");
  }
  /* שאלות נפוצות: נבנות מהנתונים של המתחם + שאלות שהמארח הוסיף */
  const faqOf = (l) => T.faqOf(l, ratingOf(l.id));

  const cancelLines = T.cancelLines;

  function reviewsHTML(l) {
    const st = S.stay;
    const all = S.reviews.filter((r) => r.listing_id === l.id);
    const rt = ratingOf(l.id);
    if (!all.length) return `<p class="muted">עוד אין חוות דעת. רק אורחים שההזמנה שלהם אושרה מקבלים קישור לכתיבה.</p>`;
    const sorted = all.slice().sort(st.revSort === "high" ? (a, b) => b.rating - a.rating : st.revSort === "low" ? (a, b) => a.rating - b.rating : (a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const s10 = T.score10(rt.avg);
    const cats = T.REVIEW_CATS.filter((c) => rt.cats[c.key]);
    return `<div class="rev-summary"><span class="big">${s10.toFixed(1)}</span><span><b style="font-size:var(--t-l)">${T.scoreLabel(s10)}</b><br>${T.stars(rt.avg, "lg")}<br><span class="muted" style="font-size:var(--t-s)">${plural.reviews(rt.n)} מאורחים שהזמינו דרך האתר</span></span></div>
      ${cats.length ? `<div class="rev-cats">${cats.map((c) => { const v = T.score10(rt.cats[c.key]); return `<div><span>${T.pic(c.pic)}${esc(c.name)}</span><span class="bar"><i style="width:${v * 10}%"></i></span><b>${v.toFixed(1)}</b></div>`; }).join("")}</div>` : ""}
      <div class="rev-tools"><span class="seg-tabs" role="group" aria-label="מיון חוות דעת">${[["new", "חדשות"], ["high", "גבוהות"], ["low", "נמוכות"]].map(([k, t]) => `<button type="button" data-act="rev-sort" data-v="${k}" aria-pressed="${st.revSort === k}">${t}</button>`).join("")}</span></div>
      <div class="rev-list">${sorted.slice(0, st.revShow).map((r) => `<div class="rev"><div class="rev-top"><b class="score">${T.score10(r.rating).toFixed(0)}</b><span><b>${esc(r.title || "")}</b><span class="muted">${r.unit_name ? esc(r.unit_name) + " · " : ""}${r.stay_month ? "התארחו ב" + esc(r.stay_month) : ""}</span></span></div><p>${esc(r.text)}</p>${r.reply ? `<p class="reply"><b>תגובת המארחים:</b> ${esc(r.reply)}</p>` : ""}<div class="who"><b>${esc(r.name)}</b><span class="verified">${I("shield")}הזמנה מאומתת</span></div></div>`).join("")}</div>
      ${sorted.length > st.revShow ? `<button class="btn btn-line" type="button" data-act="rev-more" style="margin-top:14px">עוד ${sorted.length - st.revShow} חוות דעת</button>` : ""}`;
  }
  /* ---------------------------------------------------------------- האזור של המתחם (v6)
     בתחתית עמוד המתחם: מה עושים באזור לפי קטגוריות ולפי המרחק מהמתחם, כתבות מהמגזין על האזור,
     והמלצות אישיות של המארחים. זמן הנסיעה משוער (קו אווירי × 1.35 במהירות ממוצעת של 52 קמ״ש). */
  const driveMin = (km) => Math.max(5, Math.round(((km * 1.35) / 52) * 60 / 5) * 5);
  const kindOf = (k) => T.PLACE_KINDS.find((x) => x.key === k) || T.PLACE_KINDS[3];
  function areaPlaces(l) {
    const c = T.coordsOf(l);
    return S.places.filter((p) => p.active !== false && p.lat != null).map((p) => Object.assign({}, p, { km: T.distKm(c, { lat: p.lat, lng: p.lng }) })).filter((p) => p.km <= 55).sort((a, b) => a.km - b.km);
  }
  function areaArticles(l) {
    const reg = T.regionOf(l.region);
    return S.articles.filter((a) => (a.regions || []).some((r) => r === l.region || r === "area:" + reg.area));
  }
  const placeCard = (p, extra) => {
    const k = kindOf(p.kind);
    const min = p.km != null ? driveMin(p.km) : null;
    /* בלי תמונה משלו: תמונה חופשית מוויקישיתוף (נאספת בבנייה) */
    const wp = !p.photo && T.PLACE_PHOTOS ? T.PLACE_PHOTOS[p.id] : null;
    return `<article class="ar-card k-${esc(k.key)}">
      <div class="ar-media">${p.photo ? `<img src="${esc(T.img(p.photo, 520))}" alt="${esc(p.name)}" loading="lazy">${p.photo_credit ? `<small class="ar-credit">צילום: ${esc(p.photo_credit)}</small>` : ""}` : wp ? `<img src="${esc(wp.src)}" alt="${esc(p.name)}" loading="lazy"><a class="ar-credit" href="${esc(wp.link)}" target="_blank" rel="noopener license" title="פרטי התמונה והרישיון בוויקישיתוף">צילום: ${esc(wp.credit)}</a>` : `<span class="ar-art" aria-hidden="true">${I(k.icon)}</span>`}${min ? `<span class="ar-time">${I("car2")}${min} דק׳</span>` : ""}</div>
      <div class="ar-body"><span class="ar-kind">${T.pic(k.pic)}${esc(k.one)}${p.settlement ? ` · ${esc(p.settlement)}` : ""}</span><h3>${esc(p.name)}</h3>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}
        ${min ? `<p class="ar-meta">${T.kmText(p.km)} מהמתחם · כ־${min} דקות נסיעה</p>` : ""}${extra || ""}
        <div class="ar-acts"><a href="${esc(T.wazeLink(p.name, p.lat, p.lng))}" target="_blank" rel="noopener" aria-label="ניווט ב־Waze אל ${esc(p.name)}">${I("nav")}Waze</a><a href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener" aria-label="מסלול ב־Google Maps אל ${esc(p.name)}">${I("pin")}מסלול</a><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + (p.settlement ? " " + p.settlement : ""))}" target="_blank" rel="noopener" aria-label="תמונות וביקורות על ${esc(p.name)} ב־Google (נפתח בחלון חדש)">${I("image")}תמונות וביקורות</a>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${I("external")}אתר</a>` : ""}</div></div></article>`;
  };
  const artCard = (a) => `<a class="ar-art-card" href="#article-${esc(a.id)}">${a.cover ? `<img src="${esc(T.img(a.cover, 520))}" alt="" loading="lazy">` : ""}<span><small>${I("book")}מהמגזין</small><b>${esc(a.title)}</b>${a.excerpt ? `<em>${esc(a.excerpt)}</em>` : ""}<i>לקריאה ${I("fwd")}</i></span></a>`;
  function areaHTML(l) {
    const reg = T.regionOf(l.region);
    const list = areaPlaces(l);
    const arts = areaArticles(l);
    const general = arts.length ? [] : S.articles.filter((a) => !(a.regions || []).length).slice(0, 3);
    const hostTxt = String(((T.detailsOf(l).sections || {}).area) || "").trim();
    const host = T.detailsOf(l).host_name;
    if (!list.length && !arts.length && !general.length && !hostTxt) return "";
    const tabs = [list.length && ["todo", "מה עושים באזור", list.length, "map"], (arts.length || general.length) && ["mag", "מהמגזין", arts.length || general.length, "book"], hostTxt && ["host", "המלצות המארחים", "", "user"]].filter(Boolean);
    const st = S.stay;
    const tab = tabs.some((t) => t[0] === st.areaTab) ? st.areaTab : tabs[0][0];
    const kinds = T.PLACE_KINDS.filter((k) => list.some((p) => p.kind === k.key));
    const cur = kinds.some((k) => k.key === st.placeKind) ? st.placeKind : "";
    const shown = list.filter((p) => !cur || p.kind === cur).slice(0, st.areaMore ? 40 : 9);
    const total = list.filter((p) => !cur || p.kind === cur).length;
    let pane = "";
    if (tab === "todo") pane = `<div class="ar-kinds" role="group" aria-label="סוג מקום"><button type="button" data-act="place-kind" data-v="" aria-pressed="${!cur}">הכל<b>${list.length}</b></button>${kinds.map((k) => `<button type="button" data-act="place-kind" data-v="${k.key}" aria-pressed="${cur === k.key}">${T.pic(k.pic)}${esc(k.name)}<b>${list.filter((p) => p.kind === k.key).length}</b></button>`).join("")}</div>
      <div class="ar-grid">${shown.map(placeCard).join("")}</div>
      ${total > shown.length ? `<button class="btn btn-line ar-more" type="button" data-act="area-more">${I("plus")}עוד ${total - shown.length} מקומות באזור</button>` : ""}
      <p class="ar-note">${I("info")}זמני הנסיעה משוערים לפי מרחק. התמונות והביקורות נפתחות ב־Google, והמידע על שעות פתיחה ומחירים מתעדכן אצל האתרים עצמם.</p>`;
    else if (tab === "mag") pane = `<div class="ar-mag">${(arts.length ? arts : general).slice(0, 6).map(artCard).join("")}</div><a class="link-more" href="#magazine" style="margin-top:12px">לכל הכתבות במגזין ${I("fwd")}</a>`;
    else pane = `<div class="ar-host"><span class="ar-host-av">${I("user")}</span><div><b>${host ? `${esc(host)} ממליצים` : "המארחים ממליצים"}</b>${hostTxt.split(/\n\s*\n|\n/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join("")}</div></div>`;
    return `<section class="area-sec" id="area" aria-labelledby="h-area">
      <div class="area-head"><div><span class="eyebrow">${I("pin")} ${esc(l.settlement || reg.name)} והסביבה</span><h2 id="h-area">האזור של ${esc(l.name)}</h2></div>
        <div class="area-tabs" role="tablist" aria-label="על האזור">${tabs.map(([k, n, c, ic]) => `<button type="button" role="tab" data-act="area-tab" data-v="${k}" aria-selected="${tab === k}">${I(ic)}${n}${c ? `<b>${c}</b>` : ""}</button>`).join("")}</div></div>
      <div class="area-pane" role="tabpanel">${pane}</div></section>`;
  }
  const placeItem = (p) => { const k = T.PLACE_KINDS.find((x) => x.key === p.kind) || T.PLACE_KINDS[1]; return `<div class="place">${p.photo ? `<img src="${esc(T.img(p.photo, 300))}" alt="" loading="lazy">` : `<span class="place-ic">${T.pic(k.pic, "pic-l")}</span>`}<div><b>${esc(p.name)}</b><span class="muted">${esc(k.one)} · ${esc(p.settlement || T.regionOf(p.region).name)}${p.km != null ? ` · ${T.kmText(p.km)}` : ""}</span>${p.blurb ? `<p>${esc(p.blurb)}</p>` : ""}<span class="place-links">${p.phone ? `<a href="tel:${esc(p.phone)}" dir="ltr">${I("phone")}${esc(p.phone)}</a>` : ""}${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${I("external")}לאתר</a>` : ""}${p.lat != null ? `<a href="${esc(T.wazeLink(p.name, p.lat, p.lng))}" target="_blank" rel="noopener">${I("nav")}Waze</a>` : ""}</span></div></div>`; };
  function priceTableHTML(l) {
    const units = T.unitsOf(l);
    const t = T.termsOf(l);
    const anyHol = units.some((u) => u.price_holiday);
    const any2 = units.some((u) => u.p2_weekday || u.p2_weekend);
    const rows = units.map((u) => `<tr><th scope="row">${esc(units.length > 1 ? u.name : "ללילה")}${units.length > 1 ? `<small>עד ${u.guests_max} אורחים</small>` : ""}</th><td>${T.money(u.price_weekday)}</td>${any2 ? `<td>${u.p2_weekday ? T.money(u.p2_weekday) : "—"}</td>` : ""}<td>${T.money(u.price_weekend)}</td>${any2 ? `<td>${u.p2_weekend ? T.money(u.p2_weekend) : "—"}</td>` : ""}${anyHol ? `<td>${u.price_holiday ? T.money(u.price_holiday) : "—"}</td>` : ""}</tr>`).join("");
    const notes = [
      l.extra_guest_price && `מבוגר נוסף: ${T.money(l.extra_guest_price)} ללילה`, t.extra_child_price && `ילד נוסף: ${T.money(t.extra_child_price)} ללילה`,
      `מינימום ${plural.nights(l.min_nights)}`, t.min_weekend > 1 && `בסופ״ש מינימום ${plural.nights(t.min_weekend)}`, t.min_holiday > 1 && `בחגים מינימום ${plural.nights(t.min_holiday)}`,
      ...(l.seasons || []).map((s) => `${s.label || "עונה"} (${T.fmtShort(s.from)}–${T.fmtShort(s.to)}): ${s.pct > 0 ? "+" : ""}${s.pct}%${s.min ? `, מינימום ${plural.nights(s.min)}` : ""}`)
    ].filter(Boolean);
    return `<section class="stay-section" id="prices"><h2>מחירון</h2><div class="table-scroll"><table class="price-table"><thead><tr><th></th><th>אמצ״ש</th>${any2 ? "<th>אמצ״ש · מ־2 לילות</th>" : ""}<th>סופ״ש</th>${any2 ? "<th>סופ״ש · מ־2 לילות</th>" : ""}${anyHol ? "<th>חג</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint" style="margin-top:10px">${notes.map(esc).join(" · ")}. סופ״ש = לילות חמישי ושישי. ${t.price_note ? esc(t.price_note) : ""}</p></section>`;
  }
  /* רעש וסביבה: מה המארח הצהיר (רמת שקט, מקורות רעש, ומה מותר להרעיש ולמה) */
  function noiseHTML(l) {
    const nz = T.noiseOf(l);
    if (!nz.set && !nz.note) return "";
    const tone = nz.party ? "party" : nz.level ? nz.level.key : "normal";
    const head = nz.party ? "מותר להרעיש" : nz.level ? nz.level.name : "רעש וסביבה";
    const lines = [];
    if (nz.party && nz.allowed.length) lines.push(`<li>${I("mic")}<span><b>מה מותר:</b> ${esc(nz.allowed.join(", "))}</span></li>`);
    if (nz.party && nz.reasons.length) lines.push(`<li>${I("tree")}<span><b>למה זה בסדר:</b> ${esc(nz.reasons.join(", "))}</span></li>`);
    if (nz.party && nz.quiet_from) lines.push(`<li>${I("moon")}<span><b>שעות שקט:</b> מ־${esc(nz.quiet_from)}</span></li>`);
    if (!nz.party && nz.level && nz.level.key === "quiet") lines.push(`<li>${I("leaf")}<span>סביבה שקטה, בלי מקורות רעש קבועים בסביבה.</span></li>`);
    if (nz.sources.length) lines.push(`<li>${I("info")}<span><b>בסביבה:</b> ${esc(nz.sources.join(", "))}</span></li>`);
    return `<section class="stay-section" id="noise"><h2>רעש וסביבה</h2><div class="noise-box noise-${tone}"><b>${I(nz.party ? "mic" : tone === "quiet" ? "leaf" : "info")}${esc(head)}</b>
      ${lines.length ? `<ul>${lines.join("")}</ul>` : ""}${nz.note ? `<p>${esc(nz.note)}</p>` : ""}<small class="muted">לפי הצהרת המארחים${nz.locked ? " ובדיקת צוות האתר" : ""}.</small></div></section>`;
  }
  function policiesHTML(l) {
    const t = T.termsOf(l), d = T.detailsOf(l);
    const kids = t.kids === "none" ? "מבוגרים בלבד" : t.kids === "age" ? `ילדים מגיל ${t.kids_age || "—"}` : t.kids === "welcome" ? "ילדים מתקבלים בברכה" : "";
    const smoke = (T.SMOKING_POLICY.find((x) => x.key === t.smoking) || {}).name;
    const items = [
      (t.checkin || t.checkout) && [I("clock"), "כניסה ויציאה", `כניסה מ־${t.checkin || "15:00"} · יציאה עד ${t.checkout || "11:00"}${t.checkin_sat || t.checkout_sat ? `<br><span class="muted">בשבת: כניסה ${esc(t.checkin_sat || "—")} · יציאה ${esc(t.checkout_sat || "—")}</span>` : ""}`],
      kids && [I("users"), "ילדים", kids],
      [I("paw"), "בעלי חיים", hasAmen(l, "pets") ? "מקבלים כלבים" : "לא מקבלים בעלי חיים"],
      t.smoking && [I("flame"), "עישון", smoke]
    ].filter(Boolean);
    const cancel = cancelLines(t.cancel);
    return `<section class="stay-section" id="policies"><h2>חשוב לדעת לפני ההזמנה</h2>
      <div class="policy-grid">${items.map(([ic, h, v]) => `<div>${ic}<span><b>${h}</b>${v}</span></div>`).join("")}</div>
      ${cancel.length || t.cancel_note ? `<h3 class="sub-h">מדיניות ביטול</h3><ul class="tiers">${cancel.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>${t.cancel_note ? `<p class="hint">${esc(t.cancel_note)}</p>` : ""}` : ""}
      ${(d.rules || []).length ? `<h3 class="sub-h">חוקי הבית</h3><ul class="rules">${d.rules.map((x) => `<li>${I("check")}${esc(x)}</li>`).join("")}</ul>` : ""}
      <p class="hint" style="margin-top:14px">ביטול עסקה נעשה מול המארחים ובהתאם לחוק הגנת הצרכן. <button class="link-btn" type="button" data-act="report">${I("flag")}המידע לא מדויק? דווחו לנו</button></p></section>`;
  }
  function unitsHTML(l) {
    const units = T.unitsOf(l);
    if (units.length < 2) return "";
    return `<section class="stay-section" id="units"><h2>היחידות במתחם</h2><div class="units-detail">${units.map((u) => {
      const spec = [`${I("users")} עד ${u.guests_max}`, `${I("bed")} ${plural.bedrooms(u.bedrooms || 1)}`, u.beds && `${u.beds} מיטות`, u.bathrooms && `${I("bath")} ${u.bathrooms} חדרי רחצה`, u.size && `${u.size} מ״ר`, u.ical_url && `${I("sync")} יומן מסונכרן`].filter(Boolean);
      const am = (u.amenities || []).map(T.amenityOf);
      const pickedRow = S.stay.rooms.some((r) => r.unitId === u.id);
      return `<article class="unit-card ${pickedRow ? "on" : ""}">${u.photos.length ? `<button type="button" class="unit-pic" data-act="lb-unit" data-id="${esc(u.id)}" aria-label="תמונות של ${esc(u.name)}"><img src="${esc(T.img(u.photos[0], 600))}" alt="${esc(u.name)}" loading="lazy">${u.photos.length > 1 ? `<span class="chip">${I("image")}${u.photos.length}</span>` : ""}</button>` : ""}
        <div class="unit-body"><h3>${esc(u.name)}</h3><p class="meta">${spec.map((x) => `<span>${x}</span>`).join("")}</p>${u.desc ? `<p>${esc(u.desc)}</p>` : ""}
          ${am.length ? `<p class="unit-amen">${am.slice(0, 6).map((a) => `<span>${T.pic(a.pic)}${esc(a.name)}</span>`).join("")}${am.length > 6 ? `<span>+${am.length - 6}</span>` : ""}</p>` : ""}
          <div class="unit-foot"><span class="price"><b>${T.money(u.price_weekday)}</b>ללילה<small>סופ״ש ${T.money(u.price_weekend)}</small></span><button class="btn ${pickedRow ? "btn-primary" : "btn-line"} btn-sm" type="button" data-act="unit" data-id="${esc(u.id)}" aria-pressed="${pickedRow}">${pickedRow ? `${I("check")}נבחרה` : "בחירת היחידה"}</button></div></div></article>`;
    }).join("")}</div></section>`;
  }
  function viewStay(id) {
    const l = byId(id);
    if (!l) return `<div class="view wrap page">${emptyState("המתחם לא נמצא", "ייתכן שהוסר מהאתר או שהקישור שגוי.", `<a class="btn btn-primary" href="#search">לכל המתחמים</a>`)}</div>`;
    const st = S.stay;
    if (st.id !== id) {
      const units = T.unitsOf(l);
      const g = Math.max(1, S.filters.guests || 2), c = S.filters.children || 0;
      const f = S.filters;
      const fit = units.find((u) => u.guests_max >= g + c && (!(f.ci && f.co) || T.unitFree(u, f.ci, f.co))) || units.find((u) => u.guests_max >= g + c) || units[0];
      Object.assign(st, { id, rooms: [{ unitId: fit.id, guests: Math.min(fit.guests_max, g), children: Math.min(Math.max(0, fit.guests_max - Math.min(fit.guests_max, g)), c) }], ci: f.ci, co: f.co, extras: [], coupon: "", pkg: "", benefit: f.benefit && T.benefitsOf(l).some((b) => b.key === f.benefit) ? f.benefit : "", flexible: false, calUnit: fit.id, calStart: null, sent: null, phone: false, video: false, revSort: "new", revShow: 6, placeKind: "", lbCat: "all" });
      if (st.ci) { const d = T.parseISO(st.ci); st.calStart = new Date(d.getFullYear(), d.getMonth(), 1); }
    }
    if (!S.viewed.has(id)) {
      S.viewed.add(id); T.store.track(id, "v");
      S.viewedList = [id].concat(S.viewedList.filter((x) => x !== id)).slice(0, 30);
      T.storage.set("tamara.viewed", S.viewedList);
    }
    const reg = T.regionOf(l.region), typ = T.typeOf(l.type);
    const d = T.detailsOf(l), t = T.termsOf(l);
    const photos = T.photosOf(l);
    const allPhotos = T.photosOf(l, true);
    const saved = S.saved.has(l.id);
    const units = T.unitsOf(l);
    const rt = ratingOf(l.id);
    const here = T.coordsOf(l);
    const nearby = S.listings.filter((x) => x.id !== l.id).map((x) => ({ x, km: T.distKm(here, T.coordsOf(x)) })).filter((o) => o.km <= 60).sort((a, b) => a.km - b.km).slice(0, 3);
    const sameTown = S.listings.filter((x) => x.id !== l.id && x.settlement === l.settlement).length;
    /* מארח עם כמה מתחמים: כל מתחם בדף משלו, ובתחתית קישור לשאר המתחמים שלו */
    const sameHost = l.owner_id ? S.listings.filter((x) => x.id !== l.id && x.owner_id === l.owner_id).slice(0, 8) : [];
    const desc = (l.description || "").split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
    const lm = T.lastMinuteActive(l);
    const benefits = T.benefitsOf(l);
    const badges = T.badgesOf(l, { ratings: S.ratings, top: S.top, settings: S.settings });
    const sec = d.sections || {};
    const secCards = [["location", "לוקיישן", "pin"], ["vibe", "אווירה", "sparkle"], ["facilities", "מתקנים", "home"]].filter(([k]) => sec[k]);
    const good = String(sec.good || "").split(/\n+/).filter(Boolean);
    const idx = S.lastResults.indexOf(l.id);
    const prevId = idx > 0 ? S.lastResults[idx - 1] : "", nextId = idx >= 0 && idx < S.lastResults.length - 1 ? S.lastResults[idx + 1] : "";
    const faq = faqOf(l);
    const groups = T.AMENITY_GROUPS.map((g) => ({ g, items: T.AMENITIES.filter((a) => a.group === g.key && (l.amenities || []).includes(a.key)) })).filter((x) => x.items.length);
    const viewedOthers = S.viewedList.filter((x) => x !== l.id).map(byId).filter(Boolean).slice(0, 8);
    return `<div class="view wrap page">
      ${idx >= 0 ? `<div class="stay-nav"><a class="link-more" href="#search">${I("back")}חזרה לתוצאות</a><span>${prevId ? `<a class="link-more" href="#stay-${esc(prevId)}">${I("chev-r")}הקודם</a>` : ""}<span class="muted">${idx + 1} מתוך ${S.lastResults.length}</span>${nextId ? `<a class="link-more" href="#stay-${esc(nextId)}">לצימר הבא${I("chev-l")}</a>` : ""}</span></div>` : ""}
      <div class="stay-head">
        <div>
          <nav class="crumbs" aria-label="פירורי לחם"><a href="#">ראשי</a><span>›</span><a href="#area-${reg.area}">${esc(T.typeOf(l.type).plural)} ב${esc(T.AREAS[reg.area])}</a><span>›</span><a href="#region-${reg.key}">${esc(reg.name)}</a><span>›</span><a href="#town-${encodeURIComponent(l.settlement)}">${esc(l.settlement)}</a></nav>
          <span class="eyebrow">${esc(typ.name)} · ${esc(l.settlement)}</span>
          <h1>${esc(l.name)}</h1>
          <div class="sub">${rt ? scoreHTML(l.id, true) : ""}<span>${I("pin")}${esc(l.settlement)} • ${esc(reg.name)}${units.length > 1 ? ` • ${units.length} ${esc(typ.plural)}` : ""}</span>${d.host_name ? `<span>${I("user")}המארחים: ${esc(d.host_name)}</span>` : ""}${(l.audience || []).length ? `<span>${I("users")}מתאים ל: ${l.audience.map((a) => (T.AUDIENCE.find((x) => x.key === a) || { name: a }).name).join(", ")}</span>` : ""}${T.isSponsored(l) ? `<span class="pill pill-muted">${I("megaphone")}מיקום ממומן</span>` : ""}</div>
          ${badges.length ? `<div class="badges" style="margin-top:10px">${badges.map((b) => `<span class="badge b-${b.k}">${I(b.icon)}${esc(b.t)}</span>`).join("")}${l.featured ? `<span class="badge">${I("star")}נבחרי העונה</span>` : ""}</div>` : ""}
        </div>
        <div class="stay-actions">
          <button class="btn btn-line" type="button" data-act="save" data-id="${esc(l.id)}" aria-pressed="${saved}">${I("heart")}${saved ? "במועדפים" : "אהבתי"}</button>
          <button class="btn btn-line" type="button" data-act="share">${I("share")}שיתוף</button>
          <button class="btn btn-line" type="button" data-act="to-message">${I("chat")}הודעה</button>
        </div>
      </div>
      <div class="gallery n${Math.min(5, photos.length)}">${photos.slice(0, 5).map((p, i) => `<button type="button" data-act="lb" data-i="${i}" aria-label="פתיחת תמונה ${i + 1} מתוך ${allPhotos.length}"><img src="${esc(i && photos.length >= 5 ? p.thumb : p.src)}" alt="${esc(imgAlt(p, l, i))}" ${i ? 'loading="lazy"' : ""}>${i === 0 && allPhotos.length > 1 ? `<span class="chip all">${I("image")}לגלריה · ${allPhotos.length} תמונות</span>` : ""}</button>`).join("")}</div>
      ${photos[0] && photos[0].real ? "" : `<p class="illus-note">${I("info")}איור להמחשה. המארחים יעלו כאן תמונות אמיתיות.</p>`}
      <div class="stay-layout">
        <div>
          <nav class="stay-tabs" role="tablist" aria-label="תוכן הדף">${[["over", "סקירה"], units.length > 1 && ["units", "יחידות"], ["prices", "מחירון"], ["amen", "מה יש במתחם"], ["avail", "זמינות"], ["reviews", `חוות דעת${rt ? ` (${rt.n})` : ""}`], ["info", "מדיניות ושאלות"], ["map", "מפה"]].filter(Boolean).map(([k, label]) => `<button type="button" role="tab" data-act="st-pane" data-v="${k}" aria-selected="${k === "over"}" aria-controls="pane-${k}">${label}</button>`).join("")}<a href="#area" data-act="jump" data-to="area">מה עושים באזור</a></nav>
          <div class="st-panes">
          <div class="st-pane" id="pane-over" role="tabpanel">
            <div class="facts-row">
              <div class="fact">${T.pic("fact-guests", "pic-l")}<div><b>עד ${T.capacity(l)}</b><span>אורחים</span></div></div>
              ${units.length > 1 ? `<div class="fact">${T.pic("fact-units", "pic-l")}<div><b>${units.length}</b><span>יחידות במתחם</span></div></div>` : `<div class="fact">${T.pic("fact-bedrooms", "pic-l")}<div><b>${l.bedrooms}</b><span>חדרי שינה</span></div></div>`}
              <div class="fact">${T.pic("fact-baths", "pic-l")}<div><b>${l.bathrooms}</b><span>חדרי רחצה</span></div></div>
              <div class="fact">${T.pic("fact-minnights", "pic-l")}<div><b>${l.min_nights}</b><span>לילות מינימום</span></div></div>
              ${t.checkin ? `<div class="fact">${T.pic("fact-checkin", "pic-l")}<div><b>${esc(t.checkin)}</b><span>כניסה</span></div></div>` : ""}
            </div>
            ${lm ? `<div class="deal-box lm">${I("bolt")}<div><b>דקה 90 · ‎-${l.lastminute_pct}%</b><div>הנחה על לילות ${T.lastMinuteNights().map(T.fmtLong).join(" ו")}, אם עדיין פנויים.</div></div></div>` : ""}
            ${l.deal_label ? `<div class="deal-box">${I("tag")}<div><b>${esc(l.deal_label)}</b><div>${esc(l.deal_text)}</div></div></div>` : ""}
            ${benefits.length ? `<div class="deal-box benefit">${T.pic("ben-reservists", "pic-l")}<div><b>הטבות</b><div>${benefits.map((b) => `${b.pct}% הנחה ל${b.name}`).join(" · ")}. בוחרים את ההטבה בטופס ההזמנה.</div></div></div>` : ""}
            <div class="bento">
              <section class="stay-section box tone-a wide"><h2>על המקום</h2><div class="prose clamp" id="about-text"><p class="lead">${esc(l.tagline)}</p>${desc}</div>${(l.description || "").length > 380 ? `<button type="button" class="link-btn" data-act="more-desc" aria-expanded="false" aria-controls="about-text">קראו עוד</button>` : ""}
                ${secCards.length ? `<div class="about-cards">${secCards.map(([k, h, ic]) => `<div>${I(ic)}<b>${h}</b><p>${esc(sec[k])}</p></div>`).join("")}</div>` : ""}</section>
              ${(d.included || []).length ? `<section class="stay-section box tone-b"><h2>מה כלול באירוח</h2><p class="incl">${d.included.map((x) => `<span>${I("check")}${esc(x)}</span>`).join("")}</p></section>` : ""}
              ${good.length ? `<section class="stay-section box tone-c"><h2>טוב לדעת</h2><ul class="good-list">${good.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
              ${(t.packages || []).length || (l.extras || []).length ? `<section class="stay-section box tone-b"><h2>חבילות ותוספות</h2><div class="extra-list">${(t.packages || []).map((p) => `<div><span>${I("coffee")}${esc(p.name)}</span><b>${T.money(p.price)} <small>${esc(T.statusName(T.EXTRA_PER, p.per))}</small></b></div>`).join("")}${(l.extras || []).map((x) => `<div><span>${I("gift")}${esc(x.name)}</span><b>${Number(x.price) ? `${T.money(x.price)} <small>${esc(T.statusName(T.EXTRA_PER, x.per))}</small>` : "<small>בתיאום מראש</small>"}</b></div>`).join("")}</div></section>` : ""}
              ${noiseHTML(l).replace('class="stay-section"', 'class="stay-section box tone-c"')}
              ${l.video_url ? `<section class="stay-section box tone-a wide"><h2>סרטון</h2><div id="video">${videoHTML(l)}</div></section>` : ""}
            </div>
          </div>
          ${units.length > 1 ? `<div class="st-pane" id="pane-units" role="tabpanel" hidden>${unitsHTML(l)}</div>` : ""}
          <div class="st-pane" id="pane-prices" role="tabpanel" hidden>${priceTableHTML(l)}</div>
          <div class="st-pane" id="pane-amen" role="tabpanel" hidden><section class="stay-section"><h2>מה יש במתחם</h2>${groups.length ? `<div class="amen-bento">${groups.map(({ g, items }, gi) => `<div class="box tone-${"abc"[gi % 3]}"><h3 class="sub-h">${T.pic(g.pic)}${esc(g.name)}</h3><div class="amen-grid">${items.map((m) => `<div class="amen">${T.pic(m.pic, "pic-l")}<span>${esc(m.name)}</span></div>`).join("")}</div></div>`).join("")}</div>` : '<p class="muted">המארחים עוד לא פירטו.</p>'}</section></div>
          <div class="st-pane" id="pane-avail" role="tabpanel" hidden><section class="stay-section" id="avail"><h2>יומן זמינות</h2><div id="cal">${calendarHTML(l)}</div></section></div>
          <div class="st-pane" id="pane-reviews" role="tabpanel" hidden><section class="stay-section" id="reviews"><h2>חוות דעת</h2><div id="rev-host">${reviewsHTML(l)}</div></section></div>
          <div class="st-pane" id="pane-info" role="tabpanel" hidden>${policiesHTML(l)}
            <section class="stay-section" id="faq"><h2>שאלות נפוצות</h2><div class="faq">${faq.map((x) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</div></section></div>
          <div class="st-pane" id="pane-map" role="tabpanel" hidden><section class="stay-section" id="map-sec"><h2>איפה זה במפה?</h2><p class="muted">${esc(l.settlement)}, ${esc(reg.name)}. הכתובת המדויקת נמסרת על ידי המארחים לאחר אישור ההזמנה.</p>
            <div class="mini-map" id="mini-map"></div>
            <div class="loc-links"><a class="btn btn-line" href="${esc(T.wazeLink(l.settlement, l.lat, l.lng))}" target="_blank" rel="noopener">${I("nav")}ניווט ב־Waze</a><a class="btn btn-line" href="${esc(T.mapsLink(l.settlement + ", ישראל", l.lat, l.lng))}" target="_blank" rel="noopener">${I("pin")}Google Maps</a><button class="btn btn-line" type="button" data-act="big-map">${I("map")}מפה גדולה</button></div></section></div>
          </div>
        </div>
        <aside aria-label="בקשת הזמנה" id="book-host">${bookHTML(l)}</aside>
      </div>
      <div id="area-host">${areaHTML(l)}</div>
      <button class="area-fab" type="button" data-act="area-go" aria-label="מה עושים באזור">${I("map")}<span>מה עושים באזור</span></button>
      ${nearby.length ? `<section class="section" aria-labelledby="h-sim">${head("בסביבה", `<span id="h-sim">מתחמים בסביבה הקרובה</span>`, "", sameTown ? `<a class="link-more" href="#town-${encodeURIComponent(l.settlement)}">עוד ב${esc(l.settlement)} ${I("fwd")}</a>` : `<a class="link-more" href="#region-${reg.key}">כל ${esc(reg.name)} ${I("fwd")}</a>`)}<div class="grid">${nearby.map((o) => card(o.x, { km: o.km })).join("")}</div></section>` : ""}
      ${sameHost.length ? `<section class="section" aria-labelledby="h-host">${head("מאותם מארחים", `<span id="h-host">עוד מתחמים של ${esc(T.detailsOf(l).host_name || "המארחים")}</span>`, "", "")}${rail(sameHost)}</section>` : ""}
      ${viewedOthers.length >= 2 ? `<section class="section" aria-labelledby="h-viewed">${head("נצפו לאחרונה", `<span id="h-viewed">מקומות שראיתם</span>`, "", `<a class="link-more" href="#me-viewed">לכל הרשימה ${I("fwd")}</a>`)}${rail(viewedOthers)}</section>` : ""}
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
  function refreshArea() { const h = $("#area-host"), l = stayL(); if (h && l) { h.innerHTML = areaHTML(l); const a = $("#area"); if (a) a.classList.add("rv", "in"); reveal(h); } }
  function refreshBooking() {
    const l = stayL();
    if (!l) return;
    const host = $("#book-host");
    const focusName = document.activeElement && document.activeElement.name;
    const keep = {};
    $$("#book input, #book textarea").forEach((el) => { if (["name", "phone", "email", "message"].includes(el.name)) keep[el.name] = el.value; if (el.name === "consent" || el.name === "remember") keep[el.name] = el.checked; });
    const prevTotal = (($("#book-host .total b") || {}).textContent || "").replace(/\D/g, "");
    host.innerHTML = bookHTML(l);
    const tb = $("#book-host .total b");
    if (tb && prevTotal) rollNumber(tb, Number(prevTotal), Number(tb.textContent.replace(/\D/g, "")));
    else if (tb) tb.classList.add("pop-in");
    Object.entries(keep).forEach(([k, v]) => { const el = $(`#book [name="${k}"]`); if (el) { if (k === "consent" || k === "remember") el.checked = v; else el.value = v; } });
    if (focusName) { const el = $(`#book [name="${focusName}"]`); if (el) { el.focus(); if (el.setSelectionRange && el.type === "text") el.setSelectionRange(el.value.length, el.value.length); } }
    $("#cal").innerHTML = calendarHTML(l);
    const uh = $("#units");
    if (uh) uh.outerHTML = unitsHTML(l);
  }
  /* גלריה מלאה עם לשוניות לפי קטגוריה ויחידה */
  function lightbox(i, cat) {
    const l = stayL();
    const old = $("#lb");
    if (i == null || !l) { if (old) { old.classList.add("closing"); old.id = ""; setTimeout(() => old.remove(), stillMotion() ? 0 : 230); } return; }
    /* בתוך החלון: גלילה לתמונה הבאה בלי לבנות את החלון מחדש */
    if (old && cat === undefined && old._pg) { old._pg.go(i); return; }
    if (old) old.remove();
    if (cat !== undefined) S.stay.lbCat = cat;
    const all = T.photosOf(l, true);
    const tabs = [["all", "הכל", all.length]];
    T.PHOTO_CATS.forEach((c) => { const n = all.filter((p) => p.cat === c.key).length; if (n && n < all.length) tabs.push([c.key, c.name, n]); });
    T.unitsOf(l).forEach((u) => { const n = all.filter((p) => p.cat === "unit:" + u.id).length; if (n) tabs.push(["unit:" + u.id, u.name, n]); });
    const photos = (S.stay.lbCat === "all" ? all : all.filter((p) => p.cat === S.stay.lbCat)).filter(Boolean);
    if (!photos.length) photos.push(all[0]);
    const n = photos.length;
    const k = ((i % n) + n) % n;
    S.stay.lb = k;
    const el = document.createElement("div");
    el.className = "lightbox" + (old ? " again" : "");
    el.id = "lb";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "גלריית תמונות");
    const top = (j) => `${esc(l.name)}${photos[j].unit ? " · " + esc(photos[j].unit) : ""} · ${j + 1}/${n}`;
    el.innerHTML = `<div class="lb-top"><span class="lb-count" aria-live="polite">${top(k)}</span><button class="icon-btn" type="button" data-act="lb-close" aria-label="סגירה">${I("x")}</button></div>
      ${tabs.length > 1 ? `<div class="lb-tabs" role="group" aria-label="קטגוריות תמונות">${tabs.map(([key, name, c]) => `<button type="button" data-act="lb-cat" data-v="${esc(key)}" aria-pressed="${S.stay.lbCat === key}">${esc(name)} · ${c}</button>`).join("")}</div>` : ""}
      <div class="lb-stage" title="לחיצה ליד התמונה סוגרת"><div class="pg-strip" style="transform:translateX(${k * 100}%)">${photos.map((p, j) => `<div class="lb-slide"><img ${Math.abs(j - k) <= 1 ? "src" : "data-src"}="${esc(p.src)}" alt="${esc(imgAlt(p, l, j)) || "איור להמחשה"}" draggable="false"></div>`).join("")}</div></div>
      <div class="lb-nav"><button class="icon-btn" type="button" data-act="lb-go" data-d="-1" aria-label="הקודמת">${I("chev-r")}</button>${n > 1 && n <= 30 ? `<span class="pg-dots lb-dots" data-w="20" aria-hidden="true"><i class="pg-act"></i>${photos.map((_, j) => `<b class="${j === k ? "on" : ""}"></b>`).join("")}</span>` : ""}<button class="icon-btn" type="button" data-act="lb-go" data-d="1" aria-label="הבאה">${I("chev-l")}</button></div>`;
    document.body.appendChild(el);
    el._pg = pagerOf($(".lb-stage", el), { dots: $(".lb-dots", el), onChange: (j) => { S.stay.lb = j; const c = $(".lb-count", el); if (c) c.innerHTML = top(j); } });
    if (el._pg) el._pg.go(k, true);
    $('[data-act="lb-close"]', el).focus();
  }
  /* חלונות: שיתוף, דיווח, מפה גדולה */
  function modal(html, label) {
    const old = $("#modal"); if (old) old.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-back" id="modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div></div>`);
    const f = $("#modal input, #modal textarea, #modal button:not([data-act=modal-close])"); if (f) f.focus();
  }
  const modalHead = (t) => `<div class="modal-head"><h2>${t}</h2><button class="icon-btn" type="button" data-act="modal-close" aria-label="סגירה">${I("x")}</button></div>`;
  function shareModal(l) {
    const url = shareUrl(l.id);
    const text = `${l.name} – ${T.typeOf(l.type).name} ב${l.settlement}`;
    modal(`${modalHead("שיתוף")}<p class="muted">שלחו את ${esc(l.name)} למי שנוסע איתכם.</p>
      <div class="share-grid"><a class="btn btn-line" href="${esc(T.waLink("", text + " " + url))}" target="_blank" rel="noopener">${I("chat")}וואטסאפ</a><a class="btn btn-line" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">${I("external")}פייסבוק</a><a class="btn btn-line" href="https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${I("send")}טלגרם</a><a class="btn btn-line" href="mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}">${I("mail")}אימייל</a></div>
      <span class="copy-field"><input class="input" readonly value="${esc(url)}" aria-label="קישור"><button class="mini-btn" type="button" data-act="copy" data-text="${esc(url)}" aria-label="העתקה">${I("copy")}</button></span>`, "שיתוף");
  }
  function reportModal(l) {
    modal(`${modalHead("דיווח על מידע לא מדויק")}<p class="muted">משהו בדף של ${esc(l.name)} לא תואם למציאות? ספרו לנו ונבדוק מול המארחים.</p>
      <form data-form="report" style="display:grid;gap:12px" novalidate><label class="field"><span>מה לא מדויק?</span><textarea class="textarea" name="message" required maxlength="1500" placeholder="למשל: המחיר בסופ״ש שונה, אין בריכה מחוממת…"></textarea></label>
      <div class="form-grid"><label class="field"><span>שם (לא חובה)</span><input class="input" name="name" autocomplete="name"></label><label class="field"><span>טלפון לחזרה (לא חובה)</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" autocomplete="tel"></label></div>
      <p class="err" id="rep-err" role="alert"></p><button class="btn btn-primary" type="submit">${I("send")}שליחת הדיווח</button></form>`, "דיווח");
  }
  function bigMap(l) {
    modal(`${modalHead(esc(l.name) + " על המפה")}<div class="map-wrap" id="big-map" style="height:min(70vh,560px);min-height:320px"></div><p class="hint">הסיכות הקטנות: אטרקציות, מסעדות ויקבים בסביבה.</p>`, "מפה");
    $("#modal .modal").classList.add("modal-wide");
    const c = T.coordsOf(l);
    S.bigMap = mountMap($("#big-map"), [l], { places: S.places.filter((p) => p.lat != null && T.distKm(c, p) <= 30), zoom: 12 });
  }

  /* מלכודת לרובוטים: שדה שאנשים לא רואים ולא ממלאים */
  const HP = `<div class="hp" aria-hidden="true"><label>אתר אינטרנט<input name="website" tabindex="-1" autocomplete="off"></label></div>`;

  /* ---------------------------------------------------------------- join */
  function viewJoin() {
    const p = S.settings.plan_prices || {};
    return `<div class="view wrap page">
      <div class="join-hero">
        <div class="join-copy"><span class="eyebrow">למארחים</span><h1>פרסמו את המתחם שלכם ב${esc(S.settings.site_name)}</h1>
          <p>כרטיס מתחם עם גלריה, יחידות, יומן זמינות ומחירים לאמצע שבוע, סופ״ש וחגים. אורחים שולחים בקשה עם תאריכים ומספר אורחים, והיא מגיעה אליכם ישירות לוואטסאפ ולמייל. אנחנו לא לוקחים עמלה על הזמנות.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary btn-lg" href="#join-form">פתיחת חשבון מארח</a><a class="btn btn-line btn-lg" href="owner.html">כבר מפרסמים? כניסה</a></div></div>
        <div class="pic"><img src="assets/img/photos/join.jpg" alt=""></div>
      </div>
      <section class="section" aria-labelledby="h-plans">${head("חבילות", `<span id="h-plans">חבילות פרסום</span>`, "מחיר חודשי לכל מתחם, לפני מע״מ. אפשר להתחיל בחודש ניסיון, או לשלם רק על פניות.")}
        <div class="plans">${T.PLANS.map((pl) => `<div class="plan ${pl.key === "pro" ? "pop" : ""}"><h3>${pl.name}</h3><div class="p">${T.money(p[pl.key])}<small> לחודש</small></div><ul>${pl.features.map((f) => `<li>${I("check")}<span>${esc(f)}</span></li>`).join("")}</ul></div>`).join("")}</div>
        <p class="hint" style="margin-top:14px">במסלול תשלום לפי פנייה: ${T.money(S.settings.lead_price_default)} לכל בקשת הזמנה שמגיעה מהאתר.</p></section>
      <section class="section" id="join-form" aria-labelledby="h-jf"><div class="form-card" id="join-card">${joinForm()}</div></section>
    </div>`;
  }
  /* הרשמה עצמית של מארח: חשבון עם סיסמה, אימות מייל, ואז פתיחת לקוח וממשק מארחים.
     מי שמעדיף שיחזרו אליו – משאיר פרטים בלבד (בקשת הצטרפות רגילה) */
  function joinForm() {
    const acc = S.joinMode !== "call";
    const trial = Number(S.settings.trial_days) || 0;
    const auto = S.settings.auto_open_hosts !== false;
    return `<div><span class="eyebrow">הצטרפות</span><h2 id="h-jf" style="font-size:2.2rem;margin-top:8px">${acc ? "פותחים חשבון מארח" : "השאירו פרטים ונחזור אליכם"}</h2>
        <p class="muted" style="margin-top:6px;font-weight:300">${acc ? `ממלאים פרטים, מאשרים את האימייל, ונכנסים לממשק המארחים כדי להעלות תמונות, מחירים ויומן.${auto && trial ? ` ${trial} ימי ניסיון בלי התחייבות.` : auto ? "" : " צוות האתר יאשר את החשבון בהקדם."}` : "נעבור יחד על המתחם, נבנה את הכרטיס ונפתח לכם גישה לממשק המארחים."}</p></div>
      <div class="seg-tabs join-mode" role="group" aria-label="איך להצטרף"><button type="button" data-act="join-mode" data-v="account" aria-pressed="${acc}">פתיחת חשבון עכשיו</button><button type="button" data-act="join-mode" data-v="call" aria-pressed="${!acc}">מעדיפים שנחזור אליכם</button></div>
      ${acc && T.isLive ? `<div class="join-google"><button class="btn btn-google btn-lg" type="button" data-act="join-google">${I("user")}הרשמה מהירה עם Google</button><span class="hint">בלי סיסמה ובלי מייל אימות: נכנסים עם Google, ממלאים 5 פרטים ומתחילים.</span></div><div class="auth-or"><span>או עם הטופס</span></div>` : ""}
      <form class="form-grid" data-form="join" novalidate>
        <label class="field"><span>שם מלא</span><input class="input" name="name" autocomplete="name" required maxlength="80"></label>
        <label class="field"><span>טלפון נייד</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" autocomplete="tel" required></label>
        <label class="field"><span>אימייל${acc ? " (הכניסה לחשבון)" : " (לא חובה)"}</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" autocomplete="email" ${acc ? "required" : ""}></label>
        <label class="field"><span>שם המתחם</span><input class="input" name="business" required maxlength="80"></label>
        <label class="field"><span>יישוב</span><input class="input" name="settlement" required maxlength="40"></label>
        <label class="field"><span>אזור</span><select class="select" name="region">${T.REGIONS.map((r) => `<option value="${r.key}">${esc(r.name)}</option>`).join("")}</select></label>
        <label class="field"><span>סוג אירוח</span><select class="select" name="type">${T.TYPES.map((t) => `<option value="${t.key}">${esc(t.name)}</option>`).join("")}</select></label>
        <label class="field"><span>מספר יחידות</span><input class="input" name="units" type="number" min="1" max="500" value="1" inputmode="numeric"></label>
        ${acc ? `<label class="field"><span>ח.פ / ע.מ (לחשבוניות, לא חובה עכשיו)</span><input class="input" name="tax_id" inputmode="numeric" dir="ltr" style="text-align:right" maxlength="12"></label><span></span>
        <label class="field"><span>סיסמה</span><input class="input" name="password" type="password" dir="ltr" autocomplete="new-password" required minlength="8"></label>
        <label class="field"><span>שוב, לאימות</span><input class="input" name="password2" type="password" dir="ltr" autocomplete="new-password" required minlength="8"></label>
        <ul class="todo pw-rules span2" id="join-pw" aria-live="polite">${pwRulesHTML("")}</ul>` : ""}
        <label class="field span2"><span>ספרו לנו בקצרה על המקום (לא חובה)</span><textarea class="textarea" name="message" maxlength="2000"></textarea></label>
        ${HP}
        ${acc ? `<label class="check span2"><input type="checkbox" name="consent" required><span>קראתי ואני מסכים/ה ל<a href="#terms-hosts" target="_blank" rel="noopener">הסכם הפרסום למארחים</a> ול<a href="#terms" target="_blank" rel="noopener">מדיניות הפרטיות</a></span></label>`
          : `<label class="check span2"><input type="checkbox" name="consent" required><span>אני מאשר/ת שתחזרו אליי בטלפון או בוואטסאפ בנוגע לפרסום (<a href="#terms" target="_blank" rel="noopener">תנאי שימוש ופרטיות</a>)</span></label>`}
        <label class="check span2"><input type="checkbox" name="marketing"><span>אשמח לקבל במייל טיפים ומבצעים למארחים (פרסומת; אפשר להסיר בכל רגע)</span></label>
        <p class="err span2" id="join-err" role="alert"></p>
        <div class="span2"><button class="btn btn-primary btn-lg" type="submit">${acc ? `${I("check")}פתיחת חשבון` : "שליחת פרטים"}</button>${acc ? ` <a class="link-more" href="owner.html" style="margin-inline-start:12px">כבר יש לכם חשבון? כניסה</a>` : ""}</div>
      </form>`;
  }
  const PW_RULES = ["לפחות 8 תווים", "לפחות אות אחת", "לפחות ספרה אחת"];
  const pwRulesHTML = (v) => { const bad = T.passwordIssues(v); return PW_RULES.map((r) => { const ok = !!v && !bad.includes(r); return `<li class="${ok ? "ok" : ""}">${I(ok ? "check" : "info")}${r}</li>`; }).join(""); };
  function joinSent(email, existing) {
    if (existing) return `<div class="book-ok"><span class="badge-ok">${I("user")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">כבר יש חשבון עם האימייל הזה</h3><p class="muted">נכנסים לממשק המארחים עם הסיסמה. שכחתם אותה? בדף הכניסה לוחצים ״שכחתי סיסמה״ ומקבלים קישור למייל.</p><a class="btn btn-primary" href="owner.html">לכניסת מארחים</a></div>`;
    return `<div class="book-ok"><span class="badge-ok">${I("mail")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">נשאר רק לאשר את האימייל</h3>
      <p class="muted">שלחנו ל־<b dir="ltr">${esc(email)}</b> קישור לאישור. לוחצים עליו, ומגיעים ישר לממשק המארחים כדי להשלים את כרטיס המתחם.</p>
      <p class="hint">לא הגיע תוך כמה דקות? בדקו בספאם או בקידומי מכירות, או <button class="link-btn" type="button" data-act="join-resend" data-email="${esc(email)}">שלחו לי שוב</button>.</p></div>`;
  }

  /* ---------------------------------------------------------------- אטרקציות ומסעדות */
  function viewPlaces(region) {
    if (region !== undefined) S.placesFilter.region = region;
    const pf = S.placesFilter;
    const list = S.places.filter((p) => (!pf.region || p.region === pf.region) && (!pf.kind || p.kind === pf.kind));
    const r = pf.region ? T.regionOf(pf.region) : null;
    const stays = (p) => (p.lat == null ? [] : S.listings.map((l) => ({ l, km: T.distKm({ lat: p.lat, lng: p.lng }, T.coordsOf(l)) })).filter((o) => o.km <= 25).sort((a, b) => a.km - b.km).slice(0, 2));
    return `<div class="view wrap page">
      <div class="page-head"><div class="crumbs"><a href="#">ראשי</a><span>›</span><span>מה עושים באזור</span></div><span class="eyebrow">אטרקציות, מסעדות וטבע</span><h1>מה עושים ${r ? T.inPlace(r.name) : "בחופשה"}</h1><p>מקומות שכדאי להכיר ליד הצימר, עם מרחק ולינה קרובה.</p></div>
      <div class="toolbar-site">
        <select class="select" id="pl-region" aria-label="אזור" style="width:auto"><option value="">כל האזורים</option>${T.REGIONS.map((x) => `<option value="${x.key}" ${pf.region === x.key ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
        <span class="ar-kinds" role="group" aria-label="סוג"><button type="button" data-act="pl-kind" data-v="" aria-pressed="${!pf.kind}">הכל</button>${T.PLACE_KINDS.filter((k) => S.places.some((p) => p.kind === k.key && (!pf.region || p.region === pf.region))).map((k) => `<button type="button" data-act="pl-kind" data-v="${k.key}" aria-pressed="${pf.kind === k.key}">${T.pic(k.pic)}${esc(k.name)}</button>`).join("")}</span>
      </div>
      ${list.length ? `<div class="ar-grid">${list.map((p) => { const near = stays(p); return placeCard(p, near.length ? `<p class="ar-meta">${I("home")} לינה קרובה: ${near.map((o) => `<a href="#stay-${esc(o.l.id)}">${esc(o.l.name)}</a> (${T.kmText(o.km)})`).join(" · ")}</p>` : ""); }).join("")}</div>` : emptyState("עוד אין מקומות באזור הזה", "נוסיף בקרוב המלצות על אטרקציות ומסעדות.", `<a class="btn btn-line" href="#places">לכל האזורים</a>`)}
    </div>`;
  }

  /* ---------------------------------------------------------------- האזור האישי */
  function viewMe(tab) {
    tab = tab || "saved";
    const saved = S.listings.filter((l) => S.saved.has(l.id));
    const viewed = S.viewedList.map(byId).filter(Boolean);
    const tabs = [["saved", "המועדפים שלי", saved.length], ["viewed", "נצפו לאחרונה", viewed.length], ["searches", "חיפושים שעשיתי", S.searches.length], ["leads", "הפניות שלי", S.myLeads.length], ["alerts", "התראות על דילים", ""]];
    let body = "";
    if (tab === "saved") body = saved.length ? grid(saved) : emptyState("עוד לא שמרתם מתחמים", "לחצו על הלב בכרטיס של מתחם כדי לשמור אותו כאן.", `<a class="btn btn-primary" href="#search">לחיפוש מתחמים</a>`);
    else if (tab === "viewed") body = viewed.length ? `<div class="toolbar-site"><button class="btn btn-ghost btn-sm" type="button" data-act="clear-viewed">${I("trash")}ניקוי הרשימה</button></div>${grid(viewed)}` : emptyState("עוד לא צפיתם במתחמים", "מתחמים שתפתחו יופיעו כאן, כדי שיהיה קל לחזור אליהם.", `<a class="btn btn-primary" href="#search">לחיפוש</a>`);
    else if (tab === "searches") body = S.searches.length ? `<div class="toolbar-site"><button class="btn btn-ghost btn-sm" type="button" data-act="clear-searches">${I("trash")}ניקוי</button></div><ul class="search-list">${S.searches.map((s, i) => `<li><span><b>${esc(s.label)}</b><small>${esc(s.dates || "בלי תאריכים")} · ${T.fmtStamp(s.at)}</small></span><button class="btn btn-line btn-sm" type="button" data-act="redo-search" data-i="${i}">${I("search")}חיפוש שוב</button></li>`).join("")}</ul>` : emptyState("אין חיפושים אחרונים", "חיפושים עם אזור, תאריכים או מאפיינים נשמרים כאן.", `<a class="btn btn-primary" href="#search">לחיפוש</a>`);
    else if (tab === "leads") body = meLeadsHTML();
    else body = `<div class="form-card" style="max-width:640px"><h2 style="font-size:2rem">דילים ודקה 90 למייל</h2><p class="muted">נשלח מתחמים שהתפנו לסופ״ש הקרוב, והנחות שמארחים פותחים לנרשמים.</p><form class="news-form" data-form="subscribe" novalidate>${HP}<label class="field"><span>אימייל</span><input class="input" name="email" type="email" dir="ltr" required value="${esc((S.guest || {}).email || "")}"></label><label class="field"><span>אזור מועדף</span><select class="select" name="region">${placeOptions("", "כל הארץ")}</select></label><button class="btn btn-primary" type="submit">${I("send")}הרשמה</button></form></div>`;
    return `<div class="view wrap page"><div class="page-head"><span class="eyebrow">${I("user")} האזור האישי</span><h1>${tab === "saved" ? "המועדפים שלי" : (tabs.find((x) => x[0] === tab) || tabs[0])[1]}</h1><p>${T.isLive ? "הרשימות נשמרות בדפדפן הזה. כדי לראות את הפניות שלכם מכל מכשיר, התחברו עם האימייל." : "במצב הדגמה הכל נשמר בדפדפן הזה בלבד."}</p></div>
      <nav class="seg-tabs me-tabs" aria-label="האזור האישי">${tabs.map(([k, t, n]) => `<a href="#me-${k}" aria-pressed="${tab === k}" role="button">${t}${n ? ` · ${n}` : ""}</a>`).join("")}</nav>
      <div style="margin-top:22px">${body}</div></div>`;
  }
  function meLeadsHTML() {
    const live = S.me.leads || [];
    const local = S.myLeads;
    const map = new Map();
    local.forEach((q) => map.set(q.id, Object.assign({}, q)));
    live.forEach((q) => map.set(q.id, Object.assign(map.get(q.id) || {}, q)));
    const list = [...map.values()].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    const user = S.me.user;
    const login = T.isLive ? (user ? `<p class="note note-ok">${I("check")}<span>מחוברים בתור ${esc(user.email)}. <button class="link-btn" type="button" data-act="guest-logout">התנתקות</button></span></p>`
      : `<div class="form-card login-mini"><b>התחברות לאזור האישי</b><p class="muted" style="font-size:var(--t-s)">נכנסים עם חשבון Google ורואים את הפניות והמועדפים מכל מכשיר. בלי סיסמה חדשה לזכור.</p><button class="btn btn-google btn-lg" type="button" data-act="guest-google">${I("user")}המשך עם Google</button><details class="login-alt"><summary>או קישור כניסה למייל</summary><form data-form="guest-login" class="news-form" novalidate><label class="field"><span>אימייל שמסרתם בבקשה</span><input class="input" name="email" type="email" dir="ltr" required></label><button class="btn btn-primary" type="submit">שליחת קישור</button></form></details></div>`) : "";
    const statusName = (k) => ({ new: "נשלחה, ממתינה למארחים", in_progress: "המארחים בטיפול", closed: "ההזמנה נסגרה", lost: "לא רלוונטית" }[k] || "נשלחה");
    return `${login}${list.length ? `<ul class="search-list">${list.map((q) => `<li><span><b>${esc(q.listing_name || "בקשה")}</b><small>${q.check_in ? `${T.fmtShort(q.check_in)}–${T.fmtShort(q.check_out)} · ` : ""}${q.guests ? plural.adults(q.guests) : ""}${q.children ? " · " + plural.kids(q.children) : ""} · נשלחה ${T.fmtStamp(q.created_at)}</small></span><span class="pill ${q.status === "closed" ? "pill-ok" : q.status === "in_progress" ? "pill-warn" : "pill-info"}">${statusName(q.status)}</span>${q.listing_id ? `<a class="btn btn-line btn-sm" href="#stay-${esc(q.listing_id)}">לדף המתחם</a>` : ""}</li>`).join("")}</ul>` : emptyState("עוד לא שלחתם בקשות", "בקשות הזמנה שתשלחו מהאתר יופיעו כאן, עם הסטטוס שלהן.", `<a class="btn btn-primary" href="#search">לחיפוש מתחמים</a>`)}`;
  }
  async function loadMe() {
    if (!T.isLive) { S.me.leads = await T.store.myGuestLeads(S.myLeads.map((x) => x.id)).catch(() => []); return; }
    try { S.me.user = await T.store.guestUser(); S.me.leads = S.me.user ? await T.store.myGuestLeads() : []; } catch (e) { S.me.leads = []; }
  }

  /* ---------------------------------------------------------------- דירוג, צרו קשר */
  function viewTop() {
    const rows = topRated(30);
    return `<div class="view wrap page"><div class="page-head"><span class="eyebrow">${I("trophy")} מומלצי הגולשים</span><h1>המקומות שהאורחים הכי אוהבים</h1><p>לפי ממוצע חוות דעת מאומתות. רק אורחים שההזמנה שלהם אושרה יכולים לדרג.</p></div>
      ${rows.length ? `<div class="top-band">${rankList(rows)}</div>` : emptyState("עוד אין מספיק חוות דעת", "הדירוג יופיע אחרי שאורחים יכתבו חוות דעת.", "")}</div>`;
  }
  function viewContact() {
    const s = S.settings;
    return `<div class="view wrap page"><div class="find-layout">
      <div class="find-copy"><span class="eyebrow">צרו קשר</span><h1>דברו איתנו</h1><p>שאלה על מתחם, עזרה בחיפוש או משהו שלא עבד באתר? נשמח לעזור.</p>
        <ul>${s.phone ? `<li>${I("phone")}<a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a></li>` : ""}${s.whatsapp ? `<li>${I("chat")}<a href="${esc(T.waLink(s.whatsapp, "שלום"))}" target="_blank" rel="noopener">וואטסאפ</a></li>` : ""}${s.email ? `<li>${I("mail")}${esc(s.email)}</li>` : ""}<li>${I("user")}<a href="#join">בעלי מתחמים: פרסום באתר</a></li></ul></div>
      <form class="form-card" data-form="contact" novalidate><div class="form-grid">
        <label class="field"><span>שם מלא</span><input class="input" name="name" autocomplete="name" required value="${esc((S.guest || {}).name || "")}"></label>
        <label class="field"><span>טלפון</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" autocomplete="tel" required value="${esc((S.guest || {}).phone || "")}"></label>
        <label class="field span2"><span>אימייל (לא חובה)</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" autocomplete="email"></label>
        <label class="field span2"><span>הודעה</span><textarea class="textarea" name="message" required></textarea></label>
        ${HP}<label class="check span2"><input type="checkbox" name="consent" required><span>אני מאשר/ת שתחזרו אליי (<a href="#terms" target="_blank" rel="noopener">תנאי שימוש ופרטיות</a>)</span></label>
        <p class="err span2" id="ct-err" role="alert"></p><div class="span2"><button class="btn btn-primary btn-lg" type="submit">${I("send")}שליחה</button></div></div></form></div></div>`;
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
    return `<div class="view wrap page"><article class="article"><div class="crumbs"><a href="#">ראשי</a><span>›</span><a href="#magazine">מגזין</a></div>
      <span class="eyebrow">מגזין</span><h1>${esc(a.title)}</h1><p class="lead">${esc(a.excerpt)}</p>
      ${a.cover ? `<div class="cover"><img src="${esc(T.img(a.cover, 1400))}" alt=""></div>` : ""}${bodyHTML(a.body)}</article>
      ${more.length ? `<section class="section">${head("להשראה", "מתחמים שכדאי להכיר", "")}${grid(more)}</section>` : ""}</div>`;
  }
  async function viewReview(token) {
    const inv = await T.store.reviewInvite(token).catch(() => null);
    if (!inv) return `<div class="view wrap page"><div class="textpage">${emptyState("הקישור לא בתוקף", "ייתכן שכבר כתבתם חוות דעת על השהייה הזאת. תודה!", `<a class="btn btn-primary" href="#">לדף הבית</a>`)}</div></div>`;
    S.reviewToken = token;
    S.reviewRating = 5;
    S.reviewScores = {};
    const stars = (name, label) => `<div class="cat-row"><span>${esc(label)}</span><span class="dots" role="radiogroup" aria-label="${esc(label)}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${esc(label)}: ${n} מתוך 5" data-act="rate-cat" data-k="${name}" data-v="${n}">${n}</button>`).join("")}</span></div>`;
    return `<div class="view wrap page"><div class="form-card" style="max-width:680px;margin:20px auto" id="review-card">
      <div><span class="eyebrow">חוות דעת מאומתת</span><h1 style="font-size:2.4rem;margin-top:8px">איך היה ב${esc(inv.listing_name)}?</h1><p class="muted" style="font-weight:300;margin-top:6px">הקישור הזה נשלח רק לאורחים שהזמינו דרך האתר. חוות הדעת תפורסם אחרי בדיקה קצרה.</p></div>
      <form data-form="review" novalidate style="display:grid;gap:16px">
        <div class="field"><span>הדירוג הכללי שלכם</span><div class="star-input" role="radiogroup" aria-label="דירוג מ-1 עד 5">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${n === 5}" aria-label="${n} כוכבים" data-act="rate" data-v="${n}" class="on"><svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg></button>`).join("")}</div></div>
        <div class="field"><span>דרגו כל נושא (לא חובה)</span><div class="cats-input">${T.REVIEW_CATS.map((c) => stars(c.key, c.name + (c.optional ? " (אם הייתה)" : ""))).join("")}</div></div>
        <label class="field"><span>כותרת קצרה</span><input class="input" name="title" maxlength="120" placeholder="למשל: סופ״ש מושלם עם נוף לחרמון"></label>
        <label class="field"><span>מה הכי אהבתם? מה כדאי לדעת לפני שמגיעים?</span><textarea class="textarea" name="text" maxlength="1500" required></textarea></label>
        <label class="field"><span>שם להצגה</span><input class="input" name="name" value="${esc(String(inv.name || "").replace(/\s*\(דוגמה\)/, ""))}" maxlength="60"></label>
        <p class="err" id="rev-err" role="alert"></p>
        <button class="btn btn-primary btn-lg" type="submit">שליחת חוות הדעת</button>
      </form></div></div>`;
  }

  /* ---------------------------------------------------------------- text pages */
  /* אישור הרשמה לדיוור (הסכמה כפולה) והסרה בלחיצה אחת, מהקישורים שבמייל */
  async function viewSubLink(hash) {
    const confirm = hash.startsWith("sub-confirm-");
    const token = hash.slice(12);
    let ok = false;
    try { ok = /^[a-f0-9]{16,64}$/i.test(token) && (confirm ? await T.store.confirmSubscriber(token) : await T.store.unsubscribe(token)); } catch (e) { ok = false; }
    const body = !ok ? `<h1 style="font-size:2.2rem">הקישור לא תקין</h1><p class="muted">ייתכן שהוא הועתק חלקית. אפשר להירשם שוב בתחתית האתר, או לכתוב לנו.</p><a class="btn btn-line" href="#contact">צרו קשר</a>`
      : confirm ? `<span class="badge-ok">${I("check")}</span><h1 style="font-size:2.2rem">נרשמתם לדילים!</h1><p class="muted">מעכשיו תקבלו מאיתנו דילים, דקה 90 ומתחמים שהתפנו לסופ״ש. בכל מייל יש קישור להסרה.</p><a class="btn btn-primary" href="#deals">לדילים של השבוע</a>`
      : `<span class="badge-ok">${I("check")}</span><h1 style="font-size:2.2rem">הוסרתם מרשימת הדיוור</h1><p class="muted">לא נשלח לכם יותר מיילים שיווקיים. התחרטתם? אפשר להירשם שוב בתחתית האתר.</p><a class="btn btn-line" href="#">לדף הבית</a>`;
    return `<div class="view wrap page"><div class="form-card book-ok" style="max-width:620px;margin:30px auto">${body}</div></div>`;
  }
  function viewText(kind) {
    const s = S.settings;
    const contact = [s.phone && `טלפון: <span dir="ltr">${esc(s.phone)}</span>`, s.email && `אימייל: ${esc(s.email)}`].filter(Boolean).join(" · ") || "פרטי הקשר יעודכנו בקרוב.";
    const op = s.legal_name ? `האתר מופעל על ידי ${esc(s.legal_name)}${s.legal_id ? ` (${esc(s.legal_id)})` : ""}${s.legal_address ? `, ${esc(s.legal_address)}` : ""}` : `האתר מופעל על ידי צוות ${esc(s.site_name)}`;
    const court = s.legal_court ? `בתי המשפט המוסמכים ב${esc(s.legal_court)}` : "בתי המשפט המוסמכים בישראל";
    const pages = {
      about: `<span class="eyebrow">אודות</span><h1>${esc(s.site_name)} – ${esc(s.site_tagline)}</h1>
        <p>${esc(s.site_name)} הוא אתר צימרים ווילות ישראלי. אנחנו מרכזים מתחמי אירוח מהגולן ועד הערבה, ומחברים בין אורחים למארחים ישירות.</p>
        <p>כל מתחם מופיע עם מחיר לאמצע שבוע, לסופ״ש ולחגים, יומן זמינות שמסונכרן עם אתרי הזמנות אחרים, מדיניות ביטול ופירוט של מה שיש בו. בקשת הזמנה מגיעה ישירות למארחים, וההזמנה והתשלום נסגרים מולם. אורחים לא משלמים לנו עמלה.</p>
        <h2>איך אנחנו בודקים</h2><p>לפני שמתחם עולה לאתר אנחנו מדברים עם המארחים ובודקים את הפרטים, התמונות והמחירים. כל שינוי בתוכן עובר אישור. חוות הדעת נכתבות רק על ידי אורחים שההזמנה שלהם אושרה, ועוברות בדיקה לפני פרסום.</p>
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
      terms: `<span class="eyebrow">מידע משפטי</span><h1>תנאי שימוש, פרטיות ועוגיות</h1>
        <p class="muted">גרסה ${esc(T.SITE_TERMS_VERSION)}. ${op}. השימוש באתר, כולל חיפוש, שליחת בקשה, פנייה טלפונית למתחם או כתיבת חוות דעת, מהווה הסכמה לתנאים האלה. אם אינכם מסכימים להם, אנא אל תשתמשו באתר.</p>
        <nav class="toc" aria-label="תוכן העניינים"><a href="#terms" data-act="jump" data-to="t1">השירות</a><a href="#terms" data-act="jump" data-to="t3">ההזמנה מול המארח</a><a href="#terms" data-act="jump" data-to="t5">רעש ושיחות</a><a href="#terms" data-act="jump" data-to="t9">אחריות</a><a href="#terms" data-act="jump" data-to="t11">פרטיות</a><a href="#terms" data-act="jump" data-to="t12">עוגיות</a></nav>
        <h2 id="t1">1. מה האתר עושה</h2><p>${esc(s.site_name)} הוא לוח פרסום של מתחמי אירוח. האתר מציג מתחמים שבעליהם או מי מטעמם (״המארחים״) מפרסמים בו, ומעביר אליהם בקשות ושיחות של אורחים. <b>האתר אינו משכיר את המתחמים, אינו סוכן נסיעות, אינו שלוחו של המארח או של האורח ואינו צד להזמנה</b>. אנחנו לא גובים תשלום על האירוח ולא מחזיקים כספים של אורחים.</p>
        <h2 id="t2">2. המידע על המתחמים</h2><p>התיאור, התמונות, המחירים, היומן, המאפיינים, מדיניות הביטול והצהרות הרעש של כל מתחם נמסרים על ידי המארחים ובאחריותם. אנחנו בודקים את המידע לפני פרסום במידה סבירה, אבל לא יכולים להבטיח שהוא מלא, מדויק או עדכני, ולא בודקים בשטח את מצב המתחם, הניקיון, הבטיחות או קיומם של רישיונות והיתרים. התמונות להמחשה. המחיר במחשבון הוא הערכה בלבד, והמחיר הסופי, הזמינות וההטבות מאושרים רק מול המארחים.</p>
        <h2 id="t3">3. ההזמנה, התשלום והביטול</h2><p>בקשה שנשלחת דרך האתר אינה הזמנה. ההזמנה נוצרת רק כשהמארח מאשר אותה ישירות מולכם, וההסכם על האירוח הוא בינכם לבין המארח בלבד. התשלום, הקבלה או החשבונית, הפיקדון, מדיניות הביטול וההחזרים נקבעים מול המארח ובכפוף לחוק הגנת הצרכן. הטבות וקופונים כפופים לאישור המארח ולהצגת אישור מתאים. מחלוקת לגבי האירוח מתבררת מול המארח. אנחנו ננסה לעזור כשפונים אלינו, אבל איננו מחויבים להכריע בה.</p>
        <h2 id="t4">4. בטיחות וכללי המתחם</h2><p>האחריות להתנהגות בזמן השהייה היא של האורחים ושל המארח. בריכה, ג׳קוזי, קמין, מרפסות, שטחים פתוחים ובעלי חיים דורשים זהירות והשגחה צמודה על ילדים. אורחים מתחייבים לשמור על חוקי הבית של המתחם, על הדין ועל הציוד, ולשאת בנזק שגרמו.</p>
        <h2 id="t5">5. רעש וסביבה</h2><p>התגיות ״סביבה שקטה״, ״ייתכנו רעשים״ ו״מותר להרעיש״ מבוססות על הצהרת המארח ועל בדיקה שלנו כשנעשתה. מתחם שמסומן שמותר בו להרעיש מאפשר מוזיקה, מסיבות או קריוקי <b>רק במסגרת מה שהמארח פירט ובכפוף לדין</b>, כולל החוק למניעת מפגעים ותקנות הרעש וחוקי העזר של הרשות המקומית. התגית אינה היתר להפר את החוק או את חוקי הבית, והאחריות לכך היא של האורחים ושל המארח.</p>
        <h2 id="t6">6. שיחות טלפון ומספרים וירטואליים</h2><p>בחלק מהמתחמים מוצג מספר טלפון וירטואלי שמפעיל ספק טלפוניה מטעמנו, והשיחה מועברת ממנו אוטומטית למארח. במקרה כזה נשמרים פרטי השיחה: המספר שממנו התקשרתם, המתחם, המועד, משך השיחה ואם נענתה. המידע משמש לדיווח למארח (כולל מספר המתקשר, כדי שיוכל לחזור אליכם אם פספס את השיחה), לחיוב המארח לפי החבילה, לבקרת איכות ולבירור תלונות. אם שיחה מוקלטת, תושמע על כך הודעה בתחילתה, ואפשר לנתק לפני שהשיחה מועברת.</p>
        <h2 id="t7">7. חוות דעת, דיווחים ותוכן שאתם שולחים</h2><p>חוות דעת נכתבות על חוויה אמיתית שלכם, בלי פרטים אישיים של אחרים, בלי לשון הרע ובלי תוכן פוגעני או פרסומי. אתם נותנים לנו רישיון חינם, לא בלעדי ולא מוגבל בזמן, לפרסם את התוכן באתר ובערוצים שלו, לקצר אותו ולהסתיר פרטים מזהים. אנחנו רשאים לא לפרסם או להסיר תוכן לפי שיקול דעתנו. האחריות לתוכן היא של מי שכתב אותו.</p>
        <h2 id="t8">8. שימוש אסור</h2><ul><li>שליחת בקשות, שיחות או חוות דעת כוזבות, בשם אחר או כדי להטריד מארחים.</li><li>איסוף מידע מהאתר באופן אוטומטי (סריקה, רובוטים, העתקת מאגר המתחמים) או שימוש בפרטי המארחים לדיוור.</li><li>ניסיון לפרוץ, לעקוף הרשאות, להעמיס על האתר או לשבש את פעולתו.</li><li>העתקה של עיצוב האתר, הקוד, הטקסטים או התמונות בלי רשות.</li></ul>
        <h2 id="t9">9. הגבלת אחריות</h2><p>השירות ניתן כפי שהוא (AS IS) וכפי שהוא זמין. ככל שהדין מאפשר, ${esc(s.site_name)} והפועלים מטעמו לא יהיו אחראים לכל נזק, הפסד או הוצאה שנובעים מהאירוח עצמו, ממעשה או מחדל של מארח או של אורח, ממידע שמסר מארח, מביטול או מאי-זמינות, מתאונה, מפגיעה ברכוש או בגוף במתחם, מתקלה או הפסקה באתר, או מנזק עקיף ותוצאתי. האמור לא חל על נזק שנגרם בזדון או ברשלנות רבתי שלנו. אתם מתחייבים לשפות אותנו על נזק והוצאה סבירה (כולל שכר טרחת עורך דין) שנגרמו לנו בגלל הפרה של התנאים האלה או בגלל תוכן ששלחתם.</p>
        <h2 id="t10">10. קניין רוחני וקישורים</h2><p>העיצוב, הקוד, המבנה, הטקסטים והסימנים של האתר שייכים ל${esc(s.legal_name || s.site_name)}. התוכן של כל מתחם שייך למארח שפרסם אותו. קישורים לשירותים חיצוניים (מפות, ניווט, וואטסאפ, יומנים) כפופים לתנאים של אותם שירותים, ואיננו אחראים להם.</p>
        <h2 id="t11">11. פרטיות</h2><p>${esc(s.legal_name || s.site_name)} הוא בעל מאגר המידע שנאסף באתר. כששולחים בקשת הזמנה, חוות דעת, דיווח, הרשמה לדיוור, הרשמת מארח או מתקשרים למספר וירטואלי, אנחנו שומרים את מה שמילאתם או את פרטי השיחה: שם, טלפון, אימייל (אם נמסר) ופרטי הבקשה.</p>
        <ul><li><b>למה:</b> כדי להעביר את הבקשה או השיחה למארחי המתחם שבחרתם ושיחזרו אליכם, לשלוח לכם אישור ועדכונים על הבקשה, להפיק דוחות וחיוב למארחים, ולמנוע ספאם והונאות.</li>
          <li><b>מי מקבל:</b> המארחים של המתחם שפניתם אליו, צוות האתר, וספקי שירות שמפעילים את האתר בשבילנו (אחסון ומסד נתונים, שליחת מיילים, תמונות, טלפוניה). חלקם שומרים מידע בשרתים מחוץ לישראל. איננו מוכרים מידע לאף אחד. המארח שמקבל את הפרטים אחראי לשימוש שהוא עושה בהם.</li>
          <li><b>כמה זמן:</b> פניות, שיחות וחוות דעת נשמרים כל עוד הם נחוצים לשירות, לחיוב ולטיפול בבירורים. הרשמה לדיוור שלא אושרה במייל נמחקת אחרי 30 יום, ויומן הפעולות נשמר שנה.</li>
          <li><b>דיוור:</b> נשלח רק למי שנרשם ואישר את הכתובת במייל. כל מייל שיווקי מסומן ״פרסומת״ ויש בו קישור להסרה בלחיצה אחת.</li>
          <li><b>אבטחה:</b> החיבור לאתר מוצפן, הגישה למידע מוגבלת לפי הרשאות, וצוות הניהול נכנס עם סיסמה ואפשרות לאימות דו-שלבי.</li>
          <li><b>הזכויות שלכם:</b> לעיין במידע עליכם, לתקן אותו או לבקש למחוק אותו, לפי חוק הגנת הפרטיות. אין חובה חוקית למסור את הפרטים, אבל בלי שם וטלפון לא נוכל להעביר בקשה למארחים.</li></ul>
        <h2 id="t12">12. עוגיות ואחסון בדפדפן</h2><p>האתר שומר בדפדפן שלכם בלבד את המועדפים, המקומות שצפיתם בהם, החיפושים האחרונים והגדרות הנגישות, וגם את הפרטים שביקשתם שנזכור בטופס. אנחנו סופרים צפיות ולחיצות על כל מתחם בלי לזהות אתכם, כדי להציג למארחים דוח. אפשר למחוק את כל אלה דרך הגדרות הדפדפן.</p>
        <h2 id="t13">13. שינויים, דין וסמכות שיפוט</h2><p>אנחנו רשאים לשנות את האתר, להפסיק שירות או לעדכן את התנאים. הגרסה המחייבת היא זו שמופיעה בעמוד ביום השימוש. על התנאים חלים דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה ל${court}.</p>
        <p>לבקשת עיון, תיקון או מחיקה של פרטים, ולכל שאלה: ${contact}</p>
        <p class="muted">מארחים: <a href="#terms-hosts">הסכם הפרסום למארחים</a>.</p>`,
      "terms-hosts": `<span class="eyebrow">למארחים</span><h1>הסכם פרסום למארחים</h1>
        <p class="muted">גרסה ${esc(T.HOST_TERMS_VERSION)}. ההסכם הוא בין ${esc(s.legal_name || s.site_name)}${s.legal_id ? ` (${esc(s.legal_id)})` : ""} (״המפעיל״) לבין מי שפותח חשבון מארח ומפרסם מתחם באתר (״המארח״). סימון ההסכמה בהרשמה או בממשק המארחים נשמר עם התאריך והגרסה, ודינו כחתימה על ההסכם.</p>
        <nav class="toc" aria-label="תוכן העניינים"><a href="#terms-hosts" data-act="jump" data-to="h2">מהות ההתקשרות</a><a href="#terms-hosts" data-act="jump" data-to="h4">הצהרות המארח</a><a href="#terms-hosts" data-act="jump" data-to="h7">שיחות</a><a href="#terms-hosts" data-act="jump" data-to="h9">תשלום</a><a href="#terms-hosts" data-act="jump" data-to="h13">אחריות ושיפוי</a></nav>
        <h2 id="h1">1. החשבון</h2><p>החשבון אישי ונפתח עם אימייל וסיסמה, ואפשר לנהל בו מתחם אחד או כמה מתחמים. המארח אחראי לשמירת הסיסמה ולכל פעולה שנעשית בחשבון, ומתחייב להחליף סיסמה ולהודיע לנו מיד אם יש חשד לשימוש לא מורשה. הפרטים בכרטיס הלקוח (שם, טלפון, שם העסק, מספר עוסק וכתובת) צריכים להיות נכונים ומעודכנים.</p>
        <h2 id="h2">2. מהות ההתקשרות</h2><p>המפעיל נותן למארח שירות פרסום בלבד: הצגת המתחם באתר והעברת פניות ושיחות של אורחים. <b>המפעיל אינו צד להזמנה, לתשלום או לאירוח, אינו סוכן או שלוח של המארח, ואינו מתחייב למספר פניות, הזמנות, צפיות או מיקום מסוים בתוצאות</b>. אין בין הצדדים יחסי שותפות, עובד ומעביד או סוכנות. המארח הוא היחיד שמספק את שירותי האירוח ואחראי להם כלפי האורחים.</p>
        <h2 id="h3">3. התוכן במתחם</h2><p>המארח אחראי לכך שהתיאור, התמונות, המחירים, היומן, מדיניות הביטול, המאפיינים, יכולת האירוח והצהרת הרעש מדויקים, מלאים ומעודכנים, ולכך שהמחירים המוצגים כוללים מע״מ כנדרש בדין. המפעיל רשאי לבדוק כל שינוי לפני פרסום, לבקש תיקונים, לערוך תוכן לצורך אחידות וקריאות, לתקן או לנעול סימון שגוי (כגון תגית רעש), ולהסיר תוכן מטעה, פוגעני, לא חוקי או מפר זכויות.</p>
        <p>המארח מצהיר שיש לו את כל הזכויות בתמונות, בסרטונים ובטקסטים שהוא מעלה, ונותן למפעיל רישיון לא בלעדי, ללא תמורה ובכל העולם, להשתמש בהם, להתאים אותם (חיתוך, הקטנה, תרגום) ולהציג אותם באתר, בניוזלטר, ברשתות החברתיות ובפרסום של האתר, במשך תקופת ההתקשרות ועד 90 יום אחריה.</p>
        <h2 id="h4">4. הצהרות והתחייבויות המארח</h2><ul>
          <li>הוא הבעלים של המתחם או מורשה כדין להשכיר ולפרסם אותו.</li>
          <li>יש בידיו כל רישיון, היתר ואישור שנדרשים לפי דין להפעלת המתחם ולשימוש בו לאירוח (לרבות רישוי עסקים, היתרי בנייה ושימוש, כבאות ובטיחות), והוא עומד בדרישות הבטיחות לבריכות, לג׳קוזי, לקמינים, לחשמל ולגז.</li>
          <li>יש לו ביטוח בתוקף שמכסה אחריות כלפי צד שלישי ונזקי רכוש במתחם, בהיקף סביר לפעילות.</li>
          <li>הוא מקיים את חוק הגנת הצרכן (כולל גילוי מחיר מלא ומדיניות ביטול), את דיני המס (כולל מסירת קבלה או חשבונית לאורחים), את חוק איסור הפליה במוצרים ובשירותים ואת דיני הנגישות ככל שהם חלים עליו.</li>
          <li>הצהרת הרעש שלו נכונה. אם סימן שמותר להרעיש במתחם, הוא אחראי לכך שהפעילות שמותרת בו עומדת בחוק למניעת מפגעים ובחוקי העזר המקומיים, ושיש לו את ההסכמות הדרושות.</li>
          <li>היומן והמחירים מעודכנים, והוא לא יאשר הזמנה כפולה ולא יבטל הזמנה מאושרת בלי סיבה מוצדקת.</li></ul>
        <h2 id="h5">5. פניות מאורחים</h2><p>בקשות הזמנה מגיעות במייל ובממשק המארחים, והמארח מתחייב לחזור אליהן בזמן סביר. ההזמנה, התשלום והביטול נסגרים ישירות בין המארח לאורח. את פרטי האורחים מותר להשתמש בהם רק לטיפול בבקשה ובאירוח, לשמור עליהם באבטחה סבירה ולא להעביר אותם לאחרים. אסור לשלוח לאורחים דבר פרסומת בלי הסכמה מפורשת, כנדרש בסעיף 30א לחוק התקשורת. לגבי המידע שקיבל, המארח אחראי עצמאי לפי חוק הגנת הפרטיות.</p>
        <h2 id="h6">6. חוות דעת</h2><p>חוות דעת נכתבות רק על ידי אורחים שהבקשה שלהם אושרה, ועוברות בדיקה שלנו לפני פרסום. המארח רשאי להגיב לחוות דעת ולבקש בדיקה של חוות דעת שנראית לו כוזבת. אסור למארח לכתוב חוות דעת על המתחם שלו או על מתחם מתחרה, להציע הטבה תמורת חוות דעת חיובית, או ללחוץ על אורחים להסיר חוות דעת.</p>
        <h2 id="h7">7. מספרים וירטואליים ונתוני שיחות</h2><p>המפעיל רשאי להציג באתר, במקום הטלפון של המארח, מספר וירטואלי שמעביר את השיחות אליו. המארח מסכים שהמפעיל וספק הטלפוניה שלו יקבלו וישמרו את נתוני השיחות: מספר המתקשר, המועד, משך השיחה, אם נענתה, ובחבילות שבהן הוגדר גם הקלטה (עם הודעה למתקשר). הנתונים משמשים לדוחות למארח, להתראה על שיחות שלא נענו, לחיוב לפי החבילה, לבקרת איכות ולבירור תלונות. רישומי המפעיל הם ראיה לכאורה למספר הפניות והשיחות לצורך חיוב, וזכותו של המארח להשיג עליהם בתוך 14 יום מקבלת החשבון.</p>
        <h2 id="h8">8. הוגנות ואיסור עקיפה</h2><p>אסור למארח לנסות לעקוף את מנגנוני הפרסום והמדידה: לשתול טלפון, אימייל או קישור חיצוני בתיאור או בתמונות במקום פרטי הקשר שהאתר מציג, לייצר פניות, שיחות או צפיות מלאכותיות, להשתמש במתחם שלא שלו, או לפרסם את אותו מתחם בכמה כרטיסים כדי לקבל חשיפה נוספת.</p>
        <h2 id="h9">9. מחירים, תשלום וחשבוניות</h2><p>המארח משלם לפי החבילה שבחר ולפי המחירון שבתוקף (מנוי חודשי, תשלום לפי פנייה או שילוב), בתוספת מע״מ ככל שחל. מנוי משולם מראש. חיוב לפי פנייה מחושב לפי רישומי המפעיל ומשולם בסוף כל חודש. תשלום שלא שולם במועד מאפשר למפעיל להשהות את הפרסום עד להסדרתו. שינוי במחירון ייכנס לתוקף לגבי המארח רק מהחידוש הבא ובהודעה של 30 יום לפחות. תשלום על תקופה שהתחילה אינו מוחזר, אלא אם הדין מחייב אחרת או שהמפעיל הפסיק את הפרסום בלי שהמארח הפר את ההסכם, ואז יוחזר החלק היחסי.</p>
        <h2 id="h10">10. ניסיון, חידוש וימי חסד</h2><p>מארחים חדשים מקבלים תקופת ניסיון כשהיא מוצעת. לפני סוף המנוי נשלחת תזכורת במייל. אם המנוי לא חודש, המתחם ממשיך להופיע כמה ימים (ימי חסד) ואז מוסתר מהאתר. הנתונים, התמונות והפניות נשמרים, ובחידוש המתחם חוזר לאוויר מיד.</p>
        <h2 id="h11">11. השעיה והסרה</h2><p>המפעיל רשאי להסתיר מתחם או להשעות חשבון מיד, בלי הודעה מוקדמת, אם יש חשד סביר להפרת ההסכם, למידע כוזב, להונאה, לסכנה בטיחותית, לפגיעה באורחים או בשכנים, לתלונות חוזרות או לחוב שלא שולם. ההחלטה תימסר למארח עם הסיבה, ותינתן לו הזדמנות לתקן כשהדבר אפשרי.</p>
        <h2 id="h12">12. סיום ההתקשרות</h2><p>המארח רשאי להפסיק לפרסם בכל עת בהודעה לצוות האתר. המפעיל רשאי לסיים את ההתקשרות בהודעה של 14 יום, או מיד אם המארח הפר את ההסכם. לבקשת המארח נמחק את המתחם ואת פרטי החשבון, חוץ ממידע שחובה או שמותר לשמור לפי דין (למשל לצורכי חשבונאות, בירור תלונות או הגנה מפני תביעות). הסעיפים על אחריות, שיפוי, תשלומים וסמכות שיפוט ממשיכים לחול גם אחרי הסיום.</p>
        <h2 id="h13">13. הגבלת אחריות</h2><p>האתר ניתן כפי שהוא וכפי שהוא זמין, ולא מובטח שיפעל בלי תקלות או הפסקות. המפעיל לא יהיה אחראי לנזק עקיף או תוצאתי, לאובדן הכנסות או רווחים, למעשה או מחדל של אורחים (כולל נזק למתחם, אי-תשלום, ביטול או בקשה כוזבת), או לתקלות אצל ספקים חיצוניים (מייל, טלפוניה, אחסון, סנכרון יומנים). בכל מקרה, האחריות הכוללת של המפעיל כלפי המארח מוגבלת לסכום ששילם המארח בשלושת החודשים שלפני האירוע, למעט נזק שנגרם בזדון.</p>
        <h2 id="h14">14. שיפוי</h2><p>המארח ישפה את המפעיל, את עובדיו ואת הפועלים מטעמו על כל תביעה, דרישה, קנס, נזק או הוצאה (כולל שכר טרחת עורך דין סביר) שנובעים מ: האירוח במתחם ומכל פגיעה בגוף או ברכוש שאירעה בו; מידע לא נכון או מטעה שמסר; הפרת זכויות יוצרים או פרטיות בתוכן שהעלה; הפרת דין (רישוי, מס, צרכנות, רעש, הפליה, נגישות, פרטיות); או מחלוקת בינו לבין אורח. המפעיל יודיע למארח על תביעה כזו בהקדם וייתן לו להתגונן בה.</p>
        <h2 id="h15">15. פרטיות המארח</h2><p>הפרטים של המארח נשמרים ומעובדים לפי <a href="#terms">מדיניות הפרטיות</a>. שם המתחם, היישוב, פרטי הקשר שבחר להציג (או המספר הווירטואלי) והתוכן של המתחם מתפרסמים באתר באופן גלוי. נתוני הצפיות, הלחיצות, הפניות והשיחות משמשים להצגת דוחות למארח ולמפעיל, ובצורה מצטברת ובלי פרטים מזהים גם לשיפור האתר.</p>
        <h2 id="h16">16. הודעות ושינויים</h2><p>הודעות נשלחות לאימייל של החשבון ובממשק המארחים, ונחשבות כמתקבלות יום עסקים אחד אחרי השליחה. אם ההסכם ישתנה, נעדכן לפחות 14 יום מראש. שינוי מהותי יוצג בממשק המארחים ויידרש לאשר אותו לפני המשך העבודה. המשך הפרסום אחרי מועד השינוי הוא הסכמה להסכם המעודכן.</p>
        <h2 id="h17">17. כללי</h2><p>ההסכם הזה, יחד עם תנאי השימוש ומדיניות הפרטיות של האתר והחבילה שנבחרה, הוא כל ההסכמות בין הצדדים. המארח לא יעביר את זכויותיו לפי ההסכם בלי הסכמה בכתב של המפעיל. אם סעיף כלשהו ייקבע כבטל, שאר ההסכם ימשיך לחול. ויתור או שיהוי במימוש זכות אינו ויתור עליה. על ההסכם חלים דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה ל${court}.</p>
        <p>שאלות: ${contact}</p>`
    };
    return `<div class="view wrap page"><article class="textpage">${pages[kind]}</article></div>`;
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
    const md = $("#modal"); if (md) md.remove();
    [S.map, S.miniMap, S.bigMap].forEach((m) => { if (m) m.remove(); });
    S.map = S.miniMap = S.bigMap = null;
    /* לפני שהנתונים הגיעו מסך הפתיחה מכסה את הדף, אז לא מציירים "טוען…" שיקפוץ */
    if (!S.loaded) { if (document.body.classList.contains("ready")) main.innerHTML = `<div class="wrap" style="padding-block:120px;text-align:center;color:var(--muted)">טוען…</div>`; return; }
    if (S.error) { main.innerHTML = `<div class="wrap page">${emptyState("לא הצלחנו לטעון את האתר", esc(S.error), `<button class="btn btn-primary" type="button" onclick="location.reload()">ניסיון נוסף</button>`)}</div>`; markReady(); return; }
    if (LOOK) Object.assign(S.settings, LOOK);
    T.applyTheme(S.settings, { cache: !PREVIEW });
    /* רענון נתונים כשהפתיח כבר מוצג: בלי לנגן שוב את אנימציית הפתיחה */
    S.homeAgain = !!$(".hf", main);
    let html, title = S.settings.site_name + " – " + S.settings.site_tagline;
    const preset = (patch) => { S.page = 1; S.filters = Object.assign(defaultFilters(), { ci: S.filters.ci, co: S.filters.co, guests: S.filters.guests, children: S.filters.children, benefit: S.filters.benefit, view: S.filters.view }, patch); const h = viewSearch(); title = searchTitle(S.filters) + " | " + S.settings.site_name; return h; };
    if (!hash || hash === "home") html = viewHome();
    else if (hash === "search") { html = viewSearch(); title = searchTitle(S.filters) + " | " + S.settings.site_name; }
    else if (hash === "deals") html = preset({ deals: true });
    else if (hash === "lastminute") html = preset({ lastminute: true });
    else if (hash === "weekend") html = preset({ weekend: true });
    else if (hash === "tonight") html = preset({ tonight: true });
    else if (hash.startsWith("quick-")) {
      const q = T.QUICK_FILTERS[Number(hash.slice(6))] || {};
      html = preset({ amenities: q.amenity ? [q.amenity] : [], audience: q.audience ? [q.audience] : [], benefit: q.benefit || S.filters.benefit, ...(q.flag ? { [q.flag]: true } : {}) });
    } else if (hash.startsWith("region-")) {
      /* region-golan או region-golan/jacuzzi (דפי נחיתה לגוגל) */
      const [place, extra] = hash.slice(7).split("/");
      const patch = { place };
      if (extra && T.AMENITIES.some((a) => a.key === extra)) patch.amenities = [extra];
      else if (extra && T.AUDIENCE.some((a) => a.key === extra)) patch.audience = [extra];
      else if (extra && T.TYPES.some((x) => x.key === extra)) patch.type = extra;
      html = preset(patch);
      const r = T.REGIONS.find((x) => x.key === place), f = T.SEO_FEATURES.find((x) => x.key === extra), ty = T.TYPES.find((x) => x.key === extra);
      if (r) title = `${ty ? ty.plural : "צימרים"} ${f ? f.phrase + " " : ""}${T.inPlace(r.name)} | ${S.settings.site_name}`;
    }
    else if (hash.startsWith("area-")) html = preset({ place: "area:" + hash.slice(5) });
    else if (hash.startsWith("type-")) { const [ty, ar] = hash.slice(5).split("/"); html = preset(Object.assign({ type: ty }, T.AREAS[ar] ? { place: "area:" + ar } : {})); }
    else if (hash.startsWith("aud-")) html = preset({ audience: [hash.slice(4)] });
    else if (hash.startsWith("town-")) { html = preset({ town: hash.slice(5) }); title = `צימרים ב${hash.slice(5)} | ${S.settings.site_name}`; }
    else if (hash.startsWith("stay-")) {
      html = viewStay(hash.slice(5));
      document.body.classList.add("has-mbar");
      const l = byId(hash.slice(5));
      if (l) title = `${l.name} – ${T.typeOf(l.type).name} ב${l.settlement} | ${S.settings.site_name}`;
    } else if (hash === "join") { html = viewJoin(); title = "פרסום צימר באתר | " + S.settings.site_name; }
    else if (hash === "saved" || hash === "me" || hash.startsWith("me-")) { if (hash === "me-leads") await loadMe(); html = viewMe(hash.startsWith("me-") ? hash.slice(3) : "saved"); title = "האזור האישי | " + S.settings.site_name; }
    else if (hash === "places" || hash.startsWith("places-")) { html = viewPlaces(hash.startsWith("places-") ? hash.slice(7) : ""); const pr = hash.startsWith("places-") ? T.REGIONS.find((x) => x.key === hash.slice(7)) : null; title = (pr ? "מה עושים " + T.inPlace(pr.name) : "אטרקציות ומסעדות") + " | " + S.settings.site_name; }
    else if (hash === "top") { html = viewTop(); title = "המקומות המומלצים | " + S.settings.site_name; }
    else if (hash === "contact") { html = viewContact(); title = "צרו קשר | " + S.settings.site_name; }
    else if (hash === "magazine") { html = viewMagazine(); title = "מגזין | " + S.settings.site_name; }
    else if (hash.startsWith("article-")) { html = viewArticle(hash.slice(8)); const a = S.articles.find((x) => x.id === hash.slice(8)); if (a) title = a.title + " | " + S.settings.site_name; }
    else if (hash.startsWith("review-")) html = await viewReview(hash.slice(7));
    else if (hash.startsWith("sub-confirm-") || hash.startsWith("unsubscribe-")) { html = await viewSubLink(hash); title = "דיוור | " + S.settings.site_name; }
    else if (["about", "accessibility", "terms", "terms-hosts"].includes(hash)) { html = viewText(hash); if (hash === "terms-hosts") title = "הסכם פרסום למארחים | " + S.settings.site_name; }
    else if (hash === "main") return;
    else html = viewHome();
    $("#chrome").innerHTML = header();
    main.innerHTML = html;
    document.title = title;
    if ($("#results")) renderResults();
    const mm = $("#mini-map");
    if (mm) { const l = stayL(); S.miniMap = mountMap(mm, [l], { mini: true }); }
    $("#footer").innerHTML = footer();
    floating();
    reveal();
    heroVideo();
    motion();
    markReady();
  }
  /* תצוגה מקדימה מפאנל הניהול (בתוך מסגרת): מקבלים צבעים ומצב זכוכית בזמן אמת, בלי לשמור כלום */
  const PREVIEW = /[?&]preview=1\b/.test(location.search) && window.parent !== window;
  let LOOK = null;
  if (PREVIEW) {
    document.documentElement.classList.add("tm-preview");
    window.addEventListener("message", (e) => {
      if (e.origin !== location.origin || !e.data || e.data.type !== "tm-look") return;
      LOOK = e.data.look || null;
      Object.assign(S.settings, LOOK || {});
      T.applyTheme(S.settings, { cache: false });
      lgSoon();
    });
  }
  /* ---------------------------------------------------------------- תנועה: מחוון שזז בין לשוניות, כפתור חיפוש "מגנטי" */
  const stillMotion = () => document.documentElement.classList.contains("a11y-still") || !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const PILLS = ".seg-tabs, .stay-tabs, .a11y-panel .seg";
  let pillRO = null;
  /* מנוע קפיצים קטן: לכל קפיץ "קשיחות ושיכוך". המחוון עשוי משני קצוות – הקצה שמוביל קשיח והקצה שנגרר רך,
     כך שבדרך הוא נמתח ונוחת שלם (כמו ב־Plan Switch) */
  const SPR = { lead: [620, 36], trail: [190, 19], soft: [420, 32] };
  const springs = new Set();
  let springRaf = 0, springLast = 0;
  const spring = (x, kc) => ({ x, v: 0, t: x, k: kc[0], c: kc[1] });
  function springLoop(now) {
    const dt = Math.min((now - (springLast || now)) / 1000, 1 / 30); springLast = now;
    let busy = false;
    springs.forEach((o) => {
      for (let i = 0; i < 4; i++) o.sp.forEach((q) => { const a = -q.k * (q.x - q.t) - q.c * q.v; q.v += a * dt / 4; q.x += q.v * dt / 4; });
      const done = o.sp.every((q) => Math.abs(q.x - q.t) < 0.3 && Math.abs(q.v) < 0.3);
      if (done) o.sp.forEach((q) => { q.x = q.t; q.v = 0; }); else busy = true;
      o.draw();
      if (done) springs.delete(o);
    });
    springRaf = busy ? requestAnimationFrame(springLoop) : 0;
    if (!busy) springLast = 0;
  }
  const kick = (o) => { springs.add(o); if (!springRaf) springRaf = requestAnimationFrame(springLoop); };
  function placePill(box) {
    const on = box.querySelector(':scope > [aria-pressed="true"], :scope > [aria-selected="true"]');
    let p = box.querySelector(":scope > .tab-hl");
    if (!on || !on.offsetWidth) { if (p) p.style.opacity = "0"; return; }
    const l = on.offsetLeft, r = l + on.offsetWidth, y = on.offsetTop, h = on.offsetHeight;
    if (!p) {
      p = document.createElement("span"); p.className = "tab-hl"; p.setAttribute("aria-hidden", "true"); box.prepend(p);
      const o = { L: spring(l, SPR.lead), R: spring(r, SPR.lead), Y: spring(y, SPR.soft), H: spring(h, SPR.soft) };
      o.sp = [o.L, o.R, o.Y, o.H];
      o.draw = () => { p.style.transform = `translate(${o.L.x.toFixed(2)}px, ${o.Y.x.toFixed(2)}px)`; p.style.width = Math.max(12, o.R.x - o.L.x).toFixed(2) + "px"; p.style.height = o.H.x.toFixed(2) + "px"; };
      p._o = o;
    }
    const o = p._o;
    p.style.opacity = "1";
    if (stillMotion() || (o.L.t === l && o.R.t === r && o.Y.t === y && o.H.t === h && !springs.has(o))) { o.sp.forEach((q) => { q.x = q.t = q === o.L ? l : q === o.R ? r : q === o.Y ? y : h; q.v = 0; }); o.draw(); return; }
    const right = l > o.L.t;
    [o.L.k, o.L.c] = right ? SPR.trail : SPR.lead;
    [o.R.k, o.R.c] = right ? SPR.lead : SPR.trail;
    o.L.t = l; o.R.t = r; o.Y.t = y; o.H.t = h;
    kick(o);
  }
  function motion(root) {
    requestAnimationFrame(() => liquid());
    (root || document).querySelectorAll("img:not(.ld)").forEach((im) => { if (im.complete) im.classList.add("ld"); });
    if (!pillRO && "ResizeObserver" in window) pillRO = new ResizeObserver((list) => list.forEach((en) => placePill(en.target)));
    (root || document).querySelectorAll(PILLS).forEach((box) => { if (!box.classList.contains("has-pill")) { box.classList.add("has-pill"); if (pillRO) pillRO.observe(box); } placePill(box); });
    const mb = $(".hf .searchbox > .btn");
    if (mb && !mb.dataset.mag && !stillMotion() && matchMedia("(hover: hover) and (pointer: fine)").matches) {
      mb.dataset.mag = "1";
      mb.addEventListener("pointermove", (e) => { const r = mb.getBoundingClientRect(); mb.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 8}px, ${((e.clientY - r.top) / r.height - 0.5) * 6}px)`; });
      mb.addEventListener("pointerleave", () => { mb.style.transform = ""; });
    }
  }
  /* כל שינוי בלשונית הפעילה מזיז את המחוון אליה */
  new MutationObserver((list) => {
    const boxes = new Set();
    list.forEach((m) => { const b = m.target.parentElement; if (b && b.classList && b.classList.contains("has-pill")) boxes.add(b); m.addedNodes && m.addedNodes.forEach((n) => { if (n.nodeType === 1 && (n.matches(PILLS) || n.querySelector(PILLS))) boxes.add(null); }); });
    if (boxes.has(null)) { boxes.delete(null); requestAnimationFrame(() => motion()); }
    boxes.forEach((b) => requestAnimationFrame(() => placePill(b)));
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected"] });
  /* מספר שמתגלגל מהערך הקודם לחדש (סכום ההזמנה) */
  function rollNumber(el, from, to) {
    if (!to || from === to || stillMotion()) return;
    const t0 = performance.now(), dur = 650;
    el.classList.add("rolling");
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = T.money(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(tick); else el.classList.remove("rolling");
    };
    requestAnimationFrame(tick);
  }
  /* תמונות: נחשפות ברכות כשהן נטענות (טשטוש קל שנעלם) */
  document.addEventListener("load", (e) => { const t = e.target; if (t.tagName === "IMG") t.classList.add("ld"); }, true);
  document.addEventListener("error", (e) => { const t = e.target; if (t.tagName === "IMG") t.classList.add("ld"); }, true);
  /* כרטיס מתחם: התמונה נוטה מעט אחרי העכבר */
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      const m = e.target.closest && (e.target.closest(".card-media") || mediaAt(e));
      if (!m || stillMotion()) return;
      const r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      m.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg"); m.style.setProperty("--ry", (x * 6).toFixed(2) + "deg");
      m.style.setProperty("--gx", (x * 100 + 50).toFixed(1) + "%"); m.style.setProperty("--gy", (y * 100 + 50).toFixed(1) + "%");
    }, { passive: true });
    document.addEventListener("pointerout", (e) => { const c = e.target.closest && e.target.closest(".card"), m = c && c.querySelector(".card-media"); if (m && !c.contains(e.relatedTarget)) { m.style.removeProperty("--rx"); m.style.removeProperty("--ry"); } });
  }
  /* ---------------------------------------------------------------- גלילת תמונות (כמו Pagination Dots)
     הפס של התמונות זז על קפיץ; הנקודה הפעילה היא גלולה שהקצה הקדמי שלה רץ קודם והאחורי מגיע אחריו,
     אז היא נמתחת בין הנקודות. אפשר גם לגרור באצבע. תמונות נטענות רק כשמתקרבים אליהן. */
  const pagers = new WeakMap();
  function pagerOf(box, opts) {
    let o = pagers.get(box);
    if (o) return o;
    const strip = box.querySelector(".pg-strip");
    if (!strip) return null;
    const op = opts || {}, slides = [...strip.children], n = slides.length;
    const dots = op.dots || box.querySelector(".pg-dots"), act = dots && dots.querySelector(".pg-act"), btns = dots ? [...dots.children].filter((x) => x !== act) : [];
    const m = /translateX\((-?[\d.]+)%\)/.exec(strip.style.transform), start = m ? Math.round(parseFloat(m[1]) / 100) : 0;
    o = { n, cur: start, box, op, P: spring(start, [230, 28]), A: spring(0, SPR.lead), B: spring(0, SPR.lead) };
    o.sp = [o.P, o.A, o.B];
    o.W = () => box.clientWidth || 1;
    o.draw = () => { strip.style.transform = `translateX(${(o.P.x * 100).toFixed(3)}%)`; if (act) { act.style.transform = `translateX(${o.A.x.toFixed(2)}px)`; act.style.width = Math.max(4, o.B.x - o.A.x).toFixed(2) + "px"; } };
    const pill = (i) => { const b = btns[i]; if (!b) return [0, 0]; const w = Number(dots.dataset.w) || 16, c = b.offsetLeft + b.offsetWidth / 2; return [c - w / 2, c + w / 2]; };
    o.load = (i) => [i - 1, i, i + 1].forEach((j) => { const sl = slides[(j + n) % n], im = sl && (sl.tagName === "IMG" ? sl : sl.querySelector("img")); if (im && im.dataset.src) { im.src = im.dataset.src; im.removeAttribute("data-src"); } });
    o.go = (i, instant) => {
      const k = ((i % n) + n) % n;
      o.cur = k; o.load(k);
      o.P.t = k;
      const [a, b] = pill(k);
      if (a < o.A.t) { [o.A.k, o.A.c] = SPR.lead; [o.B.k, o.B.c] = SPR.trail; } else { [o.B.k, o.B.c] = SPR.lead; [o.A.k, o.A.c] = SPR.trail; }
      o.A.t = a; o.B.t = b;
      btns.forEach((x, j) => x.classList.toggle("on", j === k));
      if (instant || stillMotion()) { o.sp.forEach((q) => { q.x = q.t; q.v = 0; }); o.draw(); } else kick(o);
      if (op.onChange) op.onChange(k);
    };
    const [a0, b0] = pill(start);
    o.A.x = o.A.t = a0; o.B.x = o.B.t = b0; o.draw();
    pagers.set(box, o);
    return o;
  }
  /* הקישור של הכרטיס מכסה את כל הכרטיס, אז בודקים לפי המיקום אם הנגיעה הייתה על התמונה */
  const mediaAt = (e) => {
    const c = e.target.closest(".card"), m = c && c.querySelector(".card-media");
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? m : null;
  };
  /* אחרי גרירה של תמונות בכרטיס לא פותחים את דף המקום */
  document.addEventListener("click", (e) => { const m = e.target.closest && mediaAt(e); if (m && Date.now() - (m._dragged || 0) < 400) { e.preventDefault(); e.stopPropagation(); } }, true);
  /* גרירה באצבע (ובחלון התמונות גם בעכבר) */
  document.addEventListener("pointerdown", (e) => {
    let box = e.target.closest && e.target.closest(".has-pg, .lb-stage");
    if (!box && e.target.closest) box = mediaAt(e);
    if (!box || e.button > 0 || e.target.closest("button")) return;
    const isLb = box.classList.contains("lb-stage");
    if (!isLb && e.pointerType === "mouse") return;
    const o = pagerOf(box, isLb ? undefined : { touchOnly: true });
    if (!o || o.n < 2) return;
    const x0 = e.clientX, y0 = e.clientY, p0 = o.cur;
    let drag = false, done = false;
    const mv = (ev) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!drag) { if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) return end(); if (Math.abs(dx) < 8) return; drag = true; box.classList.add("pg-drag"); o.load(p0); }
      o.P.x = o.P.t = p0 + dx / o.W(); o.P.v = 0; o.draw();
    };
    const end = (ev) => {
      if (done) return; done = true;
      window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end);
      box.classList.remove("pg-drag");
      if (!drag) return;
      box._dragged = Date.now();
      const dx = ev && ev.clientX != null ? ev.clientX - x0 : 0;
      o.go(p0 + (Math.abs(dx) > o.W() * 0.15 ? Math.sign(dx) : 0));
      if (!isLb) S.cardIdx[(box.closest(".card") && (box.closest(".card").querySelector("[data-act=save]") || {}).dataset || {}).id] = o.cur;
    };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
  });
  /* חלון התמונות: לחיצה על השטח הריק ליד התמונה סוגרת */
  document.addEventListener("click", (e) => {
    const lb = $("#lb");
    if (!lb || !lb.contains(e.target)) return;
    const st = $(".lb-stage", lb);
    if (st && Date.now() - (st._dragged || 0) < 300) return;
    if (e.target === lb || e.target.classList.contains("lb-slide") || e.target.classList.contains("lb-stage") || e.target.classList.contains("pg-strip")) lightbox(null);
  });

  /* ---------------------------------------------------------------- זכוכית נוזלית: שבירת אור בשולי הזכוכית
     מפת הזזה לכל צורה (מלבן מעוגל): ליד השוליים התמונה שמאחור "נשברת" פנימה, כמו בעדשה עבה, עם הפרדת צבעים עדינה.
     עובד בדפדפני Chromium (כרום, אדג׳, רוב האנדרואיד); בשאר הדפדפנים נשארת זכוכית מטושטשת רגילה. */
  const LG_OK = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some((b) => /Chromium/.test(b.brand)));
  const LG = [
    [".hf .searchbox", 1, "panel"], [".pick-pop, .tdd, .dp, .modal, .guests-pop .pop, .a11y-panel", 1, "panel"], [".topbar", 0.55, "panel"],
    [".stay-tabs, .seg-tabs", 0.8, "panel"], [".stay-tabs > .tab-hl, .seg-tabs > .tab-hl, .a11y-panel .seg > .tab-hl", 1, "lens"],
    [".book, .box, .fact, .ar-card, .form-card, .news-band, .hf .searchbox > .field", 0.7, "panel"], [".save-btn, .chip-sp, .toast", 0.8, "lens"]
  ];
  const LG_SEL = LG.map((x) => x[0]).join(", ");
  const lgCache = new Map();
  let lgDefs = null, lgN = 0, lgRO = null;
  function lgMap(w, h, r, band) {
    const k = Math.min(1, 220 / Math.max(w, h)), W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
    const R = r * k, B = Math.max(2, band * k), hw = W / 2, hh = H / 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"), im = ctx.createImageData(W, H), d = im.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const px = i + 0.5 - hw, py = j + 0.5 - hh, qx = Math.abs(px) - (hw - R), qy = Math.abs(py) - (hh - R);
      const depth = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R);
      let nx = 0, ny = 0;
      if (qx > 0 && qy > 0) { const L = Math.hypot(qx, qy) || 1; nx = (qx / L) * Math.sign(px); ny = (qy / L) * Math.sign(py); } else if (qx > qy) nx = Math.sign(px); else ny = Math.sign(py);
      const a = depth < B ? Math.pow(1 - Math.max(depth, 0) / B, 2.2) : 0;
      const o = (j * W + i) * 4; d[o] = 128 - nx * a * 127; d[o + 1] = 128 - ny * a * 127; d[o + 2] = 128; d[o + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return c.toDataURL();
  }
  function lgFilter(el, power, kind, gs) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 24 || h < 20) return "";
    const cs = getComputedStyle(el), r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, h / 2, w / 2);
    const band = kind === "lens" ? Math.max(5, Math.min(h * 0.24, 12)) : Math.min(h / 2.6, 16);
    const px = (kind === "lens" ? Math.min(18, h * 0.42) : 26) * power * (0.45 + gs * 0.9);
    const key = [Math.round(w / 6), Math.round(h / 6), Math.round(r), kind, Math.round(px)].join("_");
    if (lgCache.has(key)) return lgCache.get(key);
    if (!lgDefs) { lgDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg"); lgDefs.setAttribute("aria-hidden", "true"); lgDefs.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden"); document.body.appendChild(lgDefs); }
    const id = "lg" + ++lgN, sc = (m) => ((px * m) / w).toFixed(4);
    const ch = (m, mat, res) => `<feDisplacementMap in="SourceGraphic" in2="m" scale="${sc(m)}" xChannelSelector="R" yChannelSelector="G" result="d${res}"/><feColorMatrix in="d${res}" type="matrix" values="${mat}" result="${res}"/>`;
    lgDefs.insertAdjacentHTML("beforeend", `<filter id="${id}" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage href="${lgMap(w, h, r, band)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="m"/>${ch(1, "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0", "r")}${ch(0.94, "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0", "g")}${ch(0.88, "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0", "b")}<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>`);
    lgCache.set(key, id);
    return id;
  }
  function liquid(root) {
    const on = LG_OK && document.documentElement.classList.contains("glass") && !stillMotion() && !(window.matchMedia && matchMedia("(prefers-reduced-transparency: reduce)").matches);
    if (!on) { $$("[data-lg]").forEach((el) => { el.style.removeProperty("backdrop-filter"); el.removeAttribute("data-lg"); }); return; }
    const gs = Math.min(1, Math.max(0, parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gs")) || 0.6));
    if (!lgRO && "ResizeObserver" in window) lgRO = new ResizeObserver((list) => list.forEach((en) => { const el = en.target, w0 = Number(el.dataset.lgw) || 0; if (el.isConnected && Math.abs(el.offsetWidth - w0) > Math.max(30, w0 * 0.3)) lgSoon(); }));
    LG.forEach(([sel, power, kind]) => (root || document).querySelectorAll(sel).forEach((el) => {
      if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return;
      const id = lgFilter(el, power, kind, gs);
      if (!id) return;
      const f = kind === "lens" ? `url(#${id}) saturate(1.3) contrast(1.06)` : `url(#${id}) blur(var(--g-blur)) saturate(150%)`;
      if (el.dataset.lg !== id) { el.style.setProperty("backdrop-filter", f); el.dataset.lg = id; }
      if (!el.dataset.lgw && lgRO) lgRO.observe(el);
      el.dataset.lgw = el.offsetWidth;
    }));
  }
  const lgSoon = T.debounce(() => liquid(), 120);
  /* חלונות שנפתחים (בחירת סוג/אזור, יומן, תפריטים) מקבלים את הזכוכית ברגע שהם מופיעים */
  document.addEventListener("toggle", () => requestAnimationFrame(() => liquid()), true);
  new MutationObserver((list) => { if (!document.documentElement.classList.contains("glass")) return; for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches(LG_SEL) || n.querySelector(LG_SEL))) { lgSoon(); return; } }).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => lgSoon()).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(() => { if (document.documentElement.classList.contains("glass")) lgSoon(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
  window.addEventListener("resize", lgSoon);

  /* פרץ קטן של נקודות כשמסמנים לב */
  function burst(el) {
    if (stillMotion()) return;
    const b = document.createElement("span");
    b.className = "burst"; b.setAttribute("aria-hidden", "true");
    b.innerHTML = Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join("");
    el.appendChild(b); setTimeout(() => b.remove(), 750);
  }
  /* מסך הפתיחה יורד כשהמסך הראשון מוכן; בדף הבית מחכים רגע קצר גם לתמונת הפתיח כדי שלא תופיע ריקה */
  function markReady() {
    if (document.body.classList.contains("ready")) return;
    const img = $(".hf-media img");
    const go = () => requestAnimationFrame(() => document.body.classList.add("ready"));
    const waits = [];
    if (img && !img.complete && img.decode) waits.push(img.decode().catch(() => {}));
    if ($(".hf-title") && document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    if (waits.length) Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 1400))]).then(go);
    else go();
  }
  /* סרטון הרקע בפתיח: קובץ קטן לטלפון וגדול למחשב. מי שביקש בלי תנועה או חוסך נתונים רואה את התמונה בלבד */
  function heroVideo() {
    const v = $(".hf-video");
    if (!v) return;
    const still = document.documentElement.classList.contains("a11y-still") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const save = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ""));
    if (still || save) { v.remove(); return; }
    const big = Math.max(screen.width, screen.height) * (devicePixelRatio || 1) > 1700 && innerWidth >= 900;
    v.addEventListener("playing", () => v.classList.add("on"), { once: true });
    v.src = `assets/video/hero-${big ? "1080" : "720"}.mp4`;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  }
  /* תנועה (v6): קטעים וכרטיסים נכנסים בעדינות כשמגיעים אליהם, בהשהיה קטנה בין כרטיס לכרטיס.
     בלי תנועה למי שביקש (הגדרת מערכת או ״עצירת אנימציות״ בתפריט הנגישות). */
  const REVEAL = ".section, .stay-section, .area-sec, .news-band, .home-lean .band, .page-head, .grid > .card, .rail > *, .regions > *, .type-tiles > *, .mag-grid > *, .ar-grid > *, .ar-mag > *, .plans > *, .steps > *, .top-band, .rev-cards > *";
  let revObs = null;
  function reveal(root) {
    const still = document.documentElement.classList.contains("a11y-still") || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (still || !("IntersectionObserver" in window)) return;
    if (!revObs) revObs = new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revObs.unobserve(en.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    (root || document).querySelectorAll(REVEAL).forEach((el) => {
      if (el.classList.contains("rv")) return;
      const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      el.style.setProperty("--i", Math.min(Math.max(sib, 0) % 12, 8));
      el.classList.add("rv");
      revObs.observe(el);
    });
  }

  /* חלונות הבחירה בחיפוש (סוג, אזור, אורחים): אחד פתוח בכל פעם; לחיצה בחוץ או Esc סוגרים */
  const closePicks = (except) => $$("details.pick[open], details.guests-pop[open]").forEach((d) => { if (d !== except) d.removeAttribute("open"); });
  document.addEventListener("toggle", (e) => { const d = e.target; if (d.matches && d.matches("details.pick, details.guests-pop") && d.open) closePicks(d); }, true);
  const closeTdd = (focus) => {
    const b = $(".nav-dd-btn[aria-expanded=true]");
    if (!b) return false;
    b.setAttribute("aria-expanded", "false");
    $("#" + b.getAttribute("aria-controls")).hidden = true;
    if (focus) b.focus();
    return true;
  };

  /* עמוד המתחם: לשונית אחת פתוחה בכל פעם, כך שהתוכן לא נמתח מתחת לטופס ההזמנה */
  function showPane(k) {
    if (!$("#pane-" + k)) return;
    $$(".st-pane").forEach((p) => (p.hidden = p.id !== "pane-" + k));
    $$(".stay-tabs [data-act=st-pane]").forEach((b) => b.setAttribute("aria-selected", b.dataset.v === k));
    if (k === "map" && S.miniMap) setTimeout(() => { try { S.miniMap.invalidateSize(); const l = stayL(); if (l.lat) S.miniMap.setView([l.lat, l.lng], 11); } catch (e) {} }, 30);
    reveal();
  }
  /* ---------------------------------------------------------------- events */
  const closeMega = () => { const m = $("#mega"); if (m && !m.hidden) { m.hidden = true; const b = $(".mega-btn"); if (b) b.setAttribute("aria-expanded", "false"); } };
  const updateSavedCount = () => { $$(".saved-count:not(.viewed-count)").forEach((sc) => { S.saved.size ? sc.setAttribute("data-n", S.saved.size) : sc.removeAttribute("data-n"); sc.setAttribute("aria-label", `המועדפים שלי (${S.saved.size})`); }); };
  document.addEventListener("click", async (e) => {
    const tr = e.target.closest("[data-track]");
    if (tr && S.stay.id && location.hash.startsWith("#stay-")) T.store.track(S.stay.id, tr.dataset.track);
    if (!e.target.closest("#mega, .mega-btn")) closeMega();
    if (!e.target.closest(".nav-dd")) closeTdd();
    if (!e.target.closest("details.pick, details.guests-pop")) closePicks();
    const el = e.target.closest("[data-act]");
    if (!el) {
      const pnl = $("#a11y-panel");
      if (pnl && !pnl.hidden && !e.target.closest("#a11y-panel, #a11y-btn")) { pnl.hidden = true; $("#a11y-btn").setAttribute("aria-expanded", "false"); }
      if (e.target.id === "modal") { $("#modal").remove(); if (S.bigMap) { S.bigMap.remove(); S.bigMap = null; } }
      return;
    }
    const act = el.dataset.act;
    const st = S.stay;
    if (act === "tdd") {
      const open = el.getAttribute("aria-expanded") === "true";
      closeTdd();
      if (!open) { el.setAttribute("aria-expanded", "true"); $("#" + el.getAttribute("aria-controls")).hidden = false; }
      return;
    }
    if (act === "pick") {
      const d = el.closest("details.pick");
      $("input[type=hidden]", d).value = el.dataset.v;
      $(".psum", d).textContent = el.dataset.l;
      $$(".pick-opt", d).forEach((o) => { o.classList.toggle("on", o === el); o.setAttribute("aria-selected", o === el); });
      d.removeAttribute("open");
      $("summary", d).focus();
      return;
    }
    if (act === "pick-exp") {
      const a = el.closest(".pick-area");
      a.classList.toggle("open");
      el.setAttribute("aria-expanded", a.classList.contains("open"));
      return;
    }
    if (act === "save") {
      e.preventDefault();
      const id = el.dataset.id;
      S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id);
      saveSaved();
      const on = S.saved.has(id);
      if (T.isLive && S.me.user) T.store.setFavorite(id, on).catch(() => {});
      $$(`[data-act="save"][data-id="${CSS.escape(id)}"]`).forEach((b) => { b.setAttribute("aria-pressed", on); if (b.classList.contains("btn")) b.innerHTML = I("heart") + (on ? "במועדפים" : "אהבתי"); });
      updateSavedCount();
      if (on) burst(el);
      T.toast(on ? "נשמר במועדפים" : "הוסר מהמועדפים");
    } else if (act === "menu") { const nav = $("#mobile-nav"); nav.classList.toggle("open"); el.setAttribute("aria-expanded", nav.classList.contains("open")); }
    else if (act === "mega") { const m = $("#mega"); m.hidden = !m.hidden; el.setAttribute("aria-expanded", !m.hidden); if (!m.hidden) { const a = $("a", m); if (a) a.focus(); } }
    else if (act === "cookie-ok") { T.storage.set("tamara.cookies", true); floating(); }
    else if (act === "step") {
      const input = el.parentElement.querySelector("input");
      const was = input.value;
      input.value = Math.max(Number(input.min) || 0, Math.min(Number(input.max) || 40, (Number(input.value) || 0) + Number(el.dataset.d)));
      if (input.value !== was) { input.classList.remove("roll-up", "roll-dn"); void input.offsetWidth; input.classList.add(Number(el.dataset.d) > 0 ? "roll-up" : "roll-dn"); }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const pop = el.closest(".guests-pop");
      if (pop) { const g = Number(pop.querySelector("[name=guests]").value) || 1, c = Number(pop.querySelector("[name=children]").value) || 0; pop.querySelector(".gsum").textContent = plural.adults(g) + (c ? " · " + plural.kids(c) : ""); }
    } else if (act === "quick") { e.preventDefault(); location.hash = "quick-" + el.dataset.i; }
    else if (act === "show") { S.showIdx += Number(el.dataset.d); $("#showcase").innerHTML = showcase(S.listings.filter((l) => l.featured)); }
    else if (act === "cimg") {
      e.preventDefault();
      const box = el.closest(".card-media"), o = box && pagerOf(box, { touchOnly: true });
      if (o) { o.go(o.cur + Number(el.dataset.d)); S.cardIdx[el.dataset.id] = o.cur; }
    } else if (act === "quick-dates") {
      const l = byId(el.closest(".card").querySelector("[data-act=save]").dataset.id);
      S.filters.ci = el.dataset.ci; S.filters.co = el.dataset.co;
      if (S.stay.id === (l && l.id)) S.stay.id = "";
    } else if (act === "view") { S.filters.view = el.dataset.v; $$('[data-act="view"]').forEach((b) => b.setAttribute("aria-pressed", b === el)); renderResults(); }
    else if (act === "more") { S.page++; const y = window.scrollY; renderResults(); window.scrollTo(0, y); }
    else if (act === "unfilter") {
      const f = S.filters, k = el.dataset.k, v = el.dataset.v;
      if (k === "audience" || k === "amenities") f[k] = f[k].filter((x) => x !== v);
      else if (k === "dates") { f.ci = ""; f.co = ""; }
      else if (k === "people") { f.guests = 0; f.children = 0; }
      else f[k] = defaultFilters()[k];
      S.page = 1;
      $("#main").innerHTML = viewSearch(); renderResults();
    } else if (act === "clear-all") { S.filters = Object.assign(defaultFilters(), { view: S.filters.view }); S.page = 1; $("#main").innerHTML = viewSearch(); renderResults(); }
    else if (act === "filters-open") { $("#filters").classList.add("open"); document.body.style.overflow = "hidden"; }
    else if (act === "filters-close") { $("#filters").classList.remove("open"); document.body.style.overflow = ""; }
    else if (act === "day") {
      const d = el.dataset.d;
      if (!st.ci || st.co || d <= st.ci) { st.ci = d; st.co = ""; } else st.co = d;
      refreshBooking();
    } else if (act === "unit") {
      const id = el.dataset.id;
      const l = stayL();
      if (st.rooms.length === 1) { st.rooms[0].unitId = id; const u = T.unitOf(l, id); st.rooms[0].guests = Math.min(st.rooms[0].guests, u.guests_max); st.rooms[0].children = Math.min(st.rooms[0].children, Math.max(0, u.guests_max - st.rooms[0].guests)); }
      else if (!st.rooms.some((r) => r.unitId === id)) st.rooms.push({ unitId: id, guests: Math.min(2, T.unitOf(l, id).guests_max), children: 0 });
      st.calUnit = id;
      refreshBooking(); $("#book").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (act === "room-add") {
      const l = stayL();
      const free = T.unitsOf(l).filter((u) => !st.rooms.some((r) => r.unitId === u.id));
      const pickU = (st.ci && st.co ? free.find((u) => T.unitFree(u, st.ci, st.co)) : null) || free[0];
      if (pickU) st.rooms.push({ unitId: pickU.id, guests: Math.min(2, pickU.guests_max), children: 0 });
      refreshBooking();
    } else if (act === "room-del") { st.rooms.splice(Number(el.dataset.i), 1); refreshBooking(); }
    else if (act === "alt-unit") { st.rooms[0].unitId = el.dataset.id; st.calUnit = el.dataset.id; refreshBooking(); }
    else if (act === "alt-dates") { st.ci = el.dataset.ci; st.co = el.dataset.co; const dd = T.parseISO(st.ci); st.calStart = new Date(dd.getFullYear(), dd.getMonth(), 1); refreshBooking(); }
    else if (act === "cal-unit") { st.calUnit = el.dataset.id; $("#cal").innerHTML = calendarHTML(stayL()); }
    else if (act === "cal-clear") { st.ci = ""; st.co = ""; refreshBooking(); }
    else if (act === "cal") {
      const base = st.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
      const next = new Date(base.getFullYear(), base.getMonth() + Number(el.dataset.d), 1);
      if (next >= new Date(T.today().getFullYear(), T.today().getMonth(), 1)) st.calStart = next;
      $("#cal").innerHTML = calendarHTML(stayL());
    } else if (act === "lb") lightbox(Number(el.dataset.i), "all");
    else if (act === "lb-unit") lightbox(0, "unit:" + el.dataset.id);
    else if (act === "lb-cat") lightbox(0, el.dataset.v);
    else if (act === "lb-go") lightbox(st.lb + Number(el.dataset.d));
    else if (act === "lb-close") lightbox(null);
    else if (act === "copy") { T.copy(el.dataset.text); if (!el.classList.contains("copied")) { const was = el.innerHTML; el.classList.add("copied"); el.innerHTML = I("check"); setTimeout(() => { el.classList.remove("copied"); el.innerHTML = was; }, 1600); } }
    else if (act === "share") {
      const l = stayL();
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) { try { await navigator.share({ title: l.name, text: `${l.name} – ${T.typeOf(l.type).name} ב${l.settlement}`, url: shareUrl(l.id) }); return; } catch (ex) { if (ex && ex.name === "AbortError") return; } }
      shareModal(l);
    } else if (act === "report") reportModal(stayL());
    else if (act === "big-map") bigMap(stayL());
    else if (act === "modal-close") { $("#modal").remove(); if (S.bigMap) { S.bigMap.remove(); S.bigMap = null; } }
    else if (act === "reveal") { st.phone = true; T.store.track(st.id, "p"); refreshBooking(); }
    else if (act === "video") {
      const l = stayL();
      const embed = T.videoEmbed(l.video_url);
      if (T.isLive && embed) { st.video = true; $("#video").innerHTML = videoHTML(l); }
      else window.open(l.video_url, "_blank", "noopener");
    } else if (act === "to-book") { const b = $("#book"); b.scrollIntoView({ behavior: "smooth", block: "start" }); const i = $("#book [name=ci]"); if (i) setTimeout(() => i.focus({ preventScroll: true }), 400); }
    else if (act === "to-message") { const b = $("#book [name=message]"); if (b) { b.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => b.focus({ preventScroll: true }), 400); } }
    else if (act === "jump") { e.preventDefault(); const t = document.getElementById(el.dataset.to); if (!t) return; const pane = t.closest(".st-pane"); if (pane) showPane(pane.id.slice(5)); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (act === "st-pane") { showPane(el.dataset.v); const nav = el.closest(".stay-tabs"); if (nav.getBoundingClientRect().top < 90) nav.scrollIntoView({ behavior: "smooth", block: "start" }); }
    else if (act === "more-desc") { const x = $("#about-text"); const open = x.classList.toggle("open"); x.style.maxHeight = open ? x.scrollHeight + "px" : ""; el.setAttribute("aria-expanded", open); el.textContent = open ? "פחות" : "קראו עוד"; }
    else if (act === "book-again") { st.sent = null; refreshBooking(); }
    else if (act === "rev-sort") { st.revSort = el.dataset.v; $("#rev-host").innerHTML = reviewsHTML(stayL()); }
    else if (act === "rev-more") { st.revShow += 6; $("#rev-host").innerHTML = reviewsHTML(stayL()); }
    else if (act === "place-kind") { st.placeKind = el.dataset.v; st.areaMore = false; refreshArea(); }
    else if (act === "area-tab") { st.areaTab = el.dataset.v; refreshArea(); }
    else if (act === "area-more") { st.areaMore = true; refreshArea(); }
    else if (act === "area-go") { const a = $("#area"); if (a) { a.scrollIntoView({ behavior: "smooth", block: "start" }); a.classList.remove("flash"); void a.offsetWidth; a.classList.add("flash"); } }
    else if (act === "pl-kind") { S.placesFilter.kind = el.dataset.v; $("#main").innerHTML = viewPlaces(); }
    else if (act === "rate") {
      S.reviewRating = Number(el.dataset.v);
      $$('[data-act="rate"]').forEach((b) => { const on = Number(b.dataset.v) <= S.reviewRating; b.classList.toggle("on", on); b.setAttribute("aria-checked", Number(b.dataset.v) === S.reviewRating); });
    } else if (act === "rate-cat") {
      const k = el.dataset.k, v = Number(el.dataset.v);
      S.reviewScores[k] = S.reviewScores[k] === v ? undefined : v;
      $$(`[data-act="rate-cat"][data-k="${k}"]`).forEach((b) => { const on = S.reviewScores[k] && Number(b.dataset.v) <= S.reviewScores[k]; b.classList.toggle("on", !!on); b.classList.remove("pop"); if (on) { b.style.setProperty("--d", Number(b.dataset.v) * 40 + "ms"); void b.offsetWidth; b.classList.add("pop"); } b.setAttribute("aria-checked", Number(b.dataset.v) === S.reviewScores[k]); });
    } else if (act === "redo-search") { const s = S.searches[Number(el.dataset.i)]; if (s) { S.filters = Object.assign(defaultFilters(), s.f); S.page = 1; location.hash = "search"; } }
    else if (act === "clear-searches") { S.searches = []; T.storage.set("tamara.searches", []); render(); }
    else if (act === "clear-viewed") { S.viewedList = []; T.storage.set("tamara.viewed", []); render(); }
    else if (act === "join-mode") { S.joinMode = el.dataset.v; const c = $("#join-card"); if (c) c.innerHTML = joinForm(); }
    else if (act === "join-resend") {
      if (S.resendAt && Date.now() - S.resendAt < 60e3) { T.toast("אפשר לשלוח שוב בעוד דקה"); return; }
      S.resendAt = Date.now();
      try { await T.store.resendSignup(el.dataset.email); T.toast("שלחנו שוב. בדקו גם בספאם."); } catch (ex) { T.toast(T.authError(ex), "err"); }
    }
    else if (act === "join-google") { el.disabled = true; try { await T.store.signInGoogle("/owner.html"); } catch (ex) { el.disabled = false; T.toast(ex.message, "err"); } }
    else if (act === "guest-google") { try { await T.store.signInGuestGoogle(); } catch (ex) { T.toast("הכניסה עם Google לא זמינה: " + ex.message, "err"); } }
    else if (act === "guest-logout") { await T.store.signOut(); S.me = { leads: null, user: null }; render(); }
    else if (act === "a11y-open") {
      const p = $("#a11y-panel");
      p.hidden = !p.hidden;
      el.setAttribute("aria-expanded", !p.hidden);
      if (!p.hidden) { p.innerHTML = a11yPanel(); $("button", p).focus(); }
    } else if (act === "a11y") { A11Y[el.dataset.k] = !A11Y[el.dataset.k]; applyA11y(); el.setAttribute("aria-checked", A11Y[el.dataset.k]); }
    else if (act === "a11y-scale") { A11Y.scale = Number(el.dataset.v); applyA11y(); $$('[data-act="a11y-scale"]').forEach((b) => b.setAttribute("aria-pressed", b === el)); }
  });
  document.addEventListener("keydown", (e) => {
    if ($("#lb")) { if (e.key === "Escape") lightbox(null); if (e.key === "ArrowLeft") lightbox(S.stay.lb + 1); if (e.key === "ArrowRight") lightbox(S.stay.lb - 1); }
    else if (e.key === "Escape") {
      if ($("#modal")) { $("#modal").remove(); if (S.bigMap) { S.bigMap.remove(); S.bigMap = null; } return; }
      const m = $("#mega"); if (m && !m.hidden) { closeMega(); $(".mega-btn").focus(); return; }
      if (closeTdd(true)) return;
      const pk = $("details.pick[open], details.guests-pop[open]"); if (pk) { pk.removeAttribute("open"); $("summary", pk).focus(); return; }
      const f = $("#filters.open"); if (f) { f.classList.remove("open"); document.body.style.overflow = ""; }
      const p = $("#a11y-panel"); if (p && !p.hidden) { p.hidden = true; $("#a11y-btn").focus(); }
    }
  });
  const onFilterInput = T.debounce(readFilters, 120);
  const onBookInput = (e) => {
    const t = e.target;
    if (!t.closest("#book")) return;
    const f = t.form;
    const st = S.stay;
    st.ci = f.ci.value; st.co = f.co.value;
    st.rooms = st.rooms.map((r, i) => ({ unitId: f["unit-" + i] ? f["unit-" + i].value : r.unitId, guests: f["adults-" + i] ? Number(f["adults-" + i].value) : r.guests, children: f["kids-" + i] && !f["kids-" + i].disabled ? Number(f["kids-" + i].value) : 0 }));
    if (/^unit-/.test(t.name)) st.calUnit = t.value;
    st.extras = $$('#book input[name="extras"]:checked').map((x) => x.value);
    const pk = $('#book input[name="pkg"]:checked'); st.pkg = pk ? pk.value : "";
    if (f.benefit) st.benefit = f.benefit.value;
    if (f.coupon) st.coupon = f.coupon.value.trim();
    st.flexible = !!(f.flexible && f.flexible.checked);
    if (st.co && st.ci && st.co <= st.ci) st.co = "";
    if (t.name === "ci" && st.ci) { const d = T.parseISO(st.ci); st.calStart = new Date(d.getFullYear(), d.getMonth(), 1); }
    if (["name", "phone", "email", "message", "consent", "remember"].includes(t.name)) return;
    refreshBooking();
  };
  const debouncedBook = T.debounce(onBookInput, 350);
  document.addEventListener("input", (e) => {
    if (e.target.closest("#filters") || (e.target.form && e.target.form.id === "filters")) onFilterInput();
    if (e.target.closest("#book")) (e.target.name === "coupon" ? debouncedBook : onBookInput)(e);
    if (e.target.name === "password" && e.target.form && e.target.form.dataset.form === "join") { const ul = $("#join-pw"); if (ul) ul.innerHTML = pwRulesHTML(e.target.value); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.form && e.target.form.id === "filters") onFilterInput();
    if (e.target.id === "pl-region") { S.placesFilter.region = e.target.value; location.hash = e.target.value ? "places-" + e.target.value : "places"; }
  });
  /* בורר התאריכים בטופס ההזמנה מכיר את הימים התפוסים של היחידות שנבחרו */
  T.dp.blockedFor = (inp) => {
    if (!inp.closest("#book")) return null;
    const l = stayL();
    if (!l) return null;
    const set = new Set();
    S.stay.rooms.forEach((r) => T.blockedSet(T.unitOf(l, r.unitId)).forEach((d) => set.add(d)));
    return set;
  };
  /* תצוגה מקדימה של הטווח בלוח הקבוע בזמן בחירת תאריך העזיבה */
  document.addEventListener("mouseover", (e) => {
    const wrap = e.target.closest && e.target.closest(".dp-inline");
    if (!wrap) return;
    const st = S.stay;
    if (!st.ci || st.co) return;
    const d = e.target.closest(".dp-d");
    T.dp.paint(wrap, st.ci, "", d && !d.disabled && d.dataset.d > st.ci ? d.dataset.d : "");
  });
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    const kind = form.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const fd = new FormData(form);
    /* רובוט מילא את השדה הנסתר: עונים כאילו נשלח, ולא שומרים כלום */
    if (fd.get("website")) { form.reset(); T.toast("נשלח. תודה!"); return; }
    const phoneOk = (p) => /^0?5\d{8}$|^0\d{8}$|^972\d{8,9}$/.test(String(p).replace(/[\s-]/g, ""));
    const emailOk = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(m).trim());
    const bad = (errId, msg, name) => { $(errId).textContent = msg; const f = name && form.elements[name]; if (f) { f.setAttribute("aria-invalid", "true"); f.focus(); } };
    $$("[aria-invalid]", form).forEach((x) => x.removeAttribute("aria-invalid"));
    const remember = (g) => { S.guest = g; T.storage.set("tamara.guest", g); };
    const pushMine = (lead, saved) => { S.myLeads = [Object.assign({ id: (saved && saved.id) || lead.id || T.uid("q"), created_at: new Date().toISOString(), status: "new" }, { listing_id: lead.listing_id, listing_name: lead.listing_name, check_in: lead.check_in, check_out: lead.check_out, guests: lead.guests, children: lead.children })].concat(S.myLeads).slice(0, 50); T.storage.set("tamara.myleads", S.myLeads); };
    if (kind === "hero-search") {
      Object.assign(S.filters, defaultFilters(), { type: fd.get("type") || "", place: fd.get("place") || "", ci: fd.get("ci") || "", co: fd.get("co") || "", guests: Number(fd.get("guests")) || 0, children: Number(fd.get("children")) || 0 });
      if (S.filters.co && S.filters.co <= S.filters.ci) S.filters.co = "";
      S.page = 1;
      rememberSearch();
      location.hash = "search";
    } else if (kind === "filters") readFilters();
    else if (kind === "book") {
      const l = stayL();
      const st = S.stay;
      const q = stayQuote(l);
      if (!q) return bad("#book-err", "בחרו תאריך הגעה ועזיבה", st.ci ? "co" : "ci");
      if (q.conflicts.length) return bad("#book-err", "חלק מהלילות תפוסים. בחרו תאריכים או יחידה אחרת (ההצעות למעלה).", "ci");
      if (q.overCapacity) return bad("#book-err", "יש יותר אורחים ממה שהיחידה מתאימה לו. בחרו יחידה גדולה יותר או הוסיפו יחידה.");
      if (!fd.get("name").trim()) return bad("#book-err", "כתבו שם מלא", "name");
      if (!phoneOk(fd.get("phone"))) return bad("#book-err", "מספר הטלפון לא נראה תקין. לדוגמה: 050-1234567", "phone");
      if (fd.get("email") && !emailOk(fd.get("email"))) return bad("#book-err", "כתובת האימייל לא נראית תקינה", "email");
      if (!fd.get("consent")) return bad("#book-err", "צריך לאשר העברת פרטים למארחים", "consent");
      const btn = $('button[type="submit"]', form);
      btn.disabled = true; btn.textContent = "שולח…"; btn.classList.add("is-busy");
      const units = T.unitsOf(l);
      const multi = st.rooms.length > 1;
      const unitNames = st.rooms.map((r) => T.unitOf(l, r.unitId).name);
      const lead = {
        listing_id: l.id, listing_name: l.name, unit_id: units.length > 1 ? st.rooms[0].unitId : "", unit_name: units.length > 1 ? unitNames.join(" + ") : "",
        name: fd.get("name").trim(), phone: fd.get("phone").trim(), email: (fd.get("email") || "").trim(), check_in: st.ci, check_out: st.co,
        guests: st.rooms.reduce((s2, r) => s2 + r.guests, 0), children: st.rooms.reduce((s2, r) => s2 + r.children, 0), extras: st.extras, coupon: q.coupon ? q.coupon.code : "",
        est_total: q.total, message: (fd.get("message") || "").trim(), source: "form", benefit: q.benefit ? q.benefit.key : "", package: st.pkg || "", flexible: st.flexible,
        rooms_req: multi ? st.rooms.map((r, i) => ({ id: r.unitId, name: unitNames[i], guests: r.guests, children: r.children })) : []
      };
      try {
        const saved = await T.store.addLead(lead);
        st.sent = lead;
        pushMine(lead, saved);
        if (fd.get("remember")) remember({ name: lead.name, phone: lead.phone, email: lead.email }); else { S.guest = null; T.storage.set("tamara.guest", null); }
        refreshBooking(); T.toast("הבקשה נשלחה");
      } catch (ex) { btn.disabled = false; btn.classList.remove("is-busy"); btn.textContent = "שליחת בקשת הזמנה"; bad("#book-err", "השליחה לא הצליחה (" + ex.message + "). אפשר לנסות שוב או לפנות בוואטסאפ."); }
    } else if (kind === "contact") {
      if (!fd.get("name").trim()) return bad("#ct-err", "כתבו שם מלא", "name");
      if (!phoneOk(fd.get("phone"))) return bad("#ct-err", "מספר הטלפון לא נראה תקין", "phone");
      if (!(fd.get("message") || "").trim()) return bad("#ct-err", "כתבו הודעה", "message");
      if (!fd.get("consent")) return bad("#ct-err", "צריך לאשר שנחזור אליכם", "consent");
      try { await T.store.addLead({ listing_id: null, listing_name: "יצירת קשר", name: fd.get("name").trim(), phone: fd.get("phone").trim(), email: (fd.get("email") || "").trim(), guests: 1, extras: [], coupon: "", est_total: 0, message: fd.get("message").trim(), source: "contact" }); form.outerHTML = `<div class="form-card book-ok"><span class="badge-ok">${I("check")}</span><h2 style="font-size:2rem">ההודעה נשלחה</h2><p class="muted">נחזור אליכם בהקדם.</p></div>`; }
      catch (ex) { bad("#ct-err", "השליחה לא הצליחה (" + ex.message + ")."); }
    } else if (kind === "report") {
      const l = stayL();
      const msg = (fd.get("message") || "").trim();
      if (msg.length < 5) return bad("#rep-err", "ספרו לנו מה לא מדויק", "message");
      const ph = (fd.get("phone") || "").trim();
      if (ph && !phoneOk(ph)) return bad("#rep-err", "מספר הטלפון לא נראה תקין", "phone");
      try { await T.store.addLead({ listing_id: l.id, listing_name: l.name, name: (fd.get("name") || "").trim() || "גולש", phone: ph || "לא נמסר", email: "", guests: 1, extras: [], coupon: "", est_total: 0, message: msg, source: "report" }); $("#modal").remove(); T.toast("תודה! נבדוק את זה מול המארחים."); }
      catch (ex) { bad("#rep-err", "השליחה לא הצליחה (" + ex.message + ")."); }
    } else if (kind === "subscribe") {
      const email = (fd.get("email") || "").trim();
      if (!emailOk(email)) { const i = form.elements.email; i.setAttribute("aria-invalid", "true"); i.focus(); T.toast("כתובת האימייל לא נראית תקינה", "err"); return; }
      try { const r = await T.store.addSubscriber({ email, regions: fd.get("region") ? [fd.get("region")] : [], source: location.hash.slice(1) || "home" }); form.reset(); T.toast(r && r.duplicate ? "האימייל הזה כבר רשום. תודה!" : r && r.pending ? "כמעט סיימנו: שלחנו לכם מייל, ולחיצה על הקישור שבו מאשרת את ההרשמה." : "נרשמתם! הדילים הבאים יגיעו למייל.", r && r.pending ? "info" : undefined); }
      catch (ex) { T.toast(/^ההרשמה/.test(ex.message) ? ex.message : "ההרשמה לא הצליחה: " + ex.message, "err"); }
    } else if (kind === "guest-login") {
      const email = (fd.get("email") || "").trim();
      if (!emailOk(email)) { T.toast("כתובת האימייל לא נראית תקינה", "err"); return; }
      try { await T.store.signInGuest(email); T.toast("שלחנו קישור כניסה ל־" + email); } catch (ex) { T.toast("השליחה נכשלה: " + ex.message, "err"); }
    } else if (kind === "join") {
      const acc = S.joinMode !== "call";
      const email = String(fd.get("email") || "").trim().toLowerCase();
      const units = Math.round(Number(fd.get("units")) || 0);
      const taxId = String(fd.get("tax_id") || "").replace(/\D/g, "");
      if (!fd.get("name").trim()) return bad("#join-err", "כתבו שם מלא", "name");
      if (!phoneOk(fd.get("phone"))) return bad("#join-err", "מספר הטלפון לא נראה תקין", "phone");
      if ((acc || email) && !emailOk(email)) return bad("#join-err", acc ? "צריך אימייל תקין: הוא הכניסה לחשבון" : "כתובת האימייל לא נראית תקינה", "email");
      if (!fd.get("business").trim()) return bad("#join-err", "מה שם המתחם?", "business");
      if (!fd.get("settlement").trim()) return bad("#join-err", "באיזה יישוב המתחם?", "settlement");
      if (units < 1 || units > 500) return bad("#join-err", "כמה יחידות אירוח יש במתחם?", "units");
      if (acc && taxId && !/^\d{8,9}$/.test(taxId)) return bad("#join-err", "ח.פ / ע.מ הוא 9 ספרות (אפשר גם להשאיר ריק)", "tax_id");
      if (acc) {
        const pw = String(fd.get("password") || "");
        const issues = T.passwordIssues(pw);
        if (issues.length) return bad("#join-err", "הסיסמה צריכה " + issues.join(", "), "password");
        if (pw !== String(fd.get("password2") || "")) return bad("#join-err", "שתי הסיסמאות לא זהות", "password2");
      }
      if (!fd.get("consent")) return bad("#join-err", acc ? "צריך לאשר את הסכם הפרסום ואת מדיניות הפרטיות" : "צריך לאשר שנחזור אליכם", "consent");
      const app = { name: fd.get("name").trim(), phone: fd.get("phone").trim(), email, business: fd.get("business").trim(), settlement: fd.get("settlement").trim(), region: fd.get("region"), type: fd.get("type"), units, message: (fd.get("message") || "").trim(), tax_id: taxId, marketing: !!fd.get("marketing") };
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.classList.add("is-busy");
      try {
        if (acc) {
          const r = await T.store.signUpHost(Object.assign({ password: String(fd.get("password")) }, app));
          if (r && r.session) { location.href = "owner.html?welcome=1"; return; }
          $("#join-card").innerHTML = r && r.demo ? `<div class="book-ok"><span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">נרשמתם (מצב הדגמה)</h3><p class="muted">באתר החי יישלח עכשיו מייל לאישור הכתובת, ואחריו החשבון נפתח. כאן ההרשמה נשמרה כבקשת הצטרפות בפאנל הניהול.</p><a class="btn btn-line" href="#">לדף הבית</a></div>` : joinSent(email, r && r.existing);
          $("#join-card").scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          await T.store.addApplication(app);
          $("#join-card").innerHTML = `<div class="book-ok"><span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">תודה, ${esc(app.name)}!</h3><p class="muted">קיבלנו את הפרטים של ${esc(app.business)}. נחזור אליכם בימים הקרובים לטלפון ${esc(app.phone)}.</p><a class="btn btn-line" href="#">לדף הבית</a></div>`;
        }
      } catch (ex) { btn.disabled = false; btn.classList.remove("is-busy"); bad("#join-err", (acc ? T.authError(ex) : "השליחה לא הצליחה (" + ex.message + ").") + " אם זה חוזר, כתבו לנו בוואטסאפ."); }
    } else if (kind === "review") {
      const text = (fd.get("text") || "").trim();
      if (text.length < 10) return bad("#rev-err", "כתבו לפחות משפט אחד", "text");
      const scores = {};
      Object.entries(S.reviewScores || {}).forEach(([k, v]) => { if (v) scores[k] = v; });
      try {
        await T.store.submitReview(S.reviewToken, { rating: S.reviewRating, text, name: (fd.get("name") || "").trim() || "אורח", title: (fd.get("title") || "").trim(), scores });
        $("#review-card").innerHTML = `<div class="book-ok"><span class="badge-ok">${I("check")}</span><h3 style="font-family:var(--f-display);font-weight:400;font-size:2rem">תודה על חוות הדעת!</h3><p class="muted">היא תפורסם אחרי בדיקה קצרה.</p><a class="btn btn-line" href="#">לדף הבית</a></div>`;
      } catch (ex) { bad("#rev-err", ex.message); }
    }
  });
  window.addEventListener("hashchange", () => { if (/access_token=|error_description=/.test(location.hash)) { location.reload(); return; } if (location.hash.slice(1) === "main") return; closeMega(); const mn = $("#mobile-nav.open"); if (mn) mn.classList.remove("open"); const go = () => render().then(() => { window.scrollTo(0, 0); $("#main").focus({ preventScroll: true }); });
    /* מעבר רך בין מסכים (בדפדפנים שתומכים), בלי לגעת בכותרת העליונה */
    if (document.startViewTransition && !stillMotion() && document.body.classList.contains("ready")) document.startViewTransition(go); else go(); });
  window.addEventListener("scroll", () => { const tb = $("#topbar"); if (tb) tb.classList.toggle("scrolled", window.scrollY > 10); }, { passive: true });

  /* ---------------------------------------------------------------- boot */
  async function load() {
    for (let attempt = 0; ; attempt++) {
      try {
        const [listings, settings, reviews, articles, places, top] = await Promise.all([T.store.listListings(), T.store.getSettings(), T.store.listReviews(), T.store.listArticles(), T.store.listPlaces().catch(() => []), T.store.topViewed(20).catch(() => [])]);
        Object.assign(S, { listings, settings, reviews, articles, places, top, error: "" });
        T.SETTINGS = settings;
        computeRatings();
        break;
      } catch (e) {
        /* תקלה זמנית (רשת חלשה, שרת עמוס לרגע): עוד שני ניסיונות בשקט לפני שמציגים שגיאה */
        if (attempt < 2 && !e.missing) { await new Promise((r) => setTimeout(r, 1200 * (attempt + 1) * (attempt + 1))); continue; }
        S.error = e.message || String(e);
        break;
      }
    }
    S.loaded = true;
  }
  /* אורח מחובר: המועדפים נשמרים גם בחשבון (איחוד של מה שבדפדפן ומה שבחשבון) */
  let favSynced = "";
  async function syncFavorites(user) {
    if (!user || favSynced === user.id) return;
    favSynced = user.id;
    S.me.user = S.me.user || { email: user.email, name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || "" };
    const remote = await T.store.listFavorites().catch(() => null);
    if (!remote) return;
    const before = S.saved.size;
    remote.forEach((id) => S.saved.add(id));
    [...S.saved].filter((id) => !remote.includes(id) && byId(id)).forEach((id) => T.store.setFavorite(id, true).catch(() => {}));
    saveSaved(); updateSavedCount();
    if (S.saved.size !== before) $$('[data-act="save"][data-id]').forEach((b) => b.setAttribute("aria-pressed", S.saved.has(b.dataset.id)));
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
      if (!h || h === "home" || h.startsWith("me") || h === "magazine" || h === "top") render();
      else if ($("#results")) renderResults();
    });
    /* SIGNED_IN יכול לקרות עוד לפני שהמאזין נרשם (הטוקן נקרא מהכתובת בטעינה), ולכן גם INITIAL_SESSION */
    if (T.isLive && T.store.client) T.store.client.auth.onAuthStateChange((ev, session) => {
      if (!session || (ev !== "SIGNED_IN" && ev !== "INITIAL_SESSION")) return;
      /* לשונית אחרת שקיבלה את הכניסה בסנכרון לא "גונבת" את היעד מהלשונית שנפתחה מהקישור */
      const stored = T.authFromUrl ? T.takeAfterLogin() : "";
      const h = T.authFromUrl ? T.afterParam || stored : "";
      if (h) { T.authFromUrl = false; if (T.afterParam) { T.afterParam = ""; try { history.replaceState(history.state, "", location.pathname + location.hash); } catch (e) {} } }
      /* Supabase מוחק את הטוקן מהכתובת רק אחרי האירוע, לכן מחכים שהכתובת תתנקה ואז עוברים ליעד */
      const go = (n) => {
        if (/access_token=/.test(location.hash) && n < 60) return setTimeout(() => go(n + 1), 50);
        if (location.hash.slice(1) === h) render(); else location.hash = h;
        if (n < 61) setTimeout(() => { if (location.hash.slice(1) !== h) go(61); }, 400);
      };
      if (h) go(0);
      else if (ev === "SIGNED_IN" && location.hash.startsWith("#me")) render();
      /* לא קוראים ל-auth מתוך המאזין עצמו (supabase-js עלול להיתקע), אלא אחריו */
      setTimeout(() => syncFavorites(session.user), 0);
    });
  }
  boot();
})();
