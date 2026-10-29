/*
 * POST /api/mail  { type, id, ... }   (מחייב משתמש מחובר: מנהל, ובחלק מהסוגים גם מארח)
 *   welcome          מארח אחרי אימות המייל (מייל ברוכים הבאים + עדכון למנהל)
 *   approved         מנהל אישר בקשת הצטרפות → מייל למארח
 *   rejected         מנהל דחה בקשת הצטרפות → מייל מנומס למבקש
 *   moderation       מנהל אישר/דחה שינויי תוכן → מייל למארח  { decision: "approved" | "rejected" }
 *   review_published חוות דעת פורסמה → מייל למארח
 *   review_request   בקשת חוות דעת מהאורח במייל (מנהל או מארח המתחם)
 *   renewal          מארח ביקש לחדש מנוי → מייל למנהל
 *   test             מייל בדיקה לכתובת של המנהל (בדיקת מערכת)
 */
import { env, send, requireEnv, db, settings, siteUrl, readJson, esc, getUser, requireAdmin, advertiserIdsOf } from "./_lib.js";
import { layout, sendMail, sendOnce, row, p, table, fmtDate, reviewRequest } from "./_mail.js";

const ADMIN_TYPES = new Set(["approved", "rejected", "moderation", "review_published", "test"]);
const enc = encodeURIComponent;
const first = async (path) => (await db(path))[0] || null;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  const body = await readJson(req);
  const { type } = body;
  const id = String(body.id || "").slice(0, 64);
  try {
    const user = ADMIN_TYPES.has(type) ? await requireAdmin(req, res) : await getUser(req);
    if (!user) { if (!res.headersSent) send(res, 401, { error: "צריך להתחבר" }); return; }
    const s = await settings();
    const site = s.site_name || "תמרה";
    const base = siteUrl(req);
    const adminTo = s.notify_email || env("ADMIN_EMAIL");
    const L = (o) => layout(Object.assign({ siteName: site }, o));

    if (type === "test") {
      const r = await sendMail({ to: user.email, subject: `מייל בדיקה מ${site}`, html: L({ title: "המיילים מהאתר עובדים", body: p(`אם המייל הזה הגיע (ולא לספאם), השליחה מהאתר מוגדרת נכון. נשלח אל ${esc(user.email)}.`) }) });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "welcome") {
      const em = String(user.email).toLowerCase();
      const adv = await first(`advertisers?select=*&email=ilike.${enc(em)}`);
      const app = await first(`applications?select=*&email=ilike.${enc(em)}&order=created_at.desc`);
      if (!adv && !app) return send(res, 200, { skipped: "no signup" });
      const name = (adv && adv.name) || (app && app.name) || "";
      const jobs = [];
      jobs.push(sendOnce(`welcome:${em}`, {
        to: em, subject: adv ? `ברוכים הבאים ל${site}! החשבון שלכם פתוח` : `קיבלנו את ההרשמה – ${site}`,
        html: L(adv ? {
          title: `שלום ${name}, ברוכים הבאים`,
          body: p(`החשבון של <b>${esc(adv.business || name)}</b> נפתח${adv.status === "trial" && adv.end_date ? `, עם תקופת ניסיון עד ${fmtDate(adv.end_date)}` : ""}.`)
            + p("מה עכשיו? נכנסים לממשק המארחים, משלימים תמונות, תיאור, מחירים ויומן, ושולחים לבדיקה. אחרי אישור של צוות האתר המתחם עולה לאוויר.")
            + p(`<span style="color:#5b6b75;font-size:13px">הכניסה היא עם האימייל והסיסמה שבחרתם. שכחתם סיסמה? בדף הכניסה יש "שכחתי סיסמה".</span>`),
          cta: base && { href: `${base}/owner.html`, label: "לממשק המארחים" }
        } : {
          title: `שלום ${name}, ההרשמה התקבלה`,
          body: p("האימייל שלכם אומת. צוות האתר יעבור על הפרטים ויפתח לכם את החשבון בהקדם. נעדכן אתכם במייל."),
          cta: base && { href: `${base}/owner.html`, label: "מצב ההרשמה" }
        })
      }));
      if (adminTo) jobs.push(sendOnce(`signup-admin:${em}`, {
        to: adminTo, replyTo: em,
        subject: adv ? `מארח חדש נרשם ונפתח: ${adv.business || name}` : `הרשמת מארח ממתינה לאישור: ${(app && app.business) || name}`,
        html: L({ title: adv ? "מארח חדש נרשם (נפתח אוטומטית)" : "הרשמת מארח חדשה ממתינה לאישור", body: table([
          row("עסק", esc((adv && adv.business) || (app && app.business) || "")), row("שם", esc(name)), row("טלפון", esc((adv && adv.phone) || (app && app.phone) || "")),
          row("מייל", esc(em) + " ✓ מאומת"), row("יישוב", esc((app && app.settlement) || "")), row("יחידות", esc((app && app.units) || "")),
          row("ח.פ / ע.מ", esc((adv && adv.tax_id) || (app && app.tax_id) || "")), row("תנאי שימוש", app && app.terms_version ? `אושרו (גרסה ${esc(app.terms_version)})` : "")
        ].join("")), cta: base && { href: `${base}/admin.html#${adv ? "client-" + adv.id : "applications"}`, label: adv ? "לכרטיס הלקוח" : "לבקשות ההצטרפות" } })
      }));
      const out = await Promise.allSettled(jobs);
      return send(res, 200, { ok: true, results: out.map((x) => x.status) });
    }

    if (type === "approved" || type === "rejected") {
      const app = type === "rejected" ? await first(`applications?select=*&id=eq.${enc(id)}`) : null;
      const adv = type === "approved" ? await first(`advertisers?select=*&id=eq.${enc(id)}`) : null;
      const to = (adv && adv.email) || (app && app.email);
      if (!to) return send(res, 200, { skipped: "no email" });
      const r = await sendOnce(`${type}:${id}`, type === "approved" ? {
        to, replyTo: adminTo || undefined, subject: `החשבון שלכם ב${site} אושר`,
        html: L({ title: `שלום ${adv.name}, החשבון אושר`, body: p(`פתחנו לכם חשבון מפרסם עבור <b>${esc(adv.business)}</b>${adv.end_date ? `, בתוקף עד ${fmtDate(adv.end_date)}` : ""}.`) + p(body.invited ? "בנפרד יגיע אליכם מייל עם קישור לבחירת סיסמה. אחרי שבוחרים, נכנסים לממשק המארחים עם האימייל הזה." : "נכנסים לממשק המארחים עם האימייל הזה והסיסמה שבחרתם. שכחתם סיסמה? בדף הכניסה יש \"שכחתי סיסמה\".") + p("בממשק משלימים תמונות, תיאור, מחירים ויומן, ושולחים לבדיקה. אחרי אישור המתחם עולה לאוויר."), cta: base && { href: `${base}/owner.html`, label: "כניסה לממשק המארחים" } })
      } : {
        to, replyTo: adminTo || undefined, subject: `לגבי הבקשה שלכם לפרסום ב${site}`,
        html: L({ title: `שלום ${app.name}`, body: p("תודה על ההתעניינות. כרגע לא נוכל לפרסם את המתחם באתר. אם תרצו לשמוע למה, או לנסות שוב בהמשך, אפשר להשיב למייל הזה.") })
      });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "moderation") {
      const l = await first(`listings?select=id,name,owner_id&id=eq.${enc(id)}`);
      const adv = l && l.owner_id ? await first(`advertisers?select=name,email&id=eq.${enc(l.owner_id)}`) : null;
      if (!adv || !adv.email) return send(res, 200, { skipped: "no host" });
      const okd = body.decision !== "rejected";
      const live = okd && !!body.live;
      const r = await sendMail({ to: adv.email, replyTo: adminTo || undefined, subject: live ? `${l.name} באוויר! המתחם מוצג עכשיו ב${site}` : okd ? `השינויים ב${l.name} פורסמו` : `השינויים ב${l.name} לא אושרו`,
        html: L({ title: live ? "המתחם שלכם באוויר" : okd ? "השינויים פורסמו באתר" : "השינויים לא אושרו",
          body: live ? p(`<b>${esc(l.name)}</b> אושר ומוצג עכשיו לאורחים באתר. בקשות הזמנה יגיעו אליכם למייל ולממשק המארחים.`) + p("כדאי לשמור על היומן מעודכן ולחזור לאורחים מהר: מי שחוזר ראשון, סוגר.")
            : p(okd ? `העדכון ששלחתם ל<b>${esc(l.name)}</b> אושר ומופיע עכשיו באתר.` : `העדכון ששלחתם ל<b>${esc(l.name)}</b> לא אושר.${body.note ? " הסיבה: " + esc(String(body.note).slice(0, 400)) : ""} אפשר לתקן ולשלוח שוב מממשק המארחים.`),
          cta: base && (live ? { href: `${base}/#stay-${l.id}`, label: "לדף המתחם באתר" } : { href: `${base}/owner.html#edit-${l.id}`, label: "לעריכת המתחם" }) }) });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "review_published") {
      const rv = await first(`reviews?select=id,listing_id,name,rating,title,text&id=eq.${enc(id)}`);
      const l = rv ? await first(`listings?select=id,name,owner_id&id=eq.${enc(rv.listing_id)}`) : null;
      const adv = l && l.owner_id ? await first(`advertisers?select=email,prefs&id=eq.${enc(l.owner_id)}`) : null;
      if (!adv || !adv.email || (adv.prefs || {}).notify_reviews === false) return send(res, 200, { skipped: "no host" });
      const r = await sendOnce(`review-published:${id}`, { to: adv.email, subject: `חוות דעת חדשה על ${l.name}: ${"★".repeat(rv.rating)}`,
        html: L({ title: "חוות דעת חדשה פורסמה", body: p(`<b>${esc(rv.name)}</b> כתב/ה על ${esc(l.name)}:`) + p(`${rv.title ? `<b>${esc(rv.title)}</b><br>` : ""}״${esc(rv.text)}״`) + p("אפשר להגיב לחוות הדעת מממשק המארחים, והתגובה תופיע מתחתיה באתר."), cta: base && { href: `${base}/owner.html#reviews`, label: "לתגובה" } }) });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "review_request") {
      const q = await first(`leads?select=id,name,email,listing_id,listing_name,status,review_token&id=eq.${enc(id)}`);
      if (!q) return send(res, 404, { error: "הפנייה לא נמצאה" });
      const l = q.listing_id ? await first(`listings?select=owner_id&id=eq.${enc(q.listing_id)}`) : null;
      const admin = await requireAdminQuiet(user);
      const mine = l && l.owner_id && (await advertiserIdsOf(user.email)).includes(l.owner_id);
      if (!admin && !mine) return send(res, 403, { error: "אין הרשאה" });
      if (q.status !== "closed" || !q.review_token || !q.email) return send(res, 400, { error: "צריך פנייה שנסגרה, עם אימייל של האורח" });
      const day = new Date().toISOString().slice(0, 10);
      const r = await sendOnce(`review-request:${id}:${day}`, reviewRequest({ L, base, q }));
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "publish_request") {
      /* מארח סיים להכין מתחם חדש וביקש לפרסם אותו */
      const l = await first(`listings?select=id,name,owner_id,active,photos,price_weekday,rooms&id=eq.${enc(id)}`);
      if (!l || !l.owner_id || !(await advertiserIdsOf(user.email)).includes(l.owner_id)) return send(res, 403, { error: "אין הרשאה" });
      if (!adminTo) return send(res, 200, { skipped: "no admin email" });
      const adv = await first(`advertisers?select=name,business,phone&id=eq.${enc(l.owner_id)}`);
      const day = new Date().toISOString().slice(0, 10);
      const r = await sendOnce(`publish-request:${id}:${day}`, { to: adminTo, replyTo: user.email, subject: `בקשה לפרסום מתחם: ${l.name}`,
        html: L({ title: "מארח ביקש לפרסם מתחם", body: table([row("מתחם", esc(l.name)), row("לקוח", esc((adv && (adv.business || adv.name)) || "")), row("טלפון", esc((adv && adv.phone) || "")), row("מייל", esc(user.email)), row("תמונות", String((l.photos || []).length))].join("")) + p("בודקים את התוכן ב״אישורי תוכן״, ומאשרים עם ״אישור והצגה באתר״."), cta: base && { href: `${base}/admin.html#moderation`, label: "לאישורי תוכן" } }) });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    if (type === "renewal") {
      const ids = await advertiserIdsOf(user.email);
      if (!ids.length) return send(res, 403, { error: "אין לקוח עם האימייל הזה" });
      const adv = await first(`advertisers?select=*&id=eq.${enc(ids[0])}`);
      if (!adminTo) return send(res, 200, { skipped: "no admin email" });
      const day = new Date().toISOString().slice(0, 10);
      const r = await sendOnce(`renewal:${adv.id}:${day}`, { to: adminTo, replyTo: adv.email, subject: `בקשת חידוש מנוי: ${adv.business || adv.name}`,
        html: L({ title: "לקוח ביקש לחדש מנוי", body: table([row("עסק", esc(adv.business)), row("איש קשר", esc(adv.name)), row("טלפון", esc(adv.phone)), row("מייל", esc(adv.email)), row("חבילה", esc(adv.plan)), row("בתוקף עד", fmtDate(adv.end_date))].join("")), cta: base && { href: `${base}/admin.html#client-${adv.id}`, label: "לכרטיס הלקוח" } }) });
      return send(res, 200, Object.assign({ ok: true }, r));
    }

    return send(res, 400, { error: "סוג לא מוכר" });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}

async function requireAdminQuiet(user) {
  const rows = await db(`admins?select=email,mfa_required&email=ilike.${enc(String(user.email).replace(/[\\%_]/g, "\\$&"))}`).catch(() => []);
  return !!(rows[0] && (!rows[0].mfa_required || user._aal === "aal2"));
}
