# תמרה – צימרים ווילות

פורטל צימרים עם שלושה ממשקים ושרת קטן:

| ממשק | קובץ | למי |
|---|---|---|
| האתר | `index.html` | אורחים: חיפוש לפי אזור/תאריכים/מאפיינים, מפה, דף מתחם עם יחידות, יומן, מחשבון מחיר, קופון, בקשת הזמנה, וואטסאפ, חוות דעת, מגזין |
| ניהול האתר | `admin.html` | אתם: מתחמים, אישור שינויים של מארחים, פניות, חוות דעת, מפרסמים, חיובים, בקשות הצטרפות, מגזין, הגדרות |
| ממשק מארחים | `owner.html` | בעלי הצימרים: מחירים, תמונות, יחידות, יומן וסנכרון iCal, פניות, תגובה לחוות דעת, נתוני צפיות |
| שרת | `api/` | מיילים על פניות, ייצוא וסנכרון iCal, חתימה להעלאת תמונות, עדכון דפי גוגל |

כל עוד לא מחברים מסד נתונים, האתר רץ **במצב הדגמה**: 10 מתחמים לדוגמה, והשינויים נשמרים רק בדפדפן. מנהל בהדגמה: נכנסים מ"ניהול האתר" בלי סיסמה.

---

## השירותים והעלויות

| תפקיד | שירות | בחינם עד | הערה |
|---|---|---|---|
| אחסון האתר + שרת | **Vercel** + GitHub | 100GB תעבורה בחודש | ⚠️ התוכנית החינמית (Hobby) מיועדת **לשימוש לא מסחרי בלבד**. אתר שגובה ממפרסמים צריך **Pro** (20$ לחודש). אפשר לבנות ולבדוק ב-Hobby ולשדרג לפני העלייה לאוויר |
| מסד נתונים + כניסה | **Supabase** | 500MB נתונים, 1GB קבצים, 50 אלף משתמשים | פרויקט חינמי **מושהה אחרי שבוע בלי פעילות**. לאתר פעיל כדאי Pro (כ-25$ לחודש) |
| תמונות | **Cloudinary** (לא חובה) | כ-25GB | בלי Cloudinary התמונות נשמרות ב-Supabase Storage |
| מיילים | **Resend** | 100 ביום, 3,000 בחודש | צריך לאמת דומיין כדי לשלוח למארחים |
| מפות | Leaflet + OpenStreetMap | חינם | עם קרדיט ל-OpenStreetMap (מופיע במפה) |
| סנכרון יומנים כל שעה | GitHub Actions | 2,000 דקות בחודש במאגר פרטי | ב-Vercel Hobby ה-Cron רץ רק פעם ביום, לכן GitHub משלים |

המחירים נבדקו באוקטובר 2026. בדקו שוב באתרי השירותים לפני שמתחייבים.

---

## העלאה לאוויר (כשעה)

