/* תמונות חופשיות למקומות ב"מה עושים באזור"
 * בזמן הבנייה: לכל מקום בלי תמונה משלו מחפשים את התמונה הראשית של הערך שלו בוויקיפדיה,
 * לוקחים רק קבצים מוויקישיתוף ברישיון חופשי (CC0 / נחלת הכלל / CC BY / CC BY-SA),
 * שומרים עותק באתר (assets/places) ומחזירים קרדיט לצלם ולרישיון, כמו שהרישיון דורש.
 * כל תקלה כאן לא עוצרת את הבנייה: מקום בלי תמונה פשוט נשאר עם האיור. */
import fs from "node:fs";
import path from "node:path";

/* כותרות ערכים לכל מקום מהרשימה המוכנה (עברית קודם, אנגלית כגיבוי) */
const TITLES = {
  "pl-banias": ["שמורת נחל חרמון", "מפל הבניאס", "Banias"],
  "pl-meshushim": ["בריכת המשושים", "Hexagon Pool"],
  "pl-bental": ["הר בנטל", "Mount Bental"],
  "pl-hermon": ["הר החרמון", "Mount Hermon"],
  "pl-katzrin": ["קצרין העתיקה", "פארק קצרין העתיקה", "Ancient Qatzrin Park", "Qatzrin Ancient Village"],
  "pl-nimrod": ["מבצר נמרוד", "Nimrod Fortress"],
  "pl-gamla": ["גמלא", "שמורת גמלא", "מפל גמלא", "Gamla", "Gamla Nature Reserve"],
  "pl-golan-winery": ["יקבי רמת הגולן", "Golan Heights Winery", "Golan Heights wine"],
  "pl-gadot": ["מצפה גדות", "גדות"],
  "pl-tanur": ["מפל התנור", "נחל עיון", "Ayun Stream"],
  "pl-tel-dan": ["שמורת תל דן", "תל דן", "Tel Dan"],
  "pl-hula-reserve": ["שמורת החולה", "Hula Nature Reserve"],
  "pl-agamon": ["אגמון החולה", "Agamon Hula"],
  "pl-safed": ["העיר העתיקה של צפת", "צפת", "Safed"],
  "pl-rosh-pina": ["ראש פינה", "ראש פינה (מושבה)", "Rosh Pinna", "Rosh Pina"],
  "pl-meron": ["הר מירון", "Mount Meron"],
  "pl-amud": ["נחל עמוד", "Nahal Amud"],
  "pl-dalton": ["Dalton, Israel", "רמת דלתון"],
  "pl-hanikra": ["נקרות ראש הנקרה", "ראש הנקרה", "Rosh HaNikra grottoes"],
  "pl-akko": ["העיר העתיקה של עכו", "Old City of Acre", "Acre, Israel"],
  "pl-montfort": ["מבצר מונפור", "Montfort Castle"],
  "pl-achziv": ["גן לאומי אכזיב", "אכזיב", "Achziv"],
  "pl-goren": ["פארק גורן", "Goren Park"],
  "pl-montfort-lake": ["אגם מונפורט", "Montfort Lake"],
  "pl-yehiam": ["מבצר יחיעם", "Yehiam Fortress"],
  "pl-hamat-gader": ["חמת גדר", "Hamat Gader"],
  "pl-capernaum": ["כפר נחום", "Capernaum"],
  "pl-yardenit": ["ירדנית", "Yardenit"],
  "pl-jordan-park": ["פארק הירדן", "Jordan River Park"],
  "pl-arbel": ["הר ארבל", "Mount Arbel"],
  "pl-tiberias-springs": ["חמי טבריה", "Hamat Tiberias"],
  "pl-kursi": ["כורסי", "Kursi, Golan Heights"],
  "pl-ginosar-boat": ["הסירה מגינוסר", "Ancient Galilee Boat"],
  "pl-zichron": ["זכרון יעקב", "Zikhron Ya'akov"],
  "pl-carmel-winery": ["יקבי כרמל", "Carmel Winery", "Carmel Wine"],
  "pl-ramat-hanadiv": ["רמת הנדיב", "Ramat HaNadiv"],
  "pl-ein-hod": ["עין הוד", "עין הוד (כפר אמנים)", "Ein Hod", "Ein Hod artists' village", "Janco Dada Museum"],
  "pl-nahal-mearot": ["שמורת נחל מערות", "Nahal Me'arot Nature Reserve"],
  "pl-muhraka": ["המוחרקה", "מנזר המוחרקה", "Muhraka", "Muhraqa", "El-Muhraqa"],
  "pl-bahai": ["הגנים הבהאיים", "המקדש הבהאי", "Terraces of the Baháʼí Faith"],
  "pl-dor-habonim": ["שמורת חוף דור הבונים", "חוף דור הבונים", "Dor HaBonim Beach Nature Reserve", "Dor Habonim Beach", "Tel Dor"],
  "pl-soreq": ["מערת הנטיפים", "Avshalom Cave"],
  "pl-ein-karem": ["עין כרם", "Ein Karem"],
  "pl-ein-hania": ["עין חנייה", "עין חניה", "Ein Hanya", "Ein Haniya", "Ein Hanya spring"],
  "pl-sataf": ["סטף", "Sataf"],
  "pl-old-city": ["העיר העתיקה (ירושלים)", "העיר העתיקה של ירושלים", "Old City (Jerusalem)"],
  "pl-city-of-david": ["עיר דוד", "City of David"],
  "pl-canada-park": ["פארק קנדה", "Canada Park"],
  "pl-tzora-wine": ["יקב צרעה", "צרעה", "Tzora Vineyards"],
  "pl-masada": ["מצדה", "Masada"],
  "pl-ein-gedi": ["שמורת עין גדי", "עין גדי", "Ein Gedi"],
  "pl-arugot": ["נחל ערוגות", "Nahal Arugot"],
  "pl-qumran": ["גן לאומי קומראן", "קומראן", "Qumran"],
  "pl-ein-bokek": ["עין בוקק", "Ein Bokek"],
  "pl-einot-tzukim": ["עינות צוקים", "Einot Tzukim"],
  "pl-sodom": ["הר סדום", "Mount Sodom"],
  "pl-ramon-visitor": ["מכתש רמון", "Makhtesh Ramon"],
  "pl-ein-avdat": ["עין עבדת", "גן לאומי עין עבדת", "Ein Avdat", "Ein Avdat National Park", "Nahal Zin"],
  "pl-avdat": ["עבדת", "Avdat"],
  "pl-ben-gurion": ["צריף בן-גוריון", "Ben-Gurion's Desert Home", "Ben-Gurion's Tomb"],
  "pl-alpaca": ["חוות האלפקות", "Alpaca Farm (Israel)"],
  "pl-ramon-stars": ["מצפה רמון", "Mitzpe Ramon"],
  "pl-coral-beach": ["שמורת חוף האלמוגים", "Coral Beach Nature Reserve"],
  "pl-underwater": ["המצפה התת-ימי באילת", "המצפה התת ימי", "Coral World Underwater Observatory", "Underwater Observatory Marine Park", "Coral World Eilat"],
  "pl-timna": ["פארק תמנע", "Timna Valley"],
  "pl-red-canyon": ["הקניון האדום", "Red Canyon (Israel)"],
  "pl-hai-bar": ["שמורת חי-בר יטבתה", "חי-בר יטבתה", "Hai-Bar Yotvata Nature Reserve", "Yotvata Hai-Bar Nature Reserve"]
};

