/* תמרה – ליבה משותפת: קבועים, כלים, אייקונים ומנוע תמחור */
(function () {
  "use strict";
  const T = (window.Tamara = window.Tamara || {});
  T.config = window.TAMARA_CONFIG || {};

  /* ---------------------------------------------------------------- קבועים */
  T.REGIONS = [
    { key: "golan", name: "רמת הגולן", area: "north", land: "mountain", time: "dusk", blurb: "בזלת, נחלים ורוח הרים", lat: 33.0, lng: 35.76 },
    { key: "galil-elyon", name: "הגליל העליון", area: "north", land: "mountain", time: "dawn", blurb: "יערות, מעיינות ונוף לחרמון", lat: 33.06, lng: 35.55 },
    { key: "galil-maaravi", name: "הגליל המערבי", area: "north", land: "hills", time: "day", blurb: "כרמי זיתים בין הרים לים", lat: 32.95, lng: 35.2 },
    { key: "kinneret", name: "כנרת ועמק הירדן", area: "north", land: "lake", time: "dusk", blurb: "שקיעות מעל המים", lat: 32.8, lng: 35.56 },
    { key: "carmel", name: "הכרמל", area: "north", land: "hills", time: "dawn", blurb: "אורנים, כפרי אמנים וים", lat: 32.7, lng: 35.02 },
    { key: "jerusalem", name: "הרי ירושלים", area: "center", land: "hills", time: "dusk", blurb: "טרסות, יקבים ושבילים", lat: 31.77, lng: 35.06 },
    { key: "dead-sea", name: "ים המלח", area: "south", land: "deadsea", time: "dawn", blurb: "זריחה מעל הרי מואב", lat: 31.25, lng: 35.38 },
    { key: "negev", name: "הנגב ומצפה רמון", area: "south", land: "desert", time: "night", blurb: "מכתש, שקט ושמי כוכבים", lat: 30.62, lng: 34.82 },
    { key: "eilat", name: "אילת והערבה", area: "south", land: "redsea", time: "day", blurb: "הרי גרניט ומים צלולים", lat: 29.62, lng: 34.98 }
  ];
  T.AREAS = { north: "צפון", center: "מרכז", south: "דרום" };

  T.TYPES = [
    { key: "zimmer", name: "צימר", plural: "צימרים" },
    { key: "villa", name: "וילה", plural: "וילות" },
    { key: "cabin", name: "בקתת עץ", plural: "בקתות עץ" },
    { key: "suite", name: "סוויטה", plural: "סוויטות" },
    { key: "compound", name: "מתחם לקבוצות", plural: "מתחמים לקבוצות" }
  ];

  T.AMENITIES = [
    { key: "jacuzzi", name: "ג׳קוזי", icon: "jacuzzi" },
    { key: "private_pool", name: "בריכה פרטית", icon: "pool" },
    { key: "heated_pool", name: "בריכה מחוממת", icon: "thermo" },
    { key: "sauna", name: "סאונה", icon: "sauna" },
    { key: "view", name: "נוף פתוח", icon: "sunset" },
    { key: "secluded", name: "מבודד ושקט", icon: "tree" },
    { key: "fireplace", name: "קמין", icon: "flame" },
    { key: "kitchen", name: "מטבח מאובזר", icon: "utensils" },
    { key: "bbq", name: "פינת מנגל", icon: "grill" },
    { key: "breakfast", name: "ארוחת בוקר", icon: "coffee" },
    { key: "spa", name: "עיסויים במתחם", icon: "leaf" },
    { key: "garden", name: "חצר ודשא", icon: "tree" },
    { key: "kids", name: "מתקנים לילדים", icon: "blocks" },
    { key: "events", name: "מתאים לאירועים", icon: "party" },
    { key: "kosher", name: "כשר", icon: "badge" },
    { key: "shabbat", name: "מתאים לשומרי שבת", icon: "candle" },
    { key: "accessible", name: "נגיש", icon: "wheelchair" },
    { key: "pets", name: "ידידותי לכלבים", icon: "paw" },
    { key: "wifi", name: "Wi‑Fi", icon: "wifi" },
    { key: "parking", name: "חניה פרטית", icon: "car" }
  ];

  T.AUDIENCE = [
    { key: "couples", name: "זוגות" },
    { key: "families", name: "משפחות" },
    { key: "groups", name: "קבוצות" }
  ];

  /* דפי נחיתה לגוגל: אזור + מאפיין (משמש גם את scripts/build.mjs) */
  T.SEO_FEATURES = [
    { key: "jacuzzi", phrase: "עם ג׳קוזי" },
    { key: "private_pool", phrase: "עם בריכה פרטית" },
    { key: "heated_pool", phrase: "עם בריכה מחוממת" },
    { key: "secluded", phrase: "מבודדים ושקטים" },
    { key: "view", phrase: "עם נוף פתוח" },
    { key: "kosher", phrase: "כשרים" },
    { key: "pets", phrase: "ידידותיים לכלבים" },
    { key: "couples", phrase: "לזוגות", audience: true },
    { key: "families", phrase: "למשפחות", audience: true },
    { key: "groups", phrase: "לקבוצות", audience: true }
  ];
  /* "הגליל העליון" → "בגליל העליון", "רמת הגולן" → "ברמת הגולן" */
  T.inPlace = (name) => (String(name).startsWith("ה") ? "ב" + String(name).slice(1) : "ב" + name);

  T.QUICK_FILTERS = [
    { label: "ג׳קוזי בחדר", amenity: "jacuzzi" },
    { label: "בריכה מחוממת", amenity: "heated_pool" },
    { label: "מבודד ושקט", amenity: "secluded" },
    { label: "לזוגות", audience: "couples" },
    { label: "למשפחות", audience: "families" },
    { label: "לקבוצות", audience: "groups" },
    { label: "כשר", amenity: "kosher" },
    { label: "עם הכלב", amenity: "pets" }
  ];

  T.PLANS = [
    { key: "basic", name: "בסיסי", features: ["כרטיס מתחם מלא עם גלריה ויחידות", "פניות ישירות לוואטסאפ ולמייל", "יומן זמינות וסנכרון עם Booking ו-Airbnb", "ממשק מארחים ודוח צפיות"] },
    { key: "pro", name: "מומלץ", features: ["כל מה שבבסיסי", "הופעה ב״נבחרי העונה״ בעמוד הבית", "תווית דיל ומבצע ״דקה 90״", "דוח פניות והמרות חודשי"] },
    { key: "premium", name: "פרימיום", features: ["כל מה שבמומלץ", "מיקום ממומן בראש תוצאות האזור", "צילום מקצועי פעם בשנה", "ליווי אישי בעדכון הכרטיס"] }
  ];
  T.BILLING_MODELS = [
    { key: "subscription", name: "מנוי חודשי" },
    { key: "per_lead", name: "תשלום לפי פנייה" },
    { key: "both", name: "מנוי + פנייה" }
  ];
  T.EXTRA_PER = [
    { key: "stay", name: "לשהייה" },
    { key: "night", name: "ללילה" },
    { key: "guest", name: "לאורח" }
  ];

  T.LEAD_STATUS = [
    { key: "new", name: "חדשה" },
    { key: "in_progress", name: "בטיפול" },
    { key: "closed", name: "נסגרה הזמנה" },
    { key: "lost", name: "לא רלוונטית" }
  ];
  T.ADV_STATUS = [
    { key: "active", name: "פעיל" },
    { key: "trial", name: "תקופת ניסיון" },
    { key: "paused", name: "מושהה" },
    { key: "ended", name: "הסתיים" }
  ];
  T.REVIEW_STATUS = [
    { key: "pending", name: "ממתינה" },
    { key: "approved", name: "פורסמה" },
    { key: "rejected", name: "נדחתה" }
  ];

  /* שדות תוכן שמארח משנה רק באישור מנהל (מחירים ויומן מתעדכנים מיד) */
  T.MODERATED_FIELDS = [
    ["name", "שם"], ["type", "סוג"], ["region", "אזור"], ["settlement", "יישוב"], ["tagline", "משפט פתיחה"],
    ["description", "תיאור"], ["photos", "תמונות"], ["amenities", "מאפיינים"], ["audience", "מתאים ל"], ["video_url", "סרטון"]
  ];

  /* חגים (לילות) לפי לוח השנה העברי, ישראל. חושב עם Hebcal; ניתן לעריכה בהגדרות. */
  T.HOLIDAYS = [
    { label: "חנוכה 2026", from: "2026-12-04", to: "2026-12-11" },
    { label: "פסח 2027", from: "2027-04-21", to: "2027-04-27" },
    { label: "שבועות 2027", from: "2027-06-10", to: "2027-06-10" },
    { label: "ראש השנה 2027", from: "2027-10-01", to: "2027-10-02" },
    { label: "סוכות 2027", from: "2027-10-15", to: "2027-10-22" },
    { label: "חנוכה 2027", from: "2027-12-24", to: "2027-12-31" },
    { label: "פסח 2028", from: "2028-04-10", to: "2028-04-16" },
    { label: "שבועות 2028", from: "2028-05-30", to: "2028-05-30" },
    { label: "ראש השנה 2028", from: "2028-09-20", to: "2028-09-21" },
    { label: "סוכות 2028", from: "2028-10-04", to: "2028-10-11" },
    { label: "חנוכה 2028", from: "2028-12-12", to: "2028-12-19" }
  ];

  T.DEFAULT_SETTINGS = {
    site_name: "תמרה",
    site_tagline: "צימרים ווילות",
    phone: "",
    whatsapp: "",
    email: "",
    notify_email: "",
    hero_title: "צימרים ווילות מהגולן ועד הערבה",
    hero_subtitle: "מחפשים לפי אזור, תאריכים ומה שחשוב לכם, ושולחים בקשה ישירות למארחים. בלי עמלות ובלי מתווכים.",
    hero_image: "",
    plan_prices: { basic: 149, pro: 299, premium: 549 },
    lead_price_default: 25,
    sponsored_price: 199,
    moderation: true,
    holidays: T.HOLIDAYS,
    coupons: [],
    a11y_coordinator: ""
  };
  T.SETTINGS = T.DEFAULT_SETTINGS;
  T.HERO_DEFAULT = "assets/img/photos/hero.jpg";

  T.regionOf = (k) => T.REGIONS.find((r) => r.key === k) || { key: k, name: k || "", land: "hills", time: "day", lat: 31.5, lng: 35 };
  T.typeOf = (k) => T.TYPES.find((t) => t.key === k) || { key: k, name: k || "", plural: k || "" };
  T.amenityOf = (k) => T.AMENITIES.find((a) => a.key === k) || { key: k, name: k, icon: "check" };
  T.statusName = (list, k) => (list.find((s) => s.key === k) || { name: k || "" }).name;

  /* ------------------------------------------------------------------ כלים */
  T.esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  T.$ = (sel, root) => (root || document).querySelector(sel);
  T.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  T.uid = (prefix) => (prefix || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  T.uuid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16); }));
  T.token = () => Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join("");
  T.money = (n) => (n || n === 0 ? "₪" + Math.round(Number(n)).toLocaleString("he-IL") : "");
  T.num = (n) => Number(n || 0).toLocaleString("he-IL");
  T.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  T.clone = (o) => JSON.parse(JSON.stringify(o));
  T.storage = {
    get(k, d) {
      try {
        const v = localStorage.getItem(k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (e) {}
    }
  };

  const pad = (n) => String(n).padStart(2, "0");
  T.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  T.parseISO = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  T.addDays = (d, n) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  };
  T.today = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  T.nightsBetween = (a, b) => (a && b ? Math.round((T.parseISO(b) - T.parseISO(a)) / 86400000) : 0);
  const fmtShort = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" });
  const fmtLong = new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "numeric", month: "long" });
  const fmtMonth = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });
  const fmtStamp = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  T.fmtShort = (s) => (s ? fmtShort.format(T.parseISO(s)) : "");
  T.fmtLong = (s) => (s ? fmtLong.format(T.parseISO(s)) : "");
  T.fmtMonth = (d) => fmtMonth.format(d);
  T.fmtStamp = (s) => (s ? fmtStamp.format(new Date(s)) : "");
  T.fmtDate = (s) => (s ? new Intl.DateTimeFormat("he-IL").format(T.parseISO(s)) : "");
  T.daysUntil = (s) => (s ? Math.round((T.parseISO(s) - T.today()) / 86400000) : null);
  T.monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  /* לילות סוף שבוע: הלילות שמתחילים ביום חמישי ושישי */
  T.isWeekendNight = (d) => d.getDay() === 4 || d.getDay() === 5;

  T.phoneDigits = (p) => {
    const d = String(p || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.startsWith("972")) return d;
    if (d.startsWith("0")) return "972" + d.slice(1);
    return d;
  };
  T.waLink = (phone, text) => "https://wa.me/" + (T.phoneDigits(phone) || "") + "?text=" + encodeURIComponent(text || "");
  T.wazeLink = (q, lat, lng) => (lat && lng ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : "https://waze.com/ul?q=" + encodeURIComponent(q) + "&navigate=yes");
  T.mapsLink = (q, lat, lng) => "https://www.google.com/maps/search/?api=1&query=" + (lat && lng ? `${lat},${lng}` : encodeURIComponent(q));
  T.videoEmbed = (url) => {
    const u = String(url || "");
    let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return "https://www.youtube-nocookie.com/embed/" + m[1] + "?autoplay=1&rel=0";
    m = u.match(/vimeo\.com\/(\d+)/);
    if (m) return "https://player.vimeo.com/video/" + m[1] + "?autoplay=1";
    return "";
  };

  T.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      T.toast("הועתק");
      return true;
    } catch (e) {
      T.toast("לא הצלחנו להעתיק. סמנו את הטקסט והעתיקו ידנית.");
      return false;
    }
  };

  T.toast = (msg, tone) => {
    let host = T.$("#toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast" + (tone ? " toast-" + tone : "");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.classList.add("out"), 2800);
    setTimeout(() => el.remove(), 3300);
  };

  T.resizeImage = (file, max, quality) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("resize"))), "image/jpeg", quality || 0.82);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("הקובץ אינו תמונה תקינה"));
      };
      img.src = url;
    });
  T.blobToDataURL = (b) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(b);
    });

  /* --------------------------------------------------------------- אייקונים */
  const ICONS = {
    map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    megaphone: '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M17.5 9a4 4 0 0 1 0 6"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l9-11h-6z"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3.5-5-1.2 0 1.2 2 1.2 5 1.2zM12 8c1.5-3 5-3.5 5-1.2 0 1.2-2 1.2-5 1.2z"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
    drag: '<path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01"/>',
    quote: '<path d="M9 7H5v5h4v1a3 3 0 0 1-3 3M19 7h-4v5h4v1a3 3 0 0 1-3 3"/>',
    sync: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.7L4 15.5M4 20v-4.5h4.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.7 2.8 2.4 3 5.2"/>',
    bed: '<path d="M3 18V6M3 13h18v5M21 13a4 4 0 0 0-4-4h-6v4"/><circle cx="7" cy="10" r="1.6"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 3.6-1.2M7 19l-1 2M17 19l1 2"/>',
    home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    door: '<path d="M5 20V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v15M3 20h18"/><path d="M15 12.5h.01"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    fwd: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "chev-l": '<path d="m15 6-6 6 6 6"/>',
    "chev-r": '<path d="m9 6 6 6-6 6"/>',
    "chev-d": '<path d="m6 9 6 6 6-6"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.5 3.8 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.2 0 5.3 3 4.2 6.2C19.5 15.4 12 20 12 20z"/>',
    phone: '<path d="M5 3.5h3.2l1.6 4.2-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4.2 1.6V17a2.5 2.5 0 0 1-2.7 2.5C9.6 19 5 14.4 4.5 6.2A2.5 2.5 0 0 1 5 3.5z"/>',
    chat: '<path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.5z"/><path d="M9 10.5h6M9 13.5h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    "eye-off": '<path d="M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.8 3.4M6.5 7.6C4 9.3 2.5 12 2.5 12S6 18.5 12 18.5c1.9 0 3.5-.6 4.9-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M9 8l-4 4 4 4M5 12h10"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
    nav: '<path d="M12 3 4.5 20 12 16l7.5 4z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    wifi: '<path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0M12 19.5h.01"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.4-8.8 1.4 1 2.3 2.3 2.6 3.9 1.1-.8 1.9-2.3 2-4 2.6 2 5 5.1 5 8.9 0 3.6-2.6 6.2-6.5 6.2z"/>',
    pool: '<path d="M3 16c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2M3 20c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0M16 13V5.5a1.5 1.5 0 0 0-3 0M8 9h8"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
    jacuzzi: '<circle cx="7" cy="8" r="2"/><circle cx="13.5" cy="5.5" r="1.5"/><circle cx="17" cy="10" r="1.2"/><path d="M3 14h18v1.5a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/>',
    sunset: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 7v2.5M5.6 10.6l1.6 1.6M18.4 10.6l-1.6 1.6M3 15h2M19 15h2"/>',
    utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
    grill: '<path d="M4 10h16a8 8 0 0 1-16 0zM8 17.5 6 21M16 17.5l2 3.5M9 3c-1 1 1 2 0 3.5M13 3c-1 1 1 2 0 3.5"/>',
    coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-.8.8.8 1.7 0 2.5M12 3c-.8.8.8 1.7 0 2.5"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-4 6-7 10-9"/>',
    tree: '<path d="M12 21v-5M12 16c-4 0-6.5-2.3-6.5-5.3 0-2.4 1.6-3.9 3.3-4.4C9.4 4.3 10.6 3 12 3s2.6 1.3 3.2 3.3c1.7.5 3.3 2 3.3 4.4 0 3-2.5 5.3-6.5 5.3z"/>',
    blocks: '<rect x="4" y="12" width="7" height="7" rx="1"/><rect x="13" y="12" width="7" height="7" rx="1"/><path d="M12 3l3.5 6h-7z"/>',
    party: '<path d="M4 20l4.5-12L16 15.5z"/><path d="M14 4v2M18.5 5.5 17 7M20 10h-2M14.5 9.5l3-3"/>',
    badge: '<path d="M12 3l2.4 1.6 2.9-.1.9 2.7 2.3 1.8-.9 2.8.9 2.8-2.3 1.7-.9 2.8-2.9-.1L12 21l-2.4-1.6-2.9.1-.9-2.7-2.3-1.8.9-2.8-.9-2.8 2.3-1.7.9-2.8 2.9.1z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
    candle: '<path d="M9 21V11h6v10M7 21h10M12 11V8.5"/><path d="M12 3.5c1 1.2 1.6 2 1.6 2.8a1.6 1.6 0 0 1-3.2 0c0-.8.6-1.6 1.6-2.8z"/>',
    wheelchair: '<circle cx="11" cy="4.5" r="1.8"/><path d="M11 7.5V13h5l2.5 5.5M11 10h4"/><path d="M8.5 11.2a5 5 0 1 0 6.8 6.3"/>',
    paw: '<circle cx="6.5" cy="10.5" r="1.7"/><circle cx="17.5" cy="10.5" r="1.7"/><circle cx="9.8" cy="6.2" r="1.7"/><circle cx="14.2" cy="6.2" r="1.7"/><path d="M12 12c-2.5 0-5 3-5 5.2 0 1.6 1.3 2.3 2.6 2.3 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.3 0 2.6-.7 2.6-2.3C17 15 14.5 12 12 12z"/>',
    car: '<path d="M5 15.5V12l2-5h10l2 5v3.5M3.5 15.5h17V19h-17zM5 12h14M7 19v1.5M17 19v1.5"/>',
    sauna: '<path d="M5 20V9l7-5 7 5v11zM9 20v-5h6v5"/><path d="M10 9c-.8.8.8 1.7 0 2.5M14 9c-.8.8.8 1.7 0 2.5"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.5"/>',
    inbox: '<path d="M3.5 13.5 6 5h12l2.5 8.5V19H3.5z"/><path d="M3.5 13.5H9l1 2h4l1-2h5.5"/>',
    briefcase: '<rect x="3.5" y="7" width="17" height="12.5" rx="2"/><path d="M9 7V5h6v2M3.5 12.5h17"/>',
    "user-plus": '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.6-3.6 3.2-5.5 6.5-5.5 1.6 0 3 .4 4.1 1.2M18 13v6M15 16h6"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    a11y: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5c2.3.7 4.6 1 7 1s4.7-.3 7-1M12 9.5V14M12 14l-3 6.5M12 14l3 6.5"/>',
    sparkle: '<path d="M12 3c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.4M4 4v3.5h3.5M4 13a8 8 0 0 0 14.6 4.4M20 20v-3.5h-3.5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5h.01"/>',
    mountain: '<path d="M3 19 9.5 8l4 6.5 2-3L21 19z"/>'
  };
  T.icon = (name, cls) =>
    `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;


  T.stars = (r, cls) => {
    const v = Math.round(Number(r || 0) * 2) / 2;
    let h = `<span class="stars ${cls || ""}" aria-label="דירוג ${v} מתוך 5">`;
    for (let i = 1; i <= 5; i++) h += `<svg viewBox="0 0 24 24" aria-hidden="true" class="${v >= i ? "on" : v >= i - 0.5 ? "half" : ""}"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>`;
    return h + "</span>";
  };

  /* --------------------------------------------------------- מתחם ויחידות */
  /* מתחם בלי יחידות מוגדרות הוא יחידה אחת בעצמו */
  T.unitsOf = (l) => {
    if (l && Array.isArray(l.rooms) && l.rooms.length) {
      return l.rooms.map((r) => Object.assign({
        guests_max: l.guests_max, bedrooms: 1, price_weekday: l.price_weekday, price_weekend: l.price_weekend,
        price_holiday: l.price_holiday, guests_base: l.guests_base, blocked_dates: [], ical_blocked: [], ical_url: ""
      }, r, {
        guests_max: Number(r.guests_max) || Number(l.guests_max) || 2,
        price_weekday: Number(r.price_weekday) || 0,
        price_weekend: Number(r.price_weekend) || Number(r.price_weekday) || 0,
        price_holiday: Number(r.price_holiday) || Number(l.price_holiday) || 0,
        guests_base: Number(r.guests_base) || Number(l.guests_base) || 0
      }));
    }
    return [{
      id: "", name: (l && l.name) || "", single: true, guests_max: Number(l.guests_max) || 2, bedrooms: l.bedrooms,
      price_weekday: Number(l.price_weekday) || 0, price_weekend: Number(l.price_weekend) || Number(l.price_weekday) || 0,
      price_holiday: Number(l.price_holiday) || 0, guests_base: Number(l.guests_base) || 0,
      blocked_dates: l.blocked_dates || [], ical_blocked: l.ical_blocked || [], ical_url: l.ical_url || ""
    }];
  };
  T.unitOf = (l, id) => { const u = T.unitsOf(l); return u.find((x) => x.id === id) || u[0]; };
  T.blockedSet = (unit) => new Set([...(unit.blocked_dates || []), ...(unit.ical_blocked || [])]);
  T.fromPrice = (l) => { const p = T.unitsOf(l).map((u) => u.price_weekday).filter((v) => v > 0); return p.length ? Math.min(...p) : 0; };
  T.isSponsored = (l) => !!(l.sponsored_until && l.sponsored_until >= T.iso(T.today()));

  /* דקה 90: לילות חמישי ושישי של סוף השבוע הקרוב */
  T.lastMinuteNights = () => {
    const t = T.today();
    const out = [];
    for (let i = 0; i < 8; i++) {
      const d = T.addDays(t, i);
      if (T.isWeekendNight(d)) out.push(T.iso(d));
      if (out.length && d.getDay() === 5) break;
    }
    return out;
  };
  T.lastMinuteActive = (l) => {
    if (!(Number(l.lastminute_pct) > 0)) return false;
    const nights = T.lastMinuteNights();
    return T.unitsOf(l).some((u) => { const b = T.blockedSet(u); return nights.some((n) => !b.has(n)); });
  };

  T.holidayOf = (iso, settings) => ((settings || T.SETTINGS).holidays || []).find((h) => iso >= h.from && iso <= h.to) || null;
  T.couponOf = (code, settings) => {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return null;
    const today = T.iso(T.today());
    return ((settings || T.SETTINGS).coupons || []).find((x) => x.active !== false && String(x.code).toUpperCase() === c && (!x.until || x.until >= today)) || null;
  };

  /* מחשבון מחיר: אמצ״ש / סופ״ש / חג, עונות, דקה 90, אורחים נוספים, תוספות וקופון */
  T.quote = (l, ci, co, o) => {
    o = o || {};
    const nights = T.nightsBetween(ci, co);
    if (!l || nights <= 0) return null;
    const settings = o.settings || T.SETTINGS;
    const unit = T.unitOf(l, o.unitId);
    const blocked = T.blockedSet(unit);
    const lmNights = T.lastMinuteNights();
    const lmPct = Number(l.lastminute_pct) || 0;
    const groups = { weekday: { n: 0, sum: 0 }, weekend: { n: 0, sum: 0 }, holiday: { n: 0, sum: 0, names: new Set() } };
    const conflicts = [];
    let seasonPct = 0, lmUsed = false;
    for (let i = 0; i < nights; i++) {
      const d = T.addDays(T.parseISO(ci), i);
      const iso = T.iso(d);
      if (blocked.has(iso)) conflicts.push(iso);
      const hol = T.holidayOf(iso, settings);
      let kind, price;
      if (hol && unit.price_holiday) { kind = "holiday"; price = unit.price_holiday; groups.holiday.names.add(hol.label.replace(/\s\d{4}$/, "")); }
      else if (T.isWeekendNight(d)) { kind = "weekend"; price = unit.price_weekend || unit.price_weekday; }
      else { kind = "weekday"; price = unit.price_weekday; }
      const season = (l.seasons || []).filter((s) => s.from && s.to && iso >= s.from && iso <= s.to).reduce((m, s) => Math.max(m, Number(s.pct) || 0), 0);
      if (season) { price *= 1 + season / 100; seasonPct = Math.max(seasonPct, season); }
      if (lmPct && kind !== "holiday" && lmNights.includes(iso) && !blocked.has(iso)) { price *= 1 - lmPct / 100; lmUsed = true; }
      price = Math.round(price);
      groups[kind].n++;
      groups[kind].sum += price;
    }
    const nightWord = (n) => (n === 1 ? "לילה אחד" : n === 2 ? "שני לילות" : `${n} לילות`);
    const lines = [];
    if (groups.weekday.n) lines.push({ label: `${nightWord(groups.weekday.n)} באמצע שבוע`, amount: groups.weekday.sum });
    if (groups.weekend.n) lines.push({ label: `${nightWord(groups.weekend.n)} בסופ״ש`, amount: groups.weekend.sum });
    if (groups.holiday.n) lines.push({ label: `${nightWord(groups.holiday.n)} חג (${[...groups.holiday.names].join(", ")})`, amount: groups.holiday.sum });
    const roomTotal = groups.weekday.sum + groups.weekend.sum + groups.holiday.sum;
    const guests = Number(o.guests) || 0;
    let extraGuests = 0;
    const base = unit.guests_base;
    if (base && guests > base && Number(l.extra_guest_price) > 0) {
      extraGuests = (guests - base) * Number(l.extra_guest_price) * nights;
      lines.push({ label: `${guests - base === 1 ? "אורח נוסף" : guests - base + " אורחים נוספים"} × ${nightWord(nights)}`, amount: extraGuests });
    }
    let extrasTotal = 0;
    (o.extras || []).forEach((name) => {
      const x = (l.extras || []).find((e) => e.name === name);
      if (!x) return;
      const amt = Number(x.price) * (x.per === "night" ? nights : x.per === "guest" ? Math.max(1, guests) : 1);
      extrasTotal += amt;
      lines.push({ label: x.name, amount: amt });
    });
    const subtotal = roomTotal + extraGuests + extrasTotal;
    const coupon = T.couponOf(o.coupon, settings);
    const discount = coupon ? Math.round((subtotal * Number(coupon.pct)) / 100) : 0;
    if (discount) lines.push({ label: `קופון ${coupon.code} (${coupon.pct}%)`, amount: -discount });
    return {
      nights, unit, lines, roomTotal, extrasTotal, extraGuests, discount, coupon, total: subtotal - discount,
      conflicts, belowMin: nights < (Number(l.min_nights) || 1), overCapacity: guests > unit.guests_max,
      weekday: groups.weekday.n, weekend: groups.weekend.n, holiday: groups.holiday.n, seasonPct, lastMinute: lmUsed
    };
  };
  /* פנוי לתאריכים ולמספר האורחים (מספיק שיחידה אחת במתחם מתאימה) */
  T.isAvailable = (l, ci, co, guests) => {
    if (!(ci && co && T.nightsBetween(ci, co) > 0)) return true;
    return T.unitsOf(l).some((u) => (!guests || u.guests_max >= guests) && !(T.quote(l, ci, co, { unitId: u.id }).conflicts.length));
  };

  /* ---------------------------------------------------------- תמונות */
  T.img = (url, w) => {
    const u = String(url || "");
    if (u.includes("res.cloudinary.com") && u.includes("/upload/") && !/\/upload\/[^/]*w_\d+/.test(u)) return u.replace("/upload/", `/upload/f_auto,q_auto,w_${w || 1600}/`);
    return u;
  };
  T.photosOf = (l) => {
    const p = (l.photos || []).filter(Boolean);
    if (p.length) return p.map((u) => ({ src: T.img(u, 1600), real: true }));
    return T.listingScene ? [0, 1, 2, 3].map((i) => ({ src: T.listingScene(l, i), real: false })) : [];
  };
  T.coverOf = (l) => (T.photosOf(l)[0] || {}).src || "";
  T.thumbOf = (l) => {
    const u = (l.photos || [])[0];
    if (!u) return T.coverOf(l);
    if (/assets\/img\/photos\/[\w-]+-1\.jpg$/.test(u)) return u.replace(/-1\.jpg$/, "-card.jpg");
    return T.img(u, 800);
  };

  T.normalizeListing = (l) => {
    const n = (v) => (v === "" || v == null ? 0 : Number(v));
    return Object.assign({}, l, {
      guests_max: n(l.guests_max), bedrooms: n(l.bedrooms), bathrooms: n(l.bathrooms), units: n(l.units) || 1,
      min_nights: n(l.min_nights) || 1, price_weekday: n(l.price_weekday), price_weekend: n(l.price_weekend) || n(l.price_weekday),
      price_holiday: n(l.price_holiday), guests_base: n(l.guests_base), extra_guest_price: n(l.extra_guest_price), lastminute_pct: n(l.lastminute_pct),
      lat: l.lat === "" || l.lat == null ? null : Number(l.lat), lng: l.lng === "" || l.lng == null ? null : Number(l.lng),
      amenities: l.amenities || [], audience: l.audience || [], photos: l.photos || [], blocked_dates: (l.blocked_dates || []).slice().sort(),
      ical_blocked: l.ical_blocked || [], rooms: l.rooms || [], extras: l.extras || [], seasons: l.seasons || [],
      sponsored_until: l.sponsored_until || null, video_url: l.video_url || "", pending: l.pending || null
    });
  };
})();
