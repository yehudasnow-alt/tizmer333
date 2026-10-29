/* תמרה – פאנל ניהול (admin.html) וממשק מארחים (owner.html) */
(function () {
  "use strict";
  const T = window.Tamara;
  const { $, $$, esc } = T;
  const I = T.icon;
  document.documentElement.lang = "he";
  document.documentElement.dir = "rtl";
  const MODE = document.body.dataset.mode === "owner" ? "owner" : "admin";
  const IS_ADMIN = MODE === "admin";
  const LOGO_W = "assets/img/brand/logo-horizontal-white.svg";
  const LOGO_S = "assets/img/brand/logo-stacked-ink.svg";

  const A = {
    ready: false, authed: false, loginMsg: null,
    listings: [], advertisers: [], leads: [], applications: [], reviews: [], articles: [], places: [], subscribers: [], stats: {}, settings: T.clone(T.DEFAULT_SETTINGS),
    pf: { region: "", kind: "" }, sf: { region: "" },
    drafts: {}, editId: null, calStart: null, calUnit: "",
    lf: { q: "", status: "all", region: "" }, qf: { status: "all", listing: "", q: "", source: "" }, rf: "pending",
    billMonth: T.monthKey(T.today()), exportText: "", pendingImport: null, editArticle: null, maps: []
  };
  const siteURL = (h) => "index.html" + (h ? "#" + h : "");
  const siteAbs = (h) => new URL(siteURL(h), location.href).href;
  const advName = (id) => { const a = A.advertisers.find((x) => x.id === id); return a ? a.business || a.name : ""; };
  const leadsFor = (id) => A.leads.filter((q) => q.listing_id === id);
  const planName = (k) => (T.PLANS.find((p) => p.key === k) || { name: k || "—" }).name;
  const nightsTxt = (q) => { const n = T.nightsBetween(q.check_in, q.check_out); return n > 0 ? (n === 1 ? "לילה אחד" : `${n} לילות`) : ""; };
  const pendingReviews = () => A.reviews.filter((r) => r.status === "pending");
  const pendingListings = () => A.listings.filter((l) => l.pending);
  const statusPill = (k) => {
    const tone = { new: "info", in_progress: "warn", closed: "ok", lost: "muted", approved: "ok", rejected: "muted", pending: "warn" }[k] || "muted";
    const name = k === "approved" ? "אושרה" : k === "rejected" ? "נדחתה" : k === "pending" ? "ממתינה" : T.statusName(T.LEAD_STATUS, k);
    return `<span class="pill pill-${tone}">${esc(name)}</span>`;
  };
  const advPill = (a) => {
    const days = T.daysUntil(a.end_date);
    if (a.status === "paused") return `<span class="pill pill-muted">מושהה</span>`;
    if (days === null) return `<span class="pill pill-muted">ללא תאריך</span>`;
    if (days < 0) return `<span class="pill pill-danger">הסתיים לפני ${-days} ימים</span>`;
    if (days <= 30) return `<span class="pill pill-warn">${days === 0 ? "מסתיים היום" : `עוד ${days} ימים`}</span>`;
    return `<span class="pill pill-ok">${a.status === "trial" ? "ניסיון · " : ""}עד ${T.fmtDate(a.end_date)}</span>`;
  };
  const ph = (title, sub, acts) => `<div class="ph"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${acts ? `<div class="acts">${acts}</div>` : ""}</div>`;
  const reviewLink = async (q) => {
    let token = q.review_token;
    if (!token) { token = T.token(); await T.store.updateLead(q.id, { review_token: token }); q.review_token = token; }
    return siteAbs("review-" + token);
  };

  /* ================================================================ שגיאות הרשאה */
  /* כשמסד הנתונים חוסם פעולה (RLS), בודקים מי מחובר ומסבירים בדיוק מה לתקן, במקום הודעה טכנית */
  const isDenied = (ex) => /row-level security|permission denied|42501|not authorized|JWT/i.test(String(ex && ((ex.message || "") + " " + (ex.code || ""))));
  async function fail(prefix, ex) {
    if (T.isLive && isDenied(ex)) { await explainDenied(ex); return; }
    T.toast(prefix + ": " + ((ex && ex.message) || ex), "err");
  }
  async function explainDenied(ex) {
    let w = { email: "", admin: false };
    try { w = await T.store.whoami(); } catch (e) {}
    if (!w.email) {
      try { await T.store.signOut(); } catch (e) {}
      A.authed = false; A.loginMsg = { tone: "warn", text: "ההתחברות פגה, ולכן הפעולה לא נשמרה. היכנסו שוב ונסו שוב." }; render();
      return;
    }
    if (!IS_ADMIN) { T.toast(`אין הרשאה לפעולה הזו לחשבון ${w.email}. אם זו טעות, פנו לצוות האתר.`, "err"); return; }
    const q = (x) => String(x).replace(/'/g, "''");
    const fix = w.admin
      ? { text: `החשבון שמחובר (${w.email}) מוגדר כמנהל, אבל כללי ההרשאה במסד הנתונים לא מעודכנים. ב-Supabase פותחים SQL Editor, מדביקים שוב את כל הקובץ supabase/schema.sql מהמאגר ולוחצים Run. אחר כך מנסים שוב.`, sql: "" }
      : { text: `אתם מחוברים בתור ${w.email}, אבל האימייל הזה לא רשום כמנהל במסד הנתונים, ולכן השמירה נחסמה. ב-Supabase פותחים SQL Editor, מריצים את השורה הזו, ואז יוצאים ונכנסים שוב:`, sql: `insert into public.admins (email) values (lower('${q(w.email)}')) on conflict do nothing;` };
    const old = $("#deny"); if (old) old.remove();
    /* חלון נפרד, כדי שטופס שהיה פתוח (למשל לקוח חדש) לא יימחק */
    document.body.insertAdjacentHTML("beforeend", `<div class="modal-back" id="deny" style="z-index:120"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="deny-title">
      <div class="modal-head"><h2 id="deny-title">הפעולה נחסמה</h2><button class="icon-btn" type="button" data-act="deny-close" aria-label="סגירה">${I("x")}</button></div>
      <p style="line-height:1.7">${esc(fix.text)}</p>
      ${fix.sql ? `<span class="copy-field"><input class="input" dir="ltr" readonly value="${esc(fix.sql)}" aria-label="פקודת SQL"><button class="mini-btn" type="button" data-act="copy" data-text="${esc(fix.sql)}" aria-label="העתקה">${I("copy")}</button></span>` : ""}
      <p class="hint">ההודעה המקורית: ${esc(ex && ex.message)}</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-line" type="button" data-act="logout">יציאה</button><button class="btn btn-primary" type="button" data-act="deny-close">הבנתי</button></div></div></div>`);
    $('#deny [data-act="deny-close"]').focus();
  }

  /* ================================================================ layout */
  function shell(content) {
    const cur = location.hash.slice(1) || (IS_ADMIN ? "dashboard" : "my");
    const newLeads = A.leads.filter((q) => q.status === "new").length;
    const items = IS_ADMIN
      ? [["dashboard", "chart", "סקירה"], ["listings", "home", "מתחמים", A.listings.length], ["leads", "inbox", "פניות", newLeads], ["moderation", "shield", "אישורי תוכן", pendingListings().length], ["reviews", "star", "חוות דעת", pendingReviews().length],
        ["advertisers", "briefcase", "לקוחות"], ["billing", "receipt", "חיובים"], ["applications", "user-plus", "בקשות הצטרפות", A.applications.filter((a) => a.status === "new").length], ["places", "map", "מה עושים באזור"], ["articles", "book", "מגזין"], ["subscribers", "mail", "מנויי דיוור"], ["site-settings", "sliders", "הגדרות"]]
      : [["my", "home", "המתחמים שלי"], ["leads", "inbox", "פניות", newLeads], ["reviews", "star", "חוות דעת"]];
    const isCur = (k) => cur === k || (k === "listings" && (cur.startsWith("edit-") || cur === "new")) || (k === "my" && cur.startsWith("edit-"));
    return `<div class="app">
      <aside class="side">
        <a class="brand" href="${siteURL()}" title="לאתר"><img src="${LOGO_W}" alt="${esc(A.settings.site_name)}"></a>
        <div class="panel-name">${IS_ADMIN ? "ניהול האתר" : "ממשק מארחים"}</div>
        ${T.isLive ? "" : `<div class="mode-tag"><b>מצב הדגמה</b><br>הנתונים נשמרים בדפדפן הזה בלבד.</div>`}
        <nav aria-label="ניווט בפאנל">${items.map(([k, ic, t, n]) => `<a href="#${k}" ${isCur(k) ? 'aria-current="page"' : ""} title="${t}">${I(ic)}<span class="lbl">${t}</span>${n ? `<span class="count">${n}</span>` : ""}</a>`).join("")}</nav>
        <div class="side-foot">
          <a href="${siteURL()}" target="_blank" rel="noopener">${I("external")}<span>צפייה באתר</span></a>
          ${IS_ADMIN ? `<a href="owner.html">${I("users")}<span>ממשק מארחים</span></a>` : ""}
          <button type="button" data-act="logout">${I("logout")}<span>יציאה</span></button>
        </div>
      </aside>
      <main class="main" id="main" tabindex="-1">${content}</main>
    </div>`;
  }

  /* ================================================================ login */
  function viewLogin() {
    const msg = A.loginMsg;
    let body;
    if (!T.isLive) {
      body = IS_ADMIN
        ? `<h1>כניסה לניהול</h1><p>האתר במצב הדגמה: הכניסה פתוחה והנתונים נשמרים רק בדפדפן הזה. באתר החי הכניסה היא באימייל וסיסמה.</p><button class="btn btn-primary btn-lg btn-block" type="button" data-act="demo-admin">כניסה להדגמה</button>`
        : `<h1>כניסת מארחים</h1><p>במצב הדגמה בוחרים מפרסם ורואים את המסך שלו. באתר החי המארח נכנס עם קישור למייל או עם Google.</p>
           <label class="field"><span>כניסה בתור</span><select class="select" id="demo-owner">${A.advertisers.map((a) => `<option value="${esc(a.id)}">${esc(a.business)} · ${esc(a.name)}</option>`).join("")}</select></label>
           <button class="btn btn-primary btn-lg btn-block" type="button" data-act="demo-owner">כניסה</button>`;
    } else if (IS_ADMIN) {
      body = `<h1>כניסה לניהול</h1><form data-form="login" style="display:grid;gap:12px" novalidate>
          <label class="field"><span>אימייל</span><input class="input" name="email" type="email" dir="ltr" autocomplete="username" required></label>
          <label class="field"><span>סיסמה</span><input class="input" name="password" type="password" dir="ltr" autocomplete="current-password" required></label>
          <button class="btn btn-primary btn-lg btn-block" type="submit">כניסה</button></form>`;
    } else {
      body = `<h1>כניסת מארחים</h1><p>הזינו את האימייל שמסרתם לנו, ונשלח אליו קישור כניסה.</p>
        <form data-form="owner-login" style="display:grid;gap:12px" novalidate><label class="field"><span>אימייל</span><input class="input" name="email" type="email" dir="ltr" autocomplete="email" required></label>
        <button class="btn btn-primary btn-lg btn-block" type="submit">שליחת קישור כניסה</button></form>
        <button class="btn btn-line btn-block" type="button" data-act="google">כניסה עם חשבון Google</button>`;
    }
    return `<div class="login"><div class="login-card"><img class="logo" src="${LOGO_S}" alt="${esc(A.settings.site_name)}">${body}${msg ? `<p class="note note-${msg.tone || "info"}" role="status">${esc(msg.text)}</p>` : ""}<a class="link-more" style="justify-self:center" href="${siteURL()}">${I("back")} חזרה לאתר</a></div></div>`;
  }

  /* ================================================================ dashboard */
  function billingFor(a, month) {
    const [y, m] = month.split("-").map(Number);
    const from = `${month}-01`, to = T.iso(new Date(y, m, 0));
    const ids = new Set(A.listings.filter((l) => l.owner_id === a.id).map((l) => l.id));
    const leads = A.leads.filter((q) => ids.has(q.listing_id) && (q.created_at || "").slice(0, 10) >= from && (q.created_at || "").slice(0, 10) <= to).length;
    const model = a.billing_model || "subscription";
    const sub = model === "per_lead" ? 0 : Number((A.settings.plan_prices || {})[a.plan]) || 0;
    const perLead = model === "subscription" ? 0 : leads * (Number(a.lead_price) || Number(A.settings.lead_price_default) || 0);
    const sponsored = A.listings.filter((l) => l.owner_id === a.id && l.sponsored_until && l.sponsored_until >= from).length * (Number(A.settings.sponsored_price) || 0);
    const active = a.status !== "paused" && a.status !== "ended" && (!a.start_date || a.start_date <= to);
    const total = active ? sub + perLead + sponsored : 0;
    const paid = (a.payments || []).find((p) => p.month === month);
    return { leads, sub: active ? sub : 0, perLead: active ? perLead : 0, sponsored: active ? sponsored : 0, total, paid, model, active };
  }
  function viewDashboard() {
    const active = A.listings.filter((l) => l.active).length;
    const newLeads = A.leads.filter((q) => q.status === "new");
    const expiring = A.advertisers.filter((a) => { const d = T.daysUntil(a.end_date); return d !== null && d <= 30 && a.status !== "paused"; }).sort((a, b) => (a.end_date || "").localeCompare(b.end_date || ""));
    const since = Date.now() - 30 * 864e5;
    const recent = A.leads.filter((q) => new Date(q.created_at).getTime() >= since);
    const views = Object.values(A.stats).reduce((s, x) => s + x.v, 0);
    const bill = A.advertisers.map((a) => billingFor(a, A.billMonth));
    const expected = bill.reduce((s, b) => s + b.total, 0);
    const per = {};
    recent.forEach((q) => (per[q.listing_id] = (per[q.listing_id] || 0) + 1));
    const top = Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = top.length ? top[0][1] : 1;
    const waiting = pendingListings().length + pendingReviews().length;
    return ph("סקירה", `היום ${T.fmtLong(T.iso(T.today()))}`, `<a class="btn btn-primary" href="#new">${I("plus")}מתחם חדש</a>`) + `
      <div class="kpis">
        <a class="kpi ${newLeads.length ? "attn" : ""}" href="#leads"><span>${I("inbox")}פניות חדשות</span><b>${newLeads.length}</b><small>${recent.length} פניות ב־30 יום · ${T.num(views)} צפיות${A.subscribers.length ? ` · ${A.subscribers.length} מנויי דיוור` : ""}</small></a>
        <a class="kpi ${waiting ? "attn" : ""}" href="#${pendingListings().length ? "moderation" : "reviews"}"><span>${I("shield")}ממתין לאישור</span><b>${waiting}</b><small>${pendingListings().length} עדכוני תוכן · ${pendingReviews().length} חוות דעת</small></a>
        <a class="kpi" href="#billing"><span>${I("receipt")}הכנסה צפויה החודש</span><b>${T.money(expected)}</b><small>${bill.filter((b) => b.paid).length} מתוך ${bill.filter((b) => b.total).length} שילמו</small></a>
        <a class="kpi ${expiring.length ? "attn" : ""}" href="#advertisers"><span>${I("clock")}מנויים לחידוש</span><b>${expiring.length}</b><small>${active} מתחמים פעילים באתר</small></a>
      </div>
      <div class="cols2">
        <div class="panel"><h2>פניות אחרונות <a class="link-more" href="#leads">לכל הפניות ${I("fwd")}</a></h2>${A.leads.length ? A.leads.slice(0, 6).map(leadRow).join("") : `<p class="muted">עוד לא הגיעו פניות.</p>`}</div>
        <div>
          <div class="panel"><h2>מנויים לחידוש</h2>${expiring.length ? `<ul class="list-plain">${expiring.map((a) => `<li><span><b>${esc(a.business || a.name)}</b><br><span class="muted" style="font-size:var(--t-xs)">${esc(a.name)} · ${planName(a.plan)}</span></span><span style="display:grid;gap:6px;justify-items:end">${advPill(a)}${a.phone ? `<a class="link-more" href="${esc(T.waLink(a.phone, `שלום ${a.name}, המנוי של ${a.business} ב${A.settings.site_name} מסתיים ב־${T.fmtDate(a.end_date)}. נשמח לחדש!`))}" target="_blank" rel="noopener">${I("chat")}וואטסאפ</a>` : ""}</span></li>`).join("")}</ul>` : `<p class="muted">אין מנויים שמסתיימים בחודש הקרוב.</p>`}</div>
          <div class="panel"><h2>פניות לפי מתחם · 30 יום</h2>${top.length ? `<div class="bar-list">${top.map(([id, n]) => { const l = A.listings.find((x) => x.id === id); return `<div class="bar-item"><span>${esc(l ? l.name : "מתחם שנמחק")}</span><b class="num">${n}</b><span class="track"><i style="width:${(n / max) * 100}%"></i></span></div>`; }).join("")}</div>` : `<p class="muted">אין עדיין נתונים.</p>`}</div>
        </div>
      </div>`;
  }
  function leadRow(q) {
    const det = leadDetails(q);
    return `<div class="lead-row"><div><div class="who">${esc(q.name)} <span class="muted" style="font-weight:400">· ${esc(q.listing_name || "")}${q.unit_name ? " · " + esc(q.unit_name) : ""}</span> ${q.source && q.source !== "form" ? sourcePill(q) : ""}</div>
      <div class="what">${datesTxt(q) ? datesTxt(q) + " · " : ""}${nightsTxt(q) ? nightsTxt(q) + " · " : ""}${q.check_in || q.source === "find" ? partyTxt(q) + " · " : ""}${q.est_total ? T.money(q.est_total) + " · " : ""}התקבלה ${T.fmtStamp(q.created_at)}</div>
      ${det.length ? `<div class="what">${det.join(" · ")}</div>` : ""}
      ${q.message ? `<div class="msg">״${esc(q.message)}״</div>` : ""}</div>
      <div style="display:grid;gap:6px;justify-items:end">${statusPill(q.status)}${/\d{6,}/.test(String(q.phone).replace(/\D/g, "")) ? `<a class="link-more" href="${esc(T.waLink(q.phone, `שלום ${q.name}, לגבי הבקשה שלך${q.listing_id ? " ל" + q.listing_name : ""}`))}" target="_blank" rel="noopener">${I("chat")}לחזור לאורח</a>` : ""}</div></div>`;
  }

  /* ================================================================ listings */
  function viewListings() {
    const f = A.lf;
    let list = A.listings.slice();
    if (f.q) list = list.filter((l) => (l.name + " " + l.settlement + " " + advName(l.owner_id)).includes(f.q));
    if (f.region) list = list.filter((l) => l.region === f.region);
    if (f.status === "active") list = list.filter((l) => l.active);
    if (f.status === "hidden") list = list.filter((l) => !l.active);
    if (f.status === "featured") list = list.filter((l) => l.featured);
    if (f.status === "sponsored") list = list.filter(T.isSponsored);
    const cnt = (fn) => A.listings.filter(fn).length;
    const tabs = [["all", "הכל", A.listings.length], ["active", "פעילים", cnt((l) => l.active)], ["hidden", "מוסתרים", cnt((l) => !l.active)], ["featured", "נבחרי העונה", cnt((l) => l.featured)], ["sponsored", "ממומנים", cnt(T.isSponsored)]];
    return ph("מתחמים", "מתחם מוסתר לא מופיע לאורחים. צפיות ופניות מתייחסות ל־30 הימים האחרונים.", `<a class="btn btn-primary" href="#new">${I("plus")}מתחם חדש</a>`) + `
      <div class="panel">
        <div class="toolbar">
          <input class="input" type="search" id="lf-q" placeholder="חיפוש לפי שם, יישוב או מפרסם" value="${esc(f.q)}" aria-label="חיפוש מתחמים">
          <select class="select" id="lf-region" aria-label="אזור"><option value="">כל האזורים</option>${T.REGIONS.map((r) => `<option value="${r.key}" ${f.region === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
          <span class="seg-tabs" role="group" aria-label="סטטוס">${tabs.map(([k, t, n]) => `<button type="button" data-act="lf-status" data-v="${k}" aria-pressed="${f.status === k}">${t} · ${n}</button>`).join("")}</span>
        </div>
        ${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>מתחם</th><th>מפרסם</th><th>מחיר ללילה</th><th>צפיות</th><th>פניות</th><th>סטטוס</th><th></th></tr></thead><tbody>
          ${list.map((l) => { const st = A.stats[l.id] || { v: 0 }; return `<tr data-row="${esc(l.id)}">
            <td><img class="thumb" src="${esc(T.thumbOf(l))}" alt=""></td>
            <td><a class="name" href="#edit-${esc(l.id)}">${esc(l.name)}</a><div class="sub">${esc(T.typeOf(l.type).name)} · ${esc(l.settlement)}, ${esc(T.regionOf(l.region).name)}${T.unitsOf(l).length > 1 ? ` · ${T.unitsOf(l).length} יחידות` : ""}</div></td>
            <td>${esc(advName(l.owner_id)) || '<span class="muted">—</span>'}</td>
            <td><span class="big">${T.money(T.fromPrice(l))}</span>${T.unitsOf(l).length > 1 ? '<div class="sub">החל מ</div>' : ""}</td>
            <td class="num">${T.num(st.v)}</td><td class="num">${leadsFor(l.id).length}</td>
            <td style="white-space:nowrap">${l.active ? '<span class="pill pill-ok">מוצג</span>' : '<span class="pill pill-muted">מוסתר</span>'} ${l.pending ? '<span class="pill pill-warn">ממתין לאישור</span>' : ""} ${T.isSponsored(l) ? '<span class="pill pill-navy">ממומן</span>' : ""} ${l.exclusive ? '<span class="pill pill-info">בלעדי</span>' : ""} ${l.best_price ? '<span class="pill pill-info">מחיר הכי טוב</span>' : ""}</td>
            <td><div class="acts">
              <button class="mini-btn ${l.active ? "on" : ""}" type="button" data-act="toggle" data-k="active" data-id="${esc(l.id)}" title="${l.active ? "הסתרה" : "הצגה"}" aria-label="${l.active ? "הסתרת" : "הצגת"} ${esc(l.name)}">${I(l.active ? "eye" : "eye-off")}</button>
              <button class="mini-btn ${l.featured ? "on" : ""}" type="button" data-act="toggle" data-k="featured" data-id="${esc(l.id)}" title="נבחרי העונה" aria-pressed="${l.featured}" aria-label="נבחרי העונה: ${esc(l.name)}">${I("star")}</button>
              <button class="mini-btn ${T.isSponsored(l) ? "on" : ""}" type="button" data-act="sponsor" data-id="${esc(l.id)}" title="מיקום ממומן ל־30 יום" aria-pressed="${T.isSponsored(l)}" aria-label="מיקום ממומן: ${esc(l.name)}">${I("megaphone")}</button>
              <a class="mini-btn" href="#edit-${esc(l.id)}" title="עריכה" aria-label="עריכת ${esc(l.name)}">${I("edit")}</a>
              <a class="mini-btn" href="${siteURL("stay-" + l.id)}" target="_blank" rel="noopener" title="צפייה באתר" aria-label="צפייה באתר">${I("external")}</a>
              <button class="mini-btn" type="button" data-act="ask-del" data-kind="listing" data-id="${esc(l.id)}" title="מחיקה" aria-label="מחיקת ${esc(l.name)}">${I("trash")}</button>
            </div></td></tr>`; }).join("")}
        </tbody></table></div>` : `<div class="empty"><h3>אין מתחמים שמתאימים לסינון</h3><a class="btn btn-primary" href="#new">${I("plus")}הוספת מתחם</a></div>`}
      </div>`;
  }

  /* ================================================================ editor */
  const blankListing = () => T.normalizeListing({ id: "", name: "", type: "zimmer", region: "galil-elyon", settlement: "", tagline: "", description: "", guests_max: 2, bedrooms: 1, bathrooms: 1, units: 1, min_nights: 1, price_weekday: "", price_weekend: "", price_holiday: "", guests_base: 2, extra_guest_price: "", deal_label: "", deal_text: "", lastminute_pct: 0, amenities: [], audience: ["couples"], photos: [], blocked_dates: [], rooms: [], extras: [], seasons: [], phone: "", whatsapp: "", email: "", owner_id: "", featured: false, active: false });
  function draftFor(id) {
    if (A.drafts[id]) return A.drafts[id];
    let src = id === "new" ? blankListing() : A.listings.find((l) => l.id === id);
    if (!src) return null;
    if (!IS_ADMIN) src = T.withPending(src);
    A.drafts[id] = T.clone(src);
    return A.drafts[id];
  }
  const num = (d, name, label, extra) => `<label class="field"><span>${label}</span><input class="input num" type="number" inputmode="numeric" min="0" name="${name}" value="${esc(d[name] === 0 && name.startsWith("price_h") ? "" : d[name])}" ${extra || ""}></label>`;
  const txt = (d, name, label, extra) => `<label class="field"><span>${label}</span><input class="input" name="${name}" value="${esc(d[name])}" ${extra || ""}></label>`;
  /* שדות מקוננים (details.* / terms.*) נקראים לפי data-p */
  const getPath = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
  const setPath = (o, p, v) => { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach((k) => { if (!x[k] || typeof x[k] !== "object" || Array.isArray(x[k])) x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; };
  const pv = (d, p) => { const v = getPath(d, p); return v == null ? "" : v; };
  const pNum = (d, p, label, attrs) => `<label class="field"><span>${label}</span><input class="input num" type="number" inputmode="numeric" min="0" data-p="${p}" data-t="num" value="${esc(Number(pv(d, p)) ? pv(d, p) : "")}" ${attrs || ""}></label>`;
  const pTxt = (d, p, label, attrs, span) => `<label class="field${span ? " span2" : ""}"><span>${label}</span><input class="input" data-p="${p}" value="${esc(pv(d, p))}" ${attrs || ""}></label>`;
  const pArea = (d, p, label, ph, rows, lines) => `<label class="field span2"><span>${label}</span><textarea class="textarea" data-p="${p}" ${lines ? 'data-t="lines"' : ""} rows="${rows || 3}" style="min-height:${(rows || 3) * 26 + 20}px" placeholder="${esc(ph || "")}">${esc(lines ? (getPath(d, p) || []).join("\n") : pv(d, p))}</textarea></label>`;
  const pSel = (d, p, label, opts) => `<label class="field"><span>${label}</span><select class="select" data-p="${p}">${opts.map((o) => `<option value="${esc(o.key)}" ${String(pv(d, p)) === String(o.key) ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label>`;
  const pChk = (d, p, label, sub) => `<label class="check" style="align-items:center"><input type="checkbox" data-p="${p}" ${getPath(d, p) ? "checked" : ""}><span>${label}${sub ? `<small class="muted" style="display:block;font-size:var(--t-xs)">${sub}</small>` : ""}</span></label>`;
  const arrRows = (d, path, cols, addLabel) => {
    const rows = getPath(d, path) || [];
    return `<div class="rows-edit">${rows.map((r, i) => `<div class="row-edit">${cols.map((c) => c.sel
      ? `<label class="field"${c.w ? ` style="flex-basis:${c.w}"` : ""}><span>${c.label}</span><select class="select" data-arr="${path}" data-i="${i}" data-k="${c.k}">${c.sel.map((o) => `<option value="${esc(o.key)}" ${String(r[c.k]) === String(o.key) ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select></label>`
      : c.area ? `<label class="field" style="flex-basis:100%"><span>${c.label}</span><textarea class="textarea" rows="2" style="min-height:64px" data-arr="${path}" data-i="${i}" data-k="${c.k}">${esc(r[c.k] == null ? "" : r[c.k])}</textarea></label>`
      : `<label class="field"${c.w ? ` style="flex-basis:${c.w}"` : ""}><span>${c.label}</span><input class="input${c.num ? " num" : ""}" ${c.num ? `type="number" min="${c.min || 0}"${c.max ? ` max="${c.max}"` : ""} data-t="num"` : ""} data-arr="${path}" data-i="${i}" data-k="${c.k}" value="${esc(r[c.k] == null ? "" : r[c.k])}" ${c.ph ? `placeholder="${esc(c.ph)}"` : ""}></label>`).join("")}
      <button class="mini-btn" type="button" data-act="arr-del" data-arr="${path}" data-i="${i}" aria-label="הסרה">${I("trash")}</button></div>`).join("")}
      <button class="btn btn-line btn-sm" type="button" data-act="arr-add" data-arr="${path}" style="justify-self:start">${I("plus")}${addLabel}</button></div>`;
  };
  const ARR_NEW = {
    "terms.cancel": (rows) => ({ days: rows.length ? Math.max(0, Number(rows[rows.length - 1].days) - 7) : 7, fee: rows.length ? 100 : 0 }),
    "terms.packages": () => ({ name: "", price: 0, per: "guest_night" }),
    "details.faq": () => ({ q: "", a: "" })
  };
  const UNIT_AMEN_GROUPS = ["safety", "water", "inside", "outside", "fun"];
  const amenPicks = (sel, attr) => T.AMENITY_GROUPS.map((g) => { const items = T.AMENITIES.filter((a) => a.group === g.key); return `<p class="field-label" style="margin:14px 0 8px">${esc(g.name)}</p><div class="amen-picks chips">${items.map((a) => `<label><input type="checkbox" ${attr} value="${a.key}" ${sel.includes(a.key) ? "checked" : ""}>${I(a.icon)}${esc(a.name)}</label>`).join("")}</div>`; }).join("");
  function roomCard(d, r, i) {
    const n = (k, label, extra) => `<label class="field"><span>${label}</span><input class="input num" type="number" min="0" data-room="${i}" data-k="${k}" value="${esc(Number(r[k]) ? r[k] : "")}" ${extra || ""}></label>`;
    const pool = [...new Set([...(d.photos || []), ...(r.photos || [])])];
    return `<div class="unit-edit" data-i="${i}">
      <div class="unit-edit-head"><label class="field" style="flex:1"><span>שם היחידה</span><input class="input" data-room="${i}" data-k="name" value="${esc(r.name)}"></label>
        <button class="mini-btn" type="button" data-act="room-del" data-i="${i}" aria-label="הסרת ${esc(r.name)}" ${d.rooms.length < 2 ? "disabled" : ""}>${I("trash")}</button></div>
      <div class="g-auto">${n("guests_max", "אורחים לכל היותר", 'min="1"')}${n("guests_base", "כלולים במחיר")}${n("bedrooms", "חדרי שינה")}${n("beds", "מיטות")}${n("bathrooms", "חדרי רחצה")}${n("size", "גודל (מ״ר)")}</div>
      <div class="g-auto">${n("price_weekday", "₪ אמצ״ש")}${n("price_weekend", "₪ סופ״ש")}${n("price_holiday", "₪ חג")}${n("p2_weekday", "₪ אמצ״ש מ־2 לילות")}${n("p2_weekend", "₪ סופ״ש מ־2 לילות")}</div>
      <details class="unit-more"><summary>תיאור, מאפיינים ותמונות של היחידה <span class="hint">${[r.desc ? "יש תיאור" : "אין תיאור", (r.amenities || []).length + " מאפיינים", (r.photos || []).length + " תמונות"].join(" · ")}</span></summary>
        <label class="field" style="margin-top:10px"><span>תיאור קצר</span><textarea class="textarea" rows="2" style="min-height:64px" data-room="${i}" data-k="desc" maxlength="240" placeholder="מיטת קינג, ג׳קוזי ליד החלון, מרפסת לנוף">${esc(r.desc || "")}</textarea></label>
        <p class="field-label" style="margin:12px 0 8px">מה יש ביחידה</p>
        <div class="amen-picks chips">${T.AMENITIES.filter((a) => UNIT_AMEN_GROUPS.includes(a.group)).map((a) => `<label><input type="checkbox" data-ramen="${i}" value="${a.key}" ${(r.amenities || []).includes(a.key) ? "checked" : ""}>${I(a.icon)}${esc(a.name)}</label>`).join("")}</div>
        <p class="field-label" style="margin:12px 0 8px">תמונות היחידה <span class="hint">בוחרים מתמונות המתחם או מעלים חדשות</span></p>
        <div class="unit-photos">${pool.map((u) => `<label class="uph"><input type="checkbox" data-rphoto="${i}" value="${esc(u)}" ${(r.photos || []).includes(u) ? "checked" : ""}><img src="${esc(T.img(u, 240))}" alt=""></label>`).join("")}
          <label class="uph add">${I("upload")}<span>העלאה</span><input type="file" accept="image/*" multiple class="sr" data-room-photo="${i}"></label></div>
      </details></div>`;
  }
  function viewEditor(id) {
    const d = draftFor(id);
    if (!d) return ph("המתחם לא נמצא", "") + `<a class="btn btn-line" href="#${IS_ADMIN ? "listings" : "my"}">חזרה</a>`;
    A.editId = id;
    if (!d.details || typeof d.details !== "object") d.details = {};
    if (!d.terms || typeof d.terms !== "object") d.terms = {};
    const orig = A.listings.find((l) => l.id === id);
    const moderated = !IS_ADMIN && A.settings.moderation !== false;
    const t = d.terms;
    const secs = [["location", "לוקיישן", "איפה בדיוק, איך מגיעים, חניה"], ["vibe", "אווירה", "שקט, נוף, סגנון"], ["facilities", "מתקנים", "ג׳קוזי, בריכה, מטבח"], ["area", "מה עושים באזור", "מסלולים, מסעדות, יקבים (עם זמני נסיעה)"]];
    return ph(id === "new" ? "מתחם חדש" : esc(d.name || "עריכת מתחם"), id === "new" ? "ממלאים, שומרים, ומפעילים כשהכרטיס מוכן." : `עודכן ${T.fmtStamp(d.updated_at)}`, id === "new" ? "" : `<a class="btn btn-line" href="${siteURL("stay-" + d.id)}" target="_blank" rel="noopener">${I("external")}צפייה באתר</a>`) + `
      ${!IS_ADMIN && orig && orig.pending ? `<p class="note note-info" style="margin-bottom:14px">${I("shield")}<span>שינויי תוכן ששלחתם ממתינים לאישור צוות האתר (${T.fmtStamp(orig.pending._at)}). מחירים, יומן, יחידות ומדיניות מתעדכנים מיד.</span></p>` : moderated ? `<p class="note note-info" style="margin-bottom:14px">${I("info")}<span>שינויים בשם, בתיאור, בתמונות, במאפיינים ובתוכן הדף מתפרסמים אחרי אישור צוות האתר. מחירים, יומן, יחידות ומדיניות מתעדכנים מיד.</span></p>` : ""}
      <nav class="ed-jump" aria-label="קפיצה לחלק בטופס">${[["ed-main", "פרטים"], ["ed-photos", "תמונות"], ["ed-content", "תוכן הדף"], ["ed-units", "יחידות ומחירים"], ["ed-deals", "מבצעים והטבות"], ["ed-amen", "מאפיינים"], ["ed-policy", "מדיניות"], ["ed-calendar", "יומן"], ["ed-contact", "מיקום וקשר"]].map(([k, n]) => `<a href="#" data-act="ed-jump" data-to="${k}">${n}</a>`).join("")}</nav>
      <form class="editor" id="editor" data-form="listing" novalidate>
        <div>
          <section class="panel" id="ed-main"><h2>פרטי המתחם</h2><div class="form-grid">
            ${txt(d, "name", "שם המתחם", 'required maxlength="60"')}${txt(d, "settlement", "יישוב", 'required maxlength="40"')}
            <label class="field"><span>סוג אירוח</span><select class="select" name="type">${T.TYPES.map((x) => `<option value="${x.key}" ${d.type === x.key ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
            <label class="field"><span>אזור</span><select class="select" name="region">${T.REGIONS.map((r) => `<option value="${r.key}" ${d.region === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
            ${pTxt(d, "details.host_name", "שם המארחים (מוצג בדף)", 'maxlength="40" placeholder="רונית ואבי"')}
            ${pTxt(d, "details.ribbon", "סרט על הכרטיס (לא חובה)", 'maxlength="34" placeholder="מחירים מיוחדים לחורף"')}
            <label class="field span2"><span>משפט פתיחה (מופיע בכרטיס)</span><input class="input" name="tagline" maxlength="80" value="${esc(d.tagline)}" placeholder="למשל: סוויטות אבן עם ג׳קוזי מול החרמון"></label>
            <label class="field span2"><span>תיאור מלא</span><textarea class="textarea" name="description" rows="6" placeholder="מה יש בחדר, מה בחוץ, מה בסביבה. שורה ריקה מפרידה בין פסקאות.">${esc(d.description)}</textarea></label>
            <label class="field span2"><span>קישור לסרטון (YouTube או Vimeo, לא חובה)</span><input class="input" name="video_url" dir="ltr" value="${esc(d.video_url)}" placeholder="https://youtu.be/..."></label>
          </div></section>

          <section class="panel" id="ed-photos"><h2>תמונות <span class="hint">גוררים כדי לסדר · הראשונה היא תמונת השער · לכל תמונה קטגוריה לגלריה · עד 24</span></h2>
            <div class="photos" id="photos">${photosHTML(d)}</div>
            <p class="hint" style="margin-top:10px">${T.isLive ? (T.config.CLOUDINARY_CLOUD_NAME ? "התמונות עולות ל-Cloudinary ומוגשות בגודל המתאים לכל מסך." : "התמונות מוקטנות אוטומטית לפני ההעלאה.") : "במצב הדגמה התמונות נשמרות בדפדפן ויש מקום לכמה תמונות בלבד."}</p>
          </section>

          <section class="panel" id="ed-content"><h2>תוכן לדף המתחם <span class="hint">מופיע בכרטיסיות ״על המקום״ ובשאלות הנפוצות</span></h2>
            <div class="form-grid">${secs.map(([k, n, phx]) => pArea(d, "details.sections." + k, n, phx, 2)).join("")}
              ${pArea(d, "details.sections.good", "טוב לדעת (שורה לכל פריט)", "בחורף יורד שלג, כדאי רכב גבוה\nארוחת הבוקר מוגשת בין 8:00 ל־11:00", 3)}
              ${pArea(d, "details.included", "מה כלול באירוח (שורה לכל פריט)", "בקבוק יין\nקפה, תה וחלב\nחלוקים ונעלי בית", 4, true)}
            </div>
            <p class="field-label" style="margin:18px 0 8px">שאלות נפוצות <span class="hint">נוספות לשאלות שהאתר יוצר אוטומטית ממחירים ומדיניות</span></p>
            ${arrRows(d, "details.faq", [{ k: "q", label: "שאלה", w: "100%" }, { k: "a", label: "תשובה", area: true }], "שאלה")}
          </section>

          <section class="panel" id="ed-units"><h2>יחידות ומחירים</h2>
            <div class="toggle-row" style="border:0;padding-top:0"><span>המתחם כולל כמה יחידות נפרדות<small>לכל יחידה מחיר, קיבולת, תמונות ויומן משלה. האורחים יכולים להזמין כמה יחידות יחד.</small></span><button class="switch" type="button" role="switch" aria-checked="${d.rooms.length > 0}" data-act="rooms-toggle" aria-label="כמה יחידות במתחם"></button></div>
            ${d.rooms.length ? `<div class="rows-edit" id="rooms">${d.rooms.map((r, i) => roomCard(d, r, i)).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="room-add" style="justify-self:start">${I("plus")}יחידה נוספת</button></div>`
            : `<div class="g-auto">
              ${num(d, "guests_max", "אורחים לכל היותר", 'min="1"')}${num(d, "guests_base", "אורחים כלולים במחיר")}${num(d, "bedrooms", "חדרי שינה")}${pNum(d, "terms.beds", "מיטות")}${num(d, "bathrooms", "חדרי רחצה")}${pNum(d, "terms.size", "גודל (מ״ר)")}</div>
              <div class="g-auto" style="margin-top:10px">${num(d, "price_weekday", "₪ ללילה באמצ״ש", 'required min="1"')}${num(d, "price_weekend", "₪ ללילה בסופ״ש")}${num(d, "price_holiday", "₪ ללילה בחג")}${pNum(d, "terms.p2_weekday", "₪ אמצ״ש מ־2 לילות")}${pNum(d, "terms.p2_weekend", "₪ סופ״ש מ־2 לילות")}</div>`}
            <p class="field-label" style="margin:18px 0 8px">כללי מחיר לכל המתחם</p>
            <div class="g-auto">
              ${num(d, "min_nights", "לילות מינימום", 'min="1"')}${pNum(d, "terms.min_weekend", "מינימום בסופ״ש")}${pNum(d, "terms.min_holiday", "מינימום בחג")}
              ${num(d, "extra_guest_price", "₪ למבוגר נוסף ללילה")}${pNum(d, "terms.extra_child_price", "₪ לילד נוסף ללילה")}
            </div>
            <div class="form-grid" style="margin-top:10px">${pTxt(d, "terms.price_note", "הערה למחירון (לא חובה)", 'maxlength="140" placeholder="המחירים כוללים מע״מ וארוחת בוקר"', true)}</div>
            <p class="hint" style="margin-top:10px">סופ״ש = הלילות שמתחילים בחמישי ובשישי. מחיר חג חל על לילות החגים שבהגדרות האתר. ״מ־2 לילות״ הוא מחיר ללילה כשמזמינים שני לילות ומעלה (ריק = אותו מחיר).</p>
            <p class="field-label" style="margin:18px 0 8px">עונות (תוספת או הנחה באחוזים, ומינימום לילות לתקופה)</p>
            <div class="rows-edit">${d.seasons.map((s, i) => `<div class="row-edit">
              <label class="field"><span>שם</span><input class="input" data-season="${i}" data-k="label" value="${esc(s.label)}" placeholder="קיץ"></label>
              <label class="field"><span>מתאריך</span><input class="input" type="date" data-season="${i}" data-k="from" value="${esc(s.from)}"></label>
              <label class="field"><span>עד תאריך</span><input class="input" type="date" data-season="${i}" data-k="to" value="${esc(s.to)}"></label>
              <label class="field"><span>% שינוי</span><input class="input num" type="number" min="-50" max="100" data-season="${i}" data-k="pct" value="${esc(s.pct || "")}"></label>
              <label class="field"><span>מינימום לילות</span><input class="input num" type="number" min="0" max="14" data-season="${i}" data-k="min" value="${esc(s.min || "")}"></label>
              <button class="mini-btn" type="button" data-act="season-del" data-i="${i}" aria-label="הסרת עונה">${I("trash")}</button></div>`).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="season-add" style="justify-self:start">${I("plus")}עונה</button></div>
          </section>

          <section class="panel" id="ed-deals"><h2>מבצעים, חבילות והטבות</h2><div class="form-grid">
            ${txt(d, "deal_label", "תווית דיל", 'maxlength="22" placeholder="למשל: אמצע שבוע"')}${txt(d, "deal_text", "פירוט ההטבה", 'maxlength="90" placeholder="לילה שלישי בחצי מחיר בימים א׳–ד׳"')}
            <label class="field"><span>דקה 90: הנחה לסופ״ש הקרוב (%)</span><input class="input num" type="number" min="0" max="60" name="lastminute_pct" value="${esc(d.lastminute_pct || "")}" placeholder="0 = כבוי"></label>
            ${IS_ADMIN ? `<label class="field"><span>מיקום ממומן עד</span><input class="input" type="date" name="sponsored_until" value="${esc(d.sponsored_until || "")}"></label>` : ""}
          </div><p class="hint" style="margin-top:10px">דקה 90 מוריד אוטומטית את מחיר לילות חמישי ושישי הקרובים, רק אם הם עדיין פנויים, ומקפיץ את המתחם לראש האתר.</p>
            <p class="field-label" style="margin:18px 0 8px">הטבות (% הנחה שהאורח בוחר בטופס ההזמנה ומציג אישור בהגעה)</p>
            <div class="g-auto">${T.BENEFITS.map((b) => pNum(d, "terms.benefits." + b.key, esc(b.name) + " (%)", 'max="50"')).join("")}</div>
            <p class="field-label" style="margin:18px 0 8px">חבילות אירוח (האורח בוחר אחת: לינה בלבד או חבילה)</p>
            ${arrRows(d, "terms.packages", [{ k: "name", label: "חבילה", w: "220px", ph: "לינה וארוחת בוקר" }, { k: "price", label: "₪ תוספת", num: true }, { k: "per", label: "לפי", sel: T.EXTRA_PER }], "חבילה")}
            <p class="field-label" style="margin:18px 0 8px">תוספות ושירותים (האורח מסמן כמה שרוצה)</p>
            <div class="rows-edit">${d.extras.map((x, i) => `<div class="row-edit">
              <label class="field" style="flex-basis:220px"><span>תוספת</span><input class="input" data-extra="${i}" data-k="name" value="${esc(x.name)}" placeholder="עיסוי זוגי (60 דק׳)"></label>
              <label class="field"><span>₪ מחיר</span><input class="input num" type="number" min="0" data-extra="${i}" data-k="price" value="${esc(x.price || "")}" placeholder="0 = בתיאום"></label>
              <label class="field"><span>לפי</span><select class="select" data-extra="${i}" data-k="per">${T.EXTRA_PER.map((pp) => `<option value="${pp.key}" ${x.per === pp.key ? "selected" : ""}>${pp.name}</option>`).join("")}</select></label>
              <button class="mini-btn" type="button" data-act="extra-del" data-i="${i}" aria-label="הסרת תוספת">${I("trash")}</button></div>`).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="extra-add" style="justify-self:start">${I("plus")}תוספת</button></div>
          </section>

          <section class="panel" id="ed-amen"><h2>מה יש במתחם</h2>
            ${amenPicks(d.amenities, 'name="amenities"')}
            <p class="field-label" style="margin:16px 0 8px">מתאים ל</p>
            <div class="amen-picks chips">${T.AUDIENCE.map((a) => `<label><input type="checkbox" name="audience" value="${a.key}" ${d.audience.includes(a.key) ? "checked" : ""}>${a.name}</label>`).join("")}</div>
          </section>

          <section class="panel" id="ed-policy"><h2>שעות, מדיניות וחוקי הבית</h2>
            <div class="g-auto">${pTxt(d, "terms.checkin", "כניסה", 'placeholder="15:00" maxlength="16"')}${pTxt(d, "terms.checkout", "יציאה", 'placeholder="11:00" maxlength="16"')}${pTxt(d, "terms.checkin_sat", "כניסה בשבת", 'placeholder="18:00" maxlength="16"')}${pTxt(d, "terms.checkout_sat", "יציאה בשבת", 'placeholder="מוצאי שבת" maxlength="20"')}</div>
            <div class="g-auto" style="margin-top:10px">${pSel(d, "terms.kids", "ילדים", T.KIDS_POLICY)}${pNum(d, "terms.kids_age", "מגיל (אם רלוונטי)", 'max="18"')}${pSel(d, "terms.smoking", "עישון", T.SMOKING_POLICY)}</div>
            <div style="margin-top:12px">${pChk(d, "terms.couples_only", "לזוגות בלבד", "מסומן בכרטיס ובסינון ״לזוגות בלבד״")}</div>
            <p class="field-label" style="margin:18px 0 8px">מדיניות ביטול <span class="hint">מ־X ימים לפני ההגעה ומעלה → Y% דמי ביטול</span></p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="hint" style="align-self:center">תבנית מוכנה:</span>${T.CANCEL_PRESETS.map((c) => `<button class="btn btn-line btn-sm" type="button" data-act="cancel-preset" data-k="${c.key}">${esc(c.name)}</button>`).join("")}</div>
            ${arrRows(d, "terms.cancel", [{ k: "days", label: "מ־ימים לפני ההגעה", num: true, max: 365 }, { k: "fee", label: "% דמי ביטול", num: true, max: 100 }], "מדרגה")}
            <div class="form-grid" style="margin-top:10px">${pTxt(d, "terms.cancel_note", "הערה לביטול (לא חובה)", 'maxlength="160" placeholder="במצב ביטחוני מיוחד ניתן לדחות את ההגעה ללא עלות"', true)}</div>
            <div class="form-grid" style="margin-top:14px">${pArea(d, "details.rules", "חוקי הבית (שורה לכל כלל)", "שקט אחרי 23:00\nאין מנגל בשבת\nאין מערכות הגברה", 4, true)}</div>
          </section>

          <section class="panel" id="ed-calendar"><h2>יומן זמינות <span class="hint">לחיצה על יום מסמנת אותו כתפוס</span></h2><div id="ed-cal">${editCal(d)}</div></section>

          <section class="panel"><h2>סנכרון יומן (iCal)</h2>
            <p class="hint" style="margin-bottom:12px">מדביקים את קישור ה-iCal מ-Booking, Airbnb או אתר אחר, והתאריכים התפוסים שם נחסמים כאן אוטומטית. את קישור הייצוא מדביקים באתרים האחרים כדי שיחסמו תאריכים שנתפסו כאן.</p>
            <div class="rows-edit">${T.unitsOf(d).map((u, i) => `<div class="row-edit" style="flex-direction:column;align-items:stretch">
              <b style="font-weight:500">${esc(u.single ? "המתחם" : u.name || "יחידה")}</b>
              <label class="field"><span>ייבוא: קישור iCal מאתר אחר</span><input class="input" dir="ltr" ${u.single ? 'name="ical_url"' : `data-room="${i}" data-k="ical_url"`} value="${esc(u.ical_url || "")}" placeholder="https://admin.booking.com/hotel/hoteladmin/ical.html?..."></label>
              <div class="field"><span>ייצוא: קישור iCal של ${esc(A.settings.site_name)}</span>${d.id && T.store.icalExportUrl(d.id, u.id) ? `<span class="copy-field"><input class="input" readonly value="${esc(T.store.icalExportUrl(d.id, u.id))}" aria-label="קישור ייצוא"><button class="mini-btn" type="button" data-act="copy" data-text="${esc(T.store.icalExportUrl(d.id, u.id))}" aria-label="העתקה">${I("copy")}</button></span>` : `<span class="hint">${d.id ? "הקישור ייווצר אחרי העלאת האתר ל-Vercel." : "הקישור ייווצר אחרי השמירה הראשונה."}</span>`}</div>
              ${(u.ical_blocked || []).length ? `<span class="hint">${I("sync")} ${u.ical_blocked.length} לילות חסומים מהסנכרון האחרון</span>` : ""}</div>`).join("")}</div>
            ${T.isLive && d.id ? `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px"><button class="btn btn-line btn-sm" type="button" data-act="ical-sync-now">${I("sync")} סנכרון עכשיו</button><span class="hint">${d.ical_synced_at ? "סנכרון אחרון: " + new Date(d.ical_synced_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "שמרו את הקישור ואז סנכרנו. הסנכרון רץ גם אוטומטית כל שעה."}</span></div>` : ""}
          </section>

          <section class="panel" id="ed-contact"><h2>מיקום ופרטי קשר</h2><div class="form-grid">
            <label class="field"><span>קו רוחב (lat)</span><input class="input num" dir="ltr" name="lat" value="${esc(d.lat == null ? "" : d.lat)}"></label>
            <label class="field"><span>קו אורך (lng)</span><input class="input num" dir="ltr" name="lng" value="${esc(d.lng == null ? "" : d.lng)}"></label>
            <div class="span2"><div class="mini-map" id="ed-map" style="margin-top:0;height:240px"></div><p class="hint" style="margin-top:6px">לחיצה על המפה מעדכנת את המיקום. הכתובת המדויקת לא מוצגת לאורחים, והמרחק לאטרקציות באזור מחושב מהנקודה הזו.</p></div>
            <label class="field"><span>טלפון לאורחים</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" value="${esc(d.phone)}"></label>
            <label class="field"><span>וואטסאפ</span><input class="input" name="whatsapp" type="tel" dir="ltr" style="text-align:right" value="${esc(d.whatsapp)}" placeholder="אם ריק, משתמשים בטלפון"></label>
            <label class="field span2"><span>אימייל לקבלת פניות (לא מוצג באתר)</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" value="${esc(d.email)}"></label>
          </div></section>
        </div>

        <div class="aside">
          <div class="panel"><h2>תצוגה מקדימה</h2><div id="preview">${previewHTML(d)}</div></div>
          ${IS_ADMIN ? `<div class="panel"><h2>פרסום</h2>
            <div class="toggle-row"><span>מוצג באתר<small>מתחם מוסתר לא מופיע בחיפוש</small></span><button class="switch" type="button" role="switch" aria-checked="${!!d.active}" data-act="ed-switch" data-k="active" aria-label="מוצג באתר"></button></div>
            <div class="toggle-row"><span>נבחרי העונה<small>בראש עמוד הבית</small></span><button class="switch" type="button" role="switch" aria-checked="${!!d.featured}" data-act="ed-switch" data-k="featured" aria-label="נבחרי העונה"></button></div>
            <div class="toggle-row"><span>בלעדי לאתר<small>תווית ״בלעדי לתמרה״ בכרטיס</small></span><button class="switch" type="button" role="switch" aria-checked="${!!d.exclusive}" data-act="ed-switch" data-k="exclusive" aria-label="בלעדי לאתר"></button></div>
            <div class="toggle-row"><span>מחיר הכי טוב<small>המארח התחייב שאין מחיר זול יותר באתר אחר</small></span><button class="switch" type="button" role="switch" aria-checked="${!!d.best_price}" data-act="ed-switch" data-k="best_price" aria-label="מחיר הכי טוב"></button></div>
            <label class="field" style="margin-top:12px"><span>מפרסם (לקוח)</span><select class="select" name="owner_id"><option value="">ללא</option>${A.advertisers.map((a) => `<option value="${esc(a.id)}" ${d.owner_id === a.id ? "selected" : ""}>${esc(a.business || a.name)}</option>`).join("")}</select></label>
          </div>` : `<div class="panel"><h2>פרסום</h2><p class="muted" style="font-size:var(--t-s)">${d.active ? "המתחם מוצג באתר." : "המתחם עוד לא מוצג באתר. צוות האתר יפעיל אותו אחרי בדיקה."}</p></div>`}
          <div class="panel"><h2>שלמות הכרטיס</h2>${completeness(d)}</div>
          ${d.id && A.stats[d.id] ? `<div class="panel"><h2>30 הימים האחרונים</h2><div class="stat-grid" style="grid-template-columns:1fr 1fr"><div><b>${T.num(A.stats[d.id].v)}</b><span>צפיות</span></div><div><b>${leadsFor(d.id).length}</b><span>פניות</span></div><div><b>${A.stats[d.id].p}</b><span>הצגות טלפון</span></div><div><b>${A.stats[d.id].w}</b><span>וואטסאפ</span></div></div></div>` : ""}
          ${IS_ADMIN && id !== "new" ? `<div class="panel" id="del-zone"><button class="btn btn-danger btn-block" type="button" data-act="ask-del" data-kind="listing" data-id="${esc(d.id)}">${I("trash")}מחיקת המתחם</button></div>` : ""}
        </div>
        <div class="savebar" style="grid-column:1/-1"><span class="state" id="save-state" aria-live="polite">${d._dirty ? "יש שינויים שלא נשמרו" : id === "new" ? "מתחם חדש, טרם נשמר" : "הכל שמור"}</span>
          <span style="display:flex;gap:8px"><button class="btn btn-ghost" type="button" data-act="ed-discard">ביטול שינויים</button><button class="btn btn-primary" type="submit">${I("check")}${moderated ? "שמירה ושליחה לאישור" : "שמירה"}</button></span></div>
      </form>`;
  }
  /* רשימת בדיקה: מה עוד חסר כדי שהכרטיס יהיה מלא כמו אצל המתחרים */
  function completeness(d) {
    const det = d.details || {}, t = d.terms || {}, sec = det.sections || {};
    const items = [
      ["תמונות (לפחות 6)", (d.photos || []).length >= 6, "ed-photos"],
      ["תיאור מלא", String(d.description || "").length > 120, "ed-main"],
      ["תוכן לפי נושאים", Object.values(sec).filter(Boolean).length >= 2, "ed-content"],
      ["מה כלול באירוח", (det.included || []).length > 0, "ed-content"],
      ["מחיר סופ״ש", (d.rooms.length ? d.rooms.every((r) => Number(r.price_weekend)) : Number(d.price_weekend)) > 0, "ed-units"],
      ["8 מאפיינים ומעלה", (d.amenities || []).length >= 8, "ed-amen"],
      ["שעות כניסה ויציאה", !!(t.checkin && t.checkout), "ed-policy"],
      ["מדיניות ביטול", (t.cancel || []).length > 0, "ed-policy"],
      ["מיקום על המפה", d.lat != null && d.lng != null, "ed-contact"]
    ];
    const done = items.filter((x) => x[1]).length;
    return `<div class="meter"><i style="width:${Math.round((done / items.length) * 100)}%"></i></div><p class="hint" style="margin:6px 0 8px">${done} מתוך ${items.length}</p><ul class="todo">${items.map(([n, ok, to]) => `<li class="${ok ? "ok" : ""}">${I(ok ? "check" : "info")}${ok ? esc(n) : `<a href="#" data-act="ed-jump" data-to="${to}">${esc(n)}</a>`}</li>`).join("")}</ul>`;
  }
  const catsOf = (d) => { const c = ((d.details || {}).photo_cats || []).slice(0, d.photos.length); while (c.length < d.photos.length) c.push("general"); return c; };
  function photosHTML(d) {
    const cats = catsOf(d);
    return d.photos.map((p, i) => `<div class="photo" draggable="true" data-i="${i}"><img src="${esc(T.img(p, 400))}" alt="תמונה ${i + 1}">${i === 0 ? '<span class="cover-tag">שער</span>' : ""}
      <select class="p-cat" data-photocat="${i}" aria-label="קטגוריה לתמונה ${i + 1}">${T.PHOTO_CATS.map((c) => `<option value="${c.key}" ${cats[i] === c.key ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
      <div class="p-acts"><span><button type="button" data-act="ph-move" data-i="${i}" data-d="-1" aria-label="הזזה קדימה" ${i === 0 ? "disabled" : ""}>${I("chev-r")}</button><button type="button" data-act="ph-move" data-i="${i}" data-d="1" aria-label="הזזה אחורה" ${i === d.photos.length - 1 ? "disabled" : ""}>${I("chev-l")}</button></span><button type="button" data-act="ph-del" data-i="${i}" aria-label="הסרת תמונה ${i + 1}">${I("trash")}</button></div></div>`).join("") +
      (d.photos.length < 24 ? `<label class="drop" id="drop">${I("upload")}<span>הוספת תמונות<br>לחיצה או גרירה</span><input type="file" accept="image/*" multiple class="sr" id="ph-input"></label>` : "");
  }
  /* הזזה/מחיקה של תמונה שומרת על הקטגוריה שלה */
  function movePhoto(d, from, to) {
    const cats = catsOf(d);
    const [p] = d.photos.splice(from, 1); d.photos.splice(to, 0, p);
    const [c] = cats.splice(from, 1); cats.splice(to, 0, c);
    d.details = Object.assign({}, d.details, { photo_cats: cats });
  }
  function deletePhoto(d, i) {
    const cats = catsOf(d);
    d.photos.splice(i, 1); cats.splice(i, 1);
    d.details = Object.assign({}, d.details, { photo_cats: cats });
  }
  function previewHTML(d) {
    const l = T.normalizeListing(d);
    return `<div class="card"><div class="card-media"><img src="${esc(T.thumbOf(l))}" alt=""><span class="chips-top"><span class="chip">${I("pin")}${esc(l.settlement || "יישוב")}</span></span>${T.lastMinuteActive(l) ? `<span class="chip chip-lm">דקה 90 · ‎-${l.lastminute_pct}%</span>` : l.deal_label ? `<span class="chip chip-deal">${I("tag")}${esc(l.deal_label)}</span>` : ""}</div>
      <div class="card-body"><div class="card-head"><h3>${esc(l.name || "שם המתחם")}</h3><span class="card-place">${esc(T.regionOf(l.region).name)}</span></div><p class="card-tag">${esc(l.tagline || "משפט פתיחה")}</p>
      <div class="card-foot"><span class="price"><b>${T.money(T.fromPrice(l)) || "₪—"}</b>ללילה</span></div></div></div>`;
  }
  function editCal(d) {
    const units = T.unitsOf(d);
    if (!units.some((u) => u.id === A.calUnit)) A.calUnit = units[0].id;
    const unit = units.find((u) => u.id === A.calUnit);
    const start = A.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
    const manual = new Set(unit.blocked_dates || []);
    const synced = new Set(unit.ical_blocked || []);
    const today = T.iso(T.today());
    const dows = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const month = (o) => {
      const m = new Date(start.getFullYear(), start.getMonth() + o, 1);
      let h = `<div class="cal"><h4>${T.fmtMonth(m)}</h4><div class="cal-grid">${dows.map((x) => `<span class="dow">${x}</span>`).join("")}`;
      for (let i = 0; i < m.getDay(); i++) h += "<span></span>";
      const n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      for (let k = 1; k <= n; k++) {
        const dt = new Date(m.getFullYear(), m.getMonth(), k), iso = T.iso(dt);
        const past = iso < today, isSync = synced.has(iso) && !manual.has(iso), hol = T.holidayOf(iso, A.settings);
        h += `<button type="button" class="${past ? "past" : ""} ${manual.has(iso) ? "blocked" : isSync ? "blocked synced" : ""} ${T.isWeekendNight(dt) ? "wknd" : ""} ${hol ? "hol" : ""} ${iso === today ? "today" : ""}" data-act="ed-day" data-d="${iso}" ${past || isSync ? "disabled" : ""} aria-pressed="${manual.has(iso)}" aria-label="${T.fmtLong(iso)}${manual.has(iso) ? ", תפוס" : isSync ? ", תפוס מסנכרון" : ", פנוי"}${hol ? ", " + hol.label : ""}">${k}</button>`;
      }
      return h + "</div></div>";
    };
    const upcoming = [...manual].filter((x) => x >= today).length;
    return `${units.length > 1 ? `<div class="unit-tabs seg-tabs" role="group" aria-label="יחידה">${units.map((u) => `<button type="button" data-act="cal-unit" data-id="${esc(u.id)}" aria-pressed="${u.id === unit.id}">${esc(u.name || "יחידה")}</button>`).join("")}</div>` : ""}
      <div class="cal-wrap"><div class="cal-nav"><button class="icon-btn" type="button" data-act="ed-cal" data-d="-1" aria-label="החודש הקודם">${I("chev-r")}</button><span class="hint">${upcoming ? `${upcoming} לילות מסומנים ידנית` : "אין חסימות ידניות"}${synced.size ? ` · ${synced.size} מסונכרנים` : ""}</span><button class="icon-btn" type="button" data-act="ed-cal" data-d="1" aria-label="החודש הבא">${I("chev-l")}</button></div>
      <div class="cal-months">${month(0)}${month(1)}${month(2)}</div>
      <div class="cal-legend"><span><i class="l-free"></i>פנוי</span><span><i class="l-blocked"></i>תפוס (ידני)</span><span><i class="l-synced"></i>תפוס מסנכרון iCal</span><span><i class="l-hol"></i>חג</span></div></div>`;
  }
  function readEditor() {
    const form = $("#editor");
    if (!form) return;
    const d = A.drafts[A.editId];
    if (!d.details || typeof d.details !== "object") d.details = {};
    if (!d.terms || typeof d.terms !== "object") d.terms = {};
    const fd = new FormData(form);
    ["name", "settlement", "type", "region", "tagline", "description", "deal_label", "deal_text", "phone", "whatsapp", "email", "video_url", "ical_url"].forEach((k) => { if (fd.has(k)) d[k] = fd.get(k).trim ? fd.get(k) : fd.get(k); });
    ["guests_max", "bedrooms", "bathrooms", "min_nights", "price_weekday", "price_weekend", "price_holiday", "guests_base", "extra_guest_price", "lastminute_pct"].forEach((k) => { if (fd.has(k)) d[k] = fd.get(k) === "" ? "" : Number(fd.get(k)); });
    ["lat", "lng"].forEach((k) => { if (fd.has(k)) d[k] = fd.get(k) === "" ? null : Number(fd.get(k)); });
    if (fd.has("sponsored_until")) d.sponsored_until = fd.get("sponsored_until") || null;
    if (fd.has("owner_id")) d.owner_id = fd.get("owner_id");
    d.amenities = fd.getAll("amenities");
    d.audience = fd.getAll("audience");
    $$("[data-room]", form).forEach((el) => { const r = d.rooms[Number(el.dataset.room)]; if (r) r[el.dataset.k] = el.type === "number" ? (el.value === "" ? 0 : Number(el.value)) : el.value; });
    $$("[data-season]", form).forEach((el) => { const s = d.seasons[Number(el.dataset.season)]; if (s) s[el.dataset.k] = el.dataset.k === "pct" || el.dataset.k === "min" ? Number(el.value) || 0 : el.value; });
    $$("[data-extra]", form).forEach((el) => { const x = d.extras[Number(el.dataset.extra)]; if (x) x[el.dataset.k] = el.dataset.k === "price" ? Number(el.value) || 0 : el.value; });
    $$("[data-p]", form).forEach((el) => {
      const ty = el.dataset.t;
      let v;
      if (el.type === "checkbox") v = el.checked;
      else if (ty === "num") v = el.value === "" ? 0 : Number(el.value);
      else if (ty === "lines") v = el.value.split("\n").map((x) => x.trim()).filter(Boolean);
      else v = el.value;
      setPath(d, el.dataset.p, v);
    });
    $$("[data-arr]:not(button)", form).forEach((el) => { const arr = getPath(d, el.dataset.arr); const row = Array.isArray(arr) && arr[Number(el.dataset.i)]; if (row) row[el.dataset.k] = el.dataset.t === "num" ? (el.value === "" ? 0 : Number(el.value)) : el.value; });
    $$("[data-photocat]", form).forEach((el) => { const cats = catsOf(d); cats[Number(el.dataset.photocat)] = el.value; d.details.photo_cats = cats; });
    d.rooms.forEach((r, i) => {
      if ($(`[data-ramen="${i}"]`, form)) r.amenities = $$(`[data-ramen="${i}"]:checked`, form).map((x) => x.value);
      if ($(`[data-rphoto="${i}"]`, form)) r.photos = $$(`[data-rphoto="${i}"]:checked`, form).map((x) => x.value);
    });
    if (d.rooms.length) { d.units = d.rooms.length; d.guests_max = Math.max(...d.rooms.map((r) => Number(r.guests_max) || 0)); d.price_weekday = Math.min(...d.rooms.map((r) => Number(r.price_weekday) || Infinity)); if (!Number.isFinite(d.price_weekday)) d.price_weekday = 0; }
  }
  function markDirty() {
    const d = A.drafts[A.editId];
    if (d) d._dirty = true;
    const s = $("#save-state"); if (s) s.textContent = "יש שינויים שלא נשמרו";
    const p = $("#preview"); if (p && d) p.innerHTML = previewHTML(d);
  }
  /* אחרי שינוי מבני בטיוטה (הוספה/מחיקה של שורה) מציירים מחדש בלי לקרוא שוב את הטופס הישן */
  function rerenderEditor() { const y = window.scrollY; render(); window.scrollTo(0, y); }
  async function addPhotos(files) {
    const d = A.drafts[A.editId];
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 24 - d.photos.length);
    if (!list.length) return;
    T.toast(list.length > 1 ? `מעלה ${list.length} תמונות…` : "מעלה תמונה…");
    for (const f of list) {
      try { d.photos.push(await T.store.uploadPhoto(f)); } catch (e) { fail("העלאה נכשלה", e); break; }
    }
    $("#photos").innerHTML = photosHTML(d);
    bindEditor();
    markDirty();
  }
  function bindEditor() {
    const drop = $("#drop");
    if (drop && !drop.dataset.bound) {
      drop.dataset.bound = "1";
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); drop.classList.add("over"); } }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove("over")));
      drop.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); addPhotos(e.dataTransfer.files); } });
      $("#ph-input").addEventListener("change", (e) => addPhotos(e.target.files));
    }
    /* סידור תמונות בגרירה */
    let from = -1;
    $$("#photos .photo").forEach((el) => {
      el.addEventListener("dragstart", (e) => { from = Number(el.dataset.i); el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(from)); });
      el.addEventListener("dragend", () => { el.classList.remove("dragging"); $$("#photos .drop-target").forEach((x) => x.classList.remove("drop-target")); });
      el.addEventListener("dragover", (e) => { if (from < 0) return; e.preventDefault(); el.classList.add("drop-target"); });
      el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const to = Number(el.dataset.i);
        if (from < 0 || from === to) return;
        const d = A.drafts[A.editId];
        readEditor();
        movePhoto(d, from, to);
        from = -1;
        $("#photos").innerHTML = photosHTML(d);
        bindEditor();
        markDirty();
      });
    });
    /* מפת מיקום */
    const mapEl = $("#ed-map");
    if (mapEl && window.L && !mapEl._leaflet_id) {
      const d = A.drafts[A.editId];
      const reg = T.regionOf(d.region);
      const ll = [d.lat || reg.lat, d.lng || reg.lng];
      const map = L.map(mapEl, { scrollWheelZoom: false }).setView(ll, d.lat ? 12 : 9);
      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
      let errs = 0;
      tiles.on("tileerror", () => { if (++errs === 2) { map.removeLayer(tiles); mapEl.classList.add("map-offline"); T.REGIONS.forEach((r) => L.marker([r.lat, r.lng], { interactive: false, icon: L.divIcon({ className: "tm", html: `<span class="region-label">${esc(r.name)}</span>`, iconSize: [0, 0] }) }).addTo(map)); } });
      const marker = L.marker(ll, { icon: L.divIcon({ className: "tm", html: `<span class="pin">${I("pin")}</span>`, iconSize: [0, 0] }) }).addTo(map);
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        const f = $("#editor");
        f.lat.value = e.latlng.lat.toFixed(5); f.lng.value = e.latlng.lng.toFixed(5);
        readEditor(); markDirty();
      });
      A.maps.push(map);
      setTimeout(() => map.invalidateSize(), 60);
    }
  }
  async function saveEditor() {
    readEditor();
    const d = A.drafts[A.editId];
    const errs = [];
    if (!String(d.name).trim()) errs.push("שם המתחם");
    if (!String(d.settlement).trim()) errs.push("יישוב");
    if (!(T.fromPrice(T.normalizeListing(d)) > 0)) errs.push("מחיר ללילה");
    if (d.rooms.some((r) => !String(r.name).trim())) errs.push("שם לכל יחידה");
    if (errs.length) { T.toast("חסר: " + errs.join(", "), "err"); return; }
    const today = T.iso(T.today());
    const clean = Object.assign({}, d);
    delete clean._dirty;
    clean.blocked_dates = (clean.blocked_dates || []).filter((x) => x >= today);
    clean.rooms = (clean.rooms || []).map((r) => Object.assign({}, r, { blocked_dates: (r.blocked_dates || []).filter((x) => x >= today) }));
    clean.seasons = (clean.seasons || []).filter((s) => s.from && s.to && s.to >= s.from && (Number(s.pct) || Number(s.min)));
    clean.extras = (clean.extras || []).filter((x) => String(x.name).trim()).map((x) => Object.assign({}, x, { name: String(x.name).trim(), price: Math.max(0, Number(x.price) || 0) }));
    const det = Object.assign({}, clean.details || {}), tm = Object.assign({}, clean.terms || {});
    det.faq = (det.faq || []).map((x) => ({ q: String(x.q || "").trim(), a: String(x.a || "").trim() })).filter((x) => x.q && x.a);
    det.sections = Object.fromEntries(Object.entries(det.sections || {}).map(([k, v]) => [k, String(v || "").trim()]).filter(([, v]) => v));
    ["host_name", "ribbon"].forEach((k) => { det[k] = String(det[k] || "").trim(); if (!det[k]) delete det[k]; });
    det.photo_cats = catsOf(clean);
    tm.cancel = (tm.cancel || []).map((x) => ({ days: Math.max(0, Math.round(Number(x.days) || 0)), fee: Math.min(100, Math.max(0, Math.round(Number(x.fee) || 0))) })).sort((a, b) => b.days - a.days).filter((x, i, a) => i === 0 || x.days !== a[i - 1].days);
    tm.packages = (tm.packages || []).filter((x) => String(x.name || "").trim()).map((x) => ({ name: String(x.name).trim(), price: Math.max(0, Number(x.price) || 0), per: x.per || "guest_night" }));
    tm.benefits = Object.fromEntries(Object.entries(tm.benefits || {}).map(([k, v]) => [k, Math.min(50, Math.max(0, Number(v) || 0))]).filter(([, v]) => v > 0));
    ["checkin", "checkout", "checkin_sat", "checkout_sat", "price_note", "cancel_note"].forEach((k) => { tm[k] = String(tm[k] || "").trim(); if (!tm[k]) delete tm[k]; });
    if (tm.kids !== "age") delete tm.kids_age;
    clean.details = det; clean.terms = tm;
    try {
      const wasNew = A.editId === "new";
      let saved;
      if (IS_ADMIN) saved = await T.store.saveListing(clean);
      else saved = await T.store.saveListingAsOwner(clean, A.listings.find((l) => l.id === clean.id));
      delete A.drafts[A.editId];
      await reload();
      T.toast(!IS_ADMIN && saved.pending ? "נשמר. שינויי התוכן נשלחו לאישור." : wasNew ? "המתחם נוצר" + (saved.active ? "" : ". הפעילו אותו כשהוא מוכן.") : "נשמר");
      if (wasNew) location.hash = "edit-" + saved.id; else rerenderKeepScroll();
    } catch (e) { if (e.code === "quota") T.toast(e.message, "err"); else fail("השמירה נכשלה", e); }
  }

  /* ================================================================ moderation */
  function viewModeration() {
    const list = pendingListings();
    const show = (k, v) => {
      if (k === "photos") return `<span class="thumbs">${(v || []).slice(0, 8).map((p) => `<img src="${esc(T.img(p, 160))}" alt="">`).join("")}${(v || []).length > 8 ? `<span class="muted">+${v.length - 8}</span>` : ""}</span>`;
      if (k === "amenities") return esc((v || []).map((a) => T.amenityOf(a).name).join(", "));
      if (k === "audience") return esc((v || []).map((a) => (T.AUDIENCE.find((x) => x.key === a) || { name: a }).name).join(", "));
      if (k === "region") return esc(T.regionOf(v).name);
      if (k === "type") return esc(T.typeOf(v).name);
      return esc(v || "—");
    };
    return ph("אישורי תוכן", A.settings.moderation === false ? "האישור כבוי בהגדרות, ומארחים מפרסמים שינויים ישירות." : "שינויים שמארחים שלחו בשם, בתיאור, בתמונות ובמאפיינים. מחירים ויומן לא דורשים אישור.") + `
      ${list.length ? list.map((l) => `<div class="panel" data-row="${esc(l.id)}"><h2><span>${esc(l.name)} <span class="muted" style="font-family:var(--f-body);font-size:var(--t-xs)">· ${esc(advName(l.owner_id))} · נשלח ${T.fmtStamp(l.pending._at)}</span></span>
          <span style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" type="button" data-act="mod-approve" data-id="${esc(l.id)}">${I("check")}אישור ופרסום</button><button class="btn btn-line btn-sm" type="button" data-act="mod-reject" data-id="${esc(l.id)}">דחייה</button></span></h2>
          <div class="diff">${T.MODERATED_FIELDS.filter(([k]) => l.pending[k] !== undefined).map(([k, label]) => k === "details" ? detailsDiff(l.details || {}, l.pending.details || {}) : `<div class="diff-row"><b>${label}</b><span class="old">${show(k, l[k])}</span><span class="new">${show(k, l.pending[k])}</span></div>`).join("")}</div></div>`).join("")
      : `<div class="panel"><div class="empty"><h3>אין שינויים שממתינים לאישור</h3><p>כשמארח ישנה תיאור או תמונות, השינוי יופיע כאן.</p></div></div>`}`;
  }

  const DETAIL_LABELS = { host_name: "שם המארחים", ribbon: "סרט על הכרטיס", sections: "תוכן לפי נושאים", included: "כלול באירוח", rules: "חוקי הבית", faq: "שאלות נפוצות", photo_cats: "קטגוריות תמונות" };
  const SECTION_LABELS = { location: "לוקיישן", vibe: "אווירה", facilities: "מתקנים", area: "מה עושים באזור", good: "טוב לדעת" };
  function detailText(k, v) {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "—";
    if (k === "sections") return Object.entries(v).filter(([, x]) => x).map(([sk, x]) => `${SECTION_LABELS[sk] || sk}: ${x}`).join("\n\n") || "—";
    if (k === "faq") return v.map((x) => `ש: ${x.q}\nת: ${x.a}`).join("\n\n");
    if (k === "photo_cats") return v.map((c, i) => `${i + 1}. ${T.statusName(T.PHOTO_CATS, c)}`).join(" · ");
    if (Array.isArray(v)) return v.join("\n");
    return String(v);
  }
  function detailsDiff(a, b) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k === "photo_cats" ? !T.sameField("details", { photo_cats: a[k] }, { photo_cats: b[k] }) : !T.sameField(k, a[k], b[k]));
    if (!keys.length) return `<div class="diff-row"><b>תוכן הדף</b><span class="old">—</span><span class="new">ללא שינוי</span></div>`;
    return keys.map((k) => `<div class="diff-row"><b>${esc(DETAIL_LABELS[k] || k)}</b><span class="old">${esc(detailText(k, a[k]))}</span><span class="new">${esc(detailText(k, b[k]))}</span></div>`).join("");
  }

  /* ================================================================ reviews */
  function viewReviews() {
    const all = A.reviews;
    const tabs = IS_ADMIN ? [["pending", "ממתינות"], ["approved", "פורסמו"], ["rejected", "נדחו"], ["all", "הכל"]] : [["all", "הכל"]];
    const f = IS_ADMIN ? A.rf : "all";
    const list = f === "all" ? all : all.filter((r) => r.status === f);
    const lname = (id) => (A.listings.find((l) => l.id === id) || { name: "" }).name;
    return ph("חוות דעת", "רק אורחים שההזמנה שלהם סומנה כ״נסגרה הזמנה״ מקבלים קישור לכתיבת חוות דעת.") + `
      <div class="panel">${IS_ADMIN ? `<div class="toolbar"><span class="seg-tabs" role="group">${tabs.map(([k, t]) => `<button type="button" data-act="rf" data-v="${k}" aria-pressed="${f === k}">${t} · ${k === "all" ? all.length : all.filter((r) => r.status === k).length}</button>`).join("")}</span></div>` : ""}
        ${list.length ? list.map((r) => `<div class="lead-row" data-row="${esc(r.id)}"><div>
            <div class="who">${T.stars(r.rating)} ${esc(r.name)} <span class="muted" style="font-weight:400">· ${esc(lname(r.listing_id))}${r.unit_name ? " · " + esc(r.unit_name) : ""}${r.stay_month ? " · " + esc(r.stay_month) : ""} · ${T.fmtStamp(r.created_at)}</span></div>
            ${r.title ? `<div style="font-weight:600;margin-top:4px">${esc(r.title)}</div>` : ""}
            <div class="msg">״${esc(r.text)}״</div>
            ${r.scores && Object.keys(r.scores).length ? `<div class="score-chips">${T.REVIEW_CATS.filter((c) => r.scores[c.key]).map((c) => `<span>${esc(c.name)} <b>${r.scores[c.key]}</b>/5</span>`).join("")}</div>` : ""}
            <label class="field" style="margin-top:8px;max-width:520px"><span>תגובה ${IS_ADMIN ? "מטעם המארחים" : "שלכם"} (מוצגת מתחת לחוות הדעת)</span><span class="copy-field"><input class="input" style="direction:rtl;font-size:var(--t-s)" data-reply="${esc(r.id)}" value="${esc(r.reply || "")}" maxlength="400"><button class="btn btn-line btn-sm" type="button" data-act="reply" data-id="${esc(r.id)}">שמירה</button></span></label></div>
          <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end">${statusPill(r.status)}
            ${IS_ADMIN && r.status !== "approved" ? `<button class="btn btn-primary btn-sm" type="button" data-act="rev-set" data-v="approved" data-id="${esc(r.id)}">פרסום</button>` : ""}
            ${IS_ADMIN && r.status !== "rejected" ? `<button class="btn btn-line btn-sm" type="button" data-act="rev-set" data-v="rejected" data-id="${esc(r.id)}">דחייה</button>` : ""}
            ${IS_ADMIN ? `<button class="mini-btn" type="button" data-act="ask-del" data-kind="review" data-id="${esc(r.id)}" aria-label="מחיקה">${I("trash")}</button>` : ""}</div></div>`).join("")
        : `<div class="empty"><h3>אין חוות דעת ${f === "pending" ? "שממתינות" : ""}</h3></div>`}</div>`;
  }

  /* ================================================================ leads */
  const SOURCE_TONE = { form: "navy", find: "info", contact: "muted", report: "warn" };
  const sourcePill = (q) => `<span class="pill pill-${SOURCE_TONE[q.source || "form"] || "muted"}">${esc(T.statusName(T.LEAD_SOURCES, q.source || "form"))}</span>`;
  const datesTxt = (q) => q.check_in && q.check_out ? `${T.fmtShort(q.check_in)}–${T.fmtShort(q.check_out)}` : q.check_in ? `מ־${T.fmtShort(q.check_in)}` : "";
  const partyTxt = (q) => `${q.guests || 0} מבוגרים${Number(q.children) ? ` + ${q.children} ילדים` : ""}`;
  /* פירוט מלא של הבקשה: יחידות, חבילה, הטבה, גמישות, ומה האורח ביקש ב״מצא לי צימר״ */
  function leadDetails(q) {
    const out = [];
    (q.rooms_req || []).forEach((r) => out.push(`${esc(r.name || "יחידה")}: ${r.guests} מבוגרים${Number(r.children) ? ` + ${r.children} ילדים` : ""}`));
    if (q.package) out.push("חבילה: " + esc(q.package));
    if (q.benefit) out.push("הטבה: " + esc((T.benefitOf(q.benefit) || { name: q.benefit }).name));
    if ((q.extras || []).length) out.push("תוספות: " + esc(q.extras.join(", ")));
    if (q.coupon) out.push("קופון " + esc(q.coupon));
    if (q.flexible) out.push("תאריכים גמישים");
    const m = q.meta || {};
    if (m.place_label) out.push("איפה: " + esc(m.place_label));
    if (m.budget) out.push("תקציב: עד " + T.money(m.budget) + " ללילה");
    if ((m.wants || []).length) out.push("חשוב: " + esc(m.wants.join(", ")));
    return out;
  }
  /* מתחמים שמתאימים לבקשת ״מצא לי צימר״, כדי לשלוח לאורח הצעות בוואטסאפ */
  function suggestFor(q) {
    const m = q.meta || {};
    const guests = (Number(q.guests) || 2) + (Number(q.children) || 0);
    return A.listings.filter((l) => l.active).map((l) => {
      let score = 0;
      if (m.place && !String(m.place).startsWith("area:") && l.region !== m.place) return null;
      if (m.place && String(m.place).startsWith("area:") && T.regionOf(l.region).area !== m.place.slice(5)) return null;
      if (T.capacity(l) < guests) return null;
      if (q.check_in && q.check_out && !T.freeUnits(l, q.check_in, q.check_out).length) return null;
      if (m.budget && T.fromPrice(l) > m.budget) score -= 2;
      (m.amenities || []).forEach((k) => { if ((l.amenities || []).includes(k)) score += 2; });
      (m.audience || []).forEach((k) => { if ((l.audience || []).includes(k)) score += 1; });
      return { l, score };
    }).filter(Boolean).sort((x, y) => y.score - x.score).slice(0, 4).map((x) => x.l);
  }
  function viewLeads() {
    const f = A.qf;
    let list = A.leads.slice();
    if (f.status !== "all") list = list.filter((q) => q.status === f.status);
    if (f.listing) list = list.filter((q) => q.listing_id === f.listing);
    if (f.source) list = list.filter((q) => (q.source || "form") === f.source);
    if (f.q) list = list.filter((q) => (q.name + " " + q.phone + " " + (q.email || "") + " " + (q.listing_name || "")).includes(f.q));
    const tabs = [["all", "הכל", A.leads.length]].concat(T.LEAD_STATUS.map((x) => [x.key, x.name, A.leads.filter((q) => q.status === x.key).length]));
    const listingIds = [...new Set(A.leads.map((q) => q.listing_id).filter(Boolean))];
    const sources = T.LEAD_SOURCES.filter((x) => A.leads.some((q) => (q.source || "form") === x.key));
    return ph("פניות", IS_ADMIN ? "בקשות הזמנה, ״מצא לי צימר״, יצירת קשר ודיווחים מהאתר. בקשת הזמנה מגיעה גם למארחים בממשק שלהם." : "בקשות הזמנה שאורחים שלחו מהאתר.", `<button class="btn btn-line" type="button" data-act="leads-csv">${I("download")}ייצוא CSV</button>`) + `
      <div class="panel">
        <div class="toolbar">
          <input class="input" type="search" id="qf-q" placeholder="חיפוש לפי שם, טלפון או אימייל" value="${esc(f.q)}" aria-label="חיפוש פניות">
          <select class="select" id="qf-listing" aria-label="מתחם"><option value="">כל המתחמים</option>${listingIds.map((id) => { const q = A.leads.find((x) => x.listing_id === id); return `<option value="${esc(id)}" ${f.listing === id ? "selected" : ""}>${esc(q.listing_name || id)}</option>`; }).join("")}</select>
          ${IS_ADMIN && sources.length > 1 ? `<select class="select" id="qf-source" aria-label="סוג פנייה"><option value="">כל סוגי הפניות</option>${sources.map((x) => `<option value="${x.key}" ${f.source === x.key ? "selected" : ""}>${x.name}</option>`).join("")}</select>` : ""}
          <span class="seg-tabs" role="group" aria-label="סטטוס">${tabs.map(([k, tt, n]) => `<button type="button" data-act="qf-status" data-v="${k}" aria-pressed="${f.status === k}">${tt} · ${n}</button>`).join("")}</span>
        </div>
        ${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>התקבלה</th><th>אורח</th><th>מתחם</th><th>תאריכים</th><th>הערכה</th><th>פרטים והודעה</th><th>סטטוס</th>${IS_ADMIN ? "<th>הערה פנימית</th>" : ""}<th></th></tr></thead><tbody>
          ${list.map((q) => { const det = leadDetails(q); const sug = q.source === "find" && IS_ADMIN ? suggestFor(q) : []; return `<tr data-row="${esc(q.id)}">
            <td class="sub" style="white-space:nowrap">${T.fmtStamp(q.created_at)}<div style="margin-top:4px">${sourcePill(q)}</div></td>
            <td style="min-width:120px"><div class="name">${esc(q.name)}</div><div class="sub ltr">${esc(q.phone)}</div>${q.email ? `<div class="sub ltr">${esc(q.email)}</div>` : ""}</td>
            <td style="min-width:110px">${q.listing_id ? `<a href="${siteURL("stay-" + q.listing_id)}" target="_blank" rel="noopener">${esc(q.listing_name || "")}</a>` : esc(q.listing_name || "")}${q.unit_name ? `<div class="sub">${esc(q.unit_name)}</div>` : ""}</td>
            <td style="white-space:nowrap">${datesTxt(q) || '<span class="muted">—</span>'}${q.check_in ? `<div class="sub">${nightsTxt(q)}${nightsTxt(q) ? " · " : ""}${partyTxt(q)}</div>` : q.source === "find" ? `<div class="sub">${partyTxt(q)}</div>` : ""}</td>
            <td><span class="big">${q.est_total ? T.money(q.est_total) : "—"}</span></td>
            <td style="min-width:230px;max-width:300px">${det.length ? `<ul class="lead-det">${det.map((x) => `<li>${x}</li>`).join("")}</ul>` : ""}${q.message ? `<div class="msg">״${esc(q.message)}״</div>` : det.length ? "" : '<span class="muted">—</span>'}
              ${sug.length ? `<div class="sug"><span class="hint">מתאימים:</span>${sug.map((l) => `<a href="${siteURL("stay-" + l.id)}" target="_blank" rel="noopener">${esc(l.name)}</a>`).join("")}<a class="link-more" href="${esc(T.waLink(q.phone, `שלום ${q.name}, לפי מה שביקשת מצאנו כמה מקומות מתאימים:\n` + sug.map((l) => `${l.name} (${l.settlement}): ${siteAbs("stay-" + l.id)}`).join("\n")))}" target="_blank" rel="noopener">${I("chat")}שליחת ההצעות</a></div>` : ""}</td>
            <td><select class="select" data-act-change="lead-status" data-id="${esc(q.id)}" style="min-height:36px;width:auto" aria-label="סטטוס הפנייה של ${esc(q.name)}">${T.LEAD_STATUS.map((x) => `<option value="${x.key}" ${q.status === x.key ? "selected" : ""}>${x.name}</option>`).join("")}</select></td>
            ${IS_ADMIN ? `<td><input class="input" data-act-change="lead-note" data-id="${esc(q.id)}" value="${esc(q.admin_note || "")}" style="min-height:36px;min-width:140px" aria-label="הערה פנימית" placeholder="הערה"></td>` : ""}
            <td><div class="acts">
              ${q.status === "closed" && q.listing_id && q.source !== "report" ? `<button class="mini-btn" type="button" data-act="ask-review" data-id="${esc(q.id)}" title="בקשת חוות דעת בוואטסאפ" aria-label="בקשת חוות דעת מ${esc(q.name)}">${I("star")}</button>` : ""}
              ${/\d{6,}/.test(String(q.phone).replace(/\D/g, "")) ? `<a class="mini-btn" href="${esc(T.waLink(q.phone, `שלום ${q.name}, לגבי ${q.source === "find" ? "הבקשה שלך למצוא צימר" : q.source === "contact" ? "הפנייה שלך" : `הבקשה שלך ל${q.listing_name}`}${q.check_in && q.check_out ? ` (${T.fmtDate(q.check_in)}–${T.fmtDate(q.check_out)})` : ""}`))}" target="_blank" rel="noopener" title="וואטסאפ לאורח" aria-label="וואטסאפ ל${esc(q.name)}">${I("chat")}</a>
              <button class="mini-btn" type="button" data-act="copy" data-text="${esc(q.phone)}" title="העתקת טלפון" aria-label="העתקת הטלפון של ${esc(q.name)}">${I("copy")}</button>` : ""}
              ${IS_ADMIN ? `<button class="mini-btn" type="button" data-act="ask-del" data-kind="lead" data-id="${esc(q.id)}" title="מחיקה" aria-label="מחיקת הפנייה">${I("trash")}</button>` : ""}</div></td></tr>`; }).join("")}
        </tbody></table></div>` : `<div class="empty"><h3>${A.leads.length ? "אין פניות בסינון הזה" : "עוד לא הגיעו פניות"}</h3><p>בקשות הזמנה שאורחים שולחים מדף המתחם יופיעו כאן.</p></div>`}
      </div>`;
  }
  const unesc = (x) => String(x).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  /* CSV (עם BOM כדי שאקסל יפתח עברית נכון) */
  function downloadCSV(name, head, rows) {
    const cell = (v) => { const x = v == null ? "" : String(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    const csv = "﻿" + [head].concat(rows).map((r) => r.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ================================================================ advertisers & billing */
  function viewAdvertisers() {
    const list = A.advertisers.slice().sort((a, b) => (a.end_date || "9").localeCompare(b.end_date || "9"));
    return ph("לקוחות", "בעלי המתחמים שמשלמים על פרסום. האימייל כאן הוא גם הכניסה שלהם לממשק המארחים.", `<button class="btn btn-primary" type="button" data-act="adv-edit" data-id="">${I("plus")}לקוח חדש</button>`) + `
      <div class="panel">${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>לקוח</th><th>טלפון</th><th>אימייל</th><th>חבילה ותשלום</th><th>מנוי</th><th>מתחמים</th><th></th></tr></thead><tbody>
        ${list.map((a) => { const ls = A.listings.filter((l) => l.owner_id === a.id); return `<tr data-row="${esc(a.id)}">
          <td><div class="name">${esc(a.business || "—")}</div><div class="sub">${esc(a.name)}${a.notes ? " · " + esc(a.notes) : ""}</div></td>
          <td class="ltr">${esc(a.phone) || '<span class="muted">—</span>'}</td><td class="ltr sub">${esc(a.email) || "—"}</td>
          <td>${planName(a.plan)}<div class="sub">${esc(T.statusName(T.BILLING_MODELS, a.billing_model || "subscription"))}${a.billing_model && a.billing_model !== "subscription" ? ` · ${T.money(a.lead_price || A.settings.lead_price_default)} לפנייה` : ""}</div></td>
          <td>${advPill(a)}</td>
          <td>${ls.length ? ls.map((l) => `<a href="#edit-${esc(l.id)}">${esc(l.name)}</a>`).join("<br>") : '<span class="muted">—</span>'}</td>
          <td><div class="acts">${a.phone ? `<a class="mini-btn" href="${esc(T.waLink(a.phone, ""))}" target="_blank" rel="noopener" aria-label="וואטסאפ">${I("chat")}</a>` : ""}
            <button class="mini-btn" type="button" data-act="adv-edit" data-id="${esc(a.id)}" aria-label="עריכת ${esc(a.business || a.name)}">${I("edit")}</button>
            <button class="mini-btn" type="button" data-act="ask-del" data-kind="advertiser" data-id="${esc(a.id)}" aria-label="מחיקת ${esc(a.business || a.name)}">${I("trash")}</button></div></td></tr>`; }).join("")}
      </tbody></table></div>` : `<div class="empty"><h3>עוד אין לקוחות</h3><p>מוסיפים לקוח ידנית, או מאשרים בקשת הצטרפות מהאתר.</p></div>`}</div>`;
  }
  function advModal(a) {
    const isNew = !a.id;
    const today = T.iso(T.today());
    return `<div class="modal-back" id="modal"><form class="modal" data-form="advertiser" role="dialog" aria-modal="true" aria-labelledby="m-title" novalidate>
      <div class="modal-head"><h2 id="m-title">${isNew ? "לקוח חדש" : "עריכת לקוח"}</h2><button class="icon-btn" type="button" data-act="modal-close" aria-label="סגירה">${I("x")}</button></div>
      <input type="hidden" name="id" value="${esc(a.id || "")}">
      <div class="form-grid">
        <label class="field"><span>שם העסק / המתחם</span><input class="input" name="business" value="${esc(a.business || "")}" required></label>
        <label class="field"><span>איש קשר</span><input class="input" name="name" value="${esc(a.name || "")}" required></label>
        <label class="field"><span>טלפון</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" value="${esc(a.phone || "")}"></label>
        <label class="field"><span>אימייל (כניסה לממשק המארחים)</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" value="${esc(a.email || "")}"></label>
        <label class="field"><span>חבילה</span><select class="select" name="plan">${T.PLANS.map((p) => `<option value="${p.key}" ${a.plan === p.key ? "selected" : ""}>${p.name} · ${T.money((A.settings.plan_prices || {})[p.key])}</option>`).join("")}</select></label>
        <label class="field"><span>מודל תשלום</span><select class="select" name="billing_model">${T.BILLING_MODELS.map((m) => `<option value="${m.key}" ${(a.billing_model || "subscription") === m.key ? "selected" : ""}>${m.name}</option>`).join("")}</select></label>
        <label class="field"><span>₪ לפנייה (אם רלוונטי)</span><input class="input num" type="number" min="0" name="lead_price" value="${esc(a.lead_price || "")}" placeholder="${esc(A.settings.lead_price_default)}"></label>
        <label class="field"><span>סטטוס</span><select class="select" name="status">${T.ADV_STATUS.map((s) => `<option value="${s.key}" ${a.status === s.key ? "selected" : ""}>${s.name}</option>`).join("")}</select></label>
        <label class="field"><span>תחילת מנוי</span><input class="input" type="date" name="start_date" value="${esc(a.start_date || today)}"></label>
        <label class="field"><span>סיום מנוי</span><input class="input" type="date" name="end_date" value="${esc(a.end_date || T.iso(T.addDays(T.today(), 365)))}"></label>
        <label class="field span2"><span>הערות</span><textarea class="textarea" name="notes" rows="2" style="min-height:70px">${esc(a.notes || "")}</textarea></label>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${isNew ? "" : `<button class="btn btn-line" type="button" data-act="adv-renew">${I("refresh")}חידוש לשנה</button>`}<button class="btn btn-ghost" type="button" data-act="modal-close">ביטול</button><button class="btn btn-primary" type="submit">שמירה</button></div>
    </form></div>`;
  }
  function viewBilling() {
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(T.today().getFullYear(), T.today().getMonth() - i, 1); return T.monthKey(d); });
    const rows = A.advertisers.map((a) => Object.assign({ a }, billingFor(a, A.billMonth))).filter((r) => r.total || r.paid);
    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    const paid = rows.filter((r) => r.paid).reduce((s, r) => s + r.paid.amount, 0);
    const label = (mk) => T.fmtMonth(T.parseISO(mk + "-01"));
    return ph("חיובים", "חישוב חודשי לכל לקוח: מנוי לפי החבילה, תשלום לפי פניות ומיקום ממומן. סימון התשלום נשמר אצל הלקוח.", `<select class="select" id="bill-month" aria-label="חודש" style="width:auto">${months.map((m) => `<option value="${m}" ${A.billMonth === m ? "selected" : ""}>${label(m)}</option>`).join("")}</select><button class="btn btn-line" type="button" data-act="bill-copy">${I("copy")}העתקת סיכום</button>`) + `
      <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi"><span>${I("receipt")}לחיוב ב${label(A.billMonth)}</span><b>${T.money(sum("total"))}</b><small>מנויים ${T.money(sum("sub"))} · פניות ${T.money(sum("perLead"))} · ממומן ${T.money(sum("sponsored"))}</small></div>
        <div class="kpi"><span>${I("check")}שולם</span><b>${T.money(paid)}</b><small>${rows.filter((r) => r.paid).length} לקוחות</small></div>
        <div class="kpi ${sum("total") - paid > 0 ? "attn" : ""}"><span>${I("clock")}פתוח לגבייה</span><b>${T.money(Math.max(0, sum("total") - paid))}</b><small>${rows.filter((r) => !r.paid && r.total).length} לקוחות</small></div>
      </div>
      <div class="panel">${rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>לקוח</th><th>מודל</th><th>מנוי</th><th>פניות</th><th>תשלום פניות</th><th>ממומן</th><th>סה״כ</th><th>סטטוס</th><th></th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td><div class="name">${esc(r.a.business || r.a.name)}</div><div class="sub">${planName(r.a.plan)}</div></td><td class="sub">${esc(T.statusName(T.BILLING_MODELS, r.model))}</td>
          <td class="num">${T.money(r.sub)}</td><td class="num">${r.leads}</td><td class="num">${T.money(r.perLead)}</td><td class="num">${T.money(r.sponsored)}</td><td><span class="big">${T.money(r.total)}</span></td>
          <td>${r.paid ? `<span class="pill pill-ok">שולם ${T.fmtDate(r.paid.paid_at.slice(0, 10))}</span>` : `<span class="pill pill-warn">פתוח</span>`}</td>
          <td><div class="acts">${r.paid ? `<button class="btn btn-ghost btn-sm" type="button" data-act="unpay" data-id="${esc(r.a.id)}">ביטול סימון</button>` : `<button class="btn btn-line btn-sm" type="button" data-act="pay" data-id="${esc(r.a.id)}" data-amount="${r.total}">סימון כשולם</button>`}${r.a.phone && !r.paid ? `<a class="mini-btn" href="${esc(T.waLink(r.a.phone, `שלום ${r.a.name}, חשבון ${label(A.billMonth)} ב${A.settings.site_name}: ${T.money(r.total)}. תודה!`))}" target="_blank" rel="noopener" aria-label="שליחת חשבון בוואטסאפ">${I("chat")}</a>` : ""}</div></td></tr>`).join("")}
      </tbody></table></div>` : `<div class="empty"><h3>אין חיובים בחודש הזה</h3></div>`}</div>`;
  }

  /* ================================================================ applications */
  function viewApplications() {
    const list = A.applications;
    return ph("בקשות הצטרפות", "בעלי מתחמים שמילאו את הטופס בעמוד ״למארחים״. אישור יוצר לקוח בחודש ניסיון ומתחם מוסתר לעריכה.") + `
      <div class="panel">${list.length ? list.map((a) => `<div class="lead-row" data-row="${esc(a.id)}"><div>
          <div class="who">${esc(a.business)} <span class="muted" style="font-weight:400">· ${esc(a.name)}</span></div>
          <div class="what">${esc(T.typeOf(a.type).name)} · ${esc(a.settlement)}, ${esc(T.regionOf(a.region).name)} · ${a.units} יחידות · <span dir="ltr">${esc(a.phone)}</span>${a.email ? " · " + esc(a.email) : ""} · ${T.fmtStamp(a.created_at)}</div>
          ${a.message ? `<div class="msg">״${esc(a.message)}״</div>` : ""}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${statusPill(a.status)}
          ${a.status === "new" ? `<button class="btn btn-primary btn-sm" type="button" data-act="app-approve" data-id="${esc(a.id)}">${I("check")}אישור ופתיחת מתחם</button><button class="btn btn-line btn-sm" type="button" data-act="app-reject" data-id="${esc(a.id)}">דחייה</button>` : ""}
          <a class="mini-btn" href="${esc(T.waLink(a.phone, `שלום ${a.name}, קיבלנו את הפנייה שלך לפרסום ${a.business} ב${A.settings.site_name}.`))}" target="_blank" rel="noopener" aria-label="וואטסאפ">${I("chat")}</a>
          <button class="mini-btn" type="button" data-act="ask-del" data-kind="application" data-id="${esc(a.id)}" aria-label="מחיקה">${I("trash")}</button></div></div>`).join("") : `<div class="empty"><h3>אין בקשות הצטרפות</h3></div>`}</div>`;
  }

  /* ================================================================ magazine */
  function viewArticles() {
    const ed = A.editArticle;
    if (ed) {
      return ph(ed.id ? "עריכת כתבה" : "כתבה חדשה", "שורה שמתחילה ב־## היא כותרת משנה. שורה ריקה מפרידה בין פסקאות.", `<button class="btn btn-ghost" type="button" data-act="art-cancel">חזרה לרשימה</button>`) + `
        <form class="panel" data-form="article" style="display:grid;gap:14px" novalidate>
          <label class="field"><span>כותרת</span><input class="input" name="title" value="${esc(ed.title || "")}" maxlength="110" required></label>
          <label class="field"><span>תקציר (מופיע בכרטיס ובגוגל)</span><textarea class="textarea" name="excerpt" rows="2" style="min-height:70px" maxlength="220">${esc(ed.excerpt || "")}</textarea></label>
          <div class="field"><span>תמונה ראשית</span><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${ed.cover ? `<img src="${esc(T.img(ed.cover, 400))}" alt="" style="width:180px;aspect-ratio:16/10;object-fit:cover;border-radius:10px">` : ""}<label class="btn btn-line">${I("upload")}העלאת תמונה<input type="file" accept="image/*" class="sr" id="art-cover"></label></div></div>
          <label class="field"><span>תוכן</span><textarea class="textarea" name="body" rows="16">${esc(ed.body || "")}</textarea></label>
          <label class="check"><input type="checkbox" name="published" ${ed.published ? "checked" : ""}>פרסום באתר</label>
          <div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">${I("check")}שמירה</button>${ed.id ? `<a class="btn btn-line" href="${siteURL("article-" + ed.id)}" target="_blank" rel="noopener">${I("external")}צפייה</a>` : ""}</div>
        </form>`;
    }
    return ph("מגזין", "כתבות עוזרות לקידום בגוגל ומביאות אורחים שמחפשים רעיונות.", `<button class="btn btn-primary" type="button" data-act="art-new">${I("plus")}כתבה חדשה</button>`) + `
      <div class="panel">${A.articles.length ? `<div class="table-wrap"><table class="tbl"><tbody>${A.articles.map((a) => `<tr><td style="width:90px">${a.cover ? `<img class="thumb" src="${esc(T.img(a.cover, 200))}" alt="">` : ""}</td><td><a class="name" href="#" data-act="art-edit" data-id="${esc(a.id)}">${esc(a.title)}</a><div class="sub">${esc(a.excerpt)}</div></td><td>${a.published ? '<span class="pill pill-ok">מפורסם</span>' : '<span class="pill pill-muted">טיוטה</span>'}</td>
        <td><div class="acts"><button class="mini-btn" type="button" data-act="art-edit" data-id="${esc(a.id)}" aria-label="עריכה">${I("edit")}</button><button class="mini-btn" type="button" data-act="ask-del" data-kind="article" data-id="${esc(a.id)}" aria-label="מחיקה">${I("trash")}</button></div></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><h3>עוד אין כתבות</h3></div>`}</div>`;
  }

  /* ================================================================ places (מה עושים באזור) */
  function viewPlaces() {
    const f = A.pf;
    let list = A.places.slice();
    if (f.region) list = list.filter((p) => p.region === f.region);
    if (f.kind) list = list.filter((p) => p.kind === f.kind);
    const kind = (k) => T.PLACE_KINDS.find((x) => x.key === k) || { one: k, icon: "pin" };
    const nearest = (p) => { if (p.lat == null || p.lng == null) return null; const c = { lat: Number(p.lat), lng: Number(p.lng) }; return A.listings.filter((l) => l.active).map((l) => ({ l, km: T.distKm(c, T.coordsOf(l)) })).filter((x) => x.km != null).sort((a, b) => a.km - b.km)[0] || null; };
    return ph("מה עושים באזור", "מסעדות, אטרקציות, ספא, יקבים ומסלולים. מופיעים בעמוד ״מה עושים באזור״ ובדף של כל מתחם קרוב, עם מרחק ו-Waze.", `<button class="btn btn-primary" type="button" data-act="place-edit" data-id="">${I("plus")}מקום חדש</button>`) + `
      <div class="panel"><div class="toolbar">
        <select class="select" id="pf-region" aria-label="אזור" style="width:auto"><option value="">כל האזורים</option>${T.REGIONS.map((r) => `<option value="${r.key}" ${f.region === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>
        <span class="seg-tabs" role="group" aria-label="סוג"><button type="button" data-act="pf-kind" data-v="" aria-pressed="${!f.kind}">הכל · ${A.places.length}</button>${T.PLACE_KINDS.map((k) => `<button type="button" data-act="pf-kind" data-v="${k.key}" aria-pressed="${f.kind === k.key}">${esc(k.name)} · ${A.places.filter((p) => p.kind === k.key).length}</button>`).join("")}</span></div>
        ${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>מקום</th><th>אזור</th><th>מתחם קרוב</th><th>קשר</th><th>סטטוס</th><th></th></tr></thead><tbody>${list.map((p) => { const n = nearest(p); return `<tr data-row="${esc(p.id)}">
          <td><div class="name">${I(kind(p.kind).icon)} ${esc(p.name)}</div><div class="sub">${esc(kind(p.kind).one)}${p.blurb ? " · " + esc(p.blurb) : ""}</div></td>
          <td>${esc(p.settlement || "")}<div class="sub">${esc(T.regionOf(p.region).name)}</div></td>
          <td>${n ? `${esc(n.l.name)}<div class="sub">${n.km < 1 ? "פחות מק״מ" : `${n.km.toFixed(1)} ק״מ`}</div>` : '<span class="muted">אין מיקום</span>'}</td>
          <td class="sub">${p.phone ? `<span class="ltr">${esc(p.phone)}</span><br>` : ""}${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">אתר</a>` : ""}</td>
          <td>${p.active !== false ? '<span class="pill pill-ok">מוצג</span>' : '<span class="pill pill-muted">מוסתר</span>'}</td>
          <td><div class="acts"><button class="mini-btn ${p.active !== false ? "on" : ""}" type="button" data-act="place-toggle" data-id="${esc(p.id)}" aria-label="${p.active !== false ? "הסתרת" : "הצגת"} ${esc(p.name)}">${I(p.active !== false ? "eye" : "eye-off")}</button>
            <button class="mini-btn" type="button" data-act="place-edit" data-id="${esc(p.id)}" aria-label="עריכת ${esc(p.name)}">${I("edit")}</button>
            <button class="mini-btn" type="button" data-act="ask-del" data-kind="place" data-id="${esc(p.id)}" aria-label="מחיקת ${esc(p.name)}">${I("trash")}</button></div></td></tr>`; }).join("")}</tbody></table></div>`
        : `<div class="empty"><h3>אין מקומות בסינון הזה</h3><button class="btn btn-primary" type="button" data-act="place-edit" data-id="">${I("plus")}הוספת מקום</button></div>`}</div>`;
  }
  function placeModal(p) {
    const isNew = !p.id;
    return `<div class="modal-back" id="modal"><form class="modal" data-form="place" role="dialog" aria-modal="true" aria-labelledby="m-title" novalidate>
      <div class="modal-head"><h2 id="m-title">${isNew ? "מקום חדש" : "עריכת מקום"}</h2><button class="icon-btn" type="button" data-act="modal-close" aria-label="סגירה">${I("x")}</button></div>
      <input type="hidden" name="id" value="${esc(p.id || "")}"><input type="hidden" name="photo" value="${esc(p.photo || "")}">
      <div class="form-grid">
        <label class="field span2"><span>שם</span><input class="input" name="name" value="${esc(p.name || "")}" maxlength="60" required></label>
        <label class="field"><span>סוג</span><select class="select" name="kind">${T.PLACE_KINDS.map((k) => `<option value="${k.key}" ${p.kind === k.key ? "selected" : ""}>${esc(k.one)}</option>`).join("")}</select></label>
        <label class="field"><span>אזור</span><select class="select" name="region">${T.REGIONS.map((r) => `<option value="${r.key}" ${p.region === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
        <label class="field"><span>יישוב</span><input class="input" name="settlement" value="${esc(p.settlement || "")}" maxlength="40"></label>
        <label class="field"><span>טלפון</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" value="${esc(p.phone || "")}"></label>
        <label class="field"><span>קו רוחב (lat)</span><input class="input num" dir="ltr" name="lat" value="${esc(p.lat == null ? "" : p.lat)}" placeholder="33.0"></label>
        <label class="field"><span>קו אורך (lng)</span><input class="input num" dir="ltr" name="lng" value="${esc(p.lng == null ? "" : p.lng)}" placeholder="35.7"></label>
        <label class="field span2"><span>אתר או עמוד (לא חובה)</span><input class="input" name="url" dir="ltr" value="${esc(p.url || "")}" placeholder="https://"></label>
        <label class="field span2"><span>משפט קצר</span><textarea class="textarea" name="blurb" rows="2" style="min-height:64px" maxlength="160">${esc(p.blurb || "")}</textarea></label>
        <div class="field span2"><span>תמונה (לא חובה)</span><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${p.photo ? `<img src="${esc(T.img(p.photo, 300))}" alt="" style="width:120px;aspect-ratio:4/3;object-fit:cover;border-radius:10px">` : ""}<label class="btn btn-line btn-sm">${I("upload")}העלאה<input type="file" accept="image/*" class="sr" id="place-photo"></label></div></div>
        <label class="check span2"><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}>מוצג באתר</label>
      </div>
      <p class="hint">את הקואורדינטות מעתיקים מגוגל מפות (קליק ימני על המקום). המרחק לצימרים והקישור ל-Waze מחושבים מהן.</p>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" type="button" data-act="modal-close">ביטול</button><button class="btn btn-primary" type="submit">שמירה</button></div>
    </form></div>`;
  }

  /* ================================================================ subscribers */
  function viewSubscribers() {
    const f = A.sf;
    const list = f.region ? A.subscribers.filter((x) => (x.regions || []).includes(f.region) || !(x.regions || []).length) : A.subscribers;
    const since = Date.now() - 30 * 864e5;
    const recent = A.subscribers.filter((x) => new Date(x.created_at).getTime() >= since).length;
    const regionNames = (r) => (r || []).length ? r.map((k) => T.regionOf(k).name).join(", ") : "כל הארץ";
    return ph("מנויי דיוור", "מי שנרשם לדילים ולדקה 90 באתר. מעתיקים את הכתובות לכלי הדיוור (Resend, Mailchimp ועוד). לפי החוק שולחים רק למי שנרשם, ועם קישור הסרה.", `<button class="btn btn-line" type="button" data-act="subs-copy">${I("copy")}העתקת כתובות</button><button class="btn btn-line" type="button" data-act="subs-csv">${I("download")}CSV</button>`) + `
      <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div class="kpi"><span>${I("mail")}נרשמים</span><b>${A.subscribers.length}</b><small>${recent} ב־30 הימים האחרונים</small></div>
        <div class="kpi"><span>${I("pin")}עם אזור מועדף</span><b>${A.subscribers.filter((x) => (x.regions || []).length).length}</b><small>השאר רוצים דילים מכל הארץ</small></div>
        <div class="kpi"><span>${I("users")}בסינון</span><b>${list.length}</b><small>${f.region ? esc(T.regionOf(f.region).name) + " + כל הארץ" : "כל המנויים"}</small></div>
      </div>
      <div class="panel"><div class="toolbar"><select class="select" id="sf-region" aria-label="אזור" style="width:auto"><option value="">כל האזורים</option>${T.REGIONS.map((r) => `<option value="${r.key}" ${f.region === r.key ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select></div>
        ${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>אימייל</th><th>שם</th><th>אזורים</th><th>נרשם</th><th></th></tr></thead><tbody>${list.map((x) => `<tr data-row="${esc(x.id)}"><td class="ltr">${esc(x.email)}</td><td>${esc(x.name || "") || '<span class="muted">—</span>'}</td><td class="sub">${esc(regionNames(x.regions))}</td><td class="sub" style="white-space:nowrap">${T.fmtStamp(x.created_at)}${x.source ? ` · ${esc(x.source === "site" ? "האתר" : x.source)}` : ""}</td>
          <td><div class="acts"><button class="mini-btn" type="button" data-act="copy" data-text="${esc(x.email)}" aria-label="העתקת ${esc(x.email)}">${I("copy")}</button><button class="mini-btn" type="button" data-act="ask-del" data-kind="subscriber" data-id="${esc(x.id)}" aria-label="הסרת ${esc(x.email)}">${I("trash")}</button></div></td></tr>`).join("")}</tbody></table></div>`
        : `<div class="empty"><h3>עוד אין נרשמים</h3><p>טופס ההרשמה מופיע בעמוד הבית, בדילים ובתחתית האתר.</p></div>`}</div>`;
  }

  /* ================================================================ settings */
  function viewSettings() {
    const s = A.settings;
    const p = s.plan_prices || {};
    return ph("הגדרות האתר", "") + `
      <form data-form="settings" id="settings-form" novalidate>
        <div class="cols2">
          <div>
            <section class="panel"><h2>שם ויצירת קשר</h2><div class="form-grid">
              <label class="field"><span>שם האתר</span><input class="input" name="site_name" value="${esc(s.site_name)}"></label>
              <label class="field"><span>תיאור קצר</span><input class="input" name="site_tagline" value="${esc(s.site_tagline)}"></label>
              <label class="field"><span>טלפון ראשי</span><input class="input" name="phone" type="tel" dir="ltr" style="text-align:right" value="${esc(s.phone)}"></label>
              <label class="field"><span>וואטסאפ ראשי</span><input class="input" name="whatsapp" type="tel" dir="ltr" style="text-align:right" value="${esc(s.whatsapp)}"></label>
              <label class="field"><span>אימייל באתר</span><input class="input" name="email" type="email" dir="ltr" style="text-align:right" value="${esc(s.email)}"></label>
              <label class="field"><span>אימייל להתראות (פניות והצטרפות)</span><input class="input" name="notify_email" type="email" dir="ltr" style="text-align:right" value="${esc(s.notify_email)}"></label>
              <label class="field"><span>רכז/ת נגישות (שם)</span><input class="input" name="a11y_coordinator" value="${esc(s.a11y_coordinator)}"></label>
            </div></section>
            <section class="panel"><h2>עמוד הבית</h2><div class="form-grid">
              <label class="field span2"><span>כותרת ראשית</span><input class="input" name="hero_title" value="${esc(s.hero_title)}" maxlength="70"></label>
              <label class="field span2"><span>משפט משנה</span><textarea class="textarea" name="hero_subtitle" rows="2" style="min-height:70px" maxlength="200">${esc(s.hero_subtitle)}</textarea></label></div>
              <p class="field-label" style="margin:16px 0 8px">תמונת באנר</p>
              <div style="display:grid;grid-template-columns:minmax(0,240px) 1fr;gap:14px;align-items:center">
                <div class="photo" style="aspect-ratio:16/9;cursor:default"><img src="${esc(s.hero_image || T.HERO_DEFAULT)}" alt="הבאנר הנוכחי"></div>
                <div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-line">${I("upload")}העלאת תמונה<input type="file" accept="image/*" class="sr" id="hero-input"></label>${s.hero_image ? `<button class="btn btn-ghost" type="button" data-act="hero-clear">חזרה לתמונת ברירת המחדל</button>` : ""}<span class="hint" style="width:100%">מומלץ צילום רוחבי, לפחות 2000 פיקסלים ברוחב.</span></div></div></section>
            <section class="panel"><h2>חגים (לילות במחיר חג)</h2><div class="rows-edit">${(s.holidays || []).map((h, i) => `<div class="row-edit"><label class="field"><span>חג</span><input class="input" data-hol="${i}" data-k="label" value="${esc(h.label)}"></label><label class="field"><span>מהלילה של</span><input class="input" type="date" data-hol="${i}" data-k="from" value="${esc(h.from)}"></label><label class="field"><span>עד הלילה של</span><input class="input" type="date" data-hol="${i}" data-k="to" value="${esc(h.to)}"></label><button class="mini-btn" type="button" data-act="hol-del" data-i="${i}" aria-label="הסרה">${I("trash")}</button></div>`).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="hol-add" style="justify-self:start">${I("plus")}חג</button></div><p class="hint" style="margin-top:8px">התאריכים חושבו לפי הלוח העברי (ישראל). אפשר להוסיף גם ימי שיא משלכם.</p></section>
            <section class="panel"><h2>אוספים בעמוד הבית <span class="hint">שורת מתחמים עם כותרת, למשל ״חופשה רומנטית בחורף״</span></h2><div class="rows-edit">${(s.collections || []).map((c, i) => `<div class="row-edit" style="flex-direction:column;align-items:stretch">
                <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap"><label class="field" style="flex:1 1 200px"><span>כותרת</span><input class="input" data-col="${i}" data-k="title" value="${esc(c.title || "")}" maxlength="50"></label><label class="field" style="flex:2 1 240px"><span>משפט משנה</span><input class="input" data-col="${i}" data-k="sub" value="${esc(c.sub || "")}" maxlength="110"></label><button class="mini-btn" type="button" data-act="col-del" data-i="${i}" aria-label="הסרת אוסף">${I("trash")}</button></div>
                <details${(c.ids || []).length ? "" : " open"}><summary class="hint" style="cursor:pointer;margin-top:8px">${(c.ids || []).length} מתחמים באוסף · בחירה</summary><div class="amen-picks" style="margin-top:8px">${A.listings.map((l) => `<label><input type="checkbox" data-colid="${i}" value="${esc(l.id)}" ${(c.ids || []).includes(l.id) ? "checked" : ""}>${esc(l.name)}</label>`).join("")}</div></details></div>`).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="col-add" style="justify-self:start">${I("plus")}אוסף</button></div></section>
          </div>
          <div>
            <section class="panel"><h2>אישור תוכן</h2><div class="toggle-row" style="border:0"><span>שינויי תוכן של מארחים דורשים אישור<small>שם, תיאור, תמונות, מאפיינים ותוכן הדף</small></span><button class="switch" type="button" role="switch" aria-checked="${s.moderation !== false}" data-act="set-mod" aria-label="אישור תוכן"></button></div></section>
            <section class="panel"><h2>רכיבים באתר</h2>
              ${[["find_enabled", "שירות ״מצא לי צימר״", "כפתור בתפריט וטופס בקשה אישית"], ["wa_float", "כפתור וואטסאפ צף", "מופיע אם הוזן וואטסאפ ראשי"], ["cookie_banner", "הודעת עוגיות", "פס תחתון עם הסבר על מה שנשמר בדפדפן"]].map(([k, n, sub]) => `<div class="toggle-row"><span>${n}<small>${sub}</small></span><button class="switch" type="button" role="switch" aria-checked="${s[k] !== false}" data-act="set-flag" data-k="${k}" aria-label="${n}"></button></div>`).join("")}</section>
            <section class="panel"><h2>רשתות חברתיות <span class="hint">מופיעות בתחתית האתר</span></h2><div class="form-grid">
              ${[["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"]].map(([k, n]) => `<label class="field"><span>${n}</span><input class="input" dir="ltr" name="social_${k}" value="${esc((s.social || {})[k] || "")}" placeholder="https://"></label>`).join("")}</div></section>
            <section class="panel"><h2>מחירים למפרסמים</h2><div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
              ${T.PLANS.map((pl) => `<label class="field"><span>${pl.name} (₪/חודש)</span><input class="input num" type="number" min="0" name="price_${pl.key}" value="${esc(p[pl.key])}"></label>`).join("")}
              <label class="field"><span>₪ לפנייה</span><input class="input num" type="number" min="0" name="lead_price_default" value="${esc(s.lead_price_default)}"></label>
              <label class="field"><span>₪ מיקום ממומן/חודש</span><input class="input num" type="number" min="0" name="sponsored_price" value="${esc(s.sponsored_price)}"></label></div></section>
            <section class="panel"><h2>קופונים</h2><div class="rows-edit">${(s.coupons || []).map((c, i) => `<div class="row-edit"><label class="field"><span>קוד</span><input class="input" dir="ltr" data-cpn="${i}" data-k="code" value="${esc(c.code)}"></label><label class="field"><span>% הנחה</span><input class="input num" type="number" min="1" max="90" data-cpn="${i}" data-k="pct" value="${esc(c.pct)}"></label><label class="field"><span>בתוקף עד</span><input class="input" type="date" data-cpn="${i}" data-k="until" value="${esc(c.until || "")}"></label><button class="mini-btn" type="button" data-act="cpn-del" data-i="${i}" aria-label="הסרה">${I("trash")}</button></div>`).join("")}
              <button class="btn btn-line btn-sm" type="button" data-act="cpn-add" style="justify-self:start">${I("plus")}קופון</button></div><p class="hint" style="margin-top:8px">הקופון מופיע בבקשת ההזמנה, והמארח מכבד את ההנחה. כדאי לתאם איתם מראש.</p></section>
            <section class="panel"><h2>חיבור והפצה</h2>
              ${T.isLive ? `<p class="note note-ok">${I("check")}<span>האתר מחובר למסד הנתונים.</span></p><button class="btn btn-line" type="button" data-act="rebuild" style="margin-top:10px">${I("refresh")}עדכון דפי גוגל ומפת האתר עכשיו</button><p class="hint" style="margin-top:6px">דפי המתחמים לגוגל נבנים מחדש גם אוטומטית כל לילה.</p>` : `<p class="note note-warn">${I("info")}<span>מצב הדגמה: הנתונים נשמרים רק בדפדפן הזה. להעלאה לאוויר עקבו אחרי README.md.</span></p>`}</section>
          </div>
        </div>
        <div class="savebar"><span class="state">שינויים נכנסים לאתר מיד אחרי השמירה</span><button class="btn btn-primary" type="submit">${I("check")}שמירת ההגדרות</button></div>
      </form>
      <section class="panel" style="margin-top:16px"><h2>גיבוי והעברת נתונים</h2>
        <p class="muted" style="font-size:var(--t-s);margin-bottom:12px">ייצוא יוצר טקסט JSON עם המתחמים, הלקוחות, הכתבות וההגדרות. כך מעבירים עבודה ממצב ההדגמה לאתר החי.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn btn-line" type="button" data-act="export">${I("download")}ייצוא</button>${A.exportText ? `<button class="btn btn-line" type="button" data-act="copy-export">${I("copy")}העתקה</button>` : ""}<button class="btn btn-line" type="button" data-act="import">${I("upload")}ייבוא מהתיבה</button>${T.isLive ? "" : `<button class="btn btn-ghost" type="button" data-act="clear-demo">הסרת נתוני הדוגמה</button><button class="btn btn-ghost" type="button" data-act="reset-demo">איפוס ההדגמה</button>`}</div>
        <textarea class="textarea codebox" id="io-box" aria-label="נתוני JSON לייצוא או ייבוא" placeholder="הדביקו כאן JSON לייבוא">${esc(A.exportText)}</textarea><div id="io-confirm"></div></section>`;
  }

  /* ================================================================ host home */
  function viewMy() {
    const advs = A.advertisers;
    const newLeads = A.leads.filter((q) => q.status === "new").length;
    const tot = A.listings.reduce((t, l) => { const s = A.stats[l.id] || { v: 0, p: 0, w: 0 }; t.v += s.v; t.p += s.p; t.w += s.w; return t; }, { v: 0, p: 0, w: 0 });
    const since = Date.now() - 30 * 864e5;
    const leads30 = A.leads.filter((q) => new Date(q.created_at).getTime() >= since).length;
    return ph(`שלום${advs[0] ? ", " + esc(advs[0].name) : ""}`, "מעדכנים מחירים, תמונות ויומן, ורואים פניות וחוות דעת מאורחים.") + `
      ${advs.map((a) => `<div class="panel"><h2>המנוי שלי ${advPill(a)}</h2><div class="stat-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        <div><b style="font-size:1.8rem">${planName(a.plan)}</b><span>${T.money((A.settings.plan_prices || {})[a.plan])} לחודש · ${esc(T.statusName(T.BILLING_MODELS, a.billing_model || "subscription"))}</span></div>
        <div><b style="font-size:1.8rem">${T.fmtDate(a.end_date) || "—"}</b><span>בתוקף עד · לחידוש: ${esc(A.settings.phone || A.settings.email || "צוות האתר")}</span></div>
        <a href="#leads" style="text-decoration:none;color:inherit"><b>${newLeads}</b><span>פניות חדשות</span></a></div></div>`).join("")}
      <div class="panel"><h2>30 הימים האחרונים</h2><div class="stat-grid"><div><b>${T.num(tot.v)}</b><span>צפיות בדפי המתחמים</span></div><div><b>${tot.p}</b><span>הצגות מספר טלפון</span></div><div><b>${tot.w}</b><span>לחיצות וואטסאפ</span></div><div><b>${leads30}</b><span>בקשות הזמנה</span></div></div></div>
      <div class="panel"><h2>המתחמים שלי</h2>
        ${A.listings.length ? `<div class="table-wrap"><table class="tbl"><tbody>${A.listings.map((l) => { const s = A.stats[l.id] || { v: 0 }; return `<tr><td style="width:90px"><img class="thumb" src="${esc(T.thumbOf(l))}" alt=""></td>
          <td><a class="name" href="#edit-${esc(l.id)}">${esc(l.name)}</a><div class="sub">${esc(l.settlement)} · החל מ־${T.money(T.fromPrice(l))} ללילה</div></td>
          <td>${l.active ? '<span class="pill pill-ok">מוצג באתר</span>' : '<span class="pill pill-muted">ממתין להפעלה</span>'} ${l.pending ? '<span class="pill pill-warn">שינויים ממתינים לאישור</span>' : ""}</td>
          <td class="num">${T.num(s.v)} צפיות · ${leadsFor(l.id).length} פניות</td>
          <td><div class="acts"><a class="btn btn-primary btn-sm" href="#edit-${esc(l.id)}">${I("edit")}עריכה</a><a class="mini-btn" href="${siteURL("stay-" + l.id)}" target="_blank" rel="noopener" aria-label="צפייה באתר">${I("external")}</a></div></td></tr>`; }).join("")}</tbody></table></div>`
        : `<div class="empty"><h3>עוד אין מתחמים בחשבון</h3><p>צוות האתר יוסיף את המתחם שלכם, ואז תוכלו לערוך אותו כאן.</p></div>`}</div>`;
  }

  /* ================================================================ router */
  function render() {
    const app = $("#app");
    A.maps.forEach((m) => { try { m.remove(); } catch (e) {} });
    A.maps = [];
    if (!A.ready) { app.innerHTML = `<div class="login"><p class="muted">טוען…</p></div>`; return; }
    if (!A.authed) { app.innerHTML = viewLogin(); return; }
    const h = location.hash.slice(1) || (IS_ADMIN ? "dashboard" : "my");
    if (A.editId && h !== "edit-" + A.editId && !(A.editId === "new" && h === "new")) {
      const dr = A.drafts[A.editId];
      if (dr && dr._dirty) T.toast("השינויים במתחם נשמרו כטיוטה. אפשר לחזור ולשמור.");
      A.editId = null; A.calStart = null; A.calUnit = "";
    }
    if (h !== "articles") A.editArticle = null;
    let html;
    if (IS_ADMIN) {
      const routes = { dashboard: viewDashboard, listings: viewListings, leads: viewLeads, moderation: viewModeration, reviews: viewReviews, advertisers: viewAdvertisers, billing: viewBilling, applications: viewApplications, articles: viewArticles, places: viewPlaces, subscribers: viewSubscribers, "site-settings": viewSettings };
      if (h === "new") html = viewEditor("new");
      else if (h.startsWith("edit-")) html = viewEditor(h.slice(5));
      else html = (routes[h] || viewDashboard)();
    } else {
      if (h.startsWith("edit-") && A.listings.some((l) => l.id === h.slice(5))) html = viewEditor(h.slice(5));
      else if (h === "leads") html = viewLeads();
      else if (h === "reviews") html = viewReviews();
      else html = viewMy();
    }
    app.innerHTML = shell(html);
    if ($("#editor")) bindEditor();
    document.title = (IS_ADMIN ? "ניהול" : "ממשק מארחים") + " | " + A.settings.site_name;
  }
  function rerenderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  async function reload() {
    try {
      if (IS_ADMIN) {
        const [listings, advertisers, leads, applications, reviews, articles, settings, stats, places, subscribers] = await Promise.all([T.store.listListings({ all: true }), T.store.listAdvertisers(), T.store.listLeads(), T.store.listApplications(), T.store.listReviews({ all: true }), T.store.listArticles({ all: true }), T.store.getSettings(), T.store.stats(30), T.store.listPlaces({ all: true }), T.store.listSubscribers()]);
        Object.assign(A, { listings, advertisers, leads, applications, reviews, articles, settings, stats, places, subscribers });
      } else {
        const [listings, advertisers, leads, reviews, settings, stats] = await Promise.all([T.store.myListings(), T.store.myAdvertisers(), T.store.myLeads(), T.store.myReviews(), T.store.getSettings(), T.store.stats(30)]);
        Object.assign(A, { listings, advertisers, leads, reviews, settings, stats });
      }
      T.SETTINGS = A.settings;
    } catch (e) { fail("טעינת הנתונים נכשלה", e); }
  }
  async function checkAuth() {
    if (!T.isLive) return IS_ADMIN ? T.store.isAdmin() : (await T.store.myAdvertisers()).length > 0;
    const user = await T.store.getUser();
    if (!user) return false;
    A.email = user.email || "";
    if (IS_ADMIN) {
      if (await T.store.isAdmin()) return true;
      A.loginMsg = { tone: "warn", text: "החשבון מחובר אבל לא מוגדר כמנהל. הוסיפו את האימייל לטבלת admins (שלב 4 במדריך)." };
      await T.store.signOut();
      return false;
    }
    if ((await T.store.myAdvertisers()).length) return true;
    A.loginMsg = { tone: "warn", text: "לא מצאנו לקוח עם האימייל הזה. פנו לצוות האתר כדי שיעדכנו את האימייל אצלם." };
    await T.store.signOut();
    return false;
  }

  /* ================================================================ events */
  const editRows = (key, fn) => { readEditor(); fn(A.drafts[A.editId][key]); markDirty(); rerenderEditor(); };
  const settingsRows = (key, fn) => { readSettingsForm(); fn(A.settings[key] = A.settings[key] || []); rerenderKeepScroll(); };
  function readSettingsForm() {
    const form = $("#settings-form");
    if (!form) return;
    $$("[data-hol]", form).forEach((el) => { const h = A.settings.holidays[Number(el.dataset.hol)]; if (h) h[el.dataset.k] = el.value; });
    $$("[data-cpn]", form).forEach((el) => { const c = A.settings.coupons[Number(el.dataset.cpn)]; if (c) c[el.dataset.k] = el.dataset.k === "pct" ? Number(el.value) || 0 : el.dataset.k === "code" ? el.value.trim().toUpperCase() : el.value; });
    $$("[data-col]", form).forEach((el) => { const c = (A.settings.collections || [])[Number(el.dataset.col)]; if (c) c[el.dataset.k] = el.value; });
    (A.settings.collections || []).forEach((c, i) => { if ($(`[data-colid="${i}"]`, form)) c.ids = $$(`[data-colid="${i}"]:checked`, form).map((x) => x.value); });
    const fd = new FormData(form);
    A.settings.social = {};
    ["instagram", "facebook", "tiktok", "youtube"].forEach((k) => { const v = (fd.get("social_" + k) || "").trim(); if (v) A.settings.social[k] = /^https?:\/\//.test(v) ? v : "https://" + v; });
    ["site_name", "site_tagline", "phone", "whatsapp", "email", "notify_email", "a11y_coordinator", "hero_title", "hero_subtitle"].forEach((k) => (A.settings[k] = (fd.get(k) || "").trim()));
    A.settings.plan_prices = {};
    T.PLANS.forEach((p) => (A.settings.plan_prices[p.key] = Number(fd.get("price_" + p.key)) || 0));
    A.settings.lead_price_default = Number(fd.get("lead_price_default")) || 0;
    A.settings.sponsored_price = Number(fd.get("sponsored_price")) || 0;
  }
  document.addEventListener("click", async (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) { if (e.target.id === "deny") $("#deny").remove(); else if (e.target.id === "modal") $("#modal").remove(); return; }
    const act = el.dataset.act;
    const id = el.dataset.id;
    const save = async (fn, msg) => { try { await fn(); await reload(); rerenderKeepScroll(); if (msg) T.toast(msg); } catch (ex) { fail("הפעולה נכשלה", ex); } };
    if (act === "demo-admin") { await T.store.signInAdmin(); A.authed = true; await reload(); render(); }
    else if (act === "demo-owner") { await T.store.signInOwnerDemo($("#demo-owner").value); A.authed = true; await reload(); location.hash = "my"; render(); }
    else if (act === "google") { try { await T.store.signInGoogle(); } catch (ex) { A.loginMsg = { tone: "warn", text: "הכניסה עם Google לא הוגדרה עדיין: " + ex.message }; render(); } }
    else if (act === "deny-close") $("#deny").remove();
    else if (act === "logout") { ["#modal", "#deny"].forEach((x) => { const m = $(x); if (m) m.remove(); }); await T.store.signOut(); A.authed = false; A.loginMsg = null; if (!IS_ADMIN && !T.isLive) A.advertisers = await T.store.listAdvertisers(); render(); }
    else if (act === "lf-status") { A.lf.status = el.dataset.v; rerenderKeepScroll(); }
    else if (act === "qf-status") { A.qf.status = el.dataset.v; rerenderKeepScroll(); }
    else if (act === "rf") { A.rf = el.dataset.v; rerenderKeepScroll(); }
    else if (act === "pf-kind") { A.pf.kind = el.dataset.v; rerenderKeepScroll(); }
    else if (act === "leads-csv") downloadCSV(`leads-${T.iso(T.today())}.csv`, ["התקבלה", "סוג", "סטטוס", "שם", "טלפון", "אימייל", "מתחם", "יחידה", "הגעה", "עזיבה", "מבוגרים", "ילדים", "הערכה", "פרטים", "הודעה"], A.leads.map((q) => [q.created_at, T.statusName(T.LEAD_SOURCES, q.source || "form"), T.statusName(T.LEAD_STATUS, q.status), q.name, q.phone, q.email, q.listing_name, q.unit_name, q.check_in, q.check_out, q.guests, q.children, q.est_total, unesc(leadDetails(q).join(" | ")), q.message]));
    else if (act === "subs-copy") T.copy(A.subscribers.filter((x) => !A.sf.region || !(x.regions || []).length || x.regions.includes(A.sf.region)).map((x) => x.email).join(", "));
    else if (act === "subs-csv") downloadCSV(`subscribers-${T.iso(T.today())}.csv`, ["email", "name", "regions", "created_at"], A.subscribers.map((x) => [x.email, x.name, (x.regions || []).map((k) => T.regionOf(k).name).join(" / "), x.created_at]));
    else if (act === "place-edit") { const pl = id ? A.places.find((x) => x.id === id) : { kind: "restaurant", region: A.pf.region || "golan", active: true }; document.body.insertAdjacentHTML("beforeend", placeModal(pl)); $("#modal input:not([type=hidden])").focus(); }
    else if (act === "place-toggle") { const pl = A.places.find((x) => x.id === id); save(() => T.store.savePlace(Object.assign({}, pl, { active: pl.active === false })), pl.active === false ? "המקום מוצג" : "המקום הוסתר"); }
    else if (act === "set-flag") { const k = el.dataset.k; A.settings[k] = A.settings[k] === false; el.setAttribute("aria-checked", A.settings[k] !== false); }
    else if (act === "col-add") settingsRows("collections", (rows) => rows.push({ id: T.uid("c"), title: "", sub: "", ids: [] }));
    else if (act === "col-del") settingsRows("collections", (rows) => rows.splice(Number(el.dataset.i), 1));
    else if (act === "toggle") { const l = A.listings.find((x) => x.id === id); const k = el.dataset.k; save(() => T.store.saveListing(Object.assign({}, l, { [k]: !l[k] })), k === "active" ? (!l.active ? "המתחם מוצג באתר" : "המתחם הוסתר") : !l.featured ? "נוסף לנבחרי העונה" : "הוסר מנבחרי העונה"); }
    else if (act === "sponsor") { const l = A.listings.find((x) => x.id === id); const on = T.isSponsored(l); save(() => T.store.saveListing(Object.assign({}, l, { sponsored_until: on ? null : T.iso(T.addDays(T.today(), 30)) })), on ? "המיקום הממומן בוטל" : "ממומן ל־30 יום"); }
    else if (act === "ask-del") {
      const kind = el.dataset.kind;
      const names = { listing: "את המתחם", lead: "את הפנייה", advertiser: "את הלקוח", application: "את הבקשה", review: "את חוות הדעת", article: "את הכתבה", place: "את המקום", subscriber: "את המנוי מרשימת הדיוור" };
      const box = document.createElement("div");
      box.className = "confirm";
      box.innerHTML = `<span>למחוק ${names[kind]}? אי אפשר לבטל.</span><button class="btn btn-danger btn-sm" type="button" data-act="do-del" data-kind="${kind}" data-id="${esc(id)}">מחיקה</button><button class="btn btn-ghost btn-sm" type="button" data-act="no-del">ביטול</button>`;
      const row = el.closest("tr, .lead-row, #del-zone");
      if (row && row.tagName === "TR") { const tr = document.createElement("tr"); tr.className = "confirm-row"; tr.innerHTML = `<td colspan="10"></td>`; tr.firstChild.appendChild(box); row.after(tr); }
      else if (row) row.appendChild(box);
      $('[data-act="do-del"]', box).focus();
      el.disabled = true;
    } else if (act === "no-del") { (el.closest(".confirm-row") || el.closest(".confirm")).remove(); $$("[data-act='ask-del'][disabled]").forEach((b) => (b.disabled = false)); }
    else if (act === "do-del") {
      const kind = el.dataset.kind;
      save(async () => {
        if (kind === "listing") { await T.store.deleteListing(id); delete A.drafts[id]; if (location.hash.slice(1) === "edit-" + id) { A.editId = null; location.hash = "listings"; } }
        else if (kind === "lead") await T.store.deleteLead(id);
        else if (kind === "advertiser") { for (const l of A.listings.filter((x) => x.owner_id === id)) await T.store.saveListing(Object.assign({}, l, { owner_id: "" })); await T.store.deleteAdvertiser(id); }
        else if (kind === "application") await T.store.deleteApplication(id);
        else if (kind === "review") await T.store.deleteReview(id);
        else if (kind === "article") await T.store.deleteArticle(id);
        else if (kind === "place") await T.store.deletePlace(id);
        else if (kind === "subscriber") await T.store.deleteSubscriber(id);
      }, "נמחק");
    } else if (act === "copy") T.copy(el.dataset.text);
    else if (act === "ical-sync-now") {
      readEditor();
      const d = A.drafts[A.editId];
      if (!d || !d.id) return;
      el.disabled = true;
      try {
        const r = await T.store.syncIcal(d.id);
        const fresh = await T.store.getListing(d.id);
        if (fresh) {
          d.ical_blocked = fresh.ical_blocked || [];
          d.ical_synced_at = fresh.ical_synced_at;
          const byId = new Map((fresh.rooms || []).map((x) => [x.id, x]));
          (d.rooms || []).forEach((x) => { const f = byId.get(x.id); x.ical_blocked = (f && f.ical_blocked) || []; });
        }
        rerenderKeepScroll();
        if (r.errors && r.errors.length) T.toast("חלק מהיומנים לא סונכרנו: " + r.errors.map((x) => x.error).join(" · "), "err");
        else T.toast(r.units ? "היומן סונכרן" : "אין קישור iCal שמור לסנכרון");
      } catch (ex) { el.disabled = false; fail("הסנכרון נכשל", ex); }
    }
    /* editor */
    else if (act === "ed-switch") { const d = A.drafts[A.editId]; d[el.dataset.k] = !d[el.dataset.k]; el.setAttribute("aria-checked", d[el.dataset.k]); markDirty(); }
    else if (act === "rooms-toggle") {
      readEditor();
      const d = A.drafts[A.editId];
      const tm = d.terms;
      if (d.rooms.length) { const r0 = d.rooms[0]; Object.assign(d, { price_weekday: r0.price_weekday, price_weekend: r0.price_weekend, price_holiday: r0.price_holiday || 0, guests_max: r0.guests_max, guests_base: r0.guests_base || 0, bedrooms: r0.bedrooms || d.bedrooms, blocked_dates: r0.blocked_dates || [], ical_url: r0.ical_url || "", rooms: [] }); Object.assign(tm, { p2_weekday: r0.p2_weekday || 0, p2_weekend: r0.p2_weekend || 0, beds: r0.beds || 0, size: r0.size || 0 }); }
      else d.rooms = [{ id: T.uid("r"), name: "יחידה 1", guests_max: d.guests_max || 2, bedrooms: d.bedrooms || 1, beds: tm.beds || 0, bathrooms: d.bathrooms || 1, size: tm.size || 0, guests_base: d.guests_base || 0, price_weekday: d.price_weekday || 0, price_weekend: d.price_weekend || 0, price_holiday: d.price_holiday || 0, p2_weekday: tm.p2_weekday || 0, p2_weekend: tm.p2_weekend || 0, desc: "", amenities: [], photos: [], blocked_dates: d.blocked_dates || [], ical_url: d.ical_url || "", ical_blocked: d.ical_blocked || [] }];
      markDirty(); rerenderEditor();
    } else if (act === "room-add") editRows("rooms", (rows) => rows.push({ id: T.uid("r"), name: `יחידה ${rows.length + 1}`, guests_max: 2, bedrooms: 1, beds: 1, bathrooms: 1, size: 0, guests_base: 0, price_weekday: rows[0] ? rows[0].price_weekday : 0, price_weekend: rows[0] ? rows[0].price_weekend : 0, price_holiday: 0, p2_weekday: 0, p2_weekend: 0, desc: "", amenities: [], photos: [], blocked_dates: [], ical_url: "", ical_blocked: [] }));
    else if (act === "arr-add") { const path = el.dataset.arr; readEditor(); const d = A.drafts[A.editId]; let a = getPath(d, path); if (!Array.isArray(a)) { a = []; setPath(d, path, a); } a.push(ARR_NEW[path] ? ARR_NEW[path](a) : {}); markDirty(); rerenderEditor(); }
    else if (act === "arr-del") { const path = el.dataset.arr; readEditor(); const a = getPath(A.drafts[A.editId], path); if (Array.isArray(a)) a.splice(Number(el.dataset.i), 1); markDirty(); rerenderEditor(); }
    else if (act === "cancel-preset") { readEditor(); const d = A.drafts[A.editId]; d.terms.cancel = T.clone(T.CANCEL_PRESETS.find((c) => c.key === el.dataset.k).tiers); markDirty(); rerenderEditor(); }
    else if (act === "ed-jump") { e.preventDefault(); const sec = document.getElementById(el.dataset.to); if (sec) { sec.scrollIntoView({ behavior: "smooth", block: "start" }); const f = sec.querySelector("input,select,textarea,button"); if (f) setTimeout(() => f.focus({ preventScroll: true }), 350); } }
    else if (act === "room-del") editRows("rooms", (rows) => { if (rows.length > 1) rows.splice(Number(el.dataset.i), 1); });
    else if (act === "season-add") editRows("seasons", (rows) => rows.push({ label: "", from: "", to: "", pct: 10 }));
    else if (act === "season-del") editRows("seasons", (rows) => rows.splice(Number(el.dataset.i), 1));
    else if (act === "extra-add") editRows("extras", (rows) => rows.push({ name: "", price: 0, per: "stay" }));
    else if (act === "extra-del") editRows("extras", (rows) => rows.splice(Number(el.dataset.i), 1));
    else if (act === "cal-unit") { A.calUnit = id; $("#ed-cal").innerHTML = editCal(A.drafts[A.editId]); }
    else if (act === "ed-day") {
      readEditor();
      const d = A.drafts[A.editId];
      const iso = el.dataset.d;
      const target = d.rooms.length ? d.rooms.find((r) => r.id === A.calUnit) || d.rooms[0] : d;
      target.blocked_dates = (target.blocked_dates || []).includes(iso) ? target.blocked_dates.filter((x) => x !== iso) : (target.blocked_dates || []).concat(iso).sort();
      $("#ed-cal").innerHTML = editCal(d);
      const b = $(`#ed-cal [data-d="${iso}"]`); if (b) b.focus();
      markDirty();
    } else if (act === "ed-cal") {
      const base = A.calStart || new Date(T.today().getFullYear(), T.today().getMonth(), 1);
      const next = new Date(base.getFullYear(), base.getMonth() + Number(el.dataset.d), 1);
      if (next >= new Date(T.today().getFullYear(), T.today().getMonth(), 1)) A.calStart = next;
      $("#ed-cal").innerHTML = editCal(A.drafts[A.editId]);
    } else if (act === "ph-del" || act === "ph-move") {
      const d = A.drafts[A.editId];
      const i = Number(el.dataset.i);
      readEditor();
      if (act === "ph-del") deletePhoto(d, i);
      else { const j = i + Number(el.dataset.d); if (j < 0 || j >= d.photos.length) return; movePhoto(d, i, j); }
      $("#photos").innerHTML = photosHTML(d);
      bindEditor();
      markDirty();
      if (act === "ph-move") { const b = $(`#photos [data-act="ph-move"][data-i="${i + Number(el.dataset.d)}"][data-d="${el.dataset.d}"]`); if (b) b.focus(); }
    } else if (act === "ed-discard") { delete A.drafts[A.editId]; rerenderKeepScroll(); T.toast("השינויים בוטלו"); }
    /* moderation & reviews */
    else if (act === "mod-approve") save(() => T.store.approvePending(id), "השינויים פורסמו באתר");
    else if (act === "mod-reject") save(() => T.store.rejectPending(id), "השינויים נדחו");
    else if (act === "rev-set") save(() => T.store.updateReview(id, { status: el.dataset.v }), el.dataset.v === "approved" ? "חוות הדעת פורסמה" : "חוות הדעת נדחתה");
    else if (act === "reply") { const v = $(`[data-reply="${CSS.escape(id)}"]`).value.trim(); save(() => T.store.updateReview(id, { reply: v }), "התגובה נשמרה"); }
    else if (act === "ask-review") {
      const q = A.leads.find((x) => x.id === id);
      try {
        const link = await reviewLink(q);
        const msg = `שלום ${q.name.replace(/\s*\(דוגמה\)/, "")}, תודה שהתארחתם ב${q.listing_name}! נשמח אם תכתבו כמה מילים על השהייה: ${link}`;
        document.body.insertAdjacentHTML("beforeend", `<div class="modal-back" id="modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
          <div class="modal-head"><h2 id="m-title">בקשת חוות דעת</h2><button class="icon-btn" type="button" data-act="modal-close" aria-label="סגירה">${I("x")}</button></div>
          <p class="muted" style="font-weight:300">קישור אישי ל${esc(q.name)}. הוא עובד פעם אחת, ורק להזמנה הזאת.</p>
          <span class="copy-field"><input class="input" readonly value="${esc(link)}" aria-label="קישור לחוות דעת"><button class="mini-btn" type="button" data-act="copy" data-text="${esc(link)}" aria-label="העתקה">${I("copy")}</button></span>
          <a class="btn btn-primary" href="${esc(T.waLink(q.phone, msg))}" target="_blank" rel="noopener">${I("chat")}שליחה לאורח בוואטסאפ</a></div></div>`);
      } catch (ex) { fail("יצירת הקישור נכשלה", ex); }
    }
    /* advertisers & billing */
    else if (act === "adv-edit") { const a = id ? A.advertisers.find((x) => x.id === id) : { plan: "basic", status: "active", billing_model: "subscription" }; document.body.insertAdjacentHTML("beforeend", advModal(a)); $("#modal input:not([type=hidden])").focus(); }
    else if (act === "modal-close") $("#modal").remove();
    else if (act === "adv-renew") {
      const f = el.closest("form");
      const end = f.end_date.value ? T.parseISO(f.end_date.value) : T.today();
      const base = end < T.today() ? T.today() : end;
      f.end_date.value = T.iso(new Date(base.getFullYear() + 1, base.getMonth(), base.getDate()));
      f.status.value = "active";
      T.toast("המנוי הוארך עד " + T.fmtDate(f.end_date.value) + ". לחצו שמירה.");
    } else if (act === "pay" || act === "unpay") {
      const a = A.advertisers.find((x) => x.id === id);
      const payments = (a.payments || []).filter((p) => p.month !== A.billMonth);
      if (act === "pay") payments.push({ month: A.billMonth, amount: Number(el.dataset.amount), paid_at: new Date().toISOString() });
      save(() => T.store.saveAdvertiser({ id: a.id, payments }), act === "pay" ? "סומן כשולם" : "הסימון בוטל");
    } else if (act === "bill-copy") {
      const rows = A.advertisers.map((a) => Object.assign({ a }, billingFor(a, A.billMonth))).filter((r) => r.total);
      T.copy(`חיובים ${T.fmtMonth(T.parseISO(A.billMonth + "-01"))}\n` + rows.map((r) => `${r.a.business || r.a.name}: ${T.money(r.total)} ${r.paid ? "(שולם)" : "(פתוח)"}`).join("\n"));
    }
    /* applications */
    else if (act === "app-approve") {
      const ap = A.applications.find((x) => x.id === id);
      try {
        const adv = await T.store.saveAdvertiser({ name: ap.name, business: ap.business, phone: ap.phone, email: ap.email, plan: "basic", status: "trial", billing_model: "subscription", lead_price: 0, payments: [], start_date: T.iso(T.today()), end_date: T.iso(T.addDays(T.today(), 30)), notes: "נפתח מבקשת הצטרפות" });
        const l = await T.store.saveListing(Object.assign(blankListing(), { name: ap.business, type: ap.type || "zimmer", region: ap.region, settlement: ap.settlement, units: ap.units || 1, phone: ap.phone, whatsapp: ap.phone, email: ap.email, owner_id: adv.id, active: false, price_weekday: 0, description: ap.message || "", lat: T.regionOf(ap.region).lat, lng: T.regionOf(ap.region).lng }));
        await T.store.updateApplication(id, { status: "approved" });
        await reload();
        T.toast("נוצרו לקוח ומתחם מוסתר. השלימו פרטים ושמרו.");
        location.hash = "edit-" + l.id;
      } catch (ex) { fail("האישור נכשל", ex); }
    } else if (act === "app-reject") save(() => T.store.updateApplication(id, { status: "rejected" }));
    /* articles */
    else if (act === "art-new") { A.editArticle = { title: "", excerpt: "", body: "", cover: "", published: false }; rerenderKeepScroll(); }
    else if (act === "art-edit") { e.preventDefault(); A.editArticle = T.clone(A.articles.find((a) => a.id === id)); render(); window.scrollTo(0, 0); }
    else if (act === "art-cancel") { A.editArticle = null; render(); }
    /* settings */
    else if (act === "set-mod") { A.settings.moderation = !(A.settings.moderation !== false); el.setAttribute("aria-checked", A.settings.moderation); }
    else if (act === "hol-add") settingsRows("holidays", (rows) => rows.push({ label: "", from: "", to: "" }));
    else if (act === "hol-del") settingsRows("holidays", (rows) => rows.splice(Number(el.dataset.i), 1));
    else if (act === "cpn-add") settingsRows("coupons", (rows) => rows.push({ code: "", pct: 10, until: "", active: true }));
    else if (act === "cpn-del") settingsRows("coupons", (rows) => rows.splice(Number(el.dataset.i), 1));
    else if (act === "hero-clear") save(() => T.store.saveSettings(Object.assign({}, A.settings, { hero_image: "" })), "הבאנר חזר לתמונת ברירת המחדל");
    else if (act === "rebuild") { try { await T.store.rebuildSeo(); T.toast("העדכון התחיל. הדפים יתעדכנו בעוד כמה דקות."); } catch (ex) { T.toast(ex.message, "err"); } }
    else if (act === "export") { A.exportText = JSON.stringify(await T.store.exportAll(), null, 1); rerenderKeepScroll(); T.toast("הנתונים מוכנים בתיבה. העתיקו ושמרו בקובץ."); }
    else if (act === "copy-export") T.copy(A.exportText);
    else if (act === "import") {
      let data;
      try { data = JSON.parse($("#io-box").value.trim()); } catch (ex) { T.toast("הטקסט בתיבה אינו JSON תקין", "err"); return; }
      if (!data || !Array.isArray(data.listings)) { T.toast("לא נמצאו מתחמים בטקסט", "err"); return; }
      A.pendingImport = data;
      $("#io-confirm").innerHTML = `<div class="confirm" style="margin-top:10px"><span>לייבא ${data.listings.length} מתחמים ו־${(data.advertisers || []).length} לקוחות?${T.isLive ? "" : " הנתונים הנוכחיים בדפדפן יוחלפו."}</span><button class="btn btn-danger btn-sm" type="button" data-act="do-import">ייבוא</button><button class="btn btn-ghost btn-sm" type="button" data-act="no-import">ביטול</button></div>`;
    } else if (act === "no-import") { $("#io-confirm").innerHTML = ""; A.pendingImport = null; }
    else if (act === "do-import") save(async () => { await T.store.importAll(A.pendingImport); A.pendingImport = null; A.exportText = ""; }, "הייבוא הושלם");
    else if (act === "clear-demo" || act === "reset-demo") $("#io-confirm").innerHTML = `<div class="confirm" style="margin-top:10px"><span>${act === "reset-demo" ? "להחזיר את ההדגמה למצב ההתחלתי? כל השינויים יימחקו." : "להסיר את כל נתוני הדוגמה? מה שהוספתם בעצמכם יישאר."}</span><button class="btn btn-danger btn-sm" type="button" data-act="do-${act}">אישור</button><button class="btn btn-ghost btn-sm" type="button" data-act="no-import">ביטול</button></div>`;
    else if (act === "do-reset-demo" || act === "do-clear-demo") { A.drafts = {}; save(() => (act === "do-reset-demo" ? T.store.reset() : T.store.clearDemo()), "בוצע"); }
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.closest("#editor")) { readEditor(); markDirty(); }
    else if (t.id === "lf-q") { A.lf.q = t.value.trim(); debouncedList(); }
    else if (t.id === "qf-q") { A.qf.q = t.value.trim(); debouncedLeads(); }
  });
  const refocus = (sel) => { const i = $(sel); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
  const debouncedList = T.debounce(() => { rerenderKeepScroll(); refocus("#lf-q"); }, 250);
  const debouncedLeads = T.debounce(() => { rerenderKeepScroll(); refocus("#qf-q"); }, 250);
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.id === "lf-region") { A.lf.region = t.value; rerenderKeepScroll(); }
    else if (t.id === "qf-listing") { A.qf.listing = t.value; rerenderKeepScroll(); }
    else if (t.id === "qf-source") { A.qf.source = t.value; rerenderKeepScroll(); }
    else if (t.id === "pf-region") { A.pf.region = t.value; rerenderKeepScroll(); }
    else if (t.id === "sf-region") { A.sf.region = t.value; rerenderKeepScroll(); }
    else if (t.id === "place-photo" && t.files[0]) {
      const f = t.closest("form");
      try { T.toast("מעלה תמונה…"); f.photo.value = await T.store.uploadPhoto(t.files[0]); const img = document.createElement("img"); img.src = T.img(f.photo.value, 300); img.alt = ""; img.style.cssText = "width:120px;aspect-ratio:4/3;object-fit:cover;border-radius:10px"; const old = t.closest("div").querySelector("img"); if (old) old.replaceWith(img); else t.closest("div").prepend(img); T.toast("התמונה עלתה. לחצו שמירה."); }
      catch (ex) { fail("ההעלאה נכשלה", ex); }
    }
    else if (t.id === "bill-month") { A.billMonth = t.value; rerenderKeepScroll(); }
    else if (t.dataset.roomPhoto != null && t.files.length) {
      readEditor();
      const d = A.drafts[A.editId], r = d && d.rooms[Number(t.dataset.roomPhoto)];
      if (!r) return;
      const files = Array.from(t.files).filter((f) => f.type.startsWith("image/")).slice(0, 8);
      T.toast(files.length > 1 ? `מעלה ${files.length} תמונות…` : "מעלה תמונה…");
      for (const f of files) { try { r.photos = (r.photos || []).concat(await T.store.uploadPhoto(f)); } catch (ex) { fail("העלאה נכשלה", ex); break; } }
      d._dirty = true; rerenderKeepScroll();
    }
    else if (t.id === "hero-input" && t.files[0]) {
      try { T.toast("מעלה תמונה…"); const url = await T.store.uploadPhoto(t.files[0]); await T.store.saveSettings(Object.assign({}, A.settings, { hero_image: url })); await reload(); rerenderKeepScroll(); T.toast("תמונת הבאנר עודכנה"); }
      catch (ex) { if (ex.code === "quota") T.toast(ex.message, "err"); else fail("ההעלאה נכשלה", ex); }
    } else if (t.id === "art-cover" && t.files[0]) {
      try { T.toast("מעלה תמונה…"); const f = $("form[data-form=article]"); Object.assign(A.editArticle, { title: f.title.value, excerpt: f.excerpt.value, body: f.body.value, published: f.published.checked }); A.editArticle.cover = await T.store.uploadPhoto(t.files[0]); rerenderKeepScroll(); }
      catch (ex) { fail("ההעלאה נכשלה", ex); }
    } else if (t.dataset.actChange === "lead-status") {
      try { await T.store.updateLead(t.dataset.id, { status: t.value }); await reload(); rerenderKeepScroll(); T.toast(t.value === "closed" ? "סומן כהזמנה. אפשר לבקש חוות דעת (כוכב)." : "הסטטוס עודכן"); }
      catch (ex) { fail("העדכון נכשל", ex); }
    } else if (t.dataset.actChange === "lead-note") {
      try { await T.store.updateLead(t.dataset.id, { admin_note: t.value }); const q = A.leads.find((x) => x.id === t.dataset.id); q.admin_note = t.value; T.toast("ההערה נשמרה"); }
      catch (ex) { fail("השמירה נכשלה", ex); }
    }
  });
  document.addEventListener("submit", async (e) => {
    const form = e.target;
    const kind = form.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const fd = new FormData(form);
    if (kind === "login") {
      try { await T.store.signInAdmin(fd.get("email").trim(), fd.get("password")); A.authed = await checkAuth(); if (A.authed) await reload(); render(); }
      catch (ex) { A.loginMsg = { tone: "warn", text: "הכניסה נכשלה: " + ex.message }; render(); }
    } else if (kind === "owner-login") {
      try { await T.store.signInOwnerLink(fd.get("email").trim()); A.loginMsg = { tone: "ok", text: "שלחנו קישור כניסה ל־" + fd.get("email").trim() + ". פתחו אותו מהמכשיר הזה." }; }
      catch (ex) { A.loginMsg = { tone: "warn", text: "השליחה נכשלה: " + ex.message }; }
      render();
    } else if (kind === "listing") saveEditor();
    else if (kind === "advertiser") {
      const a = Object.fromEntries(fd.entries());
      if (!a.business.trim() || !a.name.trim()) { T.toast("חסר שם עסק או איש קשר", "err"); return; }
      a.lead_price = Number(a.lead_price) || 0;
      if (!a.id) { delete a.id; a.payments = []; }
      try { await T.store.saveAdvertiser(a); $("#modal").remove(); await reload(); rerenderKeepScroll(); T.toast("נשמר"); }
      catch (ex) { fail("השמירה נכשלה", ex); }
    } else if (kind === "place") {
      const pl = Object.fromEntries(fd.entries());
      if (!String(pl.name || "").trim()) { T.toast("חסר שם למקום", "err"); return; }
      const coord = (v) => { const n = Number(String(v || "").trim()); return v === "" || v == null || !Number.isFinite(n) ? null : n; };
      const row = { name: pl.name.trim(), kind: pl.kind, region: pl.region, settlement: (pl.settlement || "").trim(), phone: (pl.phone || "").trim(), url: (pl.url || "").trim(), blurb: (pl.blurb || "").trim(), photo: pl.photo || "", lat: coord(pl.lat), lng: coord(pl.lng), active: !!fd.get("active") };
      if (row.url && !/^https?:\/\//.test(row.url)) row.url = "https://" + row.url;
      if (pl.id) row.id = pl.id;
      try { await T.store.savePlace(row); $("#modal").remove(); await reload(); rerenderKeepScroll(); T.toast("נשמר"); }
      catch (ex) { fail("השמירה נכשלה", ex); }
    } else if (kind === "settings") {
      readSettingsForm();
      const s = Object.assign({}, A.settings);
      if (!s.site_name) s.site_name = T.DEFAULT_SETTINGS.site_name;
      s.holidays = (s.holidays || []).filter((h) => h.from && h.to).sort((a, b) => a.from.localeCompare(b.from));
      s.coupons = (s.coupons || []).filter((c) => c.code && c.pct);
      s.collections = (s.collections || []).filter((c) => String(c.title || "").trim() && (c.ids || []).length).map((c) => ({ id: c.id || T.uid("c"), title: c.title.trim(), sub: String(c.sub || "").trim(), ids: c.ids }));
      try { await T.store.saveSettings(s); await reload(); rerenderKeepScroll(); T.toast("ההגדרות נשמרו"); }
      catch (ex) { fail("השמירה נכשלה", ex); }
    } else if (kind === "article") {
      const a = Object.assign({}, A.editArticle, { title: fd.get("title").trim(), excerpt: fd.get("excerpt").trim(), body: fd.get("body"), published: !!fd.get("published") });
      if (!a.title) { T.toast("חסרה כותרת", "err"); return; }
      try { const saved = await T.store.saveArticle(a); A.editArticle = T.clone(saved); await reload(); rerenderKeepScroll(); T.toast(a.published ? "נשמר ופורסם" : "נשמר כטיוטה"); }
      catch (ex) { fail("השמירה נכשלה", ex); }
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key !== "Escape") return; if ($("#deny")) $("#deny").remove(); else if ($("#modal")) $("#modal").remove(); });
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
  window.addEventListener("beforeunload", (e) => { if (Object.values(A.drafts).some((d) => d._dirty)) { e.preventDefault(); e.returnValue = ""; } });

  async function boot() {
    render();
    try { A.settings = await T.store.getSettings(); T.SETTINGS = A.settings; } catch (e) {}
    if (!IS_ADMIN && !T.isLive) A.advertisers = await T.store.listAdvertisers();
    try { A.authed = await checkAuth(); } catch (e) { A.authed = false; }
    if (A.authed) await reload();
    A.ready = true;
    render();
    T.store.onChange(async () => { if (!A.authed || A.editId || A.editArticle) return; await reload(); if (!$("#modal")) rerenderKeepScroll(); });
    if (T.isLive && T.store.client) T.store.client.auth.onAuthStateChange(async (ev, session) => {
      if (ev === "SIGNED_IN" && !A.authed) { A.authed = await checkAuth(); if (A.authed) await reload(); render(); }
      /* יציאה בלשונית אחרת, או התחברות של משתמש אחר באותו דפדפן: לא ממשיכים לעבוד בשם החשבון הקודם */
      else if (ev === "SIGNED_OUT" && A.authed) { A.authed = false; A.loginMsg = { tone: "info", text: "החשבון התנתק. היכנסו שוב כדי להמשיך." }; render(); }
      else if (A.authed && session && session.user && A.email && session.user.email !== A.email) { A.authed = await checkAuth(); if (A.authed) await reload(); else if (!A.loginMsg) A.loginMsg = { tone: "warn", text: "בדפדפן הזה התחבר עכשיו חשבון אחר. היכנסו שוב." }; render(); }
    });
  }
  boot();
})();