const UA = { "User-Agent": "TamaraSiteBuild/1.0 (zimmer listing site; build-time photo credits)" };
const FREE = /^(cc0|cc[ -]?by(-sa)?([ -]\d(\.\d)?)?|public domain|pd|gfdl|attribution|cc[ -]?by[ -]sa)/i;
const heb = (s) => /[֐-׿]/.test(s);
const strip = (h) => String(h || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

async function api(host, params) {
  const u = `https://${host}/w/api.php?` + new URLSearchParams(Object.assign({ format: "json", formatversion: "2", origin: "*" }, params));
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(host + " " + r.status);
  return r.json();
}

/* כותרות → שם קובץ התמונה הראשית (אחרי הפניות ונרמול) */
async function leadImages(host, titles) {
  const out = {};
  for (const part of chunks([...new Set(titles)], 45)) {
    const j = await api(host, { action: "query", redirects: "1", prop: "pageimages", piprop: "name", pilicense: "free", titles: part.join("|") });
    const q = j.query || {};
    const map = {};
    (q.normalized || []).forEach((n) => { map[n.from] = n.to; });
    (q.redirects || []).forEach((n) => { map[n.from] = n.to; });
    const img = {};
    (q.pages || []).forEach((p) => { if (p.pageimage) img[p.title] = p.pageimage; });
    part.forEach((t) => { let k = t; for (let i = 0; i < 3 && map[k]; i++) k = map[k]; if (img[k]) out[t] = img[k]; });
  }
  return out;
}

/* קבצים → כתובת מוקטנת, דף הקובץ, צלם ורישיון (רק מוויקישיתוף, רק רישיון חופשי) */
async function fileInfo(files) {
  const out = {};
  for (const part of chunks([...new Set(files)], 45)) {
    const j = await api("commons.wikimedia.org", { action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "900", iiextmetadatafilter: "LicenseShortName|Artist|NonFree|Credit", titles: part.map((f) => "File:" + f).join("|") });
    const q = j.query || {};
    const back = {};
    (q.normalized || []).forEach((n) => { back[n.to] = n.from; });
    (q.pages || []).forEach((p) => {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii || p.missing) return;
      const m = ii.extmetadata || {};
      const lic = strip(m.LicenseShortName && m.LicenseShortName.value);
      if ((m.NonFree && String(m.NonFree.value) === "true") || !FREE.test(lic)) return;
      let artist = strip(m.Artist && m.Artist.value);
      if (!artist || /no machine-readable|unknown/i.test(artist)) artist = "Wikimedia Commons";
      artist = artist.replace(/^This file is a work by\s+/i, "");
      if (artist.length > 42) artist = artist.slice(0, 40).replace(/\s+\S*$/, "") + "…";
      const name = (back[p.title] || p.title).replace(/^File:/, "");
      if (/logo|לוגו|סמל|emblem|coat[_ ]of|flag|map|מפה|locator|diagram|\.svg$/i.test(name) || /drachen|kite/i.test(name)) return;
      out[name] = { url: ii.thumburl || ii.url, page: ii.descriptionurl, artist, license: lic };
    });
  }
  return out;
}

