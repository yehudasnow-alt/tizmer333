/*
 * /api/daily  – המשימה היומית (Vercel Cron כל בוקר; או מנהל מהפאנל. ?dry=1 = רק להראות מה יישלח)
 *   1. תזכורות חידוש ללקוחות לפני סוף המנוי (לפי "תזכורות" בהגדרות, ברירת מחדל 30/7/1 ימים)
 *   2. הודעה כשהמנוי הסתיים (ימי חסד), והודעה כשהמתחם הוסתר מהאתר
 *   3. בקשת חוות דעת אוטומטית לאורחים אחרי העזיבה (הזמנות שסומנו "נסגרה")
 *   4. סיכום יומי למנהל: פניות, הרשמות, אישורים ומנויים שמסתיימים
 *   5. תחזוקה: מחיקת יומנים ישנים והרשמות לדיוור שלא אושרו
 * כל מייל נרשם ב-mail_log ולכן יוצא פעם אחת בלבד, גם אם המשימה רצה כמה פעמים.
 */
import crypto from "node:crypto";
import { env, send, requireEnv, db, settings, siteUrl, esc, requireAdmin, isoAdd, todayIL } from "./_lib.js";
import { layout, sendMail, once, forget, row, p, table, fmtDate, mailReady, reviewRequest } from "./_mail.js";

