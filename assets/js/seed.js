/* תמרה – נתוני הדגמה (רק במצב הדגמה; באתר המחובר מתחילים נקי) */
(function () {
  "use strict";
  const T = window.Tamara;
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
        amenities: ["jacuzzi", "fireplace", "view", "secluded", "breakfast", "spa", "wifi", "parking"], audience: ["couples", "families"], photos: ph("basalt", 4), created_at: stamp(900) }),
      L({ id: "l-glass", name: "בית הזכוכית", type: "villa", region: "galil-elyon", settlement: "ראש פינה", lat: 32.969, lng: 35.543, owner_id: "a-levi",
        tagline: "וילה עם קירות זכוכית ובריכה מחוממת מעל עמק החולה",
        description: "סלון פתוח עם חלונות מהרצפה לתקרה, מטבח שף ושלושה חדרי שינה עם חדרי רחצה צמודים. הבריכה מחוממת מנובמבר עד אפריל, ומהמרפסת רואים את העמק עד החרמון.\n\nחמש דקות הליכה למדרחוב ראש פינה העתיקה.",
        guests_max: 8, bedrooms: 3, bathrooms: 3, min_nights: 2, price_weekday: 2400, price_weekend: 3200, price_holiday: 3600, guests_base: 6, extra_guest_price: 180,
        sponsored_until: d(20), seasons: [{ label: "קיץ", from: `${y}-07-01`, to: `${y}-08-31`, pct: 20 }],
        extras: [{ name: "ארוחת בוקר בהגשה", price: 95, per: "guest" }, { name: "צ׳ק-אאוט מאוחר (16:00)", price: 400, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "view", "kitchen", "bbq", "garden", "wifi", "parking"], audience: ["families", "groups"], photos: ph("glass", 4), blocked_dates: weekends([2]), created_at: stamp(120) }),
      L({ id: "l-margalit", name: "וילה מרגלית", type: "villa", region: "kinneret", settlement: "מגדל", lat: 32.838, lng: 35.5, owner_id: "a-kineret",
        tagline: "וילה לקבוצות עם בריכה ענקית ונוף לכנרת",
        description: "חמישה חדרי שינה, סלון גדול שנפתח לבריכה ופינת ישיבה ל־20 סביב מזרקה. בערב הבריכה מוארת, ומכל קומה רואים את הכנרת.\n\nמתאימה לאירועים משפחתיים קטנים, ימי הולדת עגולים וסופי שבוע של חברים.",
        guests_max: 14, bedrooms: 5, bathrooms: 3, min_nights: 2, price_weekday: 3800, price_weekend: 5200, price_holiday: 5900, guests_base: 12, extra_guest_price: 150, featured: true,
        extras: [{ name: "שף פרטי לארוחת ערב", price: 180, per: "guest" }, { name: "ניקיון ביניים", price: 350, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "view", "kitchen", "bbq", "kids", "events", "wifi", "parking"], audience: ["families", "groups"], photos: ph("margalit", 5), blocked_dates: weekends([0, 2]), created_at: stamp(700) }),
      L({ id: "l-carmel", name: "אחוזת הכרמל", type: "compound", region: "carmel", settlement: "עין הוד", lat: 32.7, lng: 34.982, owner_id: "a-north",
        tagline: "ארבע יחידות סביב בריכה, עשר דקות מהים",
        description: "מתחם לבן בסגנון ים־תיכוני עם ארבע יחידות נפרדות, בריכה משותפת וחצר עם פרגולה לארוחות ארוכות. אפשר להזמין יחידה אחת לזוג, או את כל המתחם למשפחה מורחבת.\n\nבבוקר הולכים ברגל לגלריות בכפר האמנים, אחר הצהריים נוסעים לחוף.",
        guests_max: 13, bedrooms: 6, bathrooms: 5, units: 4, min_nights: 1, price_weekday: 690, price_weekend: 880, guests_base: 2, extra_guest_price: 120,
        rooms: [R("r1", "חדר הגפן", 2, 690, 880), R("r2", "חדר הזית", 2, 690, 880, { blocked_dates: weekends([0]) }), R("r3", "סוויטת הים", 3, 890, 1090, { guests_base: 2 }), R("r4", "הבית הגדול", 6, 1490, 1890, { bedrooms: 3, guests_base: 4, blocked_dates: weekends([1]) })],
        extras: [{ name: "ארוחת בוקר בפרגולה", price: 85, per: "guest" }, { name: "עריכת שולחן לאירוע", price: 600, per: "stay" }],
        amenities: ["private_pool", "kitchen", "bbq", "garden", "events", "view", "pets", "kids", "wifi", "parking"], audience: ["groups", "families", "couples"], photos: ph("carmel", 4), created_at: stamp(260) }),
      L({ id: "l-zayit", name: "בית הזית", type: "zimmer", region: "galil-maaravi", settlement: "כליל", lat: 32.982, lng: 35.196, owner_id: "a-galil",
        tagline: "בית עץ לבן עם מרפסת, בריכה וגינה טרופית",
        description: "בית עץ בשתי קומות עם מרפסת מקורה לכל אורכו, בריכה פרטית וגינה עם עצי דקל. החשמל סולארי והשקט אמיתי.\n\nמתאים לזוג עם שני ילדים, והכלב מוזמן גם הוא.",
        guests_max: 4, bedrooms: 2, bathrooms: 1, min_nights: 2, price_weekday: 720, price_weekend: 920, guests_base: 2, extra_guest_price: 120,
        deal_label: "אמצע שבוע", deal_text: "לילה שלישי בחצי מחיר בימים א׳–ד׳",
        amenities: ["private_pool", "garden", "kitchen", "bbq", "pets", "secluded", "wifi", "parking"], audience: ["couples", "families"], photos: ph("zayit", 4), blocked_dates: weekends([1]), created_at: stamp(600) }),
      L({ id: "l-melach", name: "מלח הארץ", type: "suite", region: "dead-sea", settlement: "נווה זוהר", lat: 31.153, lng: 35.362, owner_id: "a-south",
        tagline: "סוויטות מדבר עם טיפולי ספא ובריכה לזריחה",
        description: "סוויטות מרווחות עם ג׳קוזי ומרפסת לזריחה מעל הרי מואב. מטפלת מגיעה לחדר בתיאום מראש, ובבוקר מגישים ארוחה מדברית.",
        guests_max: 2, bedrooms: 1, bathrooms: 1, units: 2, min_nights: 1, price_weekday: 1100, price_weekend: 1450, price_holiday: 1690, lastminute_pct: 20, featured: true,
        rooms: [R("r1", "סוויטת הזריחה", 2, 1100, 1450), R("r2", "סוויטת המלח", 2, 1180, 1520, { blocked_dates: weekends([0]) })],
        extras: [{ name: "טיפול ספא זוגי", price: 590, per: "stay" }, { name: "ארוחת בוקר מדברית", price: 140, per: "night" }],
        amenities: ["jacuzzi", "view", "spa", "breakfast", "private_pool", "accessible", "wifi", "parking"], audience: ["couples"], photos: ph("melach", 5), created_at: stamp(500) }),
      L({ id: "l-shaked", name: "סוויטת השקד", type: "suite", region: "galil-maaravi", settlement: "הרדוף", lat: 32.76, lng: 35.171, owner_id: "a-north",
        tagline: "בית בריכה מזכוכית עם מטבח חוץ",
        description: "סוויטה עם קירות זכוכית שנפתחים לבריכה, מטבח חוץ מלא ופינת אוכל מקורה. בלילה סוגרים את הזכוכית ומדליקים את הקמין.",
        guests_max: 2, bedrooms: 1, bathrooms: 1, min_nights: 1, price_weekday: 890, price_weekend: 1150, price_holiday: 1350,
        deal_label: "מבצע חורף", deal_text: "עיסוי זוגי מתנה בהזמנה של לילה באמצע שבוע",
        extras: [{ name: "ארוחת שף בבית", price: 650, per: "stay" }],
        amenities: ["private_pool", "heated_pool", "jacuzzi", "fireplace", "kitchen", "bbq", "spa", "wifi"], audience: ["couples"], photos: ph("shaked", 4), created_at: stamp(60) }),
      L({ id: "l-almog", name: "וילה אלמוג", type: "villa", region: "eilat", settlement: "אילת", lat: 29.565, lng: 34.947, owner_id: "a-south",
        tagline: "וילה לבנה עם בריכה ומרפסת גג, עשר דקות מהחוף",
        description: "ארבעה חדרי שינה, בריכה פרטית עם מפל מים ומרפסת גג עם נוף להרי אדום. מטבח מלא, חניה לשני רכבים ונסיעה קצרה לשמורת האלמוגים.",
        guests_max: 10, bedrooms: 4, bathrooms: 3, min_nights: 3, price_weekday: 3200, price_weekend: 4100, price_holiday: 4600, guests_base: 8, extra_guest_price: 150,
        seasons: [{ label: "עונת חורף", from: `${today.getFullYear()}-12-15`, to: `${today.getFullYear() + 1}-02-28`, pct: 15 }],
        amenities: ["private_pool", "heated_pool", "kitchen", "bbq", "kids", "view", "wifi", "parking"], audience: ["families", "groups"], photos: ph("almog", 4), created_at: stamp(450) }),
      L({ id: "l-gefen", name: "וילת הגפן", type: "villa", region: "golan", settlement: "אניעם", lat: 32.958, lng: 35.746, owner_id: "a-north",
        tagline: "וילת יוקרה עם בריכה, מדורת גז ופרגולה",
        description: "ארבעה חדרי שינה, סלון בגובה כפול עם וילונות פשתן, בריכה עם מיטות שיזוף בתוך המים ומדורת גז לאורך המים. בחצר פרגולה עם שולחן ל־12.\n\nמתאימה לשלוש משפחות או לחגיגת יום הולדת.",
        guests_max: 12, bedrooms: 4, bathrooms: 3, min_nights: 2, price_weekday: 3400, price_weekend: 4600, price_holiday: 5200, guests_base: 10, extra_guest_price: 160, featured: true,
        extras: [{ name: "חימום בריכה בחורף", price: 450, per: "night" }, { name: "שף פרטי", price: 190, per: "guest" }],
        amenities: ["private_pool", "heated_pool", "jacuzzi", "bbq", "kitchen", "kids", "view", "events", "wifi", "parking"], audience: ["groups", "families"], photos: ph("gefen", 5), blocked_dates: weekends([1, 2]), created_at: stamp(800),
        pending: { tagline: "וילת יוקרה עם בריכה, מדורה וחדר קולנוע", description: "ארבעה חדרי שינה, סלון בגובה כפול, חדר קולנוע חדש עם מקרן ומושבים ל־10, ובריכה עם מיטות שיזוף בתוך המים.\n\nמתאימה לשלוש משפחות או לחגיגת יום הולדת.", _at: stamp(5) } }),
      L({ id: "l-terraces", name: "וילת הטרסות", type: "villa", region: "jerusalem", settlement: "נס הרים", lat: 31.752, lng: 35.061, owner_id: "a-hills",
        tagline: "וילה כשרה עם בריכה ופרגולה מול נחל שורק",
        description: "וילה על שלוש טרסות עם בריכה, פרגולה מוצלת ופינת ישיבה מול הנחל. כשרה, עם פלטה ומיחם לשבת.",
        guests_max: 8, bedrooms: 3, bathrooms: 2, min_nights: 1, price_weekday: 2600, price_weekend: 3300, price_holiday: 3900, guests_base: 6, extra_guest_price: 140,
        amenities: ["private_pool", "kosher", "shabbat", "view", "kitchen", "garden", "wifi", "parking"], audience: ["families", "groups"], photos: ph("terraces", 4), created_at: stamp(40) })
    ];

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

    const leads = [
      { id: "q-1", listing_id: "l-basalt", listing_name: "אבני בזלת", unit_id: "r1", unit_name: "סוויטת החרמון", name: "שירה (דוגמה)", phone: "050-0000001", email: "", check_in: d(9), check_out: d(11), guests: 2, extras: ["ארוחת בוקר גולנית לחדר"], coupon: "", est_total: 2220, message: "יום הולדת לבעלי, אפשר עוגה בחדר?", status: "new", source: "form", created_at: stamp(2), admin_note: "", demo: true },
      { id: "q-2", listing_id: "l-margalit", listing_name: "וילה מרגלית", name: "משפחת כהן (דוגמה)", phone: "050-0000002", email: "", check_in: d(23), check_out: d(25), guests: 12, extras: [], coupon: "TAMARA10", est_total: 8100, message: "שלוש משפחות עם 6 ילדים", status: "new", source: "form", created_at: stamp(7), admin_note: "", demo: true },
      { id: "q-3", listing_id: "l-carmel", listing_name: "אחוזת הכרמל", unit_id: "r4", unit_name: "הבית הגדול", name: "צוות פיתוח (דוגמה)", phone: "050-0000003", email: "", check_in: d(30), check_out: d(31), guests: 6, extras: ["עריכת שולחן לאירוע"], coupon: "", est_total: 2090, message: "יום גיבוש", status: "in_progress", source: "form", created_at: stamp(30), admin_note: "נשלחה הצעה מהמארח", demo: true },
      { id: "q-4", listing_id: "l-gefen", listing_name: "וילת הגפן", name: "אורי (דוגמה)", phone: "050-0000004", email: "", check_in: d(-9), check_out: d(-7), guests: 10, extras: [], coupon: "", est_total: 6800, message: "", status: "closed", source: "form", created_at: stamp(400), admin_note: "", review_token: "demoreview1", demo: true },
      { id: "q-5", listing_id: "l-glass", listing_name: "בית הזכוכית", name: "טל (דוגמה)", phone: "050-0000005", email: "", check_in: d(14), check_out: d(16), guests: 8, extras: [], coupon: "", est_total: 4800, message: "יש מקום לחנות 4 רכבים?", status: "in_progress", source: "form", created_at: stamp(50), admin_note: "", demo: true },
      { id: "q-6", listing_id: "l-terraces", listing_name: "וילת הטרסות", name: "מיכאל (דוגמה)", phone: "050-0000006", email: "", check_in: d(5), check_out: d(6), guests: 6, extras: [], coupon: "", est_total: 3300, message: "שבת חתן, צריך מקום לסעודה", status: "new", source: "form", created_at: stamp(20), admin_note: "", demo: true }
    ];

    const applications = [
      { id: "j-1", name: "גלעד (דוגמה)", phone: "050-0000011", email: "gilad@example.com", business: "בקתות התבור", settlement: "כפר קיש", region: "kinneret", type: "cabin", units: 3, message: "שלוש בקתות עם ג׳קוזי, רוצים חבילת מומלץ", status: "new", created_at: stamp(5), demo: true },
      { id: "j-2", name: "רחל (דוגמה)", phone: "050-0000012", email: "rachel@example.com", business: "נוף המכתש", settlement: "מצפה רמון", region: "negev", type: "zimmer", units: 2, message: "", status: "new", created_at: stamp(26), demo: true }
    ];

    const articles = [
      { id: "m-couples", title: "איך בוחרים צימר לזוג: שבעה דברים לבדוק לפני שמזמינים", excerpt: "ג׳קוזי בחדר או בחוץ, כמה לילות מינימום, ומה באמת כלול בארוחת הבוקר. רשימה קצרה שחוסכת אכזבות.", cover: "assets/img/photos/basalt-2.jpg", published: true, created_at: stamp(200), demo: true,
        body: "## איפה הג׳קוזי\nג׳קוזי בתוך החדר מתאים לחורף, ג׳קוזי במרפסת מתאים לאביב ולקיץ. כדאי לשאול אם הוא מחומם ואם הוא פרטי לגמרי.\n\n## מה כוללת ארוחת הבוקר\nיש מקומות שמגישים לחדר, ויש שמגישים בחדר אוכל משותף. אם חשוב לכם לאכול בפרטיות, שאלו מראש.\n\n## מינימום לילות ומחיר סופ״ש\nבסופי שבוע רוב המתחמים דורשים שני לילות. באמצע שבוע אפשר למצוא את אותו צימר בשלושים אחוז פחות.\n\n## כמה רחוק מהשכנים\nבתמונות כל צימר נראה מבודד. בקשו מהמארחים לספר כמה יחידות יש במתחם ומה המרחק ביניהן.\n\n## חניה וגישה\nבצפון ובגולן חלק מהדרכים צרות וחשוכות. כדאי להגיע לפני השקיעה בפעם הראשונה.\n\n## מדיניות ביטול\nשאלו מה קורה אם צריך לבטל או לדחות, ובקשו את זה בכתב בוואטסאפ.\n\n## תוספות\nעיסוי זוגי, יין או עוגה ליום הולדת. הרבה מארחים מארגנים את זה בשמחה אם מבקשים מראש." },
      { id: "m-hanukkah", title: "חנוכה בצפון: מתחמים עם בריכה מחוממת וקמין", excerpt: "שמונה לילות של חופש מהלימודים, גשם בחוץ וחמים בפנים. מה כדאי לבדוק כשמזמינים לחג.", cover: "assets/img/photos/gefen-3.jpg", published: true, created_at: stamp(90), demo: true,
        body: "## מזמינים מוקדם\nלילות החג מתמלאים מהר, ובהרבה מתחמים יש מחיר חג מיוחד. באתר רואים את המחיר הכולל לפני ששולחים בקשה.\n\n## בריכה מחוממת היא לא תמיד חמה\nבקשו מהמארחים את טמפרטורת המים בפועל, ובדקו אם החימום כלול או בתוספת תשלום.\n\n## קמין ועצים\nשאלו אם העצים כלולים. בחלק מהמקומות מקבלים ערימה ראשונה ומשלמים על נוספת.\n\n## יום גשום עם ילדים\nחפשו מתחמים עם מתקנים לילדים או חדר משחקים, ותכננו יציאה אחת קצרה לבית קפה או למוזיאון באזור." }
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

    return { listings, advertisers, leads, applications, reviews, articles, stats, settings, seeded_at: new Date().toISOString(), version: 2 };
  };
})();
