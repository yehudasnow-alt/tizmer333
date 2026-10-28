/*
 * POST /api/notify  { type: "lead" | "application", id }
 * נקרא מהדפדפן מיד אחרי שליחת טופס. שולח מייל דרך Resend למנהל (ולמארח, בפנייה על מתחם).
 * כדי שאי אפשר יהיה להשתמש בזה לשליחת ספאם: נשלח רק על רשומה שנוצרה בדקות האחרונות
 * ושעוד לא נשלחה עליה הודעה (notified_at מתעדכן לפני השליחה, כך שכל רשומה נשלחת פעם אחת).
 */
import { env, send, requireEnv, db, settings, siteUrl, readJson, esc } from "./_lib.js";

const FRESH_MINUTES = 15;
const MAX_PER_HOUR = 80; // הגנה על המכסה החינמית של Resend

async function mail({ to, subject, html, replyTo }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env("NOTIFY_FROM", "תמרה – צימרים ווילות <onboarding@resend.dev>"),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {})
    })
  });
  if (!r.ok) throw new Error("resend " + r.status + ": " + (await r.text()).slice(0, 200));
}

const fmt = (iso) => (iso ? iso.split("-").reverse().join(".") : "");
const row = (k, v) => (v ? `<tr><td style="padding:6px 0;color:#5b6b75;width:120px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#1B262C">${v}</td></tr>` : "");
const shell = (title, rows, cta) => `<!doctype html><html dir="rtl" lang="he"><body style="margin:0;background:#F3F9FD;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <div style="background:#1B262C;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:20px;letter-spacing:.02em">תמרה · צימרים ווילות</div>
  <div style="background:#fff;padding:22px;border-radius:0 0 14px 14px;border:1px solid #E4F2FC;border-top:0">
    <h1 style="margin:0 0 14px;font-size:20px;color:#0F4C75">${esc(title)}</h1>
    <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>
    ${cta ? `<p style="margin:22px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#0F4C75;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px">${esc(cta.label)}</a></p>` : ""}
  </div>
  <p style="color:#8a99a3;font-size:12px;text-align:center;margin-top:14px">הודעה אוטומטית מהאתר</p>
</div></body></html>`;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"])) return;
  const { type, id } = await readJson(req);
  if (!["lead", "application"].includes(type) || !id || String(id).length > 64) return send(res, 400, { error: "bad request" });
  const table = type === "lead" ? "leads" : "applications";

  try {
    const since = new Date(Date.now() - FRESH_MINUTES * 60e3).toISOString();
    const hourAgo = new Date(Date.now() - 3600e3).toISOString();
    const recent = await db(`${table}?select=id&notified_at=gte.${encodeURIComponent(hourAgo)}&limit=${MAX_PER_HOUR}`);
    if (recent.length >= MAX_PER_HOUR) return send(res, 429, { error: "rate" });

    /* סימון אטומי: רק הקריאה הראשונה על רשומה טרייה מקבלת אותה בחזרה */
    const claimed = await db(
      `${table}?id=eq.${encodeURIComponent(id)}&notified_at=is.null&created_at=gte.${encodeURIComponent(since)}`,
      { method: "PATCH", body: { notified_at: new Date().toISOString() }, prefer: "return=representation" }
    );
    const r = claimed[0];
    if (!r) return send(res, 200, { skipped: true });

    const s = await settings();
    const adminTo = s.notify_email || env("ADMIN_EMAIL");
    const base = siteUrl(req);

    if (type === "application") {
      if (adminTo) {
        await mail({
          to: adminTo,
          replyTo: r.email || undefined,
          subject: `בקשת הצטרפות חדשה: ${r.business || r.name}`,
          html: shell("בקשת הצטרפות חדשה", [
            row("שם", esc(r.name)), row("טלפון", `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`), row("מייל", esc(r.email)),
            row("עסק", esc(r.business)), row("יישוב", esc(r.settlement)), row("יחידות", esc(r.units)), row("הודעה", esc(r.message).replace(/\n/g, "<br>"))
          ].join(""), base && { href: `${base}/admin.html#applications`, label: "לבקשות בפאנל הניהול" })
        });
      }
      return send(res, 200, { ok: true });
    }

    /* פנייה על מתחם */
    let host = "";
    if (r.listing_id) {
      const ls = await db(`listings?select=email,owner_id&id=eq.${encodeURIComponent(r.listing_id)}`);
      const l = ls[0];
      if (l) {
        host = l.email || "";
        if (!host && l.owner_id) {
          const ad = await db(`advertisers?select=email&id=eq.${encodeURIComponent(l.owner_id)}`);
          host = (ad[0] && ad[0].email) || "";
        }
      }
    }
    const rows = [
      row("מתחם", esc(r.listing_name) + (r.unit_name ? ` · ${esc(r.unit_name)}` : "")),
      row("תאריכים", r.check_in ? `${fmt(r.check_in)} – ${fmt(r.check_out)}` : "גמיש"),
      row("אורחים", esc(r.guests)),
      row("תוספות", esc((r.extras || []).join(", "))),
      row("קופון", esc(r.coupon)),
      row("הערכת מחיר", r.est_total ? `₪${Number(r.est_total).toLocaleString("he-IL")}` : ""),
      row("שם", esc(r.name)),
      row("טלפון", `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>`),
      row("מייל", esc(r.email)),
      row("הודעה", esc(r.message).replace(/\n/g, "<br>"))
    ].join("");
    const subject = `פנייה חדשה: ${r.listing_name || "מתחם"}${r.check_in ? " · " + fmt(r.check_in) : ""}`;
    const jobs = [];
    if (adminTo) jobs.push(mail({ to: adminTo, replyTo: r.email || undefined, subject, html: shell("פנייה חדשה מהאתר", rows, base && { href: `${base}/admin.html#leads`, label: "לפניות בפאנל הניהול" }) }));
    if (host && host.toLowerCase() !== String(adminTo).toLowerCase()) {
      jobs.push(mail({ to: host, replyTo: r.email || undefined, subject, html: shell("פנייה חדשה על המתחם שלך", rows, base && { href: `${base}/owner.html#leads`, label: "לממשק המארחים" }) }));
    }
    const out = await Promise.allSettled(jobs);
    const failed = out.filter((x) => x.status === "rejected").map((x) => String(x.reason && x.reason.message));
    return send(res, failed.length && failed.length === jobs.length ? 502 : 200, { ok: !failed.length, sent: jobs.length - failed.length, failed });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}