const MAX_MAILS = 50;
const enc = encodeURIComponent;
const inList = (arr) => enc(`(${arr.map((x) => `"${String(x).replace(/"/g, "")}"`).join(",")})`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "method" });
  if (!requireEnv(res, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])) return;
  const cron = env("CRON_SECRET");
  const isCron = cron.length >= 16 && String(req.headers.authorization || "") === `Bearer ${cron}`;
  if (!isCron && !(await requireAdmin(req, res))) return;
  const query = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const dry = query.dry === "1";
  const noMail = !mailReady();

  try {
    const s = await settings();
    const site = s.site_name || "תמרה";
    const base = siteUrl(req);
    const adminTo = s.notify_email || env("ADMIN_EMAIL");
    const today = todayIL();
    const L = (o) => layout(Object.assign({ siteName: site }, o));
    const days = (iso) => Math.round((Date.parse(String(iso).slice(0, 10)) - Date.parse(today)) / 864e5);
    const grace = s.grace_days === 0 || s.grace_days === "0" ? 0 : Math.max(0, Math.min(60, Number(s.grace_days) || 3));
    const steps = (Array.isArray(s.reminder_days) && s.reminder_days.length ? s.reminder_days : [30, 7, 1]).map(Number).filter((n) => n >= 0 && n <= 120).sort((a, b) => a - b);
    const plan = [];
    const account = base && { href: `${base}/owner.html#account`, label: "לחידוש המנוי" };

    /* ------------------------------------------------ 1–2. מנויים */
    const advs = await db("advertisers?select=id,name,business,email,phone,plan,status,end_date,renewal_requested_at&status=in.(active,trial)&end_date=not.is.null&limit=5000");
    const hiddenToday = [];
    for (const a of advs) {
      const d = days(a.end_date);
      const trial = a.status === "trial";
      const what = trial ? "תקופת הניסיון" : "המנוי";
      const hideDay = isoAdd(String(a.end_date).slice(0, 10), grace + 1);
      if (d === -(grace + 1)) hiddenToday.push(a);
      if (!a.email) continue;
      const hi = `שלום ${esc(a.name || "")}, `;
      if (d >= 0) {
        const t = steps.find((x) => d <= x);
        if (t === undefined) continue;
        const when = d === 0 ? "היום" : d === 1 ? "מחר" : `בעוד ${d} ימים`;
        plan.push({ kind: "reminder", key: `sub-remind:${a.id}:${a.end_date}:${t}`, to: a.email, replyTo: adminTo || undefined,
          subject: `${what} של ${a.business || a.name} ב${site} מסתיים ${when}`,
          html: L({ title: `${what} מסתיים ${when}`, preheader: `בתוקף עד ${fmtDate(a.end_date)}`,
            body: p(`${hi}${what} של <b>${esc(a.business || a.name)}</b> ב${esc(site)} בתוקף עד <b>${fmtDate(a.end_date)}</b>.`)
              + p("כדי שהמתחם ימשיך להופיע באתר ולקבל פניות בלי הפסקה, מבקשים חידוש בלחיצה אחת בממשק המארחים, ואנחנו חוזרים אליכם.")
              + (grace ? p(`<span style="color:#5b6b75;font-size:13px">אם המנוי לא יחודש, המתחם ימשיך להופיע עוד ${grace} ימים אחרי הסיום ואז יוסתר עד החידוש. שום נתון לא נמחק.</span>`) : ""),
            cta: account }) });
      } else if (-d <= grace) {
        plan.push({ kind: "ended", key: `sub-ended:${a.id}:${a.end_date}`, to: a.email, replyTo: adminTo || undefined,
          subject: `${what} ב${site} הסתיים – המתחם יוסתר ב־${fmtDate(hideDay)}`,
          html: L({ title: `${what} הסתיים`, body: p(`${hi}${what} של <b>${esc(a.business || a.name)}</b> הסתיים ב־${fmtDate(a.end_date)}.`) + p(`המתחם עדיין מופיע באתר עד ${fmtDate(isoAdd(hideDay, -1))}. כדי שלא יוסתר, מבקשים חידוש עכשיו.`), cta: account }) });
      } else if (-d <= grace + 14) {
        plan.push({ kind: "hidden", key: `sub-hidden:${a.id}:${a.end_date}`, to: a.email, replyTo: adminTo || undefined,
          subject: `המתחם ${a.business || a.name} הוסתר מ${site}`,
          html: L({ title: "המתחם הוסתר מהאתר", body: p(`${hi}${what} הסתיים ב־${fmtDate(a.end_date)}, ולכן המתחם לא מוצג כרגע לאורחים.`) + p("כל הפרטים, התמונות, היומן והפניות שמורים. בחידוש המנוי המתחם חוזר לאוויר מיד."), cta: account }) });
      }
    }

    /* ------------------------------------------------ 3. בקשות חוות דעת אוטומטיות */
    if (s.auto_review_requests !== false) {
      const delay = Math.max(0, Math.min(30, Number(s.review_delay_days) || 1));
      const upto = isoAdd(today, -delay), from = isoAdd(today, -21);
      const leads = await db(`leads?select=id,name,email,listing_id,listing_name,review_token,check_out&status=eq.closed&check_out=lte.${upto}&check_out=gte.${from}&email=neq.&listing_id=not.is.null&order=check_out.asc&limit=300`);
      if (leads.length) {
        const done = new Set((await db(`reviews?select=lead_id&lead_id=in.${inList(leads.map((q) => q.id))}`)).map((r) => r.lead_id));
        const manual = new Set((await db(`mail_log?select=key&key=like.${enc("review-request:*")}&sent_at=gte.${enc(from)}`)).map((r) => r.key.split(":")[1]));
        for (const q of leads) {
          if (done.has(q.id) || manual.has(q.id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) continue;
          plan.push({ kind: "review", key: `review-auto:${q.id}`, lead: q, to: q.email, subject: `איך היה ב${q.listing_name}? נשמח לשמוע` });
        }
      }
    }

    /* ------------------------------------------------ 4. סיכום יומי למנהל */
    let digest = null;
    if (s.admin_digest !== false && adminTo) {
      const since = new Date(Date.now() - 864e5).toISOString();
      const [newLeads, apps, pendL, pendR, renewals] = await Promise.all([
        db(`leads?select=id,source&created_at=gte.${enc(since)}&limit=2000`),
        db("applications?select=id,business,name,verified&status=eq.new&limit=200"),
        db("listings?select=id,name&pending=not.is.null&limit=200"),
        db("reviews?select=id&status=eq.pending&limit=500"),
        db(`advertisers?select=id,business,name&renewal_requested_at=gte.${enc(since)}&limit=200`)
      ]);
      const expiring = advs.filter((a) => { const d = days(a.end_date); return d >= 0 && d <= 7; });
      const lines = [
        row("פניות ב־24 שעות", newLeads.length ? String(newLeads.length) : ""),
        row("בקשות הצטרפות", apps.length ? apps.map((x) => esc(x.business || x.name) + (x.verified ? " ✓" : "")).join(", ") : ""),
        row("עדכוני תוכן לאישור", pendL.length ? pendL.map((x) => esc(x.name)).join(", ") : ""),
        row("חוות דעת לאישור", pendR.length ? String(pendR.length) : ""),
        row("ביקשו חידוש", renewals.length ? renewals.map((x) => esc(x.business || x.name)).join(", ") : ""),
        row("מסתיימים השבוע", expiring.length ? expiring.map((a) => `${esc(a.business || a.name)} (${fmtDate(a.end_date)})`).join(", ") : ""),
        row("הוסתרו היום", hiddenToday.length ? hiddenToday.map((a) => esc(a.business || a.name)).join(", ") : "")
      ].filter(Boolean);
      if (lines.length) {
        digest = { kind: "digest", key: `digest:${today}`, to: adminTo, subject: `סיכום יומי – ${site} · ${fmtDate(today)}`,
          html: L({ title: "מה קורה באתר היום", body: table(lines.join("")), cta: base && { href: `${base}/admin.html`, label: "לפאנל הניהול" } }) };
        plan.push(digest);
      }
    }

    /* ------------------------------------------------ שליחה */
    const out = { ok: true, dry, today, planned: plan.length, sent: 0, skipped: 0, errors: [], items: [] };
    if (noMail) out.note = "RESEND_API_KEY לא מוגדר: מיילים לא נשלחים";
    if (dry) {
      const keys = plan.map((m) => m.key);
      const sentKeys = new Set();
      for (let i = 0; i < keys.length; i += 40) (await db(`mail_log?select=key&key=in.${inList(keys.slice(i, i + 40))}`)).forEach((r) => sentKeys.add(r.key));
      out.items = plan.map((m) => ({ kind: m.kind, to: m.to, subject: m.subject, already: sentKeys.has(m.key) }));
      out.planned = out.items.filter((x) => !x.already).length;
      return send(res, 200, out);
    }
    for (const m of noMail ? [] : plan) {
      if (out.sent >= MAX_MAILS) { out.more = true; break; }
      if (!(await once(m.key, { to: m.to, subject: m.subject }))) { out.skipped++; continue; }
      try {
        let mail = m;
        if (m.kind === "review") {
          const q = Object.assign({}, m.lead);
          if (!q.review_token) {
            q.review_token = crypto.randomBytes(16).toString("hex");
            await db(`leads?id=eq.${enc(q.id)}`, { method: "PATCH", body: { review_token: q.review_token } });
          }
          mail = Object.assign(reviewRequest({ L, base, q }), { replyTo: adminTo || undefined });
        }
        await sendMail(mail);
        out.sent++;
        out.items.push({ kind: m.kind, to: m.to, subject: m.subject });
        await sleep(550); /* Resend: עד 2 בקשות בשנייה בחשבון החינמי */
      } catch (e) {
        await forget(m.key);
        out.errors.push({ kind: m.kind, to: m.to, error: String(e.message || e).slice(0, 200) });
      }
    }

    /* ------------------------------------------------ 5. תחזוקה */
    const ago = (n) => enc(new Date(Date.now() - n * 864e5).toISOString());
    const maint = await Promise.allSettled([
      db(`audit_log?at=lt.${ago(365)}`, { method: "DELETE" }),
      db(`mail_log?sent_at=lt.${ago(400)}`, { method: "DELETE" }),
      db(`subscribers?confirmed_at=is.null&created_at=lt.${ago(30)}`, { method: "DELETE" })
    ]);
    out.maintenance = maint.map((x) => x.status);
    /* מתחם שהוסתר היום: מעדכנים גם את דפי גוגל (בנייה מחדש) */
    if (hiddenToday.length && env("DEPLOY_HOOK_URL")) {
      try { await fetch(env("DEPLOY_HOOK_URL"), { method: "POST" }); out.rebuild = true; } catch (e) { out.rebuild = false; }
    }
    return send(res, out.errors.length && !out.sent ? 502 : 200, out);
  } catch (e) {
    return send(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
}
