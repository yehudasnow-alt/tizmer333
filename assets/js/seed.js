/* תמרה – נתוני הדגמה (רק במצב הדגמה; באתר המחובר מתחילים נקי) */
(function () {
  "use strict";
  const T = window.Tamara;
  /* אתרים פופולריים למטיילים לפי אזור (נקודות מקורבות למרכז האתר, לחישוב מרחק וזמן נסיעה משוער).
     במצב הדגמה הם חלק מהנתונים; באתר המחובר טוענים אותם מ״מה עושים באזור״ בלחיצה אחת. */
  const C = (id, name, kind, region, settlement, lat, lng, blurb) => ({ id: "pl-" + id, name, kind, region, settlement, lat, lng, phone: "", url: "", blurb, photo: "", photo_credit: "", active: true, curated: true });
  T.CURATED_PLACES = [
    C("banias", "שמורת נחל חרמון (בניאס)", "water", "golan", "צפון הגולן", 33.2486, 35.6947, "מפל הבניאס, שביל התלוי ומעיינות קרים. מסלולים קצרים לכל המשפחה."),
    C("meshushim", "בריכת המשושים", "water", "golan", "שמורת יהודייה", 32.9725, 35.7355, "בריכה טבעית מוקפת עמודי בזלת משושים. ירידה תלולה, שווה כל צעד."),
    C("bental", "הר בנטל", "view", "golan", "מרום גולן", 33.1294, 35.7856, "תצפית על עמק הבכא והחרמון, מוצבים ובית קפה בפסגה."),
    C("hermon", "אתר החרמון", "attraction", "golan", "נווה אטי״ב", 33.3090, 35.7760, "רכבל לפסגה, שלג בחורף ונוף אדיר בקיץ."),
    C("katzrin", "קצרין העתיקה", "history", "golan", "קצרין", 32.9965, 35.6905, "כפר יהודי משוחזר מתקופת התלמוד ובית כנסת עתיק."),
    C("nimrod", "מבצר נמרוד", "history", "golan", "צפון הגולן", 33.2523, 35.7130, "המבצר הגדול בארץ, עם נוף לעמק החולה."),
    C("gamla", "שמורת גמלא", "nature", "golan", "דרום הגולן", 32.9040, 35.7480, "המפל הגבוה בארץ, נשרים ושרידי עיר עתיקה."),
    C("golan-winery", "יקב רמת הגולן", "winery", "golan", "קצרין", 32.9908, 35.6926, "סיורים וטעימות ביקב הוותיק של הגולן."),
    C("gadot", "מצפה גדות", "view", "golan", "גדות", 33.0181, 35.6268, "תצפית על עמק החולה ונהר הירדן."),
    C("tanur", "מפל התנור (נחל עיון)", "water", "galil-elyon", "מטולה", 33.2620, 35.5780, "מפל של 30 מטר, מרשים במיוחד בחורף ובאביב."),
    C("tel-dan", "שמורת תל דן", "water", "galil-elyon", "דן", 33.2486, 35.6525, "מקורות הירדן, יער צל ושער כנעני עתיק."),
    C("hula-reserve", "שמורת החולה", "nature", "galil-elyon", "יסוד המעלה", 33.0722, 35.5994, "שבילים מעל מים, תאואים וציפורים נודדות."),
    C("agamon", "אגמון החולה", "nature", "galil-elyon", "יסוד המעלה", 33.1043, 35.6085, "אגור, עגורים ועגלות חשמליות סביב האגם."),
    C("safed", "רובע האמנים בצפת", "history", "galil-elyon", "צפת", 32.9646, 35.4960, "סמטאות כחולות, בתי כנסת עתיקים וגלריות."),
    C("rosh-pina", "המושבה ראש פינה", "history", "galil-elyon", "ראש פינה", 32.9693, 35.5427, "בתי אבן, גן הברון ובתי קפה בסמטאות."),
    C("meron", "שביל פסגת הר מירון", "nature", "galil-elyon", "מירון", 32.9975, 35.4102, "מסלול מעגלי ביער בגובה 1,200 מטר."),
    C("amud", "שמורת נחל עמוד", "nature", "galil-elyon", "צפת", 32.9566, 35.5063, "נחל איתן, טחנות קמח וגבים לטבילה."),
    C("dalton", "יקבי דלתון", "winery", "galil-elyon", "דלתון", 33.0190, 35.4850, "אזור יקבים עם חדרי טעימות על רמת דלתון."),
    C("hanikra", "נקרות ראש הנקרה", "attraction", "galil-maaravi", "ראש הנקרה", 33.0934, 35.1045, "מערות ים לבנות ורכבל תלול לגבול."),
    C("akko", "עכו העתיקה ואולמות האבירים", "history", "galil-maaravi", "עכו", 32.9234, 35.0690, "חומות, מנהרות צלבניות ושוק ליד הנמל."),
    C("montfort", "מבצר מונפור ונחל כזיב", "nature", "galil-maaravi", "מעלות", 33.0450, 35.2237, "מבצר צלבני מעל נחל זורם, מסלול יום מלא."),
    C("achziv", "גן לאומי אכזיב", "water", "galil-maaravi", "אכזיב", 33.0496, 35.1012, "חוף מוגן ובריכות סלע טבעיות."),
    C("goren", "פארק גורן", "nature", "galil-maaravi", "אילון", 33.0535, 35.2365, "פיקניק ביער ותצפית אל מבצר מונפור."),
    C("montfort-lake", "אגם מונפורט", "attraction", "galil-maaravi", "מעלות־תרשיחא", 33.0105, 35.2665, "סירות, רכבל קטן ושבילי הליכה סביב האגם."),
    C("yehiam", "גן לאומי מבצר יחיעם", "history", "galil-maaravi", "יחיעם", 32.9997, 35.2215, "מבצר צלבני על גבעה ירוקה."),
    C("hamat-gader", "חמת גדר", "spa", "kinneret", "עמק הירדן", 32.6823, 35.6640, "מעיינות חמים, חוות תנינים וחמת רומית."),
    C("capernaum", "כפר נחום", "history", "kinneret", "צפון הכנרת", 32.8810, 35.5752, "בית כנסת עתיק על חוף האגם."),
    C("yardenit", "הירדנית", "water", "kinneret", "קבוצת כנרת", 32.7108, 35.5707, "אתר הטבילה בירדן, עצי אקליפטוס ושקט."),
    C("jordan-park", "פארק הירדן", "water", "kinneret", "צפון הכנרת", 32.9073, 35.6236, "קייקים, טחנות ושבילים לאורך הירדן."),
    C("arbel", "הר ארבל", "view", "kinneret", "ארבל", 32.8227, 35.4987, "צוק מעל הכנרת, אחת התצפיות היפות בארץ."),
    C("tiberias-springs", "חמי טבריה", "spa", "kinneret", "טבריה", 32.7631, 35.5513, "מים חמים מינרליים מול הכנרת."),
    C("kursi", "גן לאומי כורסי", "history", "kinneret", "חוף מזרחי", 32.8254, 35.6511, "מנזר ביזנטי גדול על החוף המזרחי."),
    C("ginosar-boat", "הסירה העתיקה בגינוסר", "history", "kinneret", "גינוסר", 32.8475, 35.5240, "סירת דייגים בת אלפיים שנה."),
    C("zichron", "זכרון יעקב – מדרחוב המייסדים", "history", "carmel", "זכרון יעקב", 32.5713, 34.9536, "רחוב המייסדים, בתי קפה ומוזיאון העלייה."),
    C("carmel-winery", "יקב כרמל זכרון יעקב", "winery", "carmel", "זכרון יעקב", 32.5721, 34.9549, "מרתפי היין ההיסטוריים של הברון."),
    C("ramat-hanadiv", "רמת הנדיב", "nature", "carmel", "זכרון יעקב", 32.5545, 34.9455, "גני הנדיב, מעיין ושבילי טבע."),
    C("ein-hod", "כפר האמנים עין הוד", "attraction", "carmel", "עין הוד", 32.6995, 34.9840, "גלריות, סדנאות ומוזיאון ינקו דאדא."),
    C("nahal-mearot", "שמורת נחל מערות", "history", "carmel", "עין כרמל", 32.6680, 34.9666, "מערות פרהיסטוריות באתר מורשת עולמית."),
    C("muhraka", "המוחרקה", "view", "carmel", "דלית אל־כרמל", 32.6625, 35.0960, "מנזר על פסגה עם נוף לעמק יזרעאל."),
    C("bahai", "הגנים הבהאיים", "attraction", "carmel", "חיפה", 32.8143, 34.9878, "טרסות גנים מעל מפרץ חיפה."),
    C("dor-habonim", "חוף דור הבונים", "water", "carmel", "דור", 32.6440, 34.9310, "מפרצונים, מערות חוף ומים צלולים."),
    C("soreq", "מערת הנטיפים", "nature", "jerusalem", "נס הרים", 31.7563, 35.0230, "מערת נטיפים מוארת בשמורת אבשלום."),
    C("ein-karem", "עין כרם", "history", "jerusalem", "ירושלים", 31.7686, 35.1607, "כפר בין הרים, כנסיות, מעיין ובתי קפה."),
    C("ein-hania", "מעיין עין חנייה", "water", "jerusalem", "עמק רפאים", 31.7477, 35.1629, "מעיין משוחזר ובריכות בפארק עמק רפאים."),
    C("sataf", "סטף", "nature", "jerusalem", "הרי ירושלים", 31.7728, 35.1270, "טרסות, מעיינות ומסלולים בין בוסתנים."),
    C("old-city", "העיר העתיקה והכותל", "history", "jerusalem", "ירושלים", 31.7767, 35.2345, "רובעים, שווקים וסיורי מנהרות."),
    C("city-of-david", "עיר דוד", "history", "jerusalem", "ירושלים", 31.7740, 35.2353, "חפירות, מנהרת חזקיהו ובריכת השילוח."),
    C("canada-park", "פארק איילון קנדה", "nature", "jerusalem", "לטרון", 31.8268, 34.9917, "יער, מעיינות, שרידי עתיקות ושבילי אופניים."),
    C("tzora-wine", "יקבי עמק שורק", "winery", "jerusalem", "צרעה", 31.7640, 34.9880, "יקבי בוטיק בין כרמים בשפלת יהודה."),
    C("masada", "מצדה", "history", "dead-sea", "מצדה", 31.3156, 35.3536, "עלייה ברכבל או בשביל הנחש. מומלץ בזריחה."),
    C("ein-gedi", "שמורת עין גדי", "water", "dead-sea", "עין גדי", 31.4665, 35.3878, "נחל דוד, מפלים ויעלים במדבר."),
    C("arugot", "נחל ערוגות", "water", "dead-sea", "עין גדי", 31.4473, 35.3860, "בריכות ומפל בקניון מדברי."),
    C("qumran", "גן לאומי קומראן", "history", "dead-sea", "קומראן", 31.7410, 35.4593, "המקום שבו נמצאו המגילות הגנוזות."),
    C("ein-bokek", "חוף עין בוקק", "water", "dead-sea", "עין בוקק", 31.2005, 35.3622, "ציפה במים המלוחים בעולם."),
    C("einot-tzukim", "עינות צוקים (עין פשחה)", "water", "dead-sea", "עינות צוקים", 31.7097, 35.4475, "בריכות מעיינות בשמורת טבע לחוף הים."),
    C("sodom", "הר סדום", "nature", "dead-sea", "נווה זוהר", 31.0563, 35.3863, "הר מלח, מערות ותצפית על הבריכות."),
    C("ramon-visitor", "מרכז המבקרים מכתש רמון", "view", "negev", "מצפה רמון", 30.6111, 34.8031, "על שפת המכתש, תצפית ותערוכה."),
    C("ein-avdat", "עין עבדת", "water", "negev", "מדרשת בן גוריון", 30.8209, 34.7623, "קניון לבן, בריכות ומפלים במדבר."),
    C("avdat", "גן לאומי עבדת", "history", "negev", "עבדת", 30.7936, 34.7731, "עיר נבטית על דרך הבשמים."),
    C("ben-gurion", "צריף ובית קברות בן גוריון", "history", "negev", "שדה בוקר", 30.8496, 34.7837, "צריף ראש הממשלה הראשון ותצפית על נחל צין."),
    C("alpaca", "חוות האלפקות", "attraction", "negev", "מצפה רמון", 30.6268, 34.7800, "אלפקות ולאמות, רכיבה וסיור לילדים."),
    C("ramon-stars", "תצפית כוכבים במצפה רמון", "view", "negev", "מצפה רמון", 30.5960, 34.7630, "שמיים חשוכים במיוחד, סיורי כוכבים בלילה."),
    C("coral-beach", "שמורת חוף האלמוגים", "water", "eilat", "אילת", 29.5074, 34.9183, "שנירקול מעל שונית אלמוגים."),
    C("underwater", "המצפה התת־ימי", "attraction", "eilat", "אילת", 29.5025, 34.9175, "מצפה מתחת למים, כרישים וצבי ים."),
    C("timna", "פארק תמנע", "nature", "eilat", "ערבה", 29.7820, 34.9900, "עמודי שלמה, הפטרייה ואגם במדבר."),
    C("red-canyon", "הקניון האדום", "nature", "eilat", "הרי אילת", 29.6488, 34.9207, "קניון צר בגווני אדום, מסלול קצר."),
    C("hai-bar", "חי בר יטבתה", "attraction", "eilat", "יטבתה", 29.8823, 35.0490, "ראמים, יעלים ובעלי חיים מדבריים בשמורה.")
  ];
  /* מתחמי ההדגמה בגרסה לאתר החי: מזהה demo-*, בלי לקוח ובלי טיוטות, מוצגים מיד */
  T.demoListingsForLive = () => T.seedData().listings.map((l) => {
    const r = Object.assign({}, l, { id: "demo-" + l.id.replace(/^l-/, ""), owner_id: null, pending: null, active: true, phone: "", whatsapp: "", email: "", tracking_phone: "" });
    delete r.demo; delete r.created_at; delete r.updated_at;
    return r;
  });
  T.seedData = () => {
    const today = T.today();
    const d = (n) => T.iso(T.addDays(today, n));
    const stamp = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
    const nextDow = (dow, w) => T.addDays(today, ((dow - today.getDay() + 7) % 7) + 7 * w);
    const weekends = (weeks) => weeks.flatMap((w) => { const thu = nextDow(4, w); return [T.iso(thu), T.iso(T.addDays(thu, 1))]; });
    const ph = (key, n) => Array.from({ length: n }, (_, i) => `assets/img/photos/${key}-${i + 1}.jpg`);
    const y = today.getFullYear() + (today.getMonth() > 7 ? 1 : 0);

    const advertisers = [
      { id: "a-levi", name: "רונית ואבי לוי", business: "אבני בזלת · בית הזכוכית", phone: "", email: "ronit@example.com", plan: "premium", status: "active", billing_model: "subscription", lead_price: 0, start_date: d(-200), end_date: d(165), notes: "חידוש שנתי, מעדיפים וואטסאפ", payments: [] },
      { id: "a-galil", name: "יואב שגיא", business: "בית הזית", phone: "", email: "yoav@example.com", plan: "pro", status: "active", billing_model: "subscription", lead_price: 0, start_date: d(-340), end_date: d(12), notes: "מנוי מסתיים בקרוב, לתאם שיחת חידוש", payments: [] },
      { id: "a-kineret", name: "מיכל אברהם", business: "וילה מרגלית", phone: "", email: "michal@example.com", plan: "premium", status: "active", billing_model: "both", lead_price: 30, start_date: d(-90), end_date: d(275), notes: "", payments: [] },
      { id: "a-south", name: "דנה ושי מזרחי", business: "מלח הארץ · וילה אלמוג", phone: "", email: "dana@example.com", plan: "pro", status: "active", billing_model: "subscription", lead_price: 0, start_date: d(-150), end_date: d(215), notes: "", payments: [] },
      { id: "a-hills", name: "נועה פרידמן", business: "וילת הטרסות", phone: "", email: "noa@example.com", plan: "basic", status: "trial", billing_model: "per_lead", lead_price: 25, start_date: d(-10), end_date: d(20), notes: "חודש ניסיון, תשלום לפי פנייה", payments: [] },
      { id: "a-sela", name: "הדס סלע", business: "וילת ארבל · וילת מבוא חמה · וילת העגורים", phone: "", email: "hadas@example.com", plan: "premium", status: "active", billing_model: "subscription", lead_price: 0, start_date: d(-45), end_date: d(320), notes: "שלוש וילות בצפון", payments: [] },
      { id: "a-desert", name: "עמית ורותם בן דוד", business: "וילת המכתש · סוויטות המעיין · וילת השונית", phone: "", email: "amit@example.com", plan: "pro", status: "active", billing_model: "both", lead_price: 20, start_date: d(-30), end_date: d(335), notes: "", payments: [] },
      { id: "a-north", name: "אלון קרמר", business: "וילת הגפן · סוויטת השקד · אחוזת הכרמל", phone: "", email: "alon@example.com", plan: "premium", status: "active", billing_model: "both", lead_price: 20, start_date: d(-60), end_date: d(305), notes: "שלושה מתחמים, חשבונית אחת", payments: [] }
    ];

    const L = (o) => Object.assign({
      id: "", name: "", type: "zimmer", region: "", settlement: "", tagline: "", description: "",
      guests_max: 2, bedrooms: 1, bathrooms: 1, units: 1, min_nights: 1,
      price_weekday: 0, price_weekend: 0, price_holiday: 0, guests_base: 0, extra_guest_price: 0,
      deal_label: "", deal_text: "", lastminute_pct: 0, sponsored_until: null, video_url: "",
      amenities: [], audience: [], photos: [], blocked_dates: [], ical_url: "", ical_blocked: [],
      rooms: [], extras: [], seasons: [], lat: null, lng: null,
      phone: "", whatsapp: "", email: "", owner_id: "", featured: false, active: true, pending: null, demo: true,
      created_at: stamp(400), updated_at: stamp(20)
    }, o);
    const R = (id, name, guests_max, price_weekday, price_weekend, extra) => Object.assign({ id, name, guests_max, bedrooms: 1, price_weekday, price_weekend, price_holiday: 0, guests_base: 0, blocked_dates: [], ical_url: "", ical_blocked: [] }, extra || {});

    const listings = [
      L({ id: "l-basalt", name: "אבני בזלת", type: "suite", region: "golan", settlement: "אודם", lat: 33.196, lng: 35.752, owner_id: "a-levi",
        tagline: "סוויטות אבן עם ג׳קוזי מול החרמון",
        description: "שלוש סוויטות שנבנו מאבן מקומית, כל אחת עם ג׳קוזי ספא, קמין עצים ומרפסת שפונה לחרמון. ארוחת בוקר גולנית מוגשת לחדר בשעה שתבחרו.\n\nעשר דקות נסיעה ליער אודם ולברכת רם, וחמש דקות ליקב בוטיק במושב.",
        guests_max: 4, bedrooms: 1, bathrooms: 1, units: 3, min_nights: 2, price_weekday: 950, price_weekend: 1250, price_holiday: 1490, guests_base: 2, extra_guest_price: 150,
        lastminute_pct: 15, featured: true,
        rooms: [R("r1", "סוויטת החרמון", 2, 950, 1250, { blocked_dates: weekends([0, 3]) }), R("r2", "סוויטת הבזלת", 2, 990, 1290, { blocked_dates: weekends([1]) }), R("r3", "הסוויטה המשפחתית", 4, 1150, 1450, { bedrooms: 2, guests_base: 2, blocked_dates: weekends([0, 1, 2]) })],
        extras: [{ name: "ארוחת בוקר גולנית לחדר", price: 160, per: "night" }, { name: "עיסוי זוגי (60 דק׳)", price: 520, per: "stay" }, { name: "בקבוק יין מהיקב השכן", price: 140, per: "stay" }],
        amenities: ["jacuzzi", "fireplace", "view", "secluded", "breakfast", "spa", "wifi", "parking"], audience: ["couples", "families"], photos: ph("basalt", 4), created_at: stamp(7200) }),
      L({ id: "l-glass", name: "בית הזכוכית", type: "villa", region: "galil-elyon", settlement: "ראש פינה", lat: 32.969, lng: 35.543, owner_id: "a-levi",
        tagline: "וילה עם קירות זכוכית ובריכה מחוממת מעל עמק החולה",
        description: "סלון פתוח עם חלונות מהרצפה לתקרה, מטבח שף ושלושה חדרי שינה עם חדרי רחצה צמודים. הבריכה מחוממת מנובמבר עד אפריל, ומהמרפסת רואים את העמק עד החרמון.\n\nחמש דקות הליכה למדרחוב ראש פינה העתיקה.",
        guests_max: 8, bedrooms: 3, bathrooms: 3, min_nights: 2, price_weekday: 2400, price_weekend: 3200, price_holiday: 3600, guests_base: 6, extra_guest_price: 180,
        sponsored_until: d(20), seasons: [{ label: "קיץ", from: `${y}-07-01`, to: `${y}-08-31`, pct: 20 }],
        extras: [{ name: "ארוחת בוקר בהגשה", price: 95, per: "guest" }, { name: "צ׳ק-אאוט מאוחר (16:00)", price: 400, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "view", "kitchen", "bbq", "garden", "wifi", "parking"], audience: ["families", "groups"], photos: ph("glass", 4), blocked_dates: weekends([2]), created_at: stamp(288) }),
      L({ id: "l-margalit", name: "וילה מרגלית", type: "villa", region: "kinneret", settlement: "מגדל", lat: 32.838, lng: 35.5, owner_id: "a-kineret",
        tagline: "וילה לקבוצות עם בריכה ענקית ונוף לכנרת",
        description: "חמישה חדרי שינה, סלון גדול שנפתח לבריכה ופינת ישיבה ל־20 סביב מזרקה. בערב הבריכה מוארת, ומכל קומה רואים את הכנרת.\n\nמתאימה לאירועים משפחתיים קטנים, ימי הולדת עגולים וסופי שבוע של חברים.",
        guests_max: 14, bedrooms: 5, bathrooms: 3, min_nights: 2, price_weekday: 3800, price_weekend: 5200, price_holiday: 5900, guests_base: 12, extra_guest_price: 150, featured: true,
        extras: [{ name: "שף פרטי לארוחת ערב", price: 180, per: "guest" }, { name: "ניקיון ביניים", price: 350, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "view", "kitchen", "bbq", "kids", "events", "wifi", "parking"], audience: ["families", "groups"], photos: ph("margalit", 5), blocked_dates: weekends([0, 2]), created_at: stamp(5280) }),
      L({ id: "l-carmel", name: "אחוזת הכרמל", type: "compound", region: "carmel", settlement: "עין הוד", lat: 32.7, lng: 34.982, owner_id: "a-north",
        tagline: "ארבע יחידות סביב בריכה, עשר דקות מהים",
        description: "מתחם לבן בסגנון ים־תיכוני עם ארבע יחידות נפרדות, בריכה משותפת וחצר עם פרגולה לארוחות ארוכות. אפשר להזמין יחידה אחת לזוג, או את כל המתחם למשפחה מורחבת.\n\nבבוקר הולכים ברגל לגלריות בכפר האמנים, אחר הצהריים נוסעים לחוף.",
        guests_max: 13, bedrooms: 6, bathrooms: 5, units: 4, min_nights: 1, price_weekday: 690, price_weekend: 880, guests_base: 2, extra_guest_price: 120,
        rooms: [R("r1", "חדר הגפן", 2, 690, 880), R("r2", "חדר הזית", 2, 690, 880, { blocked_dates: weekends([0]) }), R("r3", "סוויטת הים", 3, 890, 1090, { guests_base: 2 }), R("r4", "הבית הגדול", 6, 1490, 1890, { bedrooms: 3, guests_base: 4, blocked_dates: weekends([1]) })],
        extras: [{ name: "ארוחת בוקר בפרגולה", price: 85, per: "guest" }, { name: "עריכת שולחן לאירוע", price: 600, per: "stay" }],
        amenities: ["private_pool", "kitchen", "bbq", "garden", "events", "view", "pets", "kids", "wifi", "parking"], audience: ["groups", "families", "couples"], photos: ph("carmel", 4), created_at: stamp(3600) }),
      L({ id: "l-zayit", name: "בית הזית", type: "zimmer", region: "galil-maaravi", settlement: "כליל", lat: 32.982, lng: 35.196, owner_id: "a-galil",
        tagline: "בית עץ לבן עם מרפסת, בריכה וגינה טרופית",
        description: "בית עץ בשתי קומות עם מרפסת מקורה לכל אורכו, בריכה פרטית וגינה עם עצי דקל. החשמל סולארי והשקט אמיתי.\n\nמתאים לזוג עם שני ילדים, והכלב מוזמן גם הוא.",
        guests_max: 4, bedrooms: 2, bathrooms: 1, min_nights: 2, price_weekday: 720, price_weekend: 920, guests_base: 2, extra_guest_price: 120,
        deal_label: "אמצע שבוע", deal_text: "לילה שלישי בחצי מחיר בימים א׳–ד׳",
        amenities: ["private_pool", "garden", "kitchen", "bbq", "pets", "secluded", "wifi", "parking"], audience: ["couples", "families"], photos: ph("zayit", 4), blocked_dates: weekends([1]), created_at: stamp(4560) }),
      L({ id: "l-melach", name: "מלח הארץ", type: "suite", region: "dead-sea", settlement: "נווה זוהר", lat: 31.153, lng: 35.362, owner_id: "a-south",
        tagline: "סוויטות מדבר עם טיפולי ספא ובריכה לזריחה",
        description: "סוויטות מרווחות עם ג׳קוזי ומרפסת לזריחה מעל הרי מואב. מטפלת מגיעה לחדר בתיאום מראש, ובבוקר מגישים ארוחה מדברית.",
        guests_max: 2, bedrooms: 1, bathrooms: 1, units: 2, min_nights: 1, price_weekday: 1100, price_weekend: 1450, price_holiday: 1690, lastminute_pct: 20, featured: true,
        rooms: [R("r1", "סוויטת הזריחה", 2, 1100, 1450), R("r2", "סוויטת המלח", 2, 1180, 1520, { blocked_dates: weekends([0]) })],
        extras: [{ name: "טיפול ספא זוגי", price: 590, per: "stay" }, { name: "ארוחת בוקר מדברית", price: 140, per: "night" }],
        amenities: ["jacuzzi", "view", "spa", "breakfast", "private_pool", "accessible", "wifi", "parking"], audience: ["couples"], photos: ph("melach", 5), created_at: stamp(3840) }),
      L({ id: "l-shaked", name: "סוויטת השקד", type: "suite", region: "galil-maaravi", settlement: "הרדוף", lat: 32.76, lng: 35.171, owner_id: "a-north",
        tagline: "בית בריכה מזכוכית עם מטבח חוץ",
        description: "סוויטה עם קירות זכוכית שנפתחים לבריכה, מטבח חוץ מלא ופינת אוכל מקורה. בלילה סוגרים את הזכוכית ומדליקים את הקמין.",
        guests_max: 2, bedrooms: 1, bathrooms: 1, min_nights: 1, price_weekday: 890, price_weekend: 1150, price_holiday: 1350,
        deal_label: "מבצע חורף", deal_text: "עיסוי זוגי מתנה בהזמנה של לילה באמצע שבוע",
        extras: [{ name: "ארוחת שף בבית", price: 650, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "jacuzzi", "fireplace", "kitchen", "bbq", "spa", "wifi"], audience: ["couples"], photos: ph("shaked", 4), created_at: stamp(192) }),
      L({ id: "l-almog", name: "וילה אלמוג", type: "villa", region: "eilat", settlement: "אילת", lat: 29.565, lng: 34.947, owner_id: "a-south",
        tagline: "וילה לבנה עם בריכה ומרפסת גג, עשר דקות מהחוף",
        description: "ארבעה חדרי שינה, בריכה פרטית עם מפל מים ומרפסת גג עם נוף להרי אדום. מטבח מלא, חניה לשני רכבים ונסיעה קצרה לשמורת האלמוגים.",
        guests_max: 10, bedrooms: 4, bathrooms: 3, min_nights: 3, price_weekday: 3200, price_weekend: 4100, price_holiday: 4600, guests_base: 8, extra_guest_price: 150,
        seasons: [{ label: "עונת חורף", from: `${today.getFullYear()}-12-15`, to: `${today.getFullYear() + 1}-02-28`, pct: 15 }],
        amenities: ["private_pool", "heated_pool", "kitchen", "bbq", "kids", "view", "wifi", "parking"], audience: ["families", "groups"], photos: ph("almog", 4), created_at: stamp(3360) }),
      L({ id: "l-gefen", name: "וילת הגפן", type: "villa", region: "golan", settlement: "אניעם", lat: 32.958, lng: 35.746, owner_id: "a-north",
        tagline: "וילת יוקרה עם בריכה, מדורת גז ופרגולה",
        description: "ארבעה חדרי שינה, סלון בגובה כפול עם וילונות פשתן, בריכה עם מיטות שיזוף בתוך המים ומדורת גז לאורך המים. בחצר פרגולה עם שולחן ל־12.\n\nמתאימה לשלוש משפחות או לחגיגת יום הולדת.",
        guests_max: 12, bedrooms: 4, bathrooms: 3, min_nights: 2, price_weekday: 3400, price_weekend: 4600, price_holiday: 5200, guests_base: 10, extra_guest_price: 160, featured: true,
        extras: [{ name: "חימום בריכה בחורף", price: 450, per: "night" }, { name: "שף פרטי", price: 190, per: "guest" }],
        amenities: ["private_pool", "heated_pool", "jacuzzi", "bbq", "kitchen", "kids", "view", "events", "wifi", "parking"], audience: ["groups", "families"], photos: ph("gefen", 5), blocked_dates: weekends([1, 2]), created_at: stamp(6240),
        pending: { tagline: "וילת יוקרה עם בריכה, מדורה וחדר קולנוע", description: "ארבעה חדרי שינה, סלון בגובה כפול, חדר קולנוע חדש עם מקרן ומושבים ל־10, ובריכה עם מיטות שיזוף בתוך המים.\n\nמתאימה לשלוש משפחות או לחגיגת יום הולדת.", _at: stamp(5) } }),
      L({ id: "l-terraces", name: "וילת הטרסות", type: "villa", region: "jerusalem", settlement: "נס הרים", lat: 31.752, lng: 35.061, owner_id: "a-hills",
        tagline: "וילה כשרה עם בריכה ופרגולה מול נחל שורק",
        description: "וילה על שלוש טרסות עם בריכה, פרגולה מוצלת ופינת ישיבה מול הנחל. כשרה, עם פלטה ומיחם לשבת.",
        guests_max: 8, bedrooms: 3, bathrooms: 2, min_nights: 1, price_weekday: 2600, price_weekend: 3300, price_holiday: 3900, guests_base: 6, extra_guest_price: 140,
        amenities: ["private_pool", "kosher", "shabbat", "view", "kitchen", "garden", "wifi", "parking"], audience: ["families", "groups"], photos: ph("terraces", 4), created_at: stamp(120) }),
      L({ id: "l-arbel", name: "וילת ארבל", type: "villa", region: "kinneret", settlement: "ארבל", lat: 32.818, lng: 35.497, owner_id: "a-sela",
        tagline: "וילה לבנה עם בריכה מוארת, למרגלות צוק הארבל",
        description: "וילה בסגנון ים־תיכוני עם בריכה גדולה שמוארת בערב, ארבעה חדרי שינה וסלון שנפתח למרפסת. מהגג רואים את הכנרת ואת רמת הגולן.\n\nעשר דקות נסיעה לחוף, ושביל הארבל יוצא כמעט מהדלת.",
        guests_max: 10, bedrooms: 4, bathrooms: 3, min_nights: 2, price_weekday: 2900, price_weekend: 3900, price_holiday: 4500, guests_base: 8, extra_guest_price: 160, featured: true, lastminute_pct: 10,
        amenities: ["private_pool", "heated_pool", "view", "kitchen", "bbq", "garden", "wifi", "parking", "ac", "mamad"], audience: ["families", "groups", "friends"], photos: ph("arbel", 4), blocked_dates: weekends([1, 3]), created_at: stamp(30) }),
      L({ id: "l-ramon", name: "וילת המכתש", type: "villa", region: "negev", settlement: "מצפה רמון", lat: 30.608, lng: 34.799, owner_id: "a-desert",
        tagline: "בריכה, דשא ושמי מדבר, חמש דקות משפת המכתש",
        description: "וילה מודרנית עם קירות זכוכית, בריכה פרטית ודשא גדול. בלילה מכבים את האורות ורואים את שביל החלב מהמרפסת.\n\nחמש דקות למרכז המבקרים ולשביל השפה, עשרים דקות לעין עבדת.",
        guests_max: 8, bedrooms: 3, bathrooms: 2, min_nights: 2, price_weekday: 2200, price_weekend: 2900, price_holiday: 3300, guests_base: 6, extra_guest_price: 140,
        amenities: ["private_pool", "view", "secluded", "garden", "bbq", "kitchen", "wifi", "parking", "ac", "design"], audience: ["families", "couples", "friends"], photos: ph("ramon", 4), blocked_dates: weekends([0]), created_at: stamp(48) }),
      L({ id: "l-baron", name: "בית הברון", type: "villa", region: "carmel", settlement: "זכרון יעקב", lat: 32.574, lng: 34.952, owner_id: "a-north",
        tagline: "בית מושבה משופץ עם מרפסת עץ ובריכה בין דקלים",
        description: "בית לבן בן שתי קומות עם מרפסת עץ מקיפה, גינה טרופית ובריכה פרטית. שלושה חדרי שינה, מטבח גדול ופינת אוכל לעשרה.\n\nהליכה של שבע דקות לרחוב המייסדים, ליקב ולמסעדות.",
        guests_max: 8, bedrooms: 3, bathrooms: 2, min_nights: 2, price_weekday: 1900, price_weekend: 2600, price_holiday: 2900, guests_base: 6, extra_guest_price: 130,
        amenities: ["private_pool", "garden", "balcony", "kitchen", "bbq", "wifi", "parking", "ac", "winery_near", "kids"], audience: ["families", "friends"], photos: ph("baron", 4), created_at: stamp(72) }),
      L({ id: "l-dalton", name: "סוויטות דלתון", type: "suite", region: "galil-elyon", settlement: "דלתון", lat: 33.016, lng: 35.49, owner_id: "a-levi", units: 2,
        tagline: "שתי סוויטות זכוכית מול בריכה, בין יקבי רמת דלתון",
        description: "שתי סוויטות עם קירות זכוכית שנפתחים לבריכה משותפת קטנה וגינה מטופחת. בכל סוויטה מיטת קינג, מקלחת גשם ופינת קפה.\n\nחמש דקות ליקבים של דלתון, רבע שעה לצפת ולנחל עמוד.",
        guests_max: 3, bedrooms: 1, bathrooms: 1, min_nights: 1, price_weekday: 890, price_weekend: 1190, price_holiday: 1390, guests_base: 2, extra_guest_price: 120,
        rooms: [R("r1", "סוויטת הכרם", 2, 890, 1190, { blocked_dates: weekends([0]) }), R("r2", "סוויטת הגפן", 3, 990, 1290, { guests_base: 2, blocked_dates: weekends([2]) })],
        amenities: ["shared_pool", "romantic", "design", "espresso", "smart_tv", "wifi", "parking", "ac", "winery_near", "trails_near"], audience: ["couples", "honeymoon"], photos: ph("dalton", 4), created_at: stamp(96) }),
      L({ id: "l-mevo", name: "וילת מבוא חמה", type: "villa", region: "golan", settlement: "מבוא חמה", lat: 32.737, lng: 35.649, owner_id: "a-sela",
        tagline: "וילת זכוכית על שפת המצוק, עם הכנרת כולה מתחת",
        description: "וילה עם שתי קומות של זכוכית, בריכת אינסוף, פרגולה עם ספות חוץ ופינת אש. ארבעה חדרי שינה עם חדרי רחצה צמודים.\n\nבבוקר יורדים לחמת גדר, בערב צופים בשקיעה מעל הכנרת.",
        guests_max: 10, bedrooms: 4, bathrooms: 4, min_nights: 2, price_weekday: 3400, price_weekend: 4600, price_holiday: 5200, guests_base: 8, extra_guest_price: 180, featured: true,
        amenities: ["private_pool", "heated_pool", "view", "design", "kitchen", "bbq", "fireplace", "wifi", "parking", "ac", "mamad"], audience: ["families", "groups", "friends"], photos: ph("mevo", 4), blocked_dates: weekends([0, 2]), created_at: stamp(120) }),
      L({ id: "l-tzora", name: "וילת הכרמים", type: "villa", region: "jerusalem", settlement: "צרעה", lat: 31.764, lng: 34.987, owner_id: "a-hills",
        tagline: "וילה לבנה עם מגלשה לבריכה, בין כרמי עמק שורק",
        description: "וילה מודרנית עם בריכה ומגלשה לילדים, מרפסת גג ושלושה חדרי שינה. בחצר דשא, נדנדות ופינת מנגל גדולה.\n\nעשר דקות ליקבים של עמק שורק ולמערת הנטיפים.",
        guests_max: 9, bedrooms: 3, bathrooms: 2, min_nights: 2, price_weekday: 2100, price_weekend: 2800, price_holiday: 3200, guests_base: 6, extra_guest_price: 120,
        amenities: ["private_pool", "kids_pool", "fenced_pool", "kids", "garden", "bbq", "kitchen", "wifi", "parking", "ac", "winery_near"], audience: ["families"], photos: ph("tzora", 4), blocked_dates: weekends([1]), created_at: stamp(150) }),
      L({ id: "l-reef", name: "וילת השונית", type: "villa", region: "eilat", settlement: "אילת", lat: 29.539, lng: 34.946, owner_id: "a-desert",
        tagline: "וילה עם בריכה מעוצבת, שלוש דקות מחוף האלמוגים",
        description: "וילה חדשה בשכונת הווילות של אילת, עם בריכה פרטית מוצלת, ארבעה חדרי שינה ומרפסת גג עם נוף למפרץ.\n\nשלוש דקות נסיעה לשמורת האלמוגים ולמצפה התת־ימי.",
        guests_max: 10, bedrooms: 4, bathrooms: 3, min_nights: 2, price_weekday: 2600, price_weekend: 3400, price_holiday: 3900, guests_base: 8, extra_guest_price: 150, lastminute_pct: 12,
        amenities: ["private_pool", "beach_near", "kitchen", "bbq", "balcony", "wifi", "parking", "ac", "smart_tv", "mamad"], audience: ["families", "friends", "groups"], photos: ph("reef", 4), created_at: stamp(170) }),
      L({ id: "l-bustan", name: "בית הבוסתן", type: "villa", region: "galil-maaravi", settlement: "אבירים", lat: 33.027, lng: 35.278, owner_id: "a-galil",
        tagline: "וילה עם דשא ענק ובריכה, בלב בוסתן בגליל המערבי",
        description: "וילה רחבה עם מדשאה גדולה, בריכה פרטית ושמשיות, שלושה חדרי שינה וסלון עם חלונות לנוף. עצי פרי בגינה, ואפשר לקטוף בעונה.\n\nרבע שעה למבצר מונפור ולנחל כזיב, חצי שעה לחוף אכזיב.",
        guests_max: 8, bedrooms: 3, bathrooms: 2, min_nights: 2, price_weekday: 1700, price_weekend: 2300, price_holiday: 2700, guests_base: 6, extra_guest_price: 110,
        amenities: ["private_pool", "garden", "bbq", "kitchen", "pets", "secluded", "trails_near", "wifi", "parking", "ac"], audience: ["families", "friends"], photos: ph("bustan", 4), blocked_dates: weekends([2]), created_at: stamp(200) }),
      L({ id: "l-maayan", name: "סוויטות המעיין", type: "suite", region: "dead-sea", settlement: "עין גדי", lat: 31.458, lng: 35.388, owner_id: "a-desert", units: 2,
        tagline: "סוויטות זכוכית מול המדבר, עם בריכה מוצלת ושקט מוחלט",
        description: "שתי סוויטות מודרניות סביב בריכה מוצלת, עם מרפסת פרטית ונוף להרי מואב. בבוקר יוצאים לנחל דוד, בצהריים חוזרים לבריכה.\n\nעשר דקות לחוף עין גדי, חצי שעה למצדה.",
        guests_max: 3, bedrooms: 1, bathrooms: 1, min_nights: 1, price_weekday: 1050, price_weekend: 1390, price_holiday: 1590, guests_base: 2, extra_guest_price: 140,
        rooms: [R("r1", "סוויטת המדבר", 2, 1050, 1390), R("r2", "סוויטת המעיין", 3, 1150, 1490, { guests_base: 2, blocked_dates: weekends([0]) })],
        amenities: ["shared_pool", "view", "secluded", "romantic", "spa", "espresso", "wifi", "parking", "ac", "mamad"], audience: ["couples", "honeymoon"], photos: ph("maayan", 4), created_at: stamp(230) }),
      L({ id: "l-agur", name: "וילת העגורים", type: "villa", region: "galil-elyon", settlement: "יסוד המעלה", lat: 33.06, lng: 35.6, owner_id: "a-sela",
        tagline: "וילה לקבוצות עם בריכה גדולה, דקה מאגמון החולה",
        description: "וילה בת חמישה חדרי שינה עם בריכה גדולה מוארת, מרפסות ופינת ישיבה ל־16. מתאימה לסופי שבוע משפחתיים וחגיגות קטנות.\n\nדקה נסיעה לאגמון החולה, רבע שעה לראש פינה.",
        guests_max: 14, bedrooms: 5, bathrooms: 4, min_nights: 2, price_weekday: 3600, price_weekend: 4900, price_holiday: 5600, guests_base: 12, extra_guest_price: 150,
        amenities: ["private_pool", "heated_pool", "kids", "events", "karaoke", "pingpong", "kitchen", "bbq", "wifi", "parking", "ac", "mamad"], audience: ["groups", "families"], photos: ph("agur", 4), blocked_dates: weekends([0, 1]), created_at: stamp(260) }),
    ];

    /* פרטים מורחבים לכל מתחם: תיאור לפי נושאים, מדיניות, הטבות, חבילות ויחידות */
    const tiers = (k) => T.clone(T.CANCEL_PRESETS.find((c) => c.key === k).tiers);
    const times = { checkin: "15:00", checkout: "11:00", checkin_sat: "18:00", checkout_sat: "מוצאי שבת" };
    const MORE = {
      "l-basalt": { exclusive: true, add: ["mamad", "jacuzzi_room", "espresso", "smart_tv", "ac", "romantic", "stone", "winery_near", "trails_near"],
        details: { host_name: "רונית ואבי", photo_cats: ["general", "spa", "inside", "view"],
          sections: { location: "בקצה מושב אודם, בגובה 1,100 מטר, מול החרמון. הדרך סלולה עד הדלת, וחניה צמודה לכל סוויטה.", vibe: "שקט של הרים, אבן בזלת וקמין עצים. כל סוויטה עומדת לבד, בלי קירות משותפים.", facilities: "ג׳קוזי ספא לשניים, קמין עצים עם עצים כלולים, מכונת אספרסו, טלוויזיה חכמה ומרפסת עם ערסל.", area: "יער אודם (5 דק׳), ברכת רם (10 דק׳), יקב בוטיק במושב, ומסלול נחל סער (20 דק׳).", good: "בחורף יורד שלג בכמה ימים בשנה, כדאי להגיע עם רכב גבוה.\nארוחת הבוקר מוגשת לחדר בין 8:00 ל־11:00." },
          included: ["בקבוק יין גולני", "שתייה קלה ומים", "קפה, תה וחלב", "שוקולד בוטיק", "חלוקים ונעלי בית"],
          rules: ["אין מנגל בשבת", "שקט אחרי 23:00", "אין מערכות הגברה", "לא מקבלים בעלי חיים"],
          faq: [{ q: "האם הג׳קוזי פרטי?", a: "כן, בכל סוויטה יש ג׳קוזי ספא פרטי בתוך החדר, מחומם כל השנה." }] },
        terms: Object.assign({}, times, { kids: "age", kids_age: 12, smoking: "outside", cancel: tiers("mid"), min_weekend: 2, min_holiday: 2, benefits: { reservists: 5 },
          packages: [{ name: "לינה וארוחת בוקר", price: 80, per: "guest_night" }] }),
        rooms: { r1: { beds: 1, bathrooms: 1, size: 45, desc: "מיטת קינג, ג׳קוזי ספא ליד החלון הגדול וקמין עצים.", amenities: ["jacuzzi_room", "fireplace", "espresso", "smart_tv", "ac"], photos: ["assets/img/photos/basalt-2.jpg"] },
          r2: { beds: 1, bathrooms: 1, size: 40, desc: "סוויטה בקומת קרקע עם חצר קטנה ונוף ליער.", amenities: ["jacuzzi_room", "fireplace", "ac", "smart_tv"], photos: ["assets/img/photos/basalt-3.jpg"] },
          r3: { beds: 3, bathrooms: 1, size: 65, desc: "שני חדרי שינה וסלון עם ספה נפתחת. מתאימה לזוג עם שני ילדים.", amenities: ["jacuzzi", "fireplace", "kitchen", "ac", "smart_tv"], photos: ["assets/img/photos/basalt-4.jpg"] } } },
      "l-glass": { best_price: true, add: ["mamad_host", "ac", "smart_tv", "design", "espresso"],
        details: { host_name: "רונית ואבי", ribbon: "מחירים מיוחדים לחורף", photo_cats: ["general", "pool", "inside", "view"],
          sections: { location: "בשולי ראש פינה העתיקה, חמש דקות הליכה מהמדרחוב.", vibe: "עיצוב נקי, קירות זכוכית ונוף פתוח לעמק החולה.", area: "שמורת החולה (15 דק׳), נחל עמוד, ומסעדות השף של ראש פינה.", good: "הבריכה מחוממת מנובמבר עד אפריל ללא תוספת." },
          included: ["סל פירות בהגעה", "קפה ותה", "מגבות לבריכה"], rules: ["אין אירועים מעל 12 משתתפים", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "no", cancel: tiers("strict"), p2_weekday: 2200, min_weekend: 2, benefits: { reservists: 10, soldiers: 5 }, extra_child_price: 90 }) },
      "l-margalit": { add: ["mamad", "snooker", "pingpong", "karaoke", "kids_pool", "fenced_pool", "beach_near", "ac"],
        details: { host_name: "מיכל", photo_cats: ["general", "pool", "inside", "view", "pool"],
          sections: { location: "במושבה מגדל, על המדרון מעל הכנרת. 5 דקות נסיעה לחוף.", facilities: "בריכה ענקית מגודרת, בריכת פעוטות, שולחן סנוקר, פינג פונג וקריוקי.", good: "החניה ל־5 רכבים. אירועים עם מוזיקה רק עד 23:00." },
          rules: ["אירועים בתיאום מראש", "שקט אחרי 23:00"], included: ["קפה, תה וחלב", "מגבות לבריכה"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), min_weekend: 2, min_holiday: 3, benefits: { evacuees: 15 }, extra_child_price: 80 }) },
      "l-carmel": { add: ["shared_pool", "shelter", "beach_near", "pingpong", "ac"],
        details: { host_name: "אלון", photo_cats: ["general", "inside", "pool", "view"],
          sections: { location: "בכניסה לכפר האמנים עין הוד, עשר דקות מחוף דור.", vibe: "חצר ים־תיכונית עם פרגולה, ריח של תאנים ועצי זית.", area: "הגלריות בכפר, חוף דור והבונים, ומסלולי הכרמל." },
          included: ["שתייה קלה", "קפה ותה"], rules: ["מקבלים כלבים בתיאום (עד 2)", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("flex"), benefits: { reservists: 10 }, extra_child_price: 60,
          packages: [{ name: "לינה וארוחת בוקר בפרגולה", price: 85, per: "guest_night" }] }),
        rooms: { r1: { beds: 1, bathrooms: 1, size: 28, desc: "חדר זוגי עם מרפסת לחצר.", amenities: ["ac", "espresso"], photos: ["assets/img/photos/carmel-2.jpg"] },
          r2: { beds: 1, bathrooms: 1, size: 28, desc: "חדר זוגי עם חלון לעצי הזית.", amenities: ["ac"], photos: ["assets/img/photos/carmel-3.jpg"] },
          r3: { beds: 2, bathrooms: 1, size: 40, desc: "סוויטה עם פינת ישיבה ונוף לים.", amenities: ["ac", "smart_tv", "balcony"], photos: ["assets/img/photos/carmel-4.jpg"] },
          r4: { beds: 4, bathrooms: 2, size: 90, desc: "בית שלם עם שלושה חדרי שינה, מטבח וסלון.", amenities: ["kitchen", "ac", "smart_tv", "kids_room"], photos: ["assets/img/photos/carmel-1.jpg"] } } },
      "l-zayit": { add: ["romantic", "trails_near", "winery_near", "ac"],
        details: { host_name: "יואב", photo_cats: ["general", "pool", "inside", "view"], sections: { location: "ביישוב כליל, בלב חורש. הדרך האחרונה היא דרך עפר קצרה.", good: "חשמל סולארי. בימים מעוננים כדאי לחסוך במזגן." },
          rules: ["כלבים מתקבלים בברכה", "אין מסיבות"], included: ["ריבות של כליל", "קפה ותה"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("flex"), p2_weekday: 650, p2_weekend: 850, benefits: { reservists: 5, students: 5 } }) },
      "l-melach": { add: ["mamad", "jacuzzi_room", "romantic", "ac"],
        details: { host_name: "דנה ושי", photo_cats: ["general", "spa", "view", "inside", "food"], sections: { vibe: "שקט מדברי, זריחה מעל הרי מואב.", area: "מצדה (20 דק׳), עין בוקק, ומסלול נחל בוקק." } },
        terms: Object.assign({}, times, { couples_only: true, kids: "none", smoking: "no", cancel: tiers("mid"), benefits: { seniors: 10 },
          packages: [{ name: "לינה וארוחת בוקר מדברית", price: 70, per: "guest_night" }] }) },
      "l-shaked": { exclusive: true, add: ["romantic", "design", "jacuzzi_room"],
        details: { host_name: "אלון", ribbon: "עיסוי זוגי מתנה באמצע שבוע", photo_cats: ["general", "pool", "inside", "spa"] },
        terms: Object.assign({}, times, { couples_only: true, kids: "none", smoking: "no", cancel: tiers("mid"), min_weekend: 2 }) },
      "l-almog": { add: ["mamad", "ac", "smart_tv", "beach_near", "kids_pool"],
        details: { host_name: "דנה ושי", photo_cats: ["general", "pool", "inside", "view"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("strict"), extra_child_price: 100 }) },
      "l-gefen": { best_price: true, add: ["mamad", "snooker", "karaoke", "fenced_pool", "winery_near"],
        details: { host_name: "אלון", photo_cats: ["general", "pool", "inside", "view", "pool"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), min_weekend: 2, benefits: { reservists: 10, soldiers: 10 } }) },
      "l-arbel": { add: ["kosher"], details: { host_name: "הדס", photo_cats: ["general", "pool", "view", "pool"], sections: { location: "בכניסה למושב ארבל, על המדרון שמעל הכנרת.", vibe: "וילה ים־תיכונית לבנה, בריכה מוארת וריח של רוזמרין.", area: "שביל הארבל יוצא מהמושב (שעתיים הלוך וחזור). ממליצים על ארוחת בוקר בגינוסר ועל שקיעה בחוף צאלון." }, included: ["סל פירות בהגעה", "קפה ותה", "מגבות לבריכה"], rules: ["שקט אחרי 23:00", "אירועים בתיאום"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), min_weekend: 2, benefits: { reservists: 10 } }) },
      "l-ramon": { add: ["outdoor_shower"], details: { host_name: "עמית ורותם", photo_cats: ["general", "view", "pool", "view"], sections: { location: "בשכונת הווילות של מצפה רמון, חמש דקות נסיעה משפת המכתש.", vibe: "שקט מדברי, שמיים חשוכים ובריכה מוצלת.", area: "סיור כוכבים בלילה, רכיבת אופניים במכתש וקפה בחוות האלפקות. כדאי להזמין סיור ג׳יפים מראש." }, included: ["משקפת לתצפית כוכבים", "קפה ותה", "מים קרים במקרר"], rules: ["שומרים על החושך בלילה (אור עמום בחוץ)", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "no", cancel: tiers("flex"), benefits: { reservists: 10, students: 5 } }) },
      "l-baron": { details: { host_name: "אלון", photo_cats: ["general", "pool", "inside", "pool"], sections: { location: "בשכונה ותיקה של זכרון יעקב, שבע דקות הליכה למדרחוב.", area: "יקב כרמל, גני רמת הנדיב וחוף דור. בערב: מסעדות ברחוב המייסדים." }, included: ["בקבוק יין מקומי", "קפה ותה"], rules: ["שקט אחרי 23:00", "אין מסיבות"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), benefits: { reservists: 5 } }) },
      "l-dalton": { details: { host_name: "רונית ואבי", photo_cats: ["general", "inside", "pool", "pool"], sections: { location: "ברמת דלתון, בין כרמים, עם חניה צמודה.", vibe: "זכוכית, עץ ושקט של כרמים.", area: "יקבי דלתון (טעימות בתיאום), נחל עמוד ורובע האמנים בצפת." }, included: ["בקבוק יין מיקבי דלתון", "שוקולד בוטיק", "חלוקים"], rules: ["מגיל 16", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "age", kids_age: 16, smoking: "outside", cancel: tiers("mid"), benefits: { reservists: 5 }, packages: [{ name: "לינה וארוחת בוקר", price: 90, per: "guest_night" }] }) },
      "l-mevo": { exclusive: true, details: { host_name: "הדס", photo_cats: ["general", "inside", "view", "pool"], sections: { location: "בקצה המושב מבוא חמה, על שפת המצוק מעל הכנרת.", vibe: "זכוכית, אש ונוף פתוח. השקיעות כאן הן הסיבה להגיע.", area: "חמת גדר (15 דק׳), גמלא (25 דק׳) ומסעדות הדגים של עין גב." }, included: ["עצים לפינת האש", "קפה ותה", "מגבות לבריכה"], rules: ["אירועים בתיאום", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("strict"), min_weekend: 2, min_holiday: 3, benefits: { reservists: 10 } }) },
      "l-tzora": { details: { host_name: "נועה", photo_cats: ["general", "pool", "inside", "pool"], sections: { location: "בקיבוץ צרעה, מול כרמי עמק שורק.", area: "יקבי עמק שורק, מערת הנטיפים ופארק קנדה. לילדים: חוות תות שדה בעונה." }, included: ["ערכת ברכה לילדים", "קפה ותה"], rules: ["שומרים על אווירת שבת", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "no", cancel: tiers("flex"), benefits: { reservists: 5, evacuees: 10 } }) },
      "l-reef": { best_price: true, details: { host_name: "עמית ורותם", photo_cats: ["general", "inside", "pool", "pool"], sections: { location: "בשכונת הווילות של אילת, שלוש דקות מהחוף הדרומי.", area: "שמורת האלמוגים, המצפה התת־ימי ופארק תמנע. בקיץ ממליצים לצאת לטיולים לפני 10:00." }, included: ["ציוד שנירקול", "מגבות לחוף", "קפה ותה"], rules: ["שקט אחרי 23:00", "אין אירועים"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), benefits: { reservists: 10, soldiers: 10 } }) },
      "l-bustan": { details: { host_name: "יואב", photo_cats: ["general", "pool", "view", "pool"], sections: { location: "במושב אבירים, בסוף דרך שקטה בין בוסתנים.", area: "מבצר מונפור ונחל כזיב, אגם מונפורט במעלות וחוף אכזיב." }, included: ["פירות מהבוסתן בעונה", "קפה ותה"], rules: ["כלבים מתקבלים בתיאום", "שקט אחרי 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("flex"), benefits: { reservists: 5 } }) },
      "l-maayan": { details: { host_name: "עמית ורותם", photo_cats: ["general", "inside", "pool", "view"], sections: { location: "בקיבוץ עין גדי, שבע דקות משמורת נחל דוד.", vibe: "מדבר שקט, מים קרירים וצל של תמרים.", area: "נחל דוד ונחל ערוגות בבוקר, חוף עין גדי בצהריים, מצדה בזריחה." }, included: ["בקבוק מים קרים", "קפה ותה", "חלוקים"], rules: ["לזוגות בלבד", "שקט אחרי 22:00"] },
        terms: Object.assign({}, times, { kids: "none", couples_only: true, smoking: "no", cancel: tiers("mid"), benefits: { reservists: 10 } }) },
      "l-agur": { details: { host_name: "הדס", photo_cats: ["general", "pool", "view", "pool"], sections: { location: "ביסוד המעלה, דקה מאגמון החולה.", facilities: "בריכה גדולה מוארת, פינג פונג, קריוקי ופינת ישיבה ל־16.", area: "אגמון החולה (עגלות ואופניים), שמורת החולה וראש פינה." }, included: ["קפה, תה וחלב", "מגבות לבריכה"], rules: ["אירועים בתיאום מראש", "מוזיקה עד 23:00"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "outside", cancel: tiers("mid"), min_weekend: 2, benefits: { evacuees: 10 } }),
        noise: { level: "normal", party_ok: true, sources: [], allowed: ["music", "karaoke"], reasons: ["isolated"], note: "בית מבודד בקצה היישוב: מותר מוזיקה וקריוקי עד 23:00." } },
      "l-terraces": { add: ["synagogue_near", "mamad_host", "trails_near"],
        details: { host_name: "נועה", photo_cats: ["general", "pool", "view", "inside"], rules: ["שומרים על אווירת שבת במתחם", "אין מנגל בשבת"] },
        terms: Object.assign({}, times, { kids: "welcome", smoking: "no", cancel: tiers("flex"), benefits: { reservists: 5, students: 5 } }) }
    };
    listings.forEach((l) => {
      const m = MORE[l.id];
      if (!m) return;
      l.amenities = [...new Set([...(l.amenities || []), ...(m.add || [])])];
      l.details = m.details || {};
      l.terms = m.terms || {};
      l.exclusive = !!m.exclusive;
      l.best_price = !!m.best_price;
      if (m.noise) l.noise = m.noise;
      if (m.rooms) l.rooms = l.rooms.map((r) => Object.assign({}, r, m.rooms[r.id] || {}));
    });

    const reviews = [
      { id: "v1", listing_id: "l-basalt", name: "שירה ואלעד (דוגמה)", rating: 5, text: "הג׳קוזי מול החרמון בשקיעה שווה את כל הנסיעה. הסוויטה נקייה ושקטה, וארוחת הבוקר הגיעה בדיוק בזמן.", status: "approved", stay_month: "אוקטובר", created_at: stamp(300) },
      { id: "v2", listing_id: "l-basalt", name: "מורן (דוגמה)", rating: 5, text: "רונית ואבי מארחים מדהימים. הקמין והאבן נותנים תחושה של בית הרים אמיתי.", status: "approved", stay_month: "ספטמבר", created_at: stamp(900) },
      { id: "v3", listing_id: "l-basalt", name: "יובל (דוגמה)", rating: 4, text: "מקום יפה מאוד. היה קצת קר בלילה הראשון עד שהבנו איך מפעילים את החימום.", status: "approved", stay_month: "אוגוסט", created_at: stamp(1500) },
      { id: "v4", listing_id: "l-margalit", name: "משפחת כהן (דוגמה)", rating: 5, text: "חגגנו 60 לאבא עם שלוש משפחות. הבריכה המוארת בערב והנוף לכנרת היו בדיוק מה שרצינו.", status: "approved", stay_month: "יולי", created_at: stamp(600) },
      { id: "v5", listing_id: "l-margalit", name: "נוי (דוגמה)", rating: 4, text: "הווילה ענקית ומאובזרת. הדרך לשם חשוכה בלילה, כדאי להגיע לפני השקיעה.", status: "approved", stay_month: "יוני", created_at: stamp(1100) },
      { id: "v6", listing_id: "l-gefen", name: "טל (דוגמה)", rating: 5, text: "מדורת הגז ליד הבריכה, הפרגולה והשקט. הילדים לא רצו לצאת מהמים.", status: "approved", stay_month: "אוגוסט", created_at: stamp(700) },
      { id: "v7", listing_id: "l-melach", name: "עדי ורועי (דוגמה)", rating: 5, text: "הזריחה מהמרפסת והעיסוי בחדר. חופשה של יומיים שהרגישה כמו שבוע.", status: "approved", stay_month: "מרץ", created_at: stamp(400) },
      { id: "v8", listing_id: "l-melach", name: "הדס (דוגמה)", rating: 4, text: "מקום מפנק. ארוחת הבוקר המדברית הייתה מעולה.", status: "approved", stay_month: "פברואר", created_at: stamp(1300) },
      { id: "v9", listing_id: "l-zayit", name: "גלית (דוגמה)", rating: 5, text: "הגענו עם הכלב ועם שני ילדים, וכולם היו מאושרים. הבית מקסים והבריכה פרטית לגמרי.", status: "approved", stay_month: "מאי", created_at: stamp(500) },
      { id: "v10", listing_id: "l-carmel", name: "אורנה (דוגמה)", rating: 5, text: "הזמנו את כל המתחם לסוף שבוע משפחתי. ארוחות ארוכות בפרגולה והים במרחק נסיעה קצרה.", status: "approved", stay_month: "אפריל", created_at: stamp(800) },
      { id: "v11", listing_id: "l-glass", name: "רז (דוגמה)", rating: 5, text: "הבית מרהיב, וכל החלונות פתוחים לנוף. הבריכה המחוממת בנובמבר הייתה בדיוק בטמפרטורה הנכונה.", status: "pending", stay_month: "נובמבר", created_at: stamp(3) }
    ];

    const SC = (c, m, f, h, p, t, b, v) => ({ clean: c, maintain: m, facilities: f, host: h, privacy: p, treats: t, ...(b ? { breakfast: b } : {}), value: v });
    const extraReviews = [
      { id: "v12", listing_id: "l-basalt", name: "נטע (דוגמה)", rating: 5, text: "הגענו לשני לילות באמצע שבוע והיה שקט מוחלט. הקמין, הג׳קוזי והנוף בבוקר עם ערפל על החרמון.", status: "approved", stay_month: "ינואר", created_at: stamp(200) },
      { id: "v13", listing_id: "l-shaked", name: "ליאור (דוגמה)", rating: 5, text: "הזכוכית שנפתחת לבריכה זה משהו שלא ראינו בשום מקום. נקי ומעוצב, והמארחים דאגו לכל פרט.", status: "approved", stay_month: "דצמבר", created_at: stamp(150) },
      { id: "v14", listing_id: "l-carmel", name: "רותם (דוגמה)", rating: 4, text: "המתחם יפה והיחידות נוחות. החניה קצת צפופה כשכל המתחם מלא.", status: "approved", stay_month: "מאי", created_at: stamp(650) }
    ];
    reviews.push(...extraReviews);
    const META = {
      v1: ["השקיעה מהג׳קוזי", SC(5, 5, 5, 5, 5, 4, 5, 4)], v2: ["מרגיש כמו בית בהרים", SC(5, 5, 5, 5, 5, 5, 5, 5)], v3: ["יפה, קצת קר בלילה", SC(4, 4, 4, 5, 5, 4, 4, 4)],
      v4: ["חגגנו 60 לאבא", SC(5, 5, 5, 5, 4, 5, 0, 5)], v5: ["וילה ענקית ומאובזרת", SC(4, 4, 5, 4, 4, 4, 0, 4)], v6: ["הילדים לא רצו לצאת מהמים", SC(5, 5, 5, 5, 5, 5, 0, 5)],
      v7: ["יומיים שהרגישו כמו שבוע", SC(5, 5, 5, 5, 5, 5, 5, 5)], v8: ["פינוק מדברי", SC(5, 5, 5, 5, 5, 5, 5, 4)], v9: ["מושלם עם ילדים וכלב", SC(5, 4, 5, 5, 5, 4, 0, 5)],
      v10: ["סוף שבוע משפחתי", SC(5, 5, 5, 5, 4, 4, 5, 5)], v11: ["נוף שלא נגמר", SC(5, 5, 5, 5, 5, 4, 0, 4)], v12: ["שקט מוחלט באמצע שבוע", SC(5, 5, 5, 5, 5, 5, 5, 5)],
      v13: ["מעוצב ומפנק", SC(5, 5, 5, 5, 5, 5, 0, 4)], v14: ["יפה, חניה צפופה", SC(4, 4, 4, 5, 4, 4, 4, 4)]
    };
    reviews.forEach((r) => { const m = META[r.id]; if (m) { r.title = m[0]; r.scores = m[1]; } if (r.id === "v8") r.rating = 5; if (r.listing_id === "l-basalt" && r.id === "v1") r.unit_name = "סוויטת החרמון"; });

    /* מקומות באזור (לדוגמה). אתרי טבע ותיירות אמיתיים, מסעדות וספא מומצאים */
    const places = T.CURATED_PLACES.map((p) => Object.assign({}, p, { demo: true, created_at: stamp(300) }));

    const subscribers = [
      { id: "s-1", email: "maya@example.com", name: "מאיה (דוגמה)", regions: ["golan", "galil-elyon"], source: "site", created_at: stamp(48) },
      { id: "s-2", email: "dror@example.com", name: "", regions: [], source: "site", created_at: stamp(10) }
    ];

    const leads = [
      { id: "q-1", listing_id: "l-basalt", listing_name: "אבני בזלת", unit_id: "r1", unit_name: "סוויטת החרמון", name: "שירה (דוגמה)", phone: "050-0000001", email: "", check_in: d(9), check_out: d(11), guests: 2, extras: ["ארוחת בוקר גולנית לחדר"], coupon: "", est_total: 2220, message: "יום הולדת לבעלי, אפשר עוגה בחדר?", status: "new", source: "form", created_at: stamp(2), admin_note: "", demo: true },
      { id: "q-2", listing_id: "l-margalit", listing_name: "וילה מרגלית", name: "משפחת כהן (דוגמה)", phone: "050-0000002", email: "", check_in: d(23), check_out: d(25), guests: 12, extras: [], coupon: "TAMARA10", est_total: 8100, message: "שלוש משפחות עם 6 ילדים", status: "new", source: "form", created_at: stamp(7), admin_note: "", demo: true },
      { id: "q-3", listing_id: "l-carmel", listing_name: "אחוזת הכרמל", unit_id: "r4", unit_name: "הבית הגדול", name: "צוות פיתוח (דוגמה)", phone: "050-0000003", email: "", check_in: d(30), check_out: d(31), guests: 6, extras: ["עריכת שולחן לאירוע"], coupon: "", est_total: 2090, message: "יום גיבוש", status: "in_progress", source: "form", created_at: stamp(30), admin_note: "נשלחה הצעה מהמארח", demo: true },
      { id: "q-4", listing_id: "l-gefen", listing_name: "וילת הגפן", name: "אורי (דוגמה)", phone: "050-0000004", email: "", check_in: d(-9), check_out: d(-7), guests: 10, extras: [], coupon: "", est_total: 6800, message: "", status: "closed", source: "form", created_at: stamp(400), admin_note: "", review_token: "demoreview1", demo: true },
      { id: "q-5", listing_id: "l-glass", listing_name: "בית הזכוכית", name: "טל (דוגמה)", phone: "050-0000005", email: "", check_in: d(14), check_out: d(16), guests: 8, extras: [], coupon: "", est_total: 4800, message: "יש מקום לחנות 4 רכבים?", status: "in_progress", source: "form", created_at: stamp(50), admin_note: "", demo: true },
      { id: "q-6", listing_id: "l-terraces", listing_name: "וילת הטרסות", name: "מיכאל (דוגמה)", phone: "050-0000006", email: "", check_in: d(5), check_out: d(6), guests: 6, extras: [], coupon: "", est_total: 3300, message: "שבת חתן, צריך מקום לסעודה", status: "new", source: "form", created_at: stamp(20), admin_note: "", demo: true },
      { id: "q-7", listing_id: null, listing_name: "פנייה כללית", name: "אביטל (דוגמה)", phone: "050-0000007", email: "", check_in: d(16), check_out: d(18), guests: 2, children: 0, extras: [], coupon: "", est_total: 0, message: "מחפשים משהו רומנטי עם ג׳קוזי וארוחת בוקר", status: "new", source: "contact", flexible: true, meta: { place: "area:north", place_label: "כל הצפון", budget: 1200, wants: ["ג׳קוזי ספא", "ארוחת בוקר", "מבודד ושקט"] }, created_at: stamp(4), admin_note: "", demo: true },
      { id: "q-8", listing_id: "l-almog", listing_name: "וילה אלמוג", name: "אורח (דוגמה)", phone: "050-0000008", email: "", guests: 1, extras: [], coupon: "", est_total: 0, message: "בתמונות רואים מרפסת גג, אבל לפי התיאור יש רק 3 חדרי רחצה ולא 4.", status: "new", source: "report", created_at: stamp(12), admin_note: "", demo: true }
    ];

    const applications = [
      { id: "j-1", name: "גלעד (דוגמה)", phone: "050-0000011", email: "gilad@example.com", business: "בקתות התבור", settlement: "כפר קיש", region: "kinneret", type: "cabin", units: 3, message: "שלוש בקתות עם ג׳קוזי, רוצים חבילת מומלץ", status: "new", created_at: stamp(5), demo: true },
      { id: "j-2", name: "רחל (דוגמה)", phone: "050-0000012", email: "rachel@example.com", business: "נוף המכתש", settlement: "מצפה רמון", region: "negev", type: "zimmer", units: 2, message: "", status: "new", created_at: stamp(26), demo: true }
    ];

    const articles = [
      { id: "m-couples", title: "איך בוחרים צימר לזוג: שבעה דברים לבדוק לפני שמזמינים", excerpt: "ג׳קוזי בחדר או בחוץ, כמה לילות מינימום, ומה באמת כלול בארוחת הבוקר. רשימה קצרה שחוסכת אכזבות.", cover: "assets/img/photos/basalt-2.jpg", published: true, created_at: stamp(200), demo: true,
        body: "## איפה הג׳קוזי\nג׳קוזי בתוך החדר מתאים לחורף, ג׳קוזי במרפסת מתאים לאביב ולקיץ. כדאי לשאול אם הוא מחומם ואם הוא פרטי לגמרי.\n\n## מה כוללת ארוחת הבוקר\nיש מקומות שמגישים לחדר, ויש שמגישים בחדר אוכל משותף. אם חשוב לכם לאכול בפרטיות, שאלו מראש.\n\n## מינימום לילות ומחיר סופ״ש\nבסופי שבוע רוב המתחמים דורשים שני לילות. באמצע שבוע אפשר למצוא את אותו צימר בשלושים אחוז פחות.\n\n## כמה רחוק מהשכנים\nבתמונות כל צימר נראה מבודד. בקשו מהמארחים לספר כמה יחידות יש במתחם ומה המרחק ביניהן.\n\n## חניה וגישה\nבצפון ובגולן חלק מהדרכים צרות וחשוכות. כדאי להגיע לפני השקיעה בפעם הראשונה.\n\n## מדיניות ביטול\nשאלו מה קורה אם צריך לבטל או לדחות, ובקשו את זה בכתב בוואטסאפ.\n\n## תוספות\nעיסוי זוגי, יין או עוגה ליום הולדת. הרבה מארחים מארגנים את זה בשמחה אם מבקשים מראש." },
      { id: "m-hanukkah", title: "חנוכה בצפון: מתחמים עם בריכה מחוממת וקמין", excerpt: "שמונה לילות של חופש מהלימודים, גשם בחוץ וחמים בפנים. מה כדאי לבדוק כשמזמינים לחג.", cover: "assets/img/photos/gefen-3.jpg", published: true, created_at: stamp(90), demo: true,
        body: "## מזמינים מוקדם\nלילות החג מתמלאים מהר, ובהרבה מתחמים יש מחיר חג מיוחד. באתר רואים את המחיר הכולל לפני ששולחים בקשה.\n\n## בריכה מחוממת היא לא תמיד חמה\nבקשו מהמארחים את טמפרטורת המים בפועל, ובדקו אם החימום כלול או בתוספת תשלום.\n\n## קמין ועצים\nשאלו אם העצים כלולים. בחלק מהמקומות מקבלים ערימה ראשונה ומשלמים על נוספת.\n\n## יום גשום עם ילדים\nחפשו מתחמים עם מתקנים לילדים או חדר משחקים, ותכננו יציאה אחת קצרה לבית קפה או למוזיאון באזור." },
      { id: "m-golan-water", regions: ["golan", "galil-elyon"], title: "חמישה מסלולי מים בצפון שאפשר לעשות גם עם ילדים", excerpt: "בניאס, תל דן, נחל עמוד ועוד: מסלולים קצרים עם מים זורמים, צל ונקודות טבילה, ומה כדאי לדעת לפני שיוצאים.", cover: "assets/img/photos/gefen-2.jpg", published: true, created_at: stamp(500),
        body: "## שמורת נחל חרמון (בניאס)\nהמסלול הקצר יורד למפל הבניאס על שביל נוח עם גשרונים. שעה עד שעה וחצי, ומתאים לעגלות ברוב הקטעים.\n\n## תל דן\nיער צל ומים קרים כל השנה. יש מסלול נגיש קצר ומסלול ארוך יותר עד השער הכנעני. בקיץ כדאי להגיע מוקדם.\n\n## נחל עמוד\nמהחניון של עין יקים יורדים לנחל ולטחנות הקמח. שבילים מסומנים, וגבים קטנים לטבילת רגליים.\n\n## טיפ\nבחורף ובאביב המים חזקים יותר. בודקים באתר רשות הטבע והגנים אם המסלול פתוח לפני שיוצאים." },
      { id: "m-ramon-night", regions: ["negev"], title: "לילה במכתש: איך לראות כוכבים כמו שצריך", excerpt: "מצפה רמון היא אחד המקומות החשוכים בארץ. מתי להגיע, מה להביא ואיפה לעמוד כדי לראות את שביל החלב.", cover: "assets/img/photos/ramon-2.jpg", published: true, created_at: stamp(650),
        body: "## מתי להגיע\nבלילות בלי ירח (סביב מולד הירח) רואים הכי הרבה. בקיץ שביל החלב בולט במיוחד אחרי 22:00.\n\n## מה להביא\nשכבה חמה גם בקיץ, פנס עם אור אדום, וכיסא מתקפל. המדבר מתקרר מהר אחרי השקיעה.\n\n## איפה לעמוד\nשפת המכתש ליד מרכז המבקרים, או אחת מנקודות התצפית שבצד הדרך. מכבים אורות ונותנים לעיניים רבע שעה להתרגל.\n\n## סיור מודרך\nכמה מפעילים במצפה רמון מציעים סיורי כוכבים עם טלסקופ. כדאי להזמין מראש בסופי שבוע." },
      { id: "m-deadsea-sunrise", regions: ["dead-sea"], title: "זריחה במצדה וטבילה בים המלח: תוכנית לבוקר אחד", excerpt: "עולים בשביל הנחש לפני הזריחה, יורדים לארוחת בוקר, ומסיימים בציפה במים. כל מה שצריך לדעת.", cover: "assets/img/photos/maayan-3.jpg", published: true, created_at: stamp(820),
        body: "## לפני הזריחה\nשביל הנחש נפתח לפני הזריחה. העלייה לוקחת כ־45 דקות עד שעה. מביאים מים ופנס.\n\n## למעלה\nהזריחה מעל הרי מואב היא הרגע של הבוקר. אחר כך מסתובבים בארמונות הורדוס ובמחסנים לפני שמתחמם.\n\n## ירידה וטבילה\nיורדים ברכבל או בשביל, ונוסעים רבע שעה לחוף עין בוקק. נכנסים למים בזהירות, בלי לטבול את הפנים.\n\n## טיפ\nבקיץ מתחילים מוקדם ככל האפשר, וחוזרים למקום הלינה לפני 11:00." },
    ];

    const stats = {};
    listings.forEach((l, k) => {
      stats[l.id] = {};
      for (let i = 0; i < 30; i++) {
        const day = d(-i);
        const seed = (k + 3) * 31 + i * 7;
        stats[l.id][day] = { v: 18 + (seed % 47) + (l.featured ? 20 : 0), p: seed % 4, w: (seed >> 2) % 5 };
      }
    });

    const settings = T.clone(T.DEFAULT_SETTINGS);
    settings.coupons = [{ code: "TAMARA10", pct: 10, until: `${today.getFullYear() + 1}-06-30`, note: "הנחת השקה לאתר", active: true }];
    settings.collections = [
      { id: "c-insta", title: "אהובי האינסטגרם", sub: "המקומות שהכי מצטלמים אצלנו", ids: ["l-glass", "l-shaked", "l-melach", "l-gefen"] },
      { id: "c-honeymoon", title: "לירח דבש", sub: "פרטיות, ג׳קוזי ושקט", ids: ["l-basalt", "l-melach", "l-shaked"] }
    ];

    return { listings, advertisers, leads, applications, reviews, articles, places, subscribers, stats, settings, seeded_at: new Date().toISOString(), version: 4 };
  };
})();