export async function placePhotos(places, OUT) {
  const t0 = Date.now();
  const want = places.filter((p) => p && p.id && !p.photo);
  if (!want.length) return {};
  const cand = Object.fromEntries(want.map((p) => [p.id, TITLES[p.id] || [String(p.name || "").replace(/\s*\(.*\)\s*$/, ""), p.name].filter(Boolean)]));
  const all = Object.values(cand).flat();
  const [he, en] = await Promise.all([leadImages("he.wikipedia.org", all.filter(heb)), leadImages("en.wikipedia.org", all.filter((t) => !heb(t)))]);
  /* לכל מקום כל התמונות האפשריות לפי הסדר; נבחרת הראשונה שעוברת את בדיקת הרישיון (ולא לוגו/מפה) */
  const opts = Object.fromEntries(want.map((p) => [p.id, cand[p.id].map((x) => (heb(x) ? he : en)[x]).filter(Boolean)]));
  const info = await fileInfo(Object.values(opts).flat());
  const pick = {};
  for (const id in opts) { const f = opts[id].find((x) => info[x]); if (f) pick[id] = f; }
  const dir = path.join(OUT, "assets/places");
  fs.mkdirSync(dir, { recursive: true });
  const res = {};
  const ids = Object.keys(pick).filter((id) => info[pick[id]]);
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < ids.length) {
      const id = ids[i++], f = info[pick[id]];
      let src = f.url;
      if (Date.now() - t0 < 60000) {
        try {
          const r = await fetch(f.url, { headers: UA, signal: AbortSignal.timeout(20000) });
          if (r.ok) {
            const ext = /\.png($|\?)/i.test(f.url) ? "png" : /\.webp($|\?)/i.test(f.url) ? "webp" : "jpg";
            const file = `${id.replace(/[^a-z0-9-]/gi, "")}.${ext}`;
            fs.writeFileSync(path.join(dir, file), Buffer.from(await r.arrayBuffer()));
            src = `assets/places/${file}`;
          }
        } catch (e) { /* נשארים עם הכתובת בוויקישיתוף */ }
      }
      res[id] = { src, credit: `${f.artist} · ${f.license}`, link: f.page };
    }
  }));
  return res;
}
