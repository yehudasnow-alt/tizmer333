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
    { key: "compound", name: "מתחם לקבוצות", plural: "מתחמים לקבוצות" },
    { key: "boutique", name: "מלון בוטיק", plural: "מלונות בוטיק" },
    { key: "loft", name: "לופט", plural: "לופטים" },
    { key: "apartment", name: "דירת נופש", plural: "דירות נופש" },
    { key: "cave", name: "מערה", plural: "מערות" }
  ];

  /* מאפיינים לפי קבוצות (כמו בדף מתחם ובסינון) */
  T.AMENITY_GROUPS = [
    { key: "safety", name: "מרחב מוגן" },
    { key: "water", name: "בריכה וספא" },
    { key: "inside", name: "ביחידה" },
    { key: "outside", name: "בחוץ ובמתחם" },
    { key: "fun", name: "בילוי ואירועים" },
    { key: "food", name: "אוכל, כשרות ושבת" },
    { key: "access", name: "נגישות וחיות מחמד" },
    { key: "vibe", name: "אווירה וסגנון" },
    { key: "nearby", name: "בסביבה" }
  ];
  T.AMENITIES = [
    { key: "mamad", name: "ממ״ד צמוד ליחידה", icon: "shield", group: "safety" },
    { key: "mamad_host", name: "מרחב מוגן בבית המארחים", icon: "shield", group: "safety" },
    { key: "shelter", name: "מקלט קרוב", icon: "shield", group: "safety" },
    { key: "jacuzzi", name: "ג׳קוזי ספא", icon: "jacuzzi", group: "water" },
    { key: "jacuzzi_room", name: "ג׳קוזי בחדר", icon: "jacuzzi", group: "water" },
    { key: "private_pool", name: "בריכה פרטית", icon: "pool", group: "water" },
    { key: "heated_pool", name: "בריכה מחוממת", icon: "thermo", group: "water" },
    { key: "indoor_pool", name: "בריכה מקורה", icon: "pool", group: "water" },
    { key: "shared_pool", name: "בריכה במתחם", icon: "pool", group: "water" },
    { key: "fenced_pool", name: "בריכה מגודרת", icon: "pool", group: "water" },
    { key: "kids_pool", name: "בריכה בטיחותית לילדים", icon: "pool", group: "water" },
    { key: "sauna", name: "סאונה", icon: "sauna", group: "water" },
    { key: "spa", name: "עיסויים וטיפולים", icon: "leaf", group: "water" },
    { key: "fireplace", name: "קמין", icon: "flame", group: "inside" },
    { key: "kitchen", name: "מטבח מאובזר", icon: "utensils", group: "inside" },
    { key: "espresso", name: "מכונת אספרסו", icon: "coffee", group: "inside" },
    { key: "smart_tv", name: "טלוויזיה חכמה", icon: "tv", group: "inside" },
    { key: "ac", name: "מיזוג אוויר", icon: "snow", group: "inside" },
    { key: "wifi", name: "Wi‑Fi", icon: "wifi", group: "inside" },
    { key: "view", name: "נוף פתוח", icon: "sunset", group: "outside" },
    { key: "garden", name: "חצר ודשא", icon: "tree", group: "outside" },
    { key: "bbq", name: "פינת מנגל", icon: "grill", group: "outside" },
    { key: "balcony", name: "מרפסת פרטית", icon: "sunset", group: "outside" },
    { key: "outdoor_shower", name: "מקלחת חוץ", icon: "bath", group: "outside" },
    { key: "parking", name: "חניה פרטית", icon: "car", group: "outside" },
    { key: "snooker", name: "סנוקר", icon: "ball", group: "fun" },
    { key: "pingpong", name: "פינג פונג", icon: "ball", group: "fun" },
    { key: "karaoke", name: "קריוקי", icon: "mic", group: "fun" },
    { key: "kids", name: "מתקנים לילדים", icon: "blocks", group: "fun" },
    { key: "kids_room", name: "חדר נפרד לילדים", icon: "bed", group: "fun" },
    { key: "events", name: "מתאים לאירועים", icon: "party", group: "fun" },
    { key: "breakfast", name: "ארוחת בוקר", icon: "coffee", group: "food" },
    { key: "chef", name: "ארוחות שף", icon: "utensils", group: "food" },
    { key: "kosher", name: "כשר", icon: "badge", group: "food" },
    { key: "shabbat", name: "מתאים לשומרי שבת", icon: "candle", group: "food" },
    { key: "accessible", name: "נגיש לבעלי מוגבלויות", icon: "wheelchair", group: "access" },
    { key: "pets", name: "מקבלים כלבים", icon: "paw", group: "access" },
    { key: "secluded", name: "מבודד ושקט", icon: "tree", group: "vibe" },
    { key: "romantic", name: "אווירה רומנטית", icon: "heart", group: "vibe" },
    { key: "design", name: "עיצוב מיוחד", icon: "sparkle", group: "vibe" },
    { key: "stone", name: "מבנה אבן", icon: "mountain", group: "vibe" },
    { key: "winery_near", name: "יקבים בסביבה", icon: "wine", group: "nearby" },
    { key: "synagogue_near", name: "בית כנסת קרוב", icon: "star6", group: "nearby" },
    { key: "trails_near", name: "מסלולי טבע", icon: "mountain", group: "nearby" },
    { key: "beach_near", name: "קרוב לים או לכנרת", icon: "sunset", group: "nearby" }
  ];
  /* מה מוצג בכרטיס קודם (הכי מבוקש) */
  T.AMENITY_PRIORITY = ["mamad", "private_pool", "heated_pool", "jacuzzi", "jacuzzi_room", "sauna", "fireplace", "view", "secluded", "kosher", "pets", "breakfast"];

  T.AUDIENCE = [
    { key: "couples", name: "זוגות" },
    { key: "families", name: "משפחות" },
    { key: "groups", name: "קבוצות" },
    { key: "friends", name: "חברים" },
    { key: "honeymoon", name: "ירח דבש" },
    { key: "bachelor", name: "מסיבות רווקים ורווקות" }
  ];

  /* הטבות (אחוז הנחה שהמארח נותן) */
  T.BENEFITS = [
    { key: "reservists", name: "מילואימניקים", short: "למילואימניקים" },
    { key: "soldiers", name: "חיילים בסדיר", short: "לחיילים" },
    { key: "students", name: "סטודנטים", short: "לסטודנטים" },
    { key: "seniors", name: "גיל הזהב (55+)", short: "לגיל הזהב" },
    { key: "evacuees", name: "מפונים", short: "למפונים" }
  ];
  /* דירוג לפי קטגוריות (1–5), הציון הכללי מוצג מתוך 10 */
  T.REVIEW_CATS = [
    { key: "clean", name: "ניקיון" },
    { key: "maintain", name: "תחזוקה" },
    { key: "facilities", name: "מתקנים ואבזור" },
    { key: "host", name: "יחס המארחים" },
    { key: "privacy", name: "פרטיות" },
    { key: "treats", name: "כיבודים ופינוקים" },
    { key: "breakfast", name: "ארוחת בוקר", optional: true },
    { key: "value", name: "תמורה למחיר" }
  ];
  T.PHOTO_CATS = [
    { key: "general", name: "כללי" }, { key: "inside", name: "פנים" }, { key: "bedroom", name: "חדר שינה" },
    { key: "spa", name: "ספא ורחצה" }, { key: "pool", name: "בריכה וחצר" }, { key: "view", name: "נוף וסביבה" }, { key: "food", name: "אוכל" }
  ];
  /* מדיניות ביטול: מ-X ימים לפני ההגעה ומעלה → Y% דמי ביטול */
  T.CANCEL_PRESETS = [
    { key: "flex", name: "גמישה", tiers: [{ days: 7, fee: 0 }, { days: 0, fee: 100 }] },
    { key: "mid", name: "בינונית", tiers: [{ days: 15, fee: 0 }, { days: 8, fee: 50 }, { days: 0, fee: 100 }] },
    { key: "strict", name: "קפדנית", tiers: [{ days: 30, fee: 0 }, { days: 14, fee: 50 }, { days: 0, fee: 100 }] }
  ];
  T.KIDS_POLICY = [{ key: "", name: "לא צוין" }, { key: "welcome", name: "ילדים מתקבלים בברכה" }, { key: "age", name: "מגיל מסוים" }, { key: "none", name: "מבוגרים בלבד" }];
  T.SMOKING_POLICY = [{ key: "", name: "לא צוין" }, { key: "no", name: "אסור לעשן" }, { key: "outside", name: "בחוץ בלבד" }, { key: "yes", name: "מותר" }];
  T.PLACE_KINDS = [
    { key: "restaurant", name: "מסעדות", one: "מסעדה", icon: "utensils" },
    { key: "attraction", name: "אטרקציות", one: "אטרקציה", icon: "sparkle" },
    { key: "spa", name: "ספא וטיפולים", one: "ספא", icon: "leaf" },
    { key: "winery", name: "יקבים", one: "יקב", icon: "wine" },
    { key: "nature", name: "טבע ומסלולים", one: "מסלול", icon: "mountain" }
  ];
  T.UNIT_COUNTS = [2, 3, 4, 6, 8, 10];

  /* דפי נחיתה לגוגל: אזור + מאפיין (משמש גם את scripts/build.mjs) */
  T.SEO_FEATURES = [
    { key: "mamad", phrase: "עם ממ״ד צמוד" },
    { key: "jacuzzi", phrase: "עם ג׳קוזי" },
    { key: "sauna", phrase: "עם סאונה" },
    { key: "fireplace", phrase: "עם קמין" },
    { key: "indoor_pool", phrase: "עם בריכה מקורה" },
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
  /* כתובות לדפי יישוב: /s/<slug>/ באותיות לטיניות (אמין בכל שרת ובשיתוף). יישוב שלא ברשימה מתועתק אוטומטית. */
  T.TOWN_SLUGS = {
    "אודם": "odem", "אילת": "eilat", "אניעם": "aniam", "הרדוף": "harduf", "כליל": "klil", "כפר קיש": "kfar-kish", "מגדל": "migdal", "מצפה רמון": "mitzpe-ramon",
    "נווה זוהר": "neve-zohar", "נס הרים": "nes-harim", "עין הוד": "ein-hod", "ראש פינה": "rosh-pina", "צפת": "tzfat", "מטולה": "metula", "כפר ורדים": "kfar-vradim",
    "מעלות": "maalot", "פקיעין": "pekiin", "גוש חלב": "gush-halav", "דלתון": "dalton", "אמירים": "amirim", "מירון": "meron", "קצרין": "katzrin", "נמרוד": "nimrod",
    "מסעדה": "masade", "נוב": "nov", "אלוני הבשן": "alonei-habashan", "קשת": "keshet", "יונתן": "yonatan", "אבני איתן": "avnei-eitan", "נאות גולן": "neot-golan",
    "רמות": "ramot", "גבעת יואב": "givat-yoav", "טבריה": "tiberias", "כנרת": "kinneret", "יבנאל": "yavneel", "אלמגור": "almagor", "ראש הנקרה": "rosh-hanikra",
    "שלומי": "shlomi", "יעד": "yaad", "זכרון יעקב": "zichron-yaakov", "עין זיוון": "ein-zivan", "בית לחם הגלילית": "beit-lechem-haglilit", "טל אל": "tal-el",
    "כפר תבור": "kfar-tavor", "צפרירים": "tzafririm", "אבן ספיר": "even-sapir", "עין גדי": "ein-gedi", "ערד": "arad", "חצבה": "hatzeva", "צופר": "tzofar",
    "שדה בוקר": "sde-boker", "עין בוקק": "ein-bokek", "צוריאל": "tzuriel", "אביבים": "avivim", "דישון": "dishon", "כפר בלום": "kfar-blum", "דפנה": "dafna",
    "בית הלל": "beit-hillel", "שאר ישוב": "shear-yashuv", "חספין": "hispin", "כפר חרוב": "kfar-haruv", "עמירים": "amirim"
  };
  const TR = { "א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z", "ח": "ch", "ט": "t", "י": "y", "כ": "k", "ך": "k", "ל": "l", "מ": "m", "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "e", "פ": "p", "ף": "f", "צ": "tz", "ץ": "tz", "ק": "k", "ר": "r", "ש": "sh", "ת": "t" };
  T.townSlug = (name) => {
    const n = String(name || "").trim();
    if (T.TOWN_SLUGS[n]) return T.TOWN_SLUGS[n];
    return n.replace(/[׳'"״]/g, "").split("").map((c) => TR[c] || (/[a-z0-9]/i.test(c) ? c.toLowerCase() : "-")).join("").replace(/-+/g, "-").replace(/^-|-$/g, "") || "town";
  };
  /* "הגליל העליון" → "בגליל העליון", "רמת הגולן" → "ברמת הגולן" */
  T.inPlace = (name) => (String(name).startsWith("ה") ? "ב" + String(name).slice(1) : "ב" + name);

  T.QUICK_FILTERS = [
    { label: "ממ״ד צמוד", amenity: "mamad", icon: "shield" },
    { label: "פנוי הלילה", flag: "tonight", icon: "moon" },
    { label: "פנוי בסופ״ש", flag: "weekend", icon: "calendar" },
    { label: "בריכה מחוממת", amenity: "heated_pool", icon: "thermo" },
    { label: "ג׳קוזי ספא", amenity: "jacuzzi", icon: "jacuzzi" },
    { label: "לזוגות בלבד", flag: "couplesOnly", icon: "heart" },
    { label: "למשפחות", audience: "families", icon: "users" },
    { label: "לקבוצות", audience: "groups", icon: "users" },
    { label: "מבודד ושקט", amenity: "secluded", icon: "tree" },
    { label: "כשר", amenity: "kosher", icon: "badge" },
    { label: "שומרי שבת", amenity: "shabbat", icon: "candle" },
    { label: "מקבלים כלבים", amenity: "pets", icon: "paw" },
    { label: "הנחה למילואימניקים", benefit: "reservists", icon: "percent" }
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
    { key: "guest", name: "לאורח" },
    { key: "guest_night", name: "לאורח ללילה" }
  ];
  T.LEAD_SOURCES = [
    { key: "form", name: "בקשת הזמנה" },
    { key: "find", name: "מצא לי צימר" },
    { key: "contact", name: "יצירת קשר" },
    { key: "report", name: "דיווח על מידע שגוי" }
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
    ["description", "תיאור"], ["photos", "תמונות"], ["amenities", "מאפיינים"], ["audience", "מתאים ל"], ["video_url", "סרטון"],
    ["details", "תיאור מפורט, כלול באירוח, חוקי הבית ושאלות"]
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
    a11y_coordinator: "",
    social: { instagram: "", facebook: "", tiktok: "", youtube: "" },
    wa_float: true,
    cookie_banner: true,
    find_enabled: true,
    /* אוספים בעמוד הבית: { id, title, sub, ids: [...] } */
    collections: []
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
    mountain: '<path d="M3 19 9.5 8l4 6.5 2-3L21 19z"/>',
    wine: '<path d="M8 3h8l-.5 5a3.5 3.5 0 0 1-7 0zM12 11.5V20M8.5 20.5h7"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 20.5h8M12 17v3.5"/>',
    snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="10.5" r="2.4"/><path d="M12 13v.01"/>',
    star6: '<path d="M12 3 20 17H4z"/><path d="M12 21 4 7h16z"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.7 10.8 6.6-4M8.7 13.2l6.6 4"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c.8-4 3.8-6.2 7.5-6.2s6.7 2.2 7.5 6.2"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7M4 4.5v4.2h4.2"/><path d="M12 8v4.3l3 1.8"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m10 13 4-4"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5v1.5A3 3 0 0 0 8 10.5M16 6h3.5v1.5a3 3 0 0 1-3.5 3M12 13v4M8.5 20.5h7M10 17h4"/>',
    door2: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 8l4 4-4 4M14 12H4"/>'
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
  const N = (v) => Number(v) || 0;
  T.termsOf = (l) => (l && l.terms) || {};
  T.detailsOf = (l) => (l && l.details) || {};
  /* מתחם בלי יחידות מוגדרות הוא יחידה אחת בעצמו */
  T.unitsOf = (l) => {
    const t = T.termsOf(l);
    if (l && Array.isArray(l.rooms) && l.rooms.length) {
      return l.rooms.map((r) => Object.assign({
        guests_max: l.guests_max, bedrooms: 1, beds: 0, bathrooms: 0, size: 0, desc: "", amenities: [], photos: [],
        price_weekday: l.price_weekday, price_weekend: l.price_weekend, price_holiday: l.price_holiday, guests_base: l.guests_base,
        p2_weekday: 0, p2_weekend: 0, blocked_dates: [], ical_blocked: [], ical_url: ""
      }, r, {
        guests_max: N(r.guests_max) || N(l.guests_max) || 2,
        price_weekday: N(r.price_weekday),
        price_weekend: N(r.price_weekend) || N(r.price_weekday),
        price_holiday: N(r.price_holiday) || N(l.price_holiday),
        guests_base: N(r.guests_base) || N(l.guests_base),
        p2_weekday: N(r.p2_weekday), p2_weekend: N(r.p2_weekend),
        amenities: r.amenities || [], photos: (r.photos || []).filter(Boolean)
      }));
    }
    return [{
      id: "", name: (l && l.name) || "", single: true, guests_max: N(l.guests_max) || 2, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
      beds: N(t.beds), size: N(t.size), desc: "", amenities: [], photos: [],
      price_weekday: N(l.price_weekday), price_weekend: N(l.price_weekend) || N(l.price_weekday), price_holiday: N(l.price_holiday), guests_base: N(l.guests_base),
      p2_weekday: N(t.p2_weekday), p2_weekend: N(t.p2_weekend),
      blocked_dates: l.blocked_dates || [], ical_blocked: l.ical_blocked || [], ical_url: l.ical_url || ""
    }];
  };
  T.unitOf = (l, id) => { const u = T.unitsOf(l); return u.find((x) => x.id === id) || u[0]; };
  T.blockedSet = (unit) => new Set([...(unit.blocked_dates || []), ...(unit.ical_blocked || [])]);
  T.fromPrice = (l) => { const p = T.unitsOf(l).map((u) => u.price_weekday).filter((v) => v > 0); return p.length ? Math.min(...p) : 0; };
  T.weekendFrom = (l) => { const p = T.unitsOf(l).map((u) => u.price_weekend || u.price_weekday).filter((v) => v > 0); return p.length ? Math.min(...p) : 0; };
  T.isSponsored = (l) => !!(l.sponsored_until && l.sponsored_until >= T.iso(T.today()));
  /* קיבולת: יחידה אחת, או כל היחידות יחד במתחם */
  T.capacity = (l) => { const u = T.unitsOf(l); const one = Math.max(...u.map((x) => x.guests_max)); return u.length > 1 ? Math.max(one, u.reduce((s, x) => s + x.guests_max, 0)) : one; };

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
  T.unitFree = (u, ci, co) => {
    const b = T.blockedSet(u);
    const n = T.nightsBetween(ci, co);
    for (let i = 0; i < n; i++) if (b.has(T.iso(T.addDays(T.parseISO(ci), i)))) return false;
    return true;
  };
  T.freeUnits = (l, ci, co) => T.unitsOf(l).filter((u) => T.unitFree(u, ci, co));
  T.freeOnNights = (l, nights) => T.unitsOf(l).some((u) => { const b = T.blockedSet(u); return nights.every((n) => !b.has(n)); });
  T.freeTonight = (l) => T.freeOnNights(l, [T.iso(T.today())]);
  T.freeWeekend = (l) => T.freeOnNights(l, T.lastMinuteNights());

  T.holidayOf = (iso, settings) => ((settings || T.SETTINGS).holidays || []).find((h) => iso >= h.from && iso <= h.to) || null;
  T.couponOf = (code, settings) => {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return null;
    const today = T.iso(T.today());
    return ((settings || T.SETTINGS).coupons || []).find((x) => x.active !== false && String(x.code).toUpperCase() === c && (!x.until || x.until >= today)) || null;
  };
  T.benefitOf = (k) => T.BENEFITS.find((b) => b.key === k) || null;
  T.benefitsOf = (l) => T.BENEFITS.map((b) => ({ ...b, pct: N((T.termsOf(l).benefits || {})[b.key]) })).filter((b) => b.pct > 0);
  T.perAmount = (x, nights, guests) => N(x.price) * (x.per === "night" ? nights : x.per === "guest" ? Math.max(1, guests) : x.per === "guest_night" ? Math.max(1, guests) * nights : 1);

  /* לילות של יחידה אחת: מחיר לכל לילה לפי אמצ״ש / סופ״ש / חג, מחיר 2 לילות, עונה, דקה 90, ומינימום לילות */
  function unitNights(l, unit, ci, nights, settings) {
    const t = T.termsOf(l);
    const blocked = T.blockedSet(unit);
    const lmNights = T.lastMinuteNights();
    const lmPct = N(l.lastminute_pct);
    const g = { weekday: { n: 0, sum: 0 }, weekend: { n: 0, sum: 0 }, holiday: { n: 0, sum: 0, names: new Set() } };
    const conflicts = [];
    let seasonPct = 0, lmUsed = false, minNeeded = N(l.min_nights) || 1, minReason = "";
    for (let i = 0; i < nights; i++) {
      const d = T.addDays(T.parseISO(ci), i);
      const iso = T.iso(d);
      if (blocked.has(iso)) conflicts.push(iso);
      const hol = T.holidayOf(iso, settings);
      const wknd = T.isWeekendNight(d);
      let kind, price;
      if (hol && unit.price_holiday) { kind = "holiday"; price = unit.price_holiday; g.holiday.names.add(hol.label.replace(/\s\d{4}$/, "")); }
      else if (wknd) { kind = "weekend"; price = nights >= 2 && unit.p2_weekend ? unit.p2_weekend : unit.price_weekend || unit.price_weekday; }
      else { kind = "weekday"; price = nights >= 2 && unit.p2_weekday ? unit.p2_weekday : unit.price_weekday; }
      if (hol && N(t.min_holiday) > minNeeded) { minNeeded = N(t.min_holiday); minReason = "בחגים"; }
      else if (wknd && N(t.min_weekend) > minNeeded) { minNeeded = N(t.min_weekend); minReason = "בסופי שבוע"; }
      const seasons = (l.seasons || []).filter((s) => s.from && s.to && iso >= s.from && iso <= s.to);
      const season = seasons.reduce((m, s) => Math.max(m, Number(s.pct) || 0), 0);
      seasons.forEach((s) => { if (N(s.min) > minNeeded) { minNeeded = N(s.min); minReason = "ב" + (s.label || "עונה"); } });
      if (season) { price *= 1 + season / 100; seasonPct = Math.max(seasonPct, season); }
      if (lmPct && kind !== "holiday" && lmNights.includes(iso) && !blocked.has(iso)) { price *= 1 - lmPct / 100; lmUsed = true; }
      price = Math.round(price);
      g[kind].n++;
      g[kind].sum += price;
    }
    return { g, conflicts, seasonPct, lmUsed, minNeeded, minReason, total: g.weekday.sum + g.weekend.sum + g.holiday.sum };
  }
  const nightWord = (n) => (n === 1 ? "לילה אחד" : n === 2 ? "שני לילות" : `${n} לילות`);
  T.nightWord = nightWord;

  /* מחשבון מחיר. o.rooms = [{unitId, guests, children}] להזמנת כמה יחידות; או o.unitId/o.guests/o.children ליחידה אחת.
     o.extras = שמות תוספות, o.pkg = שם חבילה (לינה וארוחת בוקר…), o.benefit = מפתח הטבה, o.coupon = קוד */
  T.quote = (l, ci, co, o) => {
    o = o || {};
    const nights = T.nightsBetween(ci, co);
    if (!l || nights <= 0) return null;
    const settings = o.settings || T.SETTINGS;
    const t = T.termsOf(l);
    const rows = (o.rooms && o.rooms.length ? o.rooms : [{ unitId: o.unitId, guests: o.guests, children: o.children }])
      .map((r) => ({ unit: T.unitOf(l, r.unitId), adults: N(r.guests), children: N(r.children) }));
    const multi = rows.length > 1;
    const anyKids = rows.some((r) => r.children > 0);
    const lines = [];
    const conflicts = new Set();
    let roomTotal = 0, extraGuests = 0, seasonPct = 0, lmUsed = false, minNeeded = 1, minReason = "", over = false, first = null;
    rows.forEach((r) => {
      const u = unitNights(l, r.unit, ci, nights, settings);
      if (!first) first = u;
      const g = u.g;
      if (multi) {
        const parts = [g.weekday.n && `${g.weekday.n} אמצ״ש`, g.weekend.n && `${g.weekend.n} סופ״ש`, g.holiday.n && `${g.holiday.n} חג`].filter(Boolean).join(" · ");
        lines.push({ label: `${r.unit.name} (${parts})`, amount: u.total });
      } else {
        if (g.weekday.n) lines.push({ label: `${nightWord(g.weekday.n)} באמצע שבוע`, amount: g.weekday.sum });
        if (g.weekend.n) lines.push({ label: `${nightWord(g.weekend.n)} בסופ״ש`, amount: g.weekend.sum });
        if (g.holiday.n) lines.push({ label: `${nightWord(g.holiday.n)} חג (${[...g.holiday.names].join(", ")})`, amount: g.holiday.sum });
      }
      roomTotal += u.total;
      u.conflicts.forEach((c) => conflicts.add(c));
      seasonPct = Math.max(seasonPct, u.seasonPct);
      lmUsed = lmUsed || u.lmUsed;
      if (u.minNeeded > minNeeded) { minNeeded = u.minNeeded; minReason = u.minReason; }
      const people = r.adults + r.children;
      if (people > r.unit.guests_max) over = true;
      const base = r.unit.guests_base;
      if (base && people > base) {
        const extra = people - base;
        const kids = Math.min(r.children, extra), adults = extra - kids;
        const pa = N(l.extra_guest_price), pc = N(t.extra_child_price) || pa;
        const tail = ` × ${nightWord(nights)}${multi ? " · " + r.unit.name : ""}`;
        if (adults && pa) {
          const amt = adults * pa * nights; extraGuests += amt;
          lines.push({ label: (anyKids ? (adults === 1 ? "מבוגר נוסף" : `${adults} מבוגרים נוספים`) : (adults === 1 ? "אורח נוסף" : `${adults} אורחים נוספים`)) + tail, amount: amt });
        }
        if (kids && pc) { const amt = kids * pc * nights; extraGuests += amt; lines.push({ label: (kids === 1 ? "ילד נוסף" : `${kids} ילדים נוספים`) + tail, amount: amt }); }
      }
    });
    const guests = rows.reduce((s, r) => s + r.adults + r.children, 0);
    let pkgTotal = 0;
    const pkg = o.pkg ? (t.packages || []).find((p) => p.name === o.pkg) : null;
    if (pkg && N(pkg.price)) { pkgTotal = T.perAmount(pkg, nights, guests); lines.push({ label: pkg.name, amount: pkgTotal }); }
    let extrasTotal = 0;
    (o.extras || []).forEach((name) => {
      const x = (l.extras || []).find((e) => e.name === name);
      if (!x || !N(x.price)) return;
      const amt = T.perAmount(x, nights, guests);
      extrasTotal += amt;
      lines.push({ label: x.name, amount: amt });
    });
    const b = o.benefit ? T.benefitsOf(l).find((x) => x.key === o.benefit) : null;
    const benefitAmt = b ? Math.round(((roomTotal + extraGuests) * b.pct) / 100) : 0;
    if (benefitAmt) lines.push({ label: `הטבה ל${b.name} (${b.pct}%)`, amount: -benefitAmt });
    const subtotal = roomTotal + extraGuests + pkgTotal + extrasTotal - benefitAmt;
    const coupon = T.couponOf(o.coupon, settings);
    const discount = coupon ? Math.round((subtotal * Number(coupon.pct)) / 100) : 0;
    if (discount) lines.push({ label: `קופון ${coupon.code} (${coupon.pct}%)`, amount: -discount });
    return {
      nights, unit: rows[0].unit, units: rows.map((r) => r.unit), lines, roomTotal, extrasTotal, pkgTotal, extraGuests,
      benefit: b ? { key: b.key, name: b.name, pct: b.pct, amount: benefitAmt } : null, discount, coupon, total: subtotal - discount,
      conflicts: [...conflicts].sort(), belowMin: nights < minNeeded, minNeeded, minReason, overCapacity: over, guests,
      weekday: first.g.weekday.n, weekend: first.g.weekend.n, holiday: first.g.holiday.n, seasonPct, lastMinute: lmUsed
    };
  };
  /* פנוי לתאריכים ולמספר האורחים: יחידה אחת שמתאימה, או כמה יחידות פנויות יחד */
  T.isAvailable = (l, ci, co, guests) => {
    if (!(ci && co && T.nightsBetween(ci, co) > 0)) return true;
    const free = T.freeUnits(l, ci, co);
    if (!guests) return free.length > 0;
    return free.some((u) => u.guests_max >= guests) || (free.length > 1 && free.reduce((s, u) => s + u.guests_max, 0) >= guests);
  };
  /* הלילות הפנויים הקרובים (לכפתורי ״פנוי ב־…״ בכרטיס) */
  T.nextFreeNights = (l, days, max) => {
    const out = [];
    const minN = Math.max(1, N(l.min_nights));
    for (let i = 0; i < (days || 14) && out.length < (max || 3); i++) {
      const ci = T.iso(T.addDays(T.today(), i));
      let n = minN;
      let co = T.iso(T.addDays(T.parseISO(ci), n));
      let free = T.freeUnits(l, ci, co);
      if (!free.length) continue;
      let qs = free.map((u) => T.quote(l, ci, co, { unitId: u.id })).filter((q) => q && q.total > 0);
      if (qs.length && qs[0].belowMin) {
        n = qs[0].minNeeded; co = T.iso(T.addDays(T.parseISO(ci), n));
        free = T.freeUnits(l, ci, co);
        if (!free.length) continue;
        qs = free.map((u) => T.quote(l, ci, co, { unitId: u.id })).filter((q) => q && q.total > 0);
      }
      if (!qs.length) continue;
      const best = qs.sort((a, b) => a.total - b.total)[0];
      out.push({ ci, co, nights: n, total: best.total, free: free.length });
    }
    return out;
  };
  /* תאריכים חלופיים כשמה שנבחר תפוס: יחידות אחרות באותם תאריכים, או אותה יחידה בתאריכים קרובים */
  T.altDates = (l, ci, co, unitIds) => {
    const n = T.nightsBetween(ci, co);
    if (n <= 0) return { units: [], dates: [] };
    const ids = (unitIds || []).length ? unitIds : [T.unitsOf(l)[0].id];
    const want = ids.map((id) => T.unitOf(l, id));
    const units = T.freeUnits(l, ci, co).filter((u) => !ids.includes(u.id));
    const dates = [];
    const today = T.iso(T.today());
    for (let k = 1; k <= 28 && dates.length < 3; k++) {
      for (const sgn of [1, -1]) {
        const s = T.iso(T.addDays(T.parseISO(ci), sgn * k));
        if (s < today || dates.length >= 3) continue;
        const e = T.iso(T.addDays(T.parseISO(s), n));
        if (want.every((u) => T.unitFree(u, s, e))) dates.push({ ci: s, co: e });
      }
    }
    return { units, dates: dates.sort((a, b) => a.ci.localeCompare(b.ci)) };
  };

  /* ציון: ממוצע 1–5 מוצג מתוך 10 */
  T.score10 = (avg5) => Math.round(Number(avg5 || 0) * 20) / 10;
  T.scoreLabel = (s10) => (s10 >= 9.5 ? "מושלם" : s10 >= 9 ? "מעולה" : s10 >= 8 ? "טוב מאוד" : s10 >= 7 ? "טוב" : "סביר");
  /* מרחק בק״מ (קו אווירי) */
  T.distKm = (a, b) => {
    if (!a || !b) return null;
    const R = 6371, rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  T.coordsOf = (l) => (l && l.lat != null && l.lng != null && l.lat !== "" ? { lat: Number(l.lat), lng: Number(l.lng) } : l ? { lat: T.regionOf(l.region).lat, lng: T.regionOf(l.region).lng, approx: true } : null);
  T.kmText = (km) => (km == null ? "" : km < 1 ? "פחות מק״מ" : `${km < 10 ? km.toFixed(1).replace(/\.0$/, "") : Math.round(km)} ק״מ`);

  T.isNewListing = (l) => !!(l && l.created_at && Date.now() - new Date(l.created_at).getTime() < 30 * 864e5);
  /* תוויות לכרטיס: בלעדי, מומלצי הגולשים, הטבות, מחיר הכי טוב, לזוגות בלבד, חדש, הכי נצפים */
  T.badgesOf = (l, ctx) => {
    ctx = ctx || {};
    const out = [];
    const t = T.termsOf(l);
    if (l.exclusive) out.push({ k: "exclusive", t: "בלעדי ל" + ((ctx.settings || T.SETTINGS).site_name || "אתר"), icon: "sparkle" });
    const r = ctx.ratings && ctx.ratings[l.id];
    if (r && r.n >= 3 && r.avg >= 4.7) out.push({ k: "top", t: "מומלצי הגולשים " + new Date().getFullYear(), icon: "trophy" });
    const bs = T.benefitsOf(l).sort((a, b) => b.pct - a.pct);
    if (bs.length) out.push({ k: "benefit", t: `${bs[0].pct}% הנחה ${bs[0].short}`, icon: "percent" });
    if (l.best_price) out.push({ k: "best", t: "מחיר הכי טוב", icon: "badge" });
    if (t.couples_only) out.push({ k: "couples", t: "לזוגות בלבד", icon: "heart" });
    if (T.isNewListing(l)) out.push({ k: "new", t: "חדש באתר", icon: "sparkle" });
    if (ctx.top && ctx.top.slice(0, 3).includes(l.id)) out.push({ k: "popular", t: "הכי נצפים", icon: "eye" });
    return out;
  };

  /* ---------------------------------------------------------- תמונות */
  T.img = (url, w) => {
    const u = String(url || "");
    if (u.includes("res.cloudinary.com") && u.includes("/upload/") && !/\/upload\/[^/]*w_\d+/.test(u)) return u.replace("/upload/", `/upload/f_auto,q_auto,w_${w || 1600}/`);
    return u;
  };
  /* תמונות המתחם, כל אחת עם קטגוריה (מהעורך), ואחריהן תמונות היחידות */
  T.photosOf = (l, withUnits) => {
    const cats = (T.detailsOf(l).photo_cats || []);
    const p = (l.photos || []).filter(Boolean);
    let out = p.map((u, i) => ({ src: T.img(u, 1600), thumb: T.img(u, 800), real: true, cat: cats[i] || "general" }));
    if (withUnits) T.unitsOf(l).forEach((un) => (un.photos || []).forEach((u) => out.push({ src: T.img(u, 1600), thumb: T.img(u, 800), real: true, cat: "unit:" + un.id, unit: un.name })));
    if (!out.length && T.listingScene) out = [0, 1, 2, 3].map((i) => ({ src: T.listingScene(l, i), thumb: T.listingScene(l, i), real: false, cat: "general" }));
    return out;
  };
  T.coverOf = (l) => (T.photosOf(l)[0] || {}).src || "";
  T.thumbOf = (l) => {
    const u = (l.photos || [])[0];
    if (!u) return T.coverOf(l);
    if (/assets\/img\/photos\/[\w-]+-1\.jpg$/.test(u)) return u.replace(/-1\.jpg$/, "-card.jpg");
    return T.img(u, 800);
  };

  /* מאפיין במתחם או באחת היחידות */
  T.hasAmen = (l, a) => (l.amenities || []).includes(a) || T.unitsOf(l).some((u) => (u.amenities || []).includes(a));
  /* מדרגות ביטול → שורות טקסט */
  T.cancelLines = (tiers) => {
    const s = (tiers || []).slice().sort((a, b) => b.days - a.days);
    return s.map((x, i) => {
      const prev = s[i - 1];
      const range = i === 0 ? `עד ${x.days} ימים לפני ההגעה` : x.days === 0 ? `פחות מ־${prev.days} ימים לפני` : `${prev.days - 1}–${x.days} ימים לפני`;
      return `${i === 0 && x.days > 0 ? `ביטול ${x.days} ימים ומעלה לפני ההגעה` : range}: ${Number(x.fee) ? `${x.fee}% דמי ביטול` : "ללא עלות"}`;
    });
  };
  /* שאלות נפוצות לדף מתחם: אוטומטיות מהנתונים + שאלות שהמארח כתב (משמש גם ל-FAQPage בגוגל) */
  T.faqOf = (l, r) => {
    const d = T.detailsOf(l), t = T.termsOf(l), reg = T.regionOf(l.region), units = T.unitsOf(l), has = (a) => T.hasAmen(l, a);
    const out = [];
    out.push({ q: `איפה נמצא ${l.name}?`, a: `${l.name} נמצא ב${l.settlement}, ${reg.name}. ${(d.sections || {}).location || "הכתובת המדויקת נמסרת על ידי המארחים לאחר אישור ההזמנה."}` });
    const pools = ["private_pool", "heated_pool", "indoor_pool", "shared_pool"].filter(has);
    if (pools.length) out.push({ q: `יש בריכה ב${l.name}?`, a: `כן: ${pools.map((a) => T.amenityOf(a).name).join(", ")}.` });
    if (has("jacuzzi") || has("jacuzzi_room")) out.push({ q: "יש ג׳קוזי?", a: `כן, ${[has("jacuzzi_room") && "ג׳קוזי בתוך החדר", has("jacuzzi") && "ג׳קוזי ספא"].filter(Boolean).join(" ו")}.` });
    if (has("mamad") || has("mamad_host") || has("shelter")) out.push({ q: "יש מרחב מוגן?", a: ["mamad", "mamad_host", "shelter"].filter(has).map((a) => T.amenityOf(a).name).join(", ") + "." });
    out.push({ q: "כמה עולה לילה?", a: `${units.length > 1 ? "החל מ־" : ""}${T.money(T.fromPrice(l))} ללילה באמצע שבוע ו${T.money(T.weekendFrom(l))} בסופ״ש. מינימום ${T.nightWord(l.min_nights || 1)}${Number(t.min_weekend) > 1 ? `, ובסופ״ש ${T.nightWord(Number(t.min_weekend))}` : ""}. את המחיר המדויק לתאריכים שלכם רואים במחשבון.` });
    if (t.checkin || t.checkout) out.push({ q: "מה שעות הכניסה והיציאה?", a: `כניסה מ־${t.checkin || "15:00"}, יציאה עד ${t.checkout || "11:00"}${t.checkin_sat || t.checkout_sat ? `. בשבת: כניסה ${t.checkin_sat || "—"}, יציאה ${t.checkout_sat || "—"}` : ""}.` });
    if ((t.cancel || []).length) out.push({ q: "מה מדיניות הביטול?", a: T.cancelLines(t.cancel).join(". ") + "." });
    out.push({ q: "מקבלים כלבים?", a: has("pets") ? "כן, המתחם מקבל כלבים. כדאי לעדכן את המארחים מראש." : "המתחם לא מוגדר כמתאים לכלבים. אפשר לשאול את המארחים." });
    if (r && r.n) out.push({ q: `מה אומרים האורחים על ${l.name}?`, a: `ציון ${T.score10(r.avg).toFixed(1)} (${T.scoreLabel(T.score10(r.avg))}) לפי ${r.n === 1 ? "חוות דעת אחת" : r.n + " חוות דעת"} מאומתות.` });
    return out.concat((d.faq || []).filter((x) => x.q && x.a));
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
      sponsored_until: l.sponsored_until || null, video_url: l.video_url || "", pending: l.pending || null,
      details: l.details && typeof l.details === "object" ? l.details : {}, terms: l.terms && typeof l.terms === "object" ? l.terms : {},
      exclusive: !!l.exclusive, best_price: !!l.best_price
    });
  };
})();
