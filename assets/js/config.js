/*
 * הגדרות חיבור (ציבוריות, בטוח שיופיעו בדפדפן).
 *
 * כל עוד SUPABASE_URL ריק, האתר רץ ב"מצב הדגמה": הנתונים נשמרים רק בדפדפן
 * והמתחמים המוצגים הם לדוגמה. למילוי השדות ראו README.md.
 * מפתחות סודיים (Secret key / service_role, Resend, Cloudinary secret) לא נכנסים לכאן,
 * אלא למשתני הסביבה ב-Vercel בלבד.
 */
window.TAMARA_CONFIG = {
  SUPABASE_URL: "",          // לדוגמה: "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "",     // Project Settings → API Keys → Publishable key (sb_publishable_…) או anon public הישן
  CLOUDINARY_CLOUD_NAME: ""  // לא חובה. אם ריק, התמונות נשמרות ב-Supabase Storage
};
