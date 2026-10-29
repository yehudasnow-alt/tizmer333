/*
 * POST /api/notify  { type: "lead" | "application" | "subscribe", id }
 * נקרא מהדפדפן מיד אחרי שליחת טופס באתר.
 *   lead        → מנהל + המארח (לפי ההעדפות שלו) + אישור לאורח (אם השאיר מייל)
 *   application → מנהל + אישור למבקש
 *   subscribe   → מייל אישור הרשמה לדיוור (הסכמה כפולה)
 * הגנה מספאם: רק על רשומה שנוצרה בדקות האחרונות ושעוד לא נשלחה עליה הודעה
 * (notified_at מתעדכן לפני השליחה, ולכן כל רשומה נשלחת פעם אחת).
 */
import { env, send, requireEnv, db, settings, siteUrl, readJson, esc } from "./_lib.js";
import { layout, sendMail, row, p, table, fmtDate, money } from "./_mail.js";

const FRESH_MINUTES = 15;
const MAX_PER_HOUR = 80; // הגנה על המכסה החינמית של Resend
const TABLES = { lead: "leads", application: "applications", subscribe: "subscribers" };
const SOURCES = { form: "בקשת הזמנה", find: "מצא לי צימר", contact: "יצירת קשר", report: "דיווח על מידע שגוי" };
const BENEFITS = { reservists: "מילואימניקים", soldiers: "חיילים", students: "סטודנטים", seniors: "גיל הזהב", evacuees: "מפונים" };

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"])) return;
  const { type, id } = await readJson(req);
  const table_ = TABLES[type];
  if (!table_ || !id || String(id).length > 64) return send(res, 400, { error: "bad request" });

  try {
    const since = new Date(Date.now() - FRESH_MINUTES * 60e3).toISOString();
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const recent = await db(`${table_}?select=id&notified_at=gte.${encodeURIComponent(hourAgo)}&limit=${MAX_PER_HOUR}`);
    if (recent.length >= MAX_PER_HOUR) return send(res, 429, { error: "rate" });

    /* סימון אטומי: רק הקריאה הראשונה על רשומה טרייה מקבלת אותה בחזרה */
    const fresh = type === "subscribe" ? "" : `&created_at=gte.${encodeURIComponent(since)}`;
    const claimed = await db(`${table_}?id=eq.${encodeURIComponent(id)}&notified_at=is.null${fresh}`,
      { method: "PATCH", body: { notified_at: new Date().toISOString() }, prefer: "return=representation" });
    const r = claimed[0];
    if (!r) return send(res, 200, { skipped: true });

    const s = await settings();
    const site = s.site_name || "תמרה";
    const adminTo = s.notify_email || env("ADMIN_EMAIL");
    const base = siteUrl(req);
    const jobs = [];

    if (type === "subscribe") {
      /* הסכמה כפולה: ההרשמה פעילה רק אחרי לחיצה על הקישור (וגם הסרה בלחיצה אחת) */
      jobs.push(sendMail({
        to: r.email,
        subject: `אישור הרשמה לדילים של ${site}`,
        html: layout({
          siteName: site, title: "רק לאשר שזה אתם",
          preheader: "לחיצה אחת ותתחילו לקבל דילים ודקה 90",
          body: p("ביקשתם לקבל מאיתנו במייל דילים, מבצעי דקה 90 ומתחמים שהתפנו לסופ״ש. כדי להתחיל, אשרו את הכתובת:") + p(`<span style="color:#5b6b75;font-size:13px">אם לא אתם נרשמתם, פשוט התעלמו מהמייל הזה ולא נשלח לכם דבר.</span>`),
          cta: base && { href: `${base}/#sub-confirm-${r.token}`, label: "אישור ההרשמה" },
          footer: `קיבלתם את המייל כי הכתובת הוזנה בטופס ההרשמה ב${esc(site)}.${base ? ` <a href="${esc(base)}/#unsubscribe-${esc(r.token)}" style="color:#8a99a3">הסרה</a>` : ""}`
        })
      }));
    } else if (type === "application") {
      const rows = table([
        row("שם", esc(r.name)), row("טלפון", `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`), row("מייל", esc(r.email)),
        row("עסק", esc(r.business)), row("יישוב", esc(r.settlement)), row("יחידות", esc(r.units)), row("ח.פ / ע.מ", esc(r.tax_id || "")),
        row("אימות מייל", r.verified ? "✓ מאומת" : "לא מאומת"), row("הודעה", esc(r.message).replace(/\n/g, "<br>"))
      ].join(""));
      if (adminTo) jobs.push(sendMail({ to: adminTo, replyTo: r.email || undefined, subject: `בקשת הצטרפות חדשה: ${r.business || r.name}`,
        html: layout({ siteName: site, title: "בקשת הצטרפות חדשה", body: rows, cta: base && { href: `${base}/admin.html#applications`, label: "לבקשות בפאנל הניהול" } }) }));
      if (r.email) jobs.push(sendMail({ to: r.email, subject: `קיבלנו את הבקשה שלכם – ${site}`,
        html: layout({ siteName: site, title: `שלום ${r.name}, הבקשה התקבלה`, body: p(`תודה שבחרתם לפרסם את <b>${esc(r.business || "המתחם")}</b> ב${esc(site)}. נחזור אליכם בהקדם עם פרטי ההצטרפות.`) }) }));
    } else {
      /* פנייה על מתחם */
      let host = "", hostPrefs = {};
      if (r.listing_id) {
        const ls = await db(`listings?select=email,owner_id&id=eq.${encodeURIComponent(r.listing_id)}`);
        const l = ls[0];
        if (l) {
          host = l.email || "";
          if (l.owner_id) {
            const ad = await db(`advertisers?select=email,prefs&id=eq.${encodeURIComponent(l.owner_id)}`);
            if (ad[0]) { host = host || ad[0].email || ""; hostPrefs = ad[0].prefs || {}; }
          }
        }
      }
      const m = r.meta && typeof r.meta === "object" ? r.meta : {};
      const units = Array.isArray(r.rooms_req) && r.rooms_req.length > 1 ? r.rooms_req.map((x) => `${esc(x.name || x.id)} (${esc(x.guests)}${x.children ? "+" + esc(x.children) + " ילדים" : ""})`).join(", ") : "";
      const isStay = r.source !== "report" && r.source !== "contact";
      const details = [
        row("סוג", esc(SOURCES[r.source] || r.source)),
        row("מתחם", esc(r.listing_name) + (r.unit_name ? ` · ${esc(r.unit_name)}` : "")),
        row("יחידות", units),
        row("תאריכים", r.check_in ? `${fmtDate(r.check_in)} – ${fmtDate(r.check_out)}${r.flexible ? " (גמישים)" : ""}` : isStay ? "גמיש" : ""),
        row("אורחים", isStay ? esc(r.guests) + (r.children ? ` + ${esc(r.children)} ילדים` : "") : ""),
        row("אזור", esc(m.place_label || "")),
        row("תקציב ללילה", m.budget ? "עד " + money(m.budget) : ""),
        row("מה חשוב", esc((m.wants || []).join(", "))),
        row("חבילה", esc(r.package)),
        row("הטבה", esc(BENEFITS[r.benefit] || r.benefit)),
        row("תוספות", esc((r.extras || []).join(", "))),
        row("קופון", esc(r.coupon)),
        row("הערכת מחיר", r.est_total ? money(r.est_total) : "")
      ];
      const contact = [row("שם", esc(r.name)), row("טלפון", `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`), row("מייל", esc(r.email)), row("הודעה", esc(r.message).replace(/\n/g, "<br>"))];
      const subject = r.source === "report" ? `דיווח על מידע שגוי: ${r.listing_name || "מתחם"}` : r.source === "find" ? `מצא לי צימר: ${r.name}${r.check_in ? " · " + fmtDate(r.check_in) : ""}` : r.source === "contact" ? `הודעה מהאתר: ${r.name}` : `פנייה חדשה: ${r.listing_name || "מתחם"}${r.check_in ? " · " + fmtDate(r.check_in) : ""}`;
      if (adminTo) jobs.push(sendMail({ to: adminTo, replyTo: r.email || undefined, subject, html: layout({ siteName: site, title: "פנייה חדשה מהאתר", body: table(details.concat(contact).join("")), cta: base && { href: `${base}/admin.html#leads`, label: "לפניות בפאנל הניהול" } }) }));
      /* מארח: לא על דיווחים, ולא אם ביקש לא לקבל מיילים על פניות */
      if (host && r.source !== "report" && hostPrefs.notify_leads !== false && host.toLowerCase() !== String(adminTo).toLowerCase()) {
        jobs.push(sendMail({ to: host, replyTo: r.email || undefined, subject, html: layout({ siteName: site, title: "פנייה חדשה על המתחם שלך", preheader: `${r.name} · ${fmtDate(r.check_in)}`, body: table(details.concat(contact).join("")) + p(`<span style="color:#5b6b75;font-size:13px">כדאי לחזור לאורח מהר: רוב האורחים סוגרים עם המקום הראשון שחוזר אליהם.</span>`), cta: base && { href: `${base}/owner.html#leads`, label: "לממשק המארחים" } }) }));
      }
      /* אישור לאורח: מה שלח ולמי, ומה קורה עכשיו */
      if (r.email && s.guest_confirmation_email !== false && (r.source === "form" || r.source === "find")) {
        jobs.push(sendMail({
          to: r.email, replyTo: adminTo || undefined,
          subject: r.source === "find" ? `קיבלנו את הבקשה שלך – ${site}` : `הבקשה נשלחה ל${r.listing_name} – ${site}`,
          html: layout({
            siteName: site, title: `שלום ${r.name}, הבקשה נשלחה`,
            body: p(r.source === "find" ? "קיבלנו את הבקשה. נבדוק זמינות מול המארחים ונחזור אליך בהקדם עם כמה מקומות שמתאימים." : `הבקשה שלך הגיעה ישירות למארחים של <b>${esc(r.listing_name)}</b>. הם יחזרו אליך לאישור זמינות ומחיר, בדרך כלל בטלפון או בוואטסאפ.`)
              + table(details.filter((x, i) => i !== 0).join("")) + p(`<span style="color:#5b6b75;font-size:13px">זו בקשה ולא הזמנה סופית. ההזמנה והתשלום נסגרים ישירות מול המארחים.</span>`),
            cta: base && { href: `${base}/#me-leads`, label: "הפניות שלי באתר" }
          })
        }));
      }
    }
    const out = await Promise.allSettled(jobs);
    const failed = out.filter((x) => x.status === "rejected").map((x) => String(x.reason && x.reason.message));
    return send(res, failed.length && failed.length === jobs.length ? 502 : 200, { ok: !failed.length, sent: jobs.length - failed.length, failed });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}
