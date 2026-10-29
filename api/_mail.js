/*
 * מיילים: תבנית אחידה בעברית (RTL), שליחה דרך Resend, ויומן שליחה (mail_log)
 * כדי שכל מייל אוטומטי ייצא פעם אחת בלבד.
 */
import { env, db, esc } from "./_lib.js";

export const fmtDate = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join(".") : "");
export const money = (n) => (n || n === 0 ? "₪" + Math.round(Number(n)).toLocaleString("he-IL") : "");
export const row = (k, v) => (v ? `<tr><td style="padding:6px 0;color:#5b6b75;width:130px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#1B262C">${v}</td></tr>` : "");
export const p = (html) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#1B262C">${html}</p>`;
export const table = (rows) => `<table style="width:100%;border-collapse:collapse;font-size:15px;margin:4px 0 8px">${rows}</table>`;

/* מסגרת המייל. footer: טקסט קטן בתחתית (למשל קישור הסרה מדיוור) */
export function layout({ title, preheader = "", body, cta, footer = "", siteName = "תמרה" }) {
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F3F9FD;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<div style="max-width:580px;margin:0 auto;padding:28px 16px">
  <div style="background:#1B262C;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:20px;letter-spacing:.02em">${esc(siteName)} · צימרים ווילות</div>
  <div style="background:#fff;padding:24px 22px;border-radius:0 0 14px 14px;border:1px solid #E4F2FC;border-top:0">
    <h1 style="margin:0 0 16px;font-size:21px;color:#0F4C75;font-weight:bold">${esc(title)}</h1>
    ${body}
    ${cta ? `<p style="margin:22px 0 4px"><a href="${esc(cta.href)}" style="display:inline-block;background:#0F4C75;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:15px">${esc(cta.label)}</a></p>` : ""}
  </div>
  <p style="color:#8a99a3;font-size:12px;text-align:center;margin-top:14px;line-height:1.6">${footer || "הודעה אוטומטית מהאתר. אפשר להשיב למייל הזה."}</p>
</div></body></html>`;
}
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|tr|h1|div)>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, "\n\n").trim();

export const mailReady = () => !!env("RESEND_API_KEY");

export async function sendMail({ to, subject, html, replyTo, from }) {
  const list = (Array.isArray(to) ? to : [to]).map((x) => String(x || "").trim()).filter((x) => /@/.test(x));
  if (!list.length) return { skipped: "no recipient" };
  if (!mailReady()) return { skipped: "RESEND_API_KEY missing" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: from || env("NOTIFY_FROM", "תמרה – צימרים ווילות <onboarding@resend.dev>"), to: list, subject, html, text: text(html), ...(replyTo ? { reply_to: replyTo } : {}) })
  });
  if (!r.ok) throw new Error("resend " + r.status + ": " + (await r.text()).slice(0, 200));
  return { sent: list.length };
}

/* רושם מפתח ביומן; מחזיר true רק בפעם הראשונה (כך מייל אוטומטי לא נשלח פעמיים) */
export async function once(key, meta) {
  const rows = await db("mail_log?on_conflict=key", { method: "POST", body: [{ key, meta: meta || {} }], prefer: "resolution=ignore-duplicates,return=representation" });
  return Array.isArray(rows) && rows.length > 0;
}
export async function forget(key) { await db(`mail_log?key=eq.${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {}); }

/* שליחה פעם אחת: אם השליחה נכשלה, מוחקים את הרישום כדי שאפשר יהיה לנסות שוב */
export async function sendOnce(key, mail) {
  /* בלי מפתח Resend או בלי נמען לא רושמים ביומן, כדי שהמייל יישלח כשהשליחה תוגדר */
  if (!mailReady()) return { skipped: "RESEND_API_KEY missing" };
  if (!(Array.isArray(mail.to) ? mail.to : [mail.to]).some((x) => /@/.test(String(x || "")))) return { skipped: "no recipient" };
  if (!(await once(key, { to: mail.to, subject: mail.subject }))) return { skipped: "already sent" };
  try { return await sendMail(mail); } catch (e) { await forget(key); throw e; }
}

/* מייל בקשת חוות דעת לאורח (ידני מהפאנל, או אוטומטי יום אחרי העזיבה) */
export function reviewRequest({ L, base, q }) {
  return {
    to: q.email,
    subject: `איך היה ב${q.listing_name}? נשמח לשמוע`,
    html: L({
      title: `שלום ${q.name}, איך היה?`,
      preheader: "שתי דקות שעוזרות לאורחים הבאים",
      body: p(`תודה שהתארחתם ב<b>${esc(q.listing_name)}</b>. חוות דעת קצרה עוזרת לאורחים אחרים לבחור, ולמארחים להשתפר.`) + p(`<span style="color:#5b6b75;font-size:13px">הקישור אישי, עובד פעם אחת ורק להזמנה שלכם. חוות הדעת מתפרסמת אחרי בדיקה קצרה.</span>`),
      cta: base && { href: `${base}/#review-${q.review_token}`, label: "כתיבת חוות דעת" }
    })
  };
}