### 1 · GitHub
1. נרשמים ב-[github.com](https://github.com) → **New repository** → שם `tamara` → **Private**.
2. **uploading an existing file** → גוררים את כל תוכן התיקייה (כולל התיקיות `api`, `assets`, `scripts`, `supabase`, `.github`) → **Commit**.

### 2 · Supabase
1. [supabase.com](https://supabase.com) → **New project**. אזור: **Central EU (Frankfurt)**.
2. **SQL Editor → New query** → מדביקים את כל `supabase/schema.sql` → **Run**. (בטוח להריץ שוב בכל עדכון.)
3. מנהל: **Authentication → Users → Add user** (אימייל + סיסמה, **Auto Confirm User**), ואז ב-SQL Editor:
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
4. **Authentication → URL Configuration**: ‏**Site URL** = כתובת האתר. ב-**Redirect URLs** מוסיפים `https://הדומיין/admin.html` ו-`https://הדומיין/owner.html`.
5. כניסה עם Google (לא חובה): ב-[Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → Create OAuth client ID** (Web). ב-**Authorized redirect URIs**: ‏`https://<project-ref>.supabase.co/auth/v1/callback`. את ה-Client ID וה-Secret מדביקים ב-Supabase: **Authentication → Sign In / Providers → Google**.
6. מיילי כניסה למארחים: שירות המיילים המובנה של Supabase מוגבל מאוד. ב-**Authentication → Emails → SMTP Settings**: ‏host `smtp.resend.com`, ‏port `465`, ‏user `resend`, ‏password = מפתח ה-API של Resend.
7. **Project Settings → API Keys**: מעתיקים את ה-**Publishable key** (מתחיל ב-`sb_publishable_`) ואת ה-**Secret key** (מתחיל ב-`sb_secret_`, סודי!). את **Project URL** (בצורה `https://xxxx.supabase.co`) מוצאים בכפתור **Connect** בראש הדף.
   > בפרויקטים ישנים יש במקומם anon ו-service_role. גם הם עובדים, אבל Supabase מפסיקה אותם בסוף 2026, אז עדיף החדשים.

### 3 · Resend (מיילים)
1. [resend.com](https://resend.com) → **Domains → Add domain** → מוסיפים את רשומות ה-DNS אצל רשם הדומיין.
2. **API Keys → Create** → שומרים.
> עד שהדומיין מאומת אפשר לשלוח רק לאימייל שאיתו נרשמתם, מהכתובת `onboarding@resend.dev`.

### 4 · Cloudinary (לא חובה)
מ-[cloudinary.com](https://cloudinary.com) → **Settings → API Keys**: ‏Cloud name, ‏API Key, ‏API Secret.

### 5 · Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → בוחרים את המאגר `tamara`. ‏Framework: **Other**. שאר ההגדרות נקראות מ-`vercel.json`.
2. **Environment Variables** (לפני Deploy):

| משתנה | ערך | סודי? |
|---|---|---|
| `SUPABASE_URL` | Project URL | לא |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) | לא |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) | **כן** |
| `SITE_URL` | `https://www.tamara.co.il` | לא |
| `RESEND_API_KEY` | מ-Resend | **כן** |
| `NOTIFY_FROM` | `תמרה <noreply@tamara.co.il>` | לא |
| `ADMIN_EMAIL` | לאן יגיעו פניות (אפשר לשנות גם בהגדרות האתר) | לא |
| `CRON_SECRET` | מחרוזת אקראית ארוכה (32 תווים ומעלה) | **כן** |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | לא חובה | הסוד **כן** |
| `DEPLOY_HOOK_URL` | ראו שלב 6 | **כן** |

3. **Deploy**. הבנייה כותבת את המפתחות הציבוריים ל-`config.js` באופן אוטומטי, כך שאין צורך לערוך אותו. המפתחות הסודיים נשארים רק בשרת.
4. **Settings → Domains** → מחברים את הדומיין.

### 6 · עדכון אוטומטי של דפי גוגל
1. Vercel → **Settings → Git → Deploy Hooks** → שם `nightly`, ענף `main` → **Create** → מעתיקים את הכתובת.
2. מדביקים אותה כ-`DEPLOY_HOOK_URL` ב-Vercel (ואז **Redeploy** פעם אחת).

### 7 · GitHub Actions
ב-GitHub: **Settings → Secrets and variables → Actions → New repository secret**: ‏`SITE_URL`, ‏`CRON_SECRET` (אותו ערך כמו ב-Vercel), ‏`DEPLOY_HOOK_URL`.
מעכשיו: סנכרון יומנים כל שעה, ובנייה מחדש של דפי גוגל כל לילה. בלשונית **Actions** אפשר להריץ ידנית ולראות תוצאות.

### 8 · גוגל
[Google Search Console](https://search.google.com/search-console) → מוסיפים את הדומיין → **Sitemaps** → `sitemap.xml`.

### 9 · בדיקה אחרי העלאה
- שולחים פנייה מדף מתחם → מגיע מייל למנהל ולמארח.
- בעורך מתחם: **סנכרון עכשיו**, ופתיחת קישור הייצוא (קובץ ‎.ics).
- העלאת תמונה מהעורך.
- פתיחת `/zimmer/<מזהה>/` ו-`/sitemap.xml`.

### מעבר מההדגמה (לא חובה)
בהדגמה: **הגדרות האתר → ייצוא → העתקה**. באתר המחובר: **הגדרות האתר** → מדביקים → **ייבוא מהתיבה**. מתחמי הדוגמה לא עוברים, ותמונות שהועלו בהדגמה צריך להעלות מחדש.

---

## עבודה שוטפת

**מארח חדש:** ממלא טופס ב"פרסום מתחם" → מייל אליכם + **בקשות הצטרפות** → **אישור ופתיחת מתחם** יוצר מפרסם בחודש ניסיון ומתחם מוסתר. משלימים ומדליקים **מוצג באתר**.

**כניסת מארח:** האימייל שמוגדר אצל המפרסם הוא הכניסה שלו (קישור למייל או Google). הוא רואה רק את המתחמים שלו ולא יכול להפעיל, לקדם או לשנות סנכרון.

**אישור שינויים:** כשהאפשרות פעילה (הגדרות), שינוי של מארח בשם, תיאור, תמונות, מאפיינים או סרטון ממתין ב**אישורי תוכן** עם השוואה לפני/אחרי. מחירים ויומן מתעדכנים מיד.

**יחידות במתחם:** בעורך, "כמה יחידות" → לכל יחידה מחיר, תפוסה, יומן וקישור iCal משלה.

**תמחור:** אמצע שבוע / סופ"ש (לילות חמישי ושישי) / חג, עונות באחוזים, תוספת לאורח מעבר לבסיס, תוספות בתשלום (ללילה/לשהייה/לאורח), קופונים ו"דקה 90" (הנחה אוטומטית על סופ"ש הקרוב אם פנוי). החגים מחושבים מראש ל-2027–2028 וניתנים לעריכה.

**iCal:** מדביקים בעורך את קישור הייצוא מ-Booking/Airbnb, והתאריכים שלהם נחסמים כאן (כל שעה). את קישור הייצוא שלנו מדביקים אצלם. מיוצאים רק תאריכים שסומנו כאן, כדי לא ליצור לולאה.

**חוות דעת מאומתות:** בפניות, מסמנים פנייה כ"נסגרה" → **בקשת חוות דעת** → שולחים לאורח את הקישור האישי (חד־פעמי). החוות דעת ממתינה לאישורכם, והמארח יכול להגיב.

**חיובים:** בכרטיס הלקוח (**לקוחות**) בוחרים מודל: מנוי, תשלום לפי פנייה, או שניהם. במסך **חיובים** רואים כמה כל אחד חייב החודש ומסמנים ששולם. הגבייה עצמה ידנית.

**קידום:** "נבחרי העונה" (כוכב) ו"ממומן עד" (תאריך) מופיעים בראש העמודים והחיפוש.

**דפי גוגל:** נבנים כל לילה. אחרי שינוי גדול: **הגדרות האתר → עדכון דפי גוגל ומפת האתר עכשיו**.

---

## מבנה הקבצים

```
index.html / admin.html / owner.html   שלושת הממשקים
assets/css/tamara.css                  העיצוב (צבעים וגופנים בראש הקובץ)
assets/css/fonts.css, assets/fonts/    גופנים מקומיים: Bellefair, Karantina, IBM Plex Sans Hebrew, Cinzel (רישיון OFL)
assets/js/config.js                    חיבור (בהדגמה ריק; ב-Vercel נכתב אוטומטית)
assets/js/core.js                      אזורים, סוגים, מאפיינים, חגים, מנוע התמחור
assets/js/seed.js                      נתוני ההדגמה
assets/js/store.js                     שכבת הנתונים (הדגמה / Supabase)
assets/js/site.js                      האתר לאורחים
assets/js/admin.js                     ניהול + מארחים
assets/js/scene.js                     איורי גיבוי למתחם בלי תמונות
assets/img/brand/                      הלוגואים (SVG + PNG)
assets/vendor/                         Leaflet, Supabase (מקומיים)
api/                                   פונקציות השרת (Vercel)
scripts/build.mjs                      בנייה: דפי גוגל, sitemap, robots
supabase/schema.sql                    טבלאות, הרשאות ופונקציות
.github/workflows/                     סנכרון שעתי ובנייה לילית
tools/make-logos.mjs                   יצירת הלוגואים מחדש מהגופנים
```

להוספת אזור, מאפיין או סוג אירוח: מוסיפים שורה ברשימות בראש `assets/js/core.js`.

---

## לפני שמפרסמים

- **משפטי:** הצהרת הנגישות, תנאי השימוש ומדיניות הפרטיות הם נוסח בסיסי. כדאי שעורך דין ויועץ נגישות יעברו עליהם (כולל חוק הגנת הפרטיות ותיקון 13), וימלאו את פרטי רכז/ת הנגישות.
- **מספר טלפון וירטואלי למארחים** (כדי למדוד שיחות ולהסתיר את המספר האמיתי) דורש ספק טלפוניה בתשלום. כרגע נמדדות לחיצות "הצגת טלפון" ו"וואטסאפ".
- **סליקה:** אין גבייה אוטומטית. החיובים מחושבים באתר והגבייה נעשית בנפרד.
