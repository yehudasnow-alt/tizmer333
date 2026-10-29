/* תמרה – שכבת נתונים: מצב הדגמה (בדפדפן) או Supabase (אתר חי) */
(function () {
  "use strict";
  const T = window.Tamara;

  const COLS = {
    listings: ["id", "name", "type", "region", "settlement", "tagline", "description", "guests_max", "bedrooms", "bathrooms", "units", "min_nights",
      "price_weekday", "price_weekend", "price_holiday", "guests_base", "extra_guest_price", "deal_label", "deal_text", "lastminute_pct", "sponsored_until",
      "video_url", "amenities", "audience", "photos", "blocked_dates", "ical_url", "rooms", "extras", "seasons", "lat", "lng",
      "phone", "whatsapp", "email", "owner_id", "featured", "active", "pending", "details", "terms", "exclusive", "best_price"],
    advertisers: ["id", "name", "business", "phone", "email", "plan", "status", "billing_model", "lead_price", "start_date", "end_date", "notes", "payments"],
    leads: ["id", "listing_id", "listing_name", "unit_id", "unit_name", "name", "phone", "email", "check_in", "check_out", "guests", "children", "extras", "coupon", "est_total",
      "message", "status", "source", "admin_note", "review_token", "benefit", "package", "rooms_req", "flexible", "meta"],
    applications: ["id", "name", "phone", "email", "business", "settlement", "region", "type", "units", "message", "status"],
    reviews: ["id", "listing_id", "name", "rating", "text", "status", "stay_month", "reply", "title", "scores", "unit_name"],
    articles: ["id", "title", "excerpt", "body", "cover", "published"],
    places: ["id", "name", "kind", "region", "settlement", "lat", "lng", "phone", "url", "blurb", "photo", "active"],
    subscribers: ["id", "email", "name", "regions", "source"]
  };
  const pick = (o, cols) => {
    const out = {};
    cols.forEach((c) => {
      if (o[c] === undefined) return;
      out[c] = o[c] === "" && (/_date$|_until$|^check_|_id$/.test(c) || c === "lat" || c === "lng") && c !== "id" ? null : o[c];
    });
    return out;
  };
  const byNewest = (a, b) => (b.created_at || "").localeCompare(a.created_at || "");
  /* גרסת הסכמה שהקוד הזה מצפה לה (supabase/schema.sql → public.schema_version()) */
  T.SCHEMA_VERSION = 3;
  /* מה חסר במסד (טבלאות/עמודות/פונקציות) לפי שגיאות שחזרו מהשרת */
  T.schemaIssues = T.schemaIssues || new Set();
  /* האם הדף הזה נפתח מקישור כניסה (הטוקן בכתובת)? רק לשונית כזו עוברת ליעד אחרי הכניסה */
  T.authFromUrl = typeof location !== "undefined" && /access_token=|error_description=/.test(location.hash || "");
  /* היעד אחרי הכניסה נשמר גם בכתובת הקישור (?after=me-leads), כך שזה עובד גם כשפותחים את המייל במכשיר אחר */
  T.afterParam = (() => { try { const v = new URLSearchParams(location.search).get("after") || ""; return /^me(-[a-z]+)?$/.test(v) ? v : ""; } catch (e) { return ""; } })();
  const afterLogin = (h) => { try { localStorage.setItem("tamara.after", JSON.stringify({ h, t: Date.now() })); } catch (e) {} };
  T.takeAfterLogin = () => { try { const a = JSON.parse(localStorage.getItem("tamara.after") || "null"); localStorage.removeItem("tamara.after"); return a && Date.now() - a.t < 864e5 ? a.h : ""; } catch (e) { return ""; } };
  const same = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);

  /* השוואה ״סמנטית״: ריק = חסר, סדר מאפיינים לא משנה, קטגוריית ״כללי״ בסוף רשימת התמונות = ברירת מחדל */
  const canon = (v) => {
    if (v == null || v === "") return null;
    if (Array.isArray(v)) { const a = v.map(canon).filter((x) => x !== null); return a.length ? a : null; }
    if (typeof v === "object") { const o = {}; Object.keys(v).sort().forEach((k) => { const c = canon(v[k]); if (c !== null) o[k] = c; }); return Object.keys(o).length ? o : null; }
    return v;
  };
  const trimCats = (c) => { const a = (c || []).slice(); while (a.length && (!a[a.length - 1] || a[a.length - 1] === "general")) a.pop(); return a; };
  T.sameField = (k, a, b) => {
    if (k === "amenities" || k === "audience") return same([...(a || [])].sort(), [...(b || [])].sort());
    if (k === "details") { const n = (d) => canon(Object.assign({}, d || {}, { photo_cats: trimCats((d || {}).photo_cats) })); return JSON.stringify(n(a)) === JSON.stringify(n(b)); }
    return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
  };
  /* מארח: שדות תוכן נשמרים כ״ממתין לאישור״, מחירים ויומן נשמרים מיד */
  T.ownerSplit = (draft, original, moderation) => {
    const row = Object.assign({}, draft);
    if (!moderation) { row.pending = null; return row; }
    const diff = {};
    T.MODERATED_FIELDS.forEach(([k]) => {
      if (!T.sameField(k, draft[k], original[k])) diff[k] = draft[k];
      row[k] = original[k];
    });
    row.pending = Object.keys(diff).length ? Object.assign(diff, { _at: new Date().toISOString() }) : null;
    return row;
  };
  T.withPending = (l) => {
    if (!l || !l.pending) return l;
    const out = Object.assign({}, l);
    T.MODERATED_FIELDS.forEach(([k]) => { if (l.pending[k] !== undefined) out[k] = l.pending[k]; });
    return out;
  };

  /* ================================================================ הדגמה */
  function LocalStore() {
    const KEY = "tamara.demo.v2";
    let db = null;
    let persistent = true;
    const listeners = new Set();
    const load = () => {
      if (db) return db;
      try { const raw = localStorage.getItem(KEY); if (raw) db = JSON.parse(raw); } catch (e) { persistent = false; }
      if (!db || db.version !== 3) { db = T.seedData(); persist(); }
      db.settings = Object.assign(T.clone(T.DEFAULT_SETTINGS), db.settings || {});
      ["reviews", "articles", "leads", "applications", "advertisers", "places", "subscribers"].forEach((k) => (db[k] = db[k] || []));
      db.stats = db.stats || {};
      return db;
    };
    const persist = () => {
      try { localStorage.setItem(KEY, JSON.stringify(db)); }
      catch (e) {
        if (e && (e.name === "QuotaExceededError" || e.code === 22)) {
          const err = new Error("נגמר המקום לשמירה בדפדפן. במצב הדגמה אפשר לשמור מעט תמונות בלבד; באתר החי אין מגבלה כזו.");
          err.code = "quota";
          throw err;
        }
        persistent = false;
      }
    };
    const emit = () => listeners.forEach((f) => f());
    try { window.addEventListener("storage", (e) => { if (e.key === KEY) { db = null; load(); emit(); } }); } catch (e) {}
    const now = () => new Date().toISOString();
    const upsert = (table, obj, prefix, quiet) => {
      load();
      const list = db[table];
      const row = Object.assign({}, obj);
      if (!row.id) { row.id = T.uid(prefix); row.created_at = now(); list.unshift(row); }
      else {
        const i = list.findIndex((x) => x.id === row.id);
        if (i >= 0) list[i] = Object.assign({}, list[i], row);
        else { row.created_at = row.created_at || now(); list.unshift(row); }
      }
      const saved = list.find((x) => x.id === row.id);
      saved.updated_at = now();
      persist();
      if (!quiet) emit();
      return T.clone(saved);
    };
    const remove = (table, id) => { load(); db[table] = db[table].filter((x) => x.id !== id); persist(); emit(); };
    const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } };
    const ownerId = () => ss("tamara.demo.owner") || "";
    const myListingIds = () => new Set(db.listings.filter((l) => l.owner_id === ownerId()).map((l) => l.id));

    return {
      mode: "demo",
      get persistent() { return persistent; },
      onChange: (f) => listeners.add(f),
      async init() { load(); },
      /* מתחמים */
      async listListings(o) { load(); const all = db.listings.map(T.normalizeListing); return o && o.all ? all : all.filter((l) => l.active); },
      async getListing(id) { load(); const l = db.listings.find((x) => x.id === id); return l ? T.normalizeListing(l) : null; },
      async saveListing(l) { return upsert("listings", T.normalizeListing(l), "l-"); },
      async saveListingAsOwner(draft, original) { load(); return upsert("listings", T.normalizeListing(T.ownerSplit(draft, original, db.settings.moderation !== false)), "l-"); },
      async approvePending(id) { load(); const l = db.listings.find((x) => x.id === id); if (!l || !l.pending) return; const m = T.withPending(l); m.pending = null; return upsert("listings", m, "l-"); },
      async rejectPending(id) { return upsert("listings", { id, pending: null }, "l-"); },
      async deleteListing(id) { remove("listings", id); },
      /* מפרסמים */
      async listAdvertisers() { load(); return T.clone(db.advertisers); },
      async saveAdvertiser(a) { return upsert("advertisers", a, "a-"); },
      async deleteAdvertiser(id) { remove("advertisers", id); },
      /* פניות */
      async listLeads() { load(); return T.clone(db.leads).sort(byNewest); },
      async addLead(q) { return upsert("leads", Object.assign({ status: "new", source: "form" }, q, { id: "" }), "q-"); },
      async updateLead(id, patch) { return upsert("leads", Object.assign({}, patch, { id }), "q-"); },
      async deleteLead(id) { remove("leads", id); },
      /* בקשות הצטרפות */
      async listApplications() { load(); return T.clone(db.applications).sort(byNewest); },
      async addApplication(a) { return upsert("applications", Object.assign({ status: "new" }, a, { id: "" }), "j-"); },
      async updateApplication(id, patch) { return upsert("applications", Object.assign({}, patch, { id }), "j-"); },
      async deleteApplication(id) { remove("applications", id); },
      /* חוות דעת */
      async listReviews(o) { load(); let r = T.clone(db.reviews).sort(byNewest); if (!(o && o.all)) r = r.filter((x) => x.status === "approved"); if (o && o.listingId) r = r.filter((x) => x.listing_id === o.listingId); return r; },
      async reviewInvite(token) {
        load();
        const q = db.leads.find((x) => x.review_token && x.review_token === token && x.status === "closed");
        if (!q || db.reviews.some((r) => r.lead_id === q.id)) return null;
        return { listing_id: q.listing_id, listing_name: q.listing_name, name: q.name };
      },
      async submitReview(token, r) {
        const inv = await this.reviewInvite(token);
        if (!inv) throw new Error("הקישור לחוות הדעת כבר שומש או שאינו בתוקף");
        const q = db.leads.find((x) => x.review_token === token);
        const month = new Intl.DateTimeFormat("he-IL", { month: "long" }).format(T.parseISO(q.check_in) || new Date());
        const scores = {};
        Object.entries(r.scores || {}).forEach(([k, v]) => { if (T.REVIEW_CATS.some((c) => c.key === k) && Number(v) >= 1 && Number(v) <= 5) scores[k] = Math.round(Number(v)); });
        return upsert("reviews", { listing_id: q.listing_id, lead_id: q.id, name: String(r.name || "").slice(0, 60), rating: Math.max(1, Math.min(5, Number(r.rating) || 5)), text: String(r.text || "").slice(0, 1500), title: String(r.title || "").slice(0, 120), scores, unit_name: q.unit_name || "", status: "pending", stay_month: month }, "v-");
      },
      async updateReview(id, patch) { return upsert("reviews", Object.assign({}, patch, { id }), "v-"); },
      async deleteReview(id) { remove("reviews", id); },
      /* מקומות באזור (מסעדות, אטרקציות…) */
      async listPlaces(o) { load(); const p = T.clone(db.places).sort((a, b) => (a.name || "").localeCompare(b.name || "", "he")); return o && o.all ? p : p.filter((x) => x.active !== false); },
      async savePlace(p) { return upsert("places", p, "p-"); },
      async deletePlace(id) { remove("places", id); },
      /* מנויים לדילים במייל */
      async addSubscriber(x) {
        load();
        const email = String(x.email || "").trim().toLowerCase();
        if (db.subscribers.some((s) => s.email === email)) return { duplicate: true };
        return upsert("subscribers", { email, name: String(x.name || "").slice(0, 80), regions: x.regions || [], source: x.source || "site" }, "s-", true);
      },
      async listSubscribers() { load(); return T.clone(db.subscribers).sort(byNewest); },
      async deleteSubscriber(id) { remove("subscribers", id); },
      /* הכי נצפים ב־30 יום (לתווית בכרטיס) */
      async topViewed(n) { const st = await this.stats(30); const ids = new Set(db.listings.filter((l) => l.active).map((l) => l.id)); return Object.entries(st).filter(([id, x]) => ids.has(id) && x.v > 0).sort((a, b) => b[1].v - a[1].v).slice(0, n || 20).map(([id]) => id); },
      /* הפניות שנשלחו מהדפדפן הזה */
      async myGuestLeads(ids) { load(); const set = new Set(ids || []); return T.clone(db.leads.filter((q) => set.has(q.id))).sort(byNewest); },
      async guestUser() { return null; },
      /* מגזין */
      async listArticles(o) { load(); const a = T.clone(db.articles).sort(byNewest); return o && o.all ? a : a.filter((x) => x.published); },
      async saveArticle(a) { return upsert("articles", a, "m-"); },
      async deleteArticle(id) { remove("articles", id); },
      /* סטטיסטיקה: צפיות, חשיפת טלפון, וואטסאפ */
      async track(listingId, kind) {
        load();
        const day = T.iso(T.today());
        const s = (db.stats[listingId] = db.stats[listingId] || {});
        const row = (s[day] = s[day] || { v: 0, p: 0, w: 0 });
        row[kind] = (row[kind] || 0) + 1;
        try { persist(); } catch (e) {}
      },
      async stats(days) {
        load();
        const from = T.iso(T.addDays(T.today(), -(days || 30) + 1));
        const out = {};
        Object.entries(db.stats).forEach(([id, byDay]) => {
          const t = (out[id] = { v: 0, p: 0, w: 0 });
          Object.entries(byDay).forEach(([day, r]) => { if (day >= from) { t.v += r.v || 0; t.p += r.p || 0; t.w += r.w || 0; } });
        });
        return out;
      },
      /* הגדרות ותמונות */
      async getSettings() { load(); return Object.assign(T.clone(T.DEFAULT_SETTINGS), T.clone(db.settings)); },
      async saveSettings(s) { load(); db.settings = Object.assign({}, db.settings, s); persist(); emit(); return db.settings; },
      async uploadPhoto(file) { const blob = await T.resizeImage(file, 1280, 0.78); return T.blobToDataURL(blob); },
      notify() {},
      icalExportUrl() { return ""; },
      async syncIcal() { throw new Error("הסנכרון זמין אחרי העלאת האתר ל-Vercel"); },
      /* כניסה בהדגמה */
      async getUser() { return ss("tamara.demo.admin") === "1" ? { email: "demo@tamara", admin: true } : ownerId() ? { email: "owner", ownerId: ownerId() } : null; },
      async isAdmin() { return ss("tamara.demo.admin") === "1"; },
      async whoami() { return { email: ss("tamara.demo.admin") === "1" ? "demo" : "", admin: ss("tamara.demo.admin") === "1" }; },
      async schemaCheck() { return [{ group: "db", label: "מצב הדגמה", ok: true, detail: "האתר עוד לא מחובר ל-Supabase. הנתונים נשמרים רק בדפדפן הזה." }]; },
      async signInAdmin() { ss("tamara.demo.admin", "1"); return true; },
      async signInOwnerDemo(id) { ss("tamara.demo.owner", id); return true; },
      async signOut() { ss("tamara.demo.admin", null); ss("tamara.demo.owner", null); },
      async myAdvertisers() { load(); return T.clone(db.advertisers.filter((a) => a.id === ownerId())); },
      async myListings() { load(); return db.listings.filter((l) => l.owner_id === ownerId()).map(T.normalizeListing); },
      async myLeads() { load(); const ids = myListingIds(); return T.clone(db.leads.filter((q) => ids.has(q.listing_id))).sort(byNewest); },
      async myReviews() { load(); const ids = myListingIds(); return T.clone(db.reviews.filter((r) => ids.has(r.listing_id))).sort(byNewest); },
      exportAll() { load(); const x = T.clone(db); delete x.stats; return x; },
      async importAll(data) {
        load();
        ["listings", "advertisers", "leads", "applications", "reviews", "articles", "places", "subscribers"].forEach((t) => { if (Array.isArray(data[t])) db[t] = data[t]; });
        if (data.settings) db.settings = Object.assign({}, db.settings, data.settings);
        persist();
        emit();
      },
      async reset() { db = T.seedData(); persist(); emit(); },
      async clearDemo() {
        load();
        ["listings", "leads", "applications", "reviews", "articles", "places"].forEach((t) => (db[t] = db[t].filter((x) => !x.demo)));
        const ids = new Set(db.listings.map((l) => l.id));
        db.reviews = db.reviews.filter((r) => ids.has(r.listing_id));
        db.advertisers = db.advertisers.filter((a) => db.listings.some((l) => l.owner_id === a.id));
        db.stats = {};
        persist();
        emit();
      }
    };
  }

  /* ================================================================ Supabase */
  function SupaStore(cfg) {
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const listeners = new Set();
    const emit = () => listeners.forEach((f) => f());
    /* טבלה, עמודה או פונקציה שחסרות במסד = הסכמה לא עודכנה (צריך להריץ שוב את supabase/schema.sql) */
    const isMissing = (err, status) => !!err && (/^(42P01|PGRST205|PGRST202|42883|PGRST204|42703)$/.test(String(err.code || "")) || /does not exist|in the schema cache/i.test(String(err.message || "")) || (status === 404 && !err.code));
    const missingName = (m) => {
      m = String(m || ""); let x;
      if ((x = m.match(/'(\w+)' column of '(\w+)'/))) return x[2] + "." + x[1];
      if ((x = m.match(/column "?([\w.]+)"? of relation "(\w+)"/))) return x[2] + "." + x[1];
      if ((x = m.match(/column ([\w]+\.[\w]+) does not exist/))) return x[1];
      if ((x = m.match(/(?:relation|table) ['"](?:public\.)?(\w+)['"]/))) return x[1];
      if ((x = m.match(/function (?:public\.)?(\w+)/))) return x[1] + "()";
      return "";
    };
    const noteMissing = (err) => { const n = missingName(err.message) || "?"; T.schemaIssues.add(n); return n; };
    const ok = (res) => {
      if (res.error) {
        const missing = isMissing(res.error, res.status);
        const name = missing ? noteMissing(res.error) : "";
        const e = new Error(missing ? `מסד הנתונים לא מעודכן לגרסה הזו של האתר (חסר: ${name}). צריך להריץ שוב את supabase/schema.sql ב-Supabase (SQL Editor → Run).` : res.error.message || "שגיאת שרת");
        e.code = res.error.code; e.missing = missing; e.original = res.error.message;
        throw e;
      }
      return res.data;
    };
    /* קריאה שלא מפילה את כל הדף אם הטבלה עוד לא קיימת */
    const soft = (res, fallback, name) => { if (res.error && isMissing(res.error, res.status)) { if (res.error.message) noteMissing(res.error); else T.schemaIssues.add(name || "?"); return fallback; } return ok(res); };
    let adminCache = null;
    sb.auth.onAuthStateChange(() => { adminCache = null; });
    const flat = (rows) => (rows || []).map((x) => (x && typeof x === "object" ? Object.values(x)[0] : x));
    const myIds = async () => flat(ok(await sb.rpc("my_advertiser_ids")));
    const save = async (table, obj, cols) => {
      const row = pick(obj, cols);
      const id = row.id;
      delete row.id;
      const data = id
        ? ok(await sb.from(table).update(row).eq("id", id).select().single())
        : ok(await sb.from(table).insert(row).select().single());
      emit();
      return data;
    };
    const token = async () => { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.access_token : ""; };
    const store = {
      mode: "live",
      persistent: true,
      client: sb,
      onChange: (f) => listeners.add(f),
      async init() {},
      async listListings(o) {
        let q = sb.from("listings").select("*");
        if (!(o && o.all)) q = q.eq("active", true);
        return ok(await q.order("created_at", { ascending: false })).map(T.normalizeListing);
      },
      async getListing(id) { const r = ok(await sb.from("listings").select("*").eq("id", id).limit(1)); return r[0] ? T.normalizeListing(r[0]) : null; },
      async saveListing(l) { return T.normalizeListing(await save("listings", T.normalizeListing(l), COLS.listings)); },
      async saveListingAsOwner(draft, original) {
        const s = await store.getSettings();
        return T.normalizeListing(await save("listings", T.ownerSplit(T.normalizeListing(draft), original, s.moderation !== false), COLS.listings));
      },
      async approvePending(id) { const l = await store.getListing(id); if (!l || !l.pending) return; const m = T.withPending(l); m.pending = null; return store.saveListing(m); },
      async rejectPending(id) { ok(await sb.from("listings").update({ pending: null }).eq("id", id)); emit(); },
      async deleteListing(id) { ok(await sb.from("listings").delete().eq("id", id)); emit(); },
      async listAdvertisers() { return ok(await sb.from("advertisers").select("*").order("created_at", { ascending: false })); },
      async saveAdvertiser(a) { return save("advertisers", a, COLS.advertisers); },
      async deleteAdvertiser(id) { ok(await sb.from("advertisers").delete().eq("id", id)); emit(); },
      async listLeads() { return ok(await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(2000)); },
      async addLead(q) {
        const row = pick(Object.assign({}, q, { status: "new", source: q.source || "form", review_token: null }), COLS.leads);
        row.id = T.uuid();
        /* מסד ישן בלי העמודות החדשות: הפנייה בכל זאת נשמרת, והפרטים הנוספים נכנסים לטקסט ההודעה */
        const extra = () => {
          const m = row.meta || {}, parts = [];
          (row.rooms_req || []).forEach((r) => parts.push(`${r.name}: ${r.guests} מבוגרים${r.children ? ` + ${r.children} ילדים` : ""}`));
          if (row.children) parts.push(`ילדים: ${row.children}`);
          if (row.package) parts.push(`חבילה: ${row.package}`);
          if (row.benefit) parts.push(`הטבה: ${(T.benefitOf(row.benefit) || { name: row.benefit }).name}`);
          if (row.flexible) parts.push("תאריכים גמישים");
          if (m.place_label) parts.push(`איפה: ${m.place_label}`);
          if (m.budget) parts.push(`תקציב עד ${m.budget} ללילה`);
          if ((m.wants || []).length) parts.push(`חשוב: ${m.wants.join(", ")}`);
          return parts.join(" · ");
        };
        let noted = false;
        for (let i = 0; i < 12; i++) {
          const r = await sb.from("leads").insert(row);
          if (!r.error) break;
          const col = /^(PGRST204|42703)$/.test(String(r.error.code)) ? (missingName(r.error.message).split(".")[1] || "") : "";
          if (!col || !(col in row) || ["name", "phone", "listing_id"].includes(col)) ok(r);
          if (!noted) { const x = extra(); if (x) row.message = [row.message, `[${x}]`].filter(Boolean).join("\n"); noted = true; }
          T.schemaIssues.add("leads." + col);
          delete row[col];
        }
        store.notify("lead", row.id);
        return row;
      },
      async updateLead(id, patch) { const row = pick(patch, COLS.leads); delete row.id; ok(await sb.from("leads").update(row).eq("id", id)); emit(); },
      async deleteLead(id) { ok(await sb.from("leads").delete().eq("id", id)); emit(); },
      async listApplications() { return ok(await sb.from("applications").select("*").order("created_at", { ascending: false })); },
      async addApplication(a) {
        const row = pick(Object.assign({}, a, { status: "new" }), COLS.applications);
        row.id = T.uuid();
        ok(await sb.from("applications").insert(row));
        store.notify("application", row.id);
        return row;
      },
      async updateApplication(id, patch) { const row = pick(patch, COLS.applications); delete row.id; ok(await sb.from("applications").update(row).eq("id", id)); emit(); },
      async deleteApplication(id) { ok(await sb.from("applications").delete().eq("id", id)); emit(); },
      async listReviews(o) {
        let q = sb.from("reviews").select("*");
        if (!(o && o.all)) q = q.eq("status", "approved");
        if (o && o.listingId) q = q.eq("listing_id", o.listingId);
        return ok(await q.order("created_at", { ascending: false }).limit(1000));
      },
      async reviewInvite(token) { const r = ok(await sb.rpc("review_invite", { p_token: token })); return (Array.isArray(r) ? r[0] : r) || null; },
      async submitReview(token, r) {
        const res = await sb.rpc("submit_review", { p_token: token, p_rating: Number(r.rating), p_text: r.text, p_name: r.name, p_title: r.title || "", p_scores: r.scores || {} });
        /* מסד ישן: הגרסה הקודמת של הפונקציה (בלי כותרת ודירוג לפי קטגוריות) */
        if (res.error && isMissing(res.error)) { noteMissing(res.error); ok(await sb.rpc("submit_review", { p_token: token, p_rating: Number(r.rating), p_text: [r.title, r.text].filter(Boolean).join("\n"), p_name: r.name })); return true; }
        ok(res); return true;
      },
      async updateReview(id, patch) { const row = pick(patch, COLS.reviews); delete row.id; ok(await sb.from("reviews").update(row).eq("id", id)); emit(); },
      async deleteReview(id) { ok(await sb.from("reviews").delete().eq("id", id)); emit(); },
      async listPlaces(o) {
        let q = sb.from("places").select("*");
        if (!(o && o.all)) q = q.eq("active", true);
        return soft(await q.order("name").limit(2000), [], "places");
      },
      async savePlace(p) { return save("places", p, COLS.places); },
      async deletePlace(id) { ok(await sb.from("places").delete().eq("id", id)); emit(); },
      async addSubscriber(x) {
        const row = pick({ email: String(x.email || "").trim().toLowerCase(), name: String(x.name || "").slice(0, 80), regions: x.regions || [], source: x.source || "site" }, COLS.subscribers);
        const r = await sb.from("subscribers").insert(row);
        if (r.error && r.error.code === "23505") return { duplicate: true };
        if (r.error && isMissing(r.error, r.status)) { T.schemaIssues.add("subscribers"); throw new Error("ההרשמה לדיוור עוד לא הופעלה באתר. נסו שוב בקרוב."); }
        ok(r);
        return row;
      },
      async listSubscribers() { return soft(await sb.from("subscribers").select("*").order("created_at", { ascending: false }).limit(5000), [], "subscribers"); },
      async deleteSubscriber(id) { ok(await sb.from("subscribers").delete().eq("id", id)); emit(); },
      async topViewed(n) { const r = await sb.rpc("top_viewed", { p_limit: n || 20 }); if (r.error && isMissing(r.error)) noteMissing(r.error); return r.error ? [] : flat(r.data); },
      /* אורח מחובר רואה את הפניות שנשלחו מהאימייל שלו; בלי חיבור – רק מה שנשמר בדפדפן */
      async myGuestLeads() {
        const u = await store.getUser();
        if (!u || !u.email) return [];
        const rows = ok(await sb.from("leads").select("id,listing_id,listing_name,unit_name,check_in,check_out,guests,children,status,created_at,est_total,source,email").order("created_at", { ascending: false }).limit(200));
        return rows.filter((q) => String(q.email || "").toLowerCase() === u.email.toLowerCase());
      },
      async guestUser() { const u = await store.getUser(); return u ? { email: u.email } : null; },
      /* אחרי הכניסה Supabase מחזיר את הטוקן ב-# של הכתובת, לכן היעד (#me-leads) נשמר בצד ומופעל כשהכניסה מצליחה */
      async signInGuest(email) { afterLogin("me-leads"); ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + "?after=me-leads" } })); return true; },
      async signInGuestGoogle() { afterLogin("me-leads"); ok(await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname + "?after=me-leads" } })); },
      async listArticles(o) {
        let q = sb.from("articles").select("*");
        if (!(o && o.all)) q = q.eq("published", true);
        return ok(await q.order("created_at", { ascending: false }));
      },
      async saveArticle(a) { return save("articles", a, COLS.articles); },
      async deleteArticle(id) { ok(await sb.from("articles").delete().eq("id", id)); emit(); },
      async track(listingId, kind) { try { await sb.rpc("track_event", { p_listing: listingId, p_kind: kind }); } catch (e) {} },
      async stats(days) {
        const from = T.iso(T.addDays(T.today(), -(days || 30) + 1));
        const rows = ok(await sb.from("listing_stats").select("*").gte("day", from).limit(10000));
        const out = {};
        rows.forEach((r) => { const t = (out[r.listing_id] = out[r.listing_id] || { v: 0, p: 0, w: 0 }); t.v += r.views || 0; t.p += r.phone || 0; t.w += r.whatsapp || 0; });
        return out;
      },
      async getSettings() {
        const rows = ok(await sb.from("settings").select("data").eq("id", 1).limit(1));
        return Object.assign(T.clone(T.DEFAULT_SETTINGS), (rows[0] && rows[0].data) || {});
      },
      async saveSettings(s) { ok(await sb.from("settings").upsert({ id: 1, data: s })); emit(); return s; },
      async uploadPhoto(file) {
        const blob = await T.resizeImage(file, 2000, 0.86);
        if (cfg.CLOUDINARY_CLOUD_NAME) {
          const sig = await fetch("/api/sign-upload", { method: "POST", headers: { Authorization: "Bearer " + (await token()) } });
          if (!sig.ok) throw new Error("לא ניתן לקבל הרשאת העלאה (" + sig.status + ")");
          const s = await sig.json();
          const fd = new FormData();
          fd.append("file", blob, "photo.jpg");
          fd.append("api_key", s.api_key);
          fd.append("timestamp", s.timestamp);
          fd.append("signature", s.signature);
          fd.append("folder", s.folder);
          const up = await fetch(`https://api.cloudinary.com/v1_1/${s.cloud_name}/image/upload`, { method: "POST", body: fd });
          const j = await up.json();
          if (!up.ok) throw new Error((j.error && j.error.message) || "העלאה ל-Cloudinary נכשלה");
          return j.secure_url;
        }
        const path = `${new Date().getFullYear()}/${T.uid("p")}.jpg`;
        ok(await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
        return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
      },
      notify(type, id) { try { fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id }), keepalive: true }).catch(() => {}); } catch (e) {} },
      icalExportUrl(listingId, unitId) { return `${location.origin}/api/ical?listing=${encodeURIComponent(listingId)}${unitId ? "&unit=" + encodeURIComponent(unitId) : ""}`; },
      async syncIcal(listingId) {
        const r = await fetch("/api/sync-ical?listing=" + encodeURIComponent(listingId), { method: "POST", headers: { Authorization: "Bearer " + (await token()) } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "שגיאה " + r.status);
        return j;
      },
      async rebuildSeo() {
        const r = await fetch("/api/rebuild", { method: "POST", headers: { Authorization: "Bearer " + (await token()) } });
        if (!r.ok) throw new Error("העדכון נכשל (" + r.status + ")");
      },
      async getUser() { const { data } = await sb.auth.getSession(); return data && data.session ? data.session.user : null; },
      async isAdmin() { if (adminCache !== null) return adminCache; const r = await sb.rpc("is_admin"); adminCache = !r.error && r.data === true; return adminCache; },
      /* בדיקה טרייה מול השרת: מי מחובר עכשיו והאם הוא מנהל (לאבחון כשפעולה נחסמת) */
      async whoami() {
        const { data } = await sb.auth.getUser();
        const u = data && data.user;
        if (!u) return { email: "", admin: false };
        const r = await sb.rpc("is_admin");
        adminCache = !r.error && r.data === true;
        return { email: u.email || "", admin: adminCache, rpcError: r.error ? r.error.message : "" };
      },
      /* בדיקת מערכת: האם כל הטבלאות, העמודות והפונקציות של הגרסה הזו קיימות במסד */
      async schemaCheck() {
        const out = [];
        const probe = async (label, table, cols) => { const r = await sb.from(table).select(cols).limit(0); out.push({ group: "db", label, ok: !r.error, detail: r.error ? (isMissing(r.error) ? "חסר: " + (missingName(r.error.message) || table) : r.error.message) : "" }); };
        await probe("טבלת מתחמים + שדות התוכן החדשים", "listings", "id,details,terms,exclusive,best_price,pending,rooms,extras,seasons,video_url,ical_blocked");
        await probe("טבלת לקוחות (מפרסמים)", "advertisers", "id,billing_model,lead_price,payments");
        await probe("טבלת פניות + שדות חדשים", "leads", "id,children,benefit,package,rooms_req,flexible,meta,source");
        await probe("חוות דעת + דירוג לפי קטגוריות", "reviews", "id,title,scores,unit_name,reply");
        await probe("מה עושים באזור", "places", "id,name,kind,region,lat,lng");
        await probe("מנויי דיוור", "subscribers", "id,email,regions");
        await probe("בקשות הצטרפות", "applications", "id,status");
        await probe("מגזין", "articles", "id,published");
        await probe("סטטיסטיקות צפיות", "listing_stats", "listing_id,day,views");
        await probe("הגדרות האתר", "settings", "id,data");
        const v = await sb.rpc("schema_version");
        out.push({ group: "db", label: "גרסת מסד הנתונים", ok: !v.error && Number(v.data) >= T.SCHEMA_VERSION, detail: v.error ? "גרסה ישנה (לפני " + T.SCHEMA_VERSION + ")" : "גרסה " + v.data + (Number(v.data) < T.SCHEMA_VERSION ? ", נדרשת " + T.SCHEMA_VERSION : "") });
        const tv = await sb.rpc("top_viewed", { p_limit: 1 });
        out.push({ group: "db", label: "פונקציית ״הכי נצפים״", ok: !tv.error, detail: tv.error ? tv.error.message : "" });
        const u = await store.whoami().catch(() => ({ email: "", admin: false }));
        out.push({ group: "auth", label: "החשבון המחובר הוא מנהל", ok: !!u.admin, detail: u.email ? u.email : "לא מחובר" });
        let h = null;
        try { const r = await fetch("/api/health", { cache: "no-store" }); h = r.ok ? await r.json() : { error: "שגיאה " + r.status }; } catch (e) { h = { error: e.message }; }
        if (h && h.checks) Object.values(h.checks).forEach((c) => out.push({ group: "server", label: c.label, ok: c.ok, detail: c.detail || "", optional: !!c.optional }));
        else out.push({ group: "server", label: "פונקציות השרת (/api)", ok: false, detail: (h && h.error) || "לא זמין" });
        return out;
      },
      async signInAdmin(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); adminCache = null; return true; },
      async signInOwnerLink(email) { ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } })); return true; },
      async signInGoogle() { ok(await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } })); },
      /* יציאה רק בדפדפן הזה (לא מנתקת מכשירים אחרים של אותו משתמש) */
      async signOut() { await sb.auth.signOut({ scope: "local" }); adminCache = null; },
      async myAdvertisers() { const ids = await myIds(); if (!ids.length) return []; return ok(await sb.from("advertisers").select("*").in("id", ids)); },
      async myListings() { const ids = await myIds(); if (!ids.length) return []; return ok(await sb.from("listings").select("*").in("owner_id", ids).order("created_at", { ascending: false })).map(T.normalizeListing); },
      async myLeads() { return ok(await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(1000)); },
      async myReviews() { return ok(await sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(500)); },
      async exportAll() {
        const [listings, advertisers, leads, applications, reviews, articles, settings, places, subscribers] = await Promise.all([store.listListings({ all: true }), store.listAdvertisers(), store.listLeads(), store.listApplications(), store.listReviews({ all: true }), store.listArticles({ all: true }), store.getSettings(), store.listPlaces({ all: true }), store.listSubscribers()]);
        return { listings, advertisers, leads, applications, reviews, articles, settings, places, subscribers };
      },

      async importAll(data) {
        /* ייבוא מההדגמה: מפרסמים, מתחמים (בלי מתחמי הדוגמה), מאמרים והגדרות */
        const idMap = {};
        for (const a of data.advertisers || []) {
          const row = pick(a, COLS.advertisers); const old = row.id; delete row.id;
          idMap[old] = ok(await sb.from("advertisers").insert(row).select().single()).id;
        }
        for (const l of data.listings || []) {
          if (l.demo) continue;
          const row = pick(T.normalizeListing(l), COLS.listings); delete row.id;
          row.owner_id = idMap[row.owner_id] || null;
          row.photos = (row.photos || []).filter((p) => !String(p).startsWith("data:"));
          ok(await sb.from("listings").insert(row));
        }
        for (const p of data.places || []) {
          if (p.demo) continue;
          const row = pick(p, COLS.places); delete row.id;
          if (String(row.photo || "").startsWith("data:")) row.photo = "";
          ok(await sb.from("places").insert(row));
        }
        for (const m of data.articles || []) {
          if (m.demo) continue;
          const row = pick(m, COLS.articles); delete row.id;
          if (String(row.cover || "").startsWith("data:")) row.cover = "";
          ok(await sb.from("articles").insert(row));
        }
        if (data.settings) {
          const s = Object.assign({}, data.settings);
          if (String(s.hero_image || "").startsWith("data:")) s.hero_image = "";
          await store.saveSettings(Object.assign(await store.getSettings(), s));
        }
        emit();
      }
    };
    return store;
  }

  T.isLive = !!(T.config.SUPABASE_URL && T.config.SUPABASE_ANON_KEY);
  if (T.isLive && !window.supabase) { console.error("Supabase client failed to load; using demo mode"); T.isLive = false; }
  T.store = T.isLive ? SupaStore(T.config) : LocalStore();
})();
