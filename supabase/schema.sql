-- =====================================================================
-- תמרה – צימרים ווילות · סכמת מסד הנתונים ל-Supabase
-- מריצים: Supabase → SQL Editor → New query → הדבקה → Run
-- בטוח להריץ שוב גם על מסד קיים (מוסיף רק מה שחסר, לא מוחק נתונים).
-- אחרי כל עדכון של האתר מהמאגר מריצים את הקובץ הזה שוב (גרסה 4).
-- =====================================================================

-- ------------------------------------------------------------ טבלאות

create table if not exists public.admins (
  email text primary key
);

create table if not exists public.advertisers (
  id          text primary key default gen_random_uuid()::text,
  name        text not null default '',
  business    text not null default '',
  phone       text not null default '',
  email       text not null default '',
  plan        text not null default 'basic' check (plan in ('basic', 'pro', 'premium')),
  status      text not null default 'active' check (status in ('active', 'trial', 'paused', 'ended')),
  start_date  date,
  end_date    date,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.advertisers add column if not exists billing_model text not null default 'subscription';
alter table public.advertisers add column if not exists lead_price integer not null default 0;
alter table public.advertisers add column if not exists payments jsonb not null default '[]'::jsonb;

create table if not exists public.listings (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  type           text not null default 'zimmer',
  region         text not null,
  settlement     text not null default '',
  tagline        text not null default '',
  description    text not null default '',
  guests_max     integer not null default 2,
  bedrooms       integer not null default 1,
  bathrooms      integer not null default 1,
  units          integer not null default 1,
  min_nights     integer not null default 1,
  price_weekday  integer not null default 0,
  price_weekend  integer not null default 0,
  deal_label     text not null default '',
  deal_text      text not null default '',
  amenities      text[] not null default '{}',
  audience       text[] not null default '{}',
  photos         text[] not null default '{}',
  blocked_dates  text[] not null default '{}',
  phone          text not null default '',
  whatsapp       text not null default '',
  email          text not null default '',
  owner_id       text references public.advertisers (id) on delete set null,
  featured       boolean not null default false,
  active         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.listings add column if not exists price_holiday integer not null default 0;
alter table public.listings add column if not exists guests_base integer not null default 0;
alter table public.listings add column if not exists extra_guest_price integer not null default 0;
alter table public.listings add column if not exists lastminute_pct integer not null default 0;
alter table public.listings add column if not exists sponsored_until date;
alter table public.listings add column if not exists video_url text not null default '';
alter table public.listings add column if not exists ical_url text not null default '';
alter table public.listings add column if not exists ical_blocked text[] not null default '{}';
alter table public.listings add column if not exists ical_synced_at timestamptz;
alter table public.listings add column if not exists rooms jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists extras jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists seasons jsonb not null default '[]'::jsonb;
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;
alter table public.listings add column if not exists pending jsonb;
-- תיאור מפורט (עובר אישור), תנאים ומחירים נוספים (לא עובר אישור), תוויות של מנהל
alter table public.listings add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.listings add column if not exists terms jsonb not null default '{}'::jsonb;
alter table public.listings add column if not exists exclusive boolean not null default false;
alter table public.listings add column if not exists best_price boolean not null default false;
create index if not exists listings_owner_idx on public.listings (owner_id);
create index if not exists listings_active_idx on public.listings (active);

create table if not exists public.leads (
  id            text primary key default gen_random_uuid()::text,
  listing_id    text references public.listings (id) on delete set null,
  listing_name  text not null default '',
  name          text not null check (char_length(name) between 1 and 120),
  phone         text not null check (char_length(phone) between 6 and 30),
  email         text not null default '' check (char_length(email) <= 200),
  check_in      date,
  check_out     date,
  guests        integer not null default 2 check (guests between 1 and 200),
  message       text not null default '' check (char_length(message) <= 2000),
  status        text not null default 'new' check (status in ('new', 'in_progress', 'closed', 'lost')),
  source        text not null default 'form',
  admin_note    text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.leads add column if not exists unit_id text not null default '';
alter table public.leads add column if not exists unit_name text not null default '';
alter table public.leads add column if not exists extras text[] not null default '{}';
alter table public.leads add column if not exists coupon text not null default '';
alter table public.leads add column if not exists est_total integer not null default 0;
alter table public.leads add column if not exists review_token text;
alter table public.leads add column if not exists notified_at timestamptz;
alter table public.leads add column if not exists children integer not null default 0;
alter table public.leads add column if not exists benefit text not null default '';
alter table public.leads add column if not exists package text not null default '';
alter table public.leads add column if not exists rooms_req jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists flexible boolean not null default false;
alter table public.leads add column if not exists meta jsonb not null default '{}'::jsonb;
alter table public.leads alter column listing_name set default '';
create unique index if not exists leads_review_token_idx on public.leads (review_token) where review_token is not null;
create index if not exists leads_listing_idx on public.leads (listing_id);
create index if not exists leads_created_idx on public.leads (created_at desc);

create table if not exists public.applications (
  id          text primary key default gen_random_uuid()::text,
  name        text not null check (char_length(name) between 1 and 120),
  phone       text not null check (char_length(phone) between 6 and 30),
  email       text not null default '' check (char_length(email) <= 200),
  business    text not null default '' check (char_length(business) <= 120),
  settlement  text not null default '' check (char_length(settlement) <= 80),
  region      text not null default '',
  type        text not null default 'zimmer',
  units       integer not null default 1 check (units between 1 and 500),
  message     text not null default '' check (char_length(message) <= 2000),
  status      text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.applications add column if not exists notified_at timestamptz;

-- חוות דעת מאומתות (נוצרות רק דרך submit_review עם קישור אישי)
create table if not exists public.reviews (
  id          text primary key default gen_random_uuid()::text,
  listing_id  text references public.listings (id) on delete cascade,
  lead_id     text unique references public.leads (id) on delete set null,
  name        text not null default '' check (char_length(name) <= 60),
  rating      integer not null check (rating between 1 and 5),
  text        text not null default '' check (char_length(text) <= 1500),
  reply       text not null default '' check (char_length(reply) <= 400),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  stay_month  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reviews_listing_idx on public.reviews (listing_id);
alter table public.reviews add column if not exists title text not null default '';
alter table public.reviews add column if not exists scores jsonb not null default '{}'::jsonb;
alter table public.reviews add column if not exists unit_name text not null default '';

-- מקומות באזור: מסעדות, אטרקציות, ספא, יקבים, מסלולים (מנוהל ע"י המנהל)
create table if not exists public.places (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  kind        text not null default 'attraction',
  region      text not null default '',
  settlement  text not null default '',
  lat         double precision,
  lng         double precision,
  phone       text not null default '',
  url         text not null default '',
  blurb       text not null default '',
  photo       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- נרשמים לדילים במייל
create table if not exists public.subscribers (
  id          text primary key default gen_random_uuid()::text,
  email       text not null check (char_length(email) between 5 and 200 and email like '%_@_%._%'),
  name        text not null default '' check (char_length(name) <= 80),
  regions     text[] not null default '{}',
  source      text not null default 'site' check (char_length(source) <= 30),
  created_at  timestamptz not null default now()
);
create unique index if not exists subscribers_email_idx on public.subscribers (lower(email));

-- מגזין
create table if not exists public.articles (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  excerpt     text not null default '',
  body        text not null default '',
  cover       text not null default '',
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- צפיות ולחיצות לפי יום (נכתב רק דרך track_event)
create table if not exists public.listing_stats (
  listing_id  text not null references public.listings (id) on delete cascade,
  day         date not null default current_date,
  views       integer not null default 0,
  phone       integer not null default 0,
  whatsapp    integer not null default 0,
  primary key (listing_id, day)
);

create table if not exists public.settings (
  id    integer primary key default 1 check (id = 1),
  data  jsonb not null default '{}'::jsonb
);
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- ------------------------------------------------------------ פונקציות עזר

alter table public.admins add column if not exists mfa_required boolean not null default false;
-- מנהל. מי שהפעיל אימות דו-שלבי מקבל הרשאות מנהל רק בחיבור שעבר את הקוד (aal2)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (not a.mfa_required or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'));
$$;

-- השרת (מפתח Secret / service_role) או עורך ה-SQL של Supabase.
-- נבדק גם לפי התפקיד בפועל, כך שזה עובד עם המפתחות החדשים (sb_secret_) ועם הישנים.
create or replace function public.is_service()
returns boolean language sql stable security invoker as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

create or replace function public.my_advertiser_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select ad.id from public.advertisers ad
  where ad.email <> '' and lower(ad.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.moderation_on()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (data ->> 'moderation')::boolean from public.settings where id = 1), true);
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- מארח: לא משנה פרסום, קידום, שיוך או סנכרון; תוכן עובר דרך pending כשהאישור פעיל
-- security invoker: רץ בהרשאות של מי שמעדכן, כדי ש-is_service יזהה אותו נכון
create or replace function public.protect_listing_columns()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  -- תאריכים מסונכרנים נכתבים רק ע"י השרת (גם מנהל לא דורס אותם משמירה ישנה בעורך)
  if not public.is_service() then
    new.ical_blocked := old.ical_blocked;
    new.ical_synced_at := old.ical_synced_at;
    if jsonb_typeof(new.rooms) = 'array' then
      new.rooms := coalesce((
        select jsonb_agg(case when jsonb_typeof(r) = 'object' then
          r || jsonb_build_object('ical_blocked', coalesce((
            select o -> 'ical_blocked' from jsonb_array_elements(case when jsonb_typeof(old.rooms) = 'array' then old.rooms else '[]'::jsonb end) o
            where o ->> 'id' = r ->> 'id' limit 1), '[]'::jsonb))
          else r end order by ord)
        from jsonb_array_elements(new.rooms) with ordinality e(r, ord)), '[]'::jsonb);
    end if;
  end if;
  if not public.is_admin() and not public.is_service() then
    new.active := old.active;
    new.featured := old.featured;
    new.owner_id := old.owner_id;
    new.sponsored_until := old.sponsored_until;
    new.exclusive := old.exclusive;
    new.best_price := old.best_price;
    if public.moderation_on() then
      new.name := old.name; new.type := old.type; new.region := old.region; new.settlement := old.settlement;
      new.tagline := old.tagline; new.description := old.description; new.photos := old.photos;
      new.amenities := old.amenities; new.audience := old.audience; new.video_url := old.video_url;
      new.details := old.details;
    else
      -- בלי אישור תוכן נשמרת רק בקשת הפרסום של מתחם חדש (המנהל מפעיל אותו)
      new.pending := case when jsonb_typeof(new.pending) = 'object' and new.pending ? '_publish'
        then jsonb_build_object('_publish', true, '_at', coalesce(new.pending -> '_at', to_jsonb(now()))) else null end;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- מארח: בחוות דעת מותר לשנות רק את התגובה
create or replace function public.protect_review_columns()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() and not public.is_service() then
    new.listing_id := old.listing_id; new.lead_id := old.lead_id; new.name := old.name;
    new.rating := old.rating; new.text := old.text; new.status := old.status; new.stay_month := old.stay_month;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists listings_protect on public.listings;
create trigger listings_protect before update on public.listings for each row execute function public.protect_listing_columns();
drop trigger if exists reviews_protect on public.reviews;
create trigger reviews_protect before update on public.reviews for each row execute function public.protect_review_columns();
drop trigger if exists advertisers_touch on public.advertisers;
create trigger advertisers_touch before update on public.advertisers for each row execute function public.touch_updated_at();
drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();
drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();
drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

-- קישור לחוות דעת: מחזיר את פרטי ההזמנה אם הקישור בתוקף
create or replace function public.review_invite(p_token text)
returns table (listing_id text, listing_name text, name text)
language sql stable security definer set search_path = public as $$
  select q.listing_id, q.listing_name, q.name from public.leads q
  where q.review_token = p_token and q.status = 'closed'
    and not exists (select 1 from public.reviews r where r.lead_id = q.id)
  limit 1;
$$;

drop function if exists public.submit_review(text, integer, text, text);
create or replace function public.submit_review(p_token text, p_rating integer, p_text text, p_name text, p_title text default '', p_scores jsonb default '{}'::jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare q public.leads;
  months text[] := array['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  clean jsonb := '{}'::jsonb; k text; v text;
begin
  select * into q from public.leads where review_token = p_token and status = 'closed' limit 1;
  if q.id is null then raise exception 'הקישור לחוות הדעת אינו בתוקף'; end if;
  if exists (select 1 from public.reviews where lead_id = q.id) then raise exception 'כבר נכתבה חוות דעת על ההזמנה הזאת'; end if;
  if char_length(coalesce(p_text, '')) < 10 then raise exception 'חוות הדעת קצרה מדי'; end if;
  -- רק קטגוריות מוכרות, ציון שלם 1–5
  if jsonb_typeof(p_scores) = 'object' then
    for k, v in select * from jsonb_each_text(p_scores) loop
      if k in ('clean','maintain','facilities','host','privacy','treats','breakfast','value') and v ~ '^[1-5]$' then
        clean := clean || jsonb_build_object(k, v::int);
      end if;
    end loop;
  end if;
  insert into public.reviews (listing_id, lead_id, name, rating, text, title, scores, unit_name, status, stay_month)
  values (q.listing_id, q.id, left(coalesce(nullif(trim(p_name), ''), 'אורח'), 60), greatest(1, least(5, p_rating)), left(p_text, 1500),
          left(coalesce(p_title, ''), 120), clean, coalesce(q.unit_name, ''), 'pending',
          coalesce(months[extract(month from q.check_in)::int], ''));
  return true;
end $$;

-- 20 המתחמים הנצפים ביותר ב־30 יום (רק מזהים, בלי מספרים)
create or replace function public.top_viewed(p_limit integer default 20)
returns setof text language sql stable security definer set search_path = public as $$
  select s.listing_id from public.listing_stats s join public.listings l on l.id = s.listing_id and l.active
  where s.day >= current_date - 30 group by s.listing_id having sum(s.views) > 0
  order by sum(s.views) desc limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

-- ספירת צפיות / הצגת טלפון / וואטסאפ
create or replace function public.track_event(p_listing text, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('v', 'p', 'w') then return; end if;
  if not exists (select 1 from public.listings where id = p_listing and active) then return; end if;
  insert into public.listing_stats (listing_id, day, views, phone, whatsapp)
  values (p_listing, current_date, (p_kind = 'v')::int, (p_kind = 'p')::int, (p_kind = 'w')::int)
  on conflict (listing_id, day) do update set
    views = public.listing_stats.views + excluded.views,
    phone = public.listing_stats.phone + excluded.phone,
    whatsapp = public.listing_stats.whatsapp + excluded.whatsapp;
end $$;

-- סנכרון iCal (נקרא רק מהשרת עם Service Role): מעדכן יחידה אחת בלי לגעת בשאר השדות
create or replace function public.set_ical_blocked(p_listing text, p_unit text, p_dates text[])
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_service() then raise exception 'not allowed'; end if;
  if coalesce(p_unit, '') = '' then
    update public.listings set ical_blocked = coalesce(p_dates, '{}'), ical_synced_at = now() where id = p_listing;
  else
    update public.listings set ical_synced_at = now(), rooms = coalesce((
      select jsonb_agg(case when r ->> 'id' = p_unit then r || jsonb_build_object('ical_blocked', to_jsonb(coalesce(p_dates, '{}'))) else r end order by ord)
      from jsonb_array_elements(rooms) with ordinality e(r, ord)), '[]'::jsonb)
    where id = p_listing and jsonb_typeof(rooms) = 'array';
  end if;
end $$;
revoke execute on function public.set_ical_blocked(text, text, text[]) from public, anon, authenticated;
grant execute on function public.set_ical_blocked(text, text, text[]) to service_role;

-- גרסת הסכמה: האתר בודק אותה ב"בדיקת מערכת" בפאנל הניהול. מעלים את המספר בכל שינוי מבני.
create or replace function public.schema_version()
returns integer language sql immutable as $$ select 4 $$;
grant execute on function public.schema_version() to anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_advertiser_ids() to anon, authenticated;
grant execute on function public.review_invite(text) to anon, authenticated;
grant execute on function public.submit_review(text, integer, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.top_viewed(integer) to anon, authenticated;
grant execute on function public.track_event(text, text) to anon, authenticated;

-- ===================================================================== גרסה 4
-- חשבונות מארחים, מנויים וזמני תצוגה, מיילים אוטומטיים, דיוור בהסכמה כפולה, יומן פעולות

-- כרטיס לקוח
alter table public.advertisers add column if not exists tax_id text not null default '';
alter table public.advertisers add column if not exists address text not null default '';
alter table public.advertisers add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table public.advertisers add column if not exists source text not null default 'admin';
alter table public.advertisers add column if not exists terms_version text not null default '';
alter table public.advertisers add column if not exists terms_at timestamptz;
alter table public.advertisers add column if not exists invited_at timestamptz;
alter table public.advertisers add column if not exists renewal_requested_at timestamptz;
-- אימייל של לקוח הוא הכניסה שלו, ולכן ייחודי (אם כבר יש כפילויות, האינדקס לא נוצר ומופיעה הודעה)
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'advertisers_email_uidx') then
    if exists (select 1 from public.advertisers where email <> '' group by lower(email) having count(*) > 1) then
      raise notice 'יש לקוחות עם אותו אימייל. אחדו אותם והריצו שוב כדי למנוע כפילויות.';
    else
      create unique index advertisers_email_uidx on public.advertisers (lower(email)) where email <> '';
    end if;
  end if;
end $$;

-- הרשמה עצמית של מארחים (נפתחת רק אחרי אימות המייל)
alter table public.applications add column if not exists user_id uuid;
alter table public.applications add column if not exists tax_id text not null default '';
alter table public.applications add column if not exists verified boolean not null default false;
alter table public.applications add column if not exists terms_version text not null default '';
alter table public.applications add column if not exists terms_at timestamptz;
alter table public.applications add column if not exists marketing boolean not null default false;
alter table public.applications add column if not exists advertiser_id text;
create unique index if not exists applications_user_uidx on public.applications (user_id) where user_id is not null;

-- דיוור: הסכמה כפולה (אישור במייל) והסרה בלחיצה אחת
alter table public.subscribers add column if not exists token text not null default md5(random()::text || clock_timestamp()::text);
-- מי שנרשם לפני ההסכמה הכפולה נחשב מאושר (נרשם בעצמו בטופס)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'subscribers' and column_name = 'confirmed_at') then
    alter table public.subscribers add column confirmed_at timestamptz;
    update public.subscribers set confirmed_at = created_at;
  end if;
end $$;
alter table public.subscribers add column if not exists unsubscribed_at timestamptz;
alter table public.subscribers add column if not exists notified_at timestamptz;
create unique index if not exists subscribers_token_uidx on public.subscribers (token);

-- מיילים אוטומטיים שכבר נשלחו (כדי שכל תזכורת תצא פעם אחת). נכתב רק מהשרת.
create table if not exists public.mail_log (
  key      text primary key,
  sent_at  timestamptz not null default now(),
  meta     jsonb not null default '{}'::jsonb
);
-- יומן פעולות: מי שינה מה ומתי (לקוחות, מתחמים, הגדרות, מנהלים...)
create table if not exists public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      text not null default '',
  entity     text not null,
  entity_id  text not null default '',
  action     text not null,
  changes    jsonb not null default '[]'::jsonb
);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id, at desc);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

-- התאריך היום בישראל (השרת עובד ב-UTC)
create or replace function public.today_il()
returns date language sql stable as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;

-- האם מתחמי הלקוח מוצגים לגולשים: לקוח פעיל או בניסיון, והמנוי בתוקף כולל ימי חסד (בהגדרות)
create or replace function public.owner_visible(p_owner text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_owner is null or p_owner = ''
    or not exists (select 1 from public.advertisers a where a.id = p_owner)
    or exists (select 1 from public.advertisers a where a.id = p_owner and a.status in ('active', 'trial')
      and (a.end_date is null or a.end_date + greatest(0, coalesce((select (data ->> 'grace_days')::int from public.settings where id = 1), 3)) >= public.today_il()));
$$;

-- מצב מנהל לממשק: רשום כמנהל? צריך קוד דו-שלבי?
create or replace function public.admin_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'admin', exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))),
    'mfa_required', coalesce((select a.mfa_required from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1), false),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'));
$$;
-- הפעלה/כיבוי של חובת אימות דו-שלבי למנהל המחובר (רק מחיבור שכבר עבר קוד)
create or replace function public.admin_set_mfa(p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then raise exception 'נדרש אימות דו-שלבי בחיבור הנוכחי'; end if;
  update public.admins set mfa_required = coalesce(p_on, false) where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  return found;
end $$;

-- מארח שאימת את המייל ונכנס: יוצר בקשת הצטרפות מהפרטים שמילא בהרשמה,
-- ואם בהגדרות "פתיחה אוטומטית" – פותח לקוח בתקופת ניסיון ומתחם מוסתר להשלמה.
-- בטוח לקרוא שוב ושוב (לא יוצר כפילויות).
create or replace function public.claim_host_signup()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(auth.jwt() -> 'user_metadata', '{}'::jsonb);
  uid uuid := nullif(auth.jwt() ->> 'sub', '')::uuid;
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  st jsonb := coalesce((select data from public.settings where id = 1), '{}'::jsonb);
  app public.applications; adv text; lid text; trial int; confirmed boolean := true;
begin
  if uid is null or em = '' then return jsonb_build_object('status', 'anon'); end if;
  select id into adv from public.advertisers where email <> '' and lower(email) = em limit 1;
  if adv is not null then return jsonb_build_object('status', 'client', 'advertiser_id', adv); end if;
  begin
    select email_confirmed_at is not null into confirmed from auth.users where id = uid;
  exception when others then confirmed := true;
  end;
  if confirmed is false then return jsonb_build_object('status', 'unverified'); end if;
  select * into app from public.applications where user_id = uid order by created_at desc limit 1;
  if app.id is null then
    if coalesce(m ->> 'kind', '') <> 'host' then return jsonb_build_object('status', 'none'); end if;
    insert into public.applications (user_id, name, business, phone, email, settlement, region, type, units, message,
                                     tax_id, terms_version, terms_at, marketing, verified, status)
    values (uid,
      left(coalesce(nullif(trim(m ->> 'name'), ''), em), 120),
      left(coalesce(trim(m ->> 'business'), ''), 120),
      left(coalesce(nullif(trim(m ->> 'phone'), ''), '0000000'), 30),
      em,
      left(coalesce(trim(m ->> 'settlement'), ''), 80),
      case when coalesce(m ->> 'region', '') ~ '^[a-z-]{2,30}$' then m ->> 'region' else '' end,
      case when coalesce(m ->> 'type', '') ~ '^[a-z]{2,20}$' then m ->> 'type' else 'zimmer' end,
      case when coalesce(m ->> 'units', '') ~ '^[0-9]{1,3}$' then greatest(1, least(500, (m ->> 'units')::int)) else 1 end,
      left(coalesce(m ->> 'message', ''), 2000),
      left(coalesce(trim(m ->> 'tax_id'), ''), 20),
      left(coalesce(m ->> 'terms_version', ''), 20),
      case when coalesce(m ->> 'terms_version', '') <> '' then now() end,
      coalesce(m ->> 'marketing', '') = 'true', true, 'new')
    returning * into app;
  end if;
  if app.status = 'approved' and app.advertiser_id is not null then return jsonb_build_object('status', 'client', 'advertiser_id', app.advertiser_id); end if;
  if app.status = 'rejected' then return jsonb_build_object('status', 'rejected', 'application_id', app.id); end if;
  if coalesce(st ->> 'auto_open_hosts', 'true') <> 'true' then return jsonb_build_object('status', 'pending', 'application_id', app.id); end if;
  trial := case when coalesce(st ->> 'trial_days', '') ~ '^[0-9]{1,3}$' then least(365, (st ->> 'trial_days')::int) else 30 end;
  insert into public.advertisers (name, business, phone, email, plan, status, billing_model, start_date, end_date, notes, source, tax_id, terms_version, terms_at)
  values (app.name, app.business, app.phone, em, 'basic', 'trial', 'subscription', public.today_il(), public.today_il() + trial,
          'נפתח בהרשמה עצמית', 'signup', app.tax_id, app.terms_version, app.terms_at)
  returning id into adv;
  insert into public.listings (name, type, region, settlement, units, phone, whatsapp, email, owner_id, active)
  values (coalesce(nullif(app.business, ''), app.name), app.type, coalesce(nullif(app.region, ''), 'golan'), app.settlement, app.units,
          app.phone, app.phone, em, adv, false)
  returning id into lid;
  update public.applications set status = 'approved', advertiser_id = adv where id = app.id;
  return jsonb_build_object('status', 'opened', 'advertiser_id', adv, 'listing_id', lid, 'application_id', app.id);
end $$;

-- מצב החשבונות של לקוחות (נוצר, אומת, נכנס לאחרונה) לכרטיס הלקוח. מנהל בלבד.
create or replace function public.admin_auth_info(p_emails text[])
returns table (email text, created_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz, invited_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select lower(u.email)::text, u.created_at, u.email_confirmed_at, u.last_sign_in_at, u.invited_at
    from auth.users u where lower(u.email) in (select lower(x) from unnest(coalesce(p_emails, '{}')) x limit 1000);
end $$;

-- הבקשה של המשתמש המחובר (למסך "ההרשמה בבדיקה")
create or replace function public.my_application()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(a) - 'user_id' from public.applications a
  where a.user_id = nullif(auth.jwt() ->> 'sub', '')::uuid order by a.created_at desc limit 1;
$$;

-- מארח מעדכן את פרטי הקשר וההעדפות שלו (לא חבילה, תאריכים או תשלומים)
create or replace function public.update_my_profile(p_name text, p_phone text, p_address text, p_tax_id text, p_prefs jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.advertisers set
    name = left(coalesce(nullif(trim(p_name), ''), name), 120),
    phone = left(coalesce(nullif(trim(p_phone), ''), phone), 30),
    address = left(coalesce(p_address, address), 200),
    tax_id = left(coalesce(p_tax_id, tax_id), 20),
    prefs = case when jsonb_typeof(p_prefs) = 'object' then prefs || coalesce((
      select jsonb_object_agg(k, v) from jsonb_each(p_prefs) e(k, v)
      where k in ('notify_leads', 'notify_reviews', 'monthly_report') and jsonb_typeof(v) = 'boolean'), '{}'::jsonb) else prefs end
  where email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  return found;
end $$;

-- מארח מבקש חידוש מנוי (המנהל מקבל מייל)
create or replace function public.request_renewal()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.advertisers set renewal_requested_at = now()
  where email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  return found;
end $$;

-- הרשמה לדיוור: חדש, או הרשמה מחדש אחרי הסרה. האישור במייל מפעיל את המנוי.
create or replace function public.subscribe(p_email text, p_name text, p_regions text[], p_source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(coalesce(p_email, ''))); r public.subscribers;
begin
  if char_length(em) < 5 or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'כתובת האימייל לא תקינה'; end if;
  select * into r from public.subscribers where lower(email) = em limit 1;
  if r.id is null then
    insert into public.subscribers (email, name, regions, source)
    values (em, left(coalesce(p_name, ''), 80), coalesce(p_regions[1:20], '{}'), left(coalesce(p_source, 'site'), 30)) returning * into r;
    return jsonb_build_object('id', r.id, 'status', 'new');
  end if;
  if r.confirmed_at is not null and r.unsubscribed_at is null then return jsonb_build_object('id', r.id, 'status', 'already'); end if;
  -- ממתין לאישור: לא שולחים שוב יותר מפעם בשעה (הגנה על תיבת הדואר של מי שהוזן)
  if r.unsubscribed_at is null and r.notified_at is not null and r.notified_at > now() - interval '1 hour' then return jsonb_build_object('id', r.id, 'status', 'pending'); end if;
  update public.subscribers set unsubscribed_at = null, confirmed_at = null, notified_at = null,
    regions = coalesce(p_regions[1:20], regions), token = md5(random()::text || clock_timestamp()::text) where id = r.id;
  return jsonb_build_object('id', r.id, 'status', 'new');
end $$;
create or replace function public.subscriber_confirm(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.subscribers set confirmed_at = coalesce(confirmed_at, now()), unsubscribed_at = null where token = p_token and char_length(p_token) >= 16;
  return found;
end $$;
create or replace function public.subscriber_unsubscribe(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.subscribers set unsubscribed_at = now() where token = p_token and char_length(p_token) >= 16;
  return found;
end $$;

-- הגנה מהצפה: יותר מדי פניות/הרשמות מאותו טלפון או אימייל בזמן קצר
create or replace function public.rate_limit_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin() then return new; end if;
  if tg_table_name = 'leads' then
    select count(*) into n from public.leads where phone = new.phone and created_at > now() - interval '10 minutes';
    if n >= 5 then raise exception 'יותר מדי פניות בזמן קצר. נסו שוב בעוד כמה דקות.' using errcode = 'TM429'; end if;
  elsif tg_table_name = 'applications' then
    select count(*) into n from public.applications where (phone = new.phone or (new.email <> '' and lower(email) = lower(new.email))) and created_at > now() - interval '1 hour';
    if n >= 3 then raise exception 'כבר התקבלה בקשה מהפרטים האלה. נחזור אליכם בקרוב.' using errcode = 'TM429'; end if;
  elsif tg_table_name = 'subscribers' then
    select count(*) into n from public.subscribers where created_at > now() - interval '1 minute';
    if n >= 20 then raise exception 'נסו שוב בעוד דקה.' using errcode = 'TM429'; end if;
  end if;
  return new;
end $$;
drop trigger if exists leads_rate_limit on public.leads;
create trigger leads_rate_limit before insert on public.leads for each row execute function public.rate_limit_guard();
drop trigger if exists applications_rate_limit on public.applications;
create trigger applications_rate_limit before insert on public.applications for each row execute function public.rate_limit_guard();
drop trigger if exists subscribers_rate_limit on public.subscribers;
create trigger subscribers_rate_limit before insert on public.subscribers for each row execute function public.rate_limit_guard();

-- יומן פעולות (לא חוסם שום פעולה גם אם נכשל)
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  svc boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  who text := coalesce(nullif(auth.jwt() ->> 'email', ''), case when svc then 'שרת' else 'מערכת' end);
  ch jsonb := '[]'::jsonb; rid text;
begin
  begin
    if tg_op = 'UPDATE' then
      select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb) into ch from jsonb_each(to_jsonb(new)) n
      where n.key not in ('updated_at', 'ical_blocked', 'ical_synced_at', 'notified_at') and n.value is distinct from (to_jsonb(old) -> n.key);
      if jsonb_array_length(ch) = 0 or (svc and ch <@ '["rooms"]'::jsonb) then return new; end if;
    end if;
    rid := coalesce(case when tg_op = 'DELETE' then to_jsonb(old) ->> case when tg_table_name = 'admins' then 'email' else 'id' end
                         else to_jsonb(new) ->> case when tg_table_name = 'admins' then 'email' else 'id' end end, '');
    insert into public.audit_log (actor, entity, entity_id, action, changes) values (who, tg_table_name, rid, lower(tg_op), ch);
  exception when others then null;
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['advertisers', 'listings', 'applications', 'settings', 'admins', 'places', 'articles'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
  execute 'drop trigger if exists leads_audit on public.leads';
  execute 'create trigger leads_audit after update or delete on public.leads for each row execute function public.audit_row()';
end $$;

alter table public.mail_log  enable row level security;
alter table public.audit_log enable row level security;
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log for select to authenticated using (public.is_admin());
-- מנהלים: מנהל רואה ומוסיף מנהלים אחרים
drop policy if exists admins_manage on public.admins;
create policy admins_manage on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.today_il() to anon, authenticated;
grant execute on function public.owner_visible(text) to anon, authenticated;
grant execute on function public.admin_status() to authenticated;
grant execute on function public.admin_set_mfa(boolean) to authenticated;
grant execute on function public.claim_host_signup() to authenticated;
grant execute on function public.my_application() to authenticated;
grant execute on function public.admin_auth_info(text[]) to authenticated;
grant execute on function public.update_my_profile(text, text, text, text, jsonb) to authenticated;
grant execute on function public.request_renewal() to authenticated;
grant execute on function public.subscribe(text, text, text[], text) to anon, authenticated;
grant execute on function public.subscriber_confirm(text) to anon, authenticated;
grant execute on function public.subscriber_unsubscribe(text) to anon, authenticated;

-- תמונות: עד 6MB, רק JPEG / PNG / WebP
do $$ begin
  update storage.buckets set file_size_limit = 6291456, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'photos';
exception when others then raise notice 'לא עודכנו מגבלות הקבצים של התמונות: %', sqlerrm;
end $$;

-- ------------------------------------------------------------ הרשאות (RLS)

alter table public.admins        enable row level security;
alter table public.advertisers   enable row level security;
alter table public.listings      enable row level security;
alter table public.leads         enable row level security;
alter table public.applications  enable row level security;
alter table public.reviews       enable row level security;
alter table public.articles      enable row level security;
alter table public.listing_stats enable row level security;
alter table public.settings      enable row level security;
alter table public.places        enable row level security;
alter table public.subscribers   enable row level security;

-- מתחמים
drop policy if exists listings_read on public.listings;
-- גולשים רואים מתחם פעיל רק כשהמנוי של הלקוח בתוקף (כולל ימי חסד). מנהל ומארח רואים תמיד.
create policy listings_read on public.listings for select
  using (public.is_admin() or owner_id in (select public.my_advertiser_ids()) or (active and public.owner_visible(owner_id)));
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert to authenticated with check (public.is_admin());
drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update to authenticated
  using (public.is_admin() or owner_id in (select public.my_advertiser_ids()))
  with check (public.is_admin() or owner_id in (select public.my_advertiser_ids()));
drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete to authenticated using (public.is_admin());

-- לקוחות (מפרסמים)
drop policy if exists advertisers_read on public.advertisers;
create policy advertisers_read on public.advertisers for select to authenticated
  using (public.is_admin() or id in (select public.my_advertiser_ids()));
drop policy if exists advertisers_write on public.advertisers;
create policy advertisers_write on public.advertisers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- פניות
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to anon, authenticated
  with check (status = 'new' and admin_note = '' and review_token is null and notified_at is null
              and char_length(meta::text) <= 4000 and char_length(rooms_req::text) <= 4000
              and char_length(benefit) <= 30 and char_length(package) <= 120 and children between 0 and 100
              and (listing_id in (select l.id from public.listings l where l.active)
                   or (listing_id is null and source in ('find', 'contact'))));
drop policy if exists leads_read on public.leads;
-- מנהל, מארח המתחם, או האורח עצמו (לפי האימייל המאומת שלו)
create policy leads_read on public.leads for select to authenticated
  using (public.is_admin()
         or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids()))
         or (email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())))
  with check (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated using (public.is_admin());

-- בקשות הצטרפות
drop policy if exists applications_insert on public.applications;
-- "השארת פרטים" בלבד; הרשמה עם חשבון עוברת דרך claim_host_signup (שם מסומן אימות המייל)
create policy applications_insert on public.applications for insert to anon, authenticated
  with check (status = 'new' and notified_at is null and verified = false and user_id is null and advertiser_id is null);
drop policy if exists applications_admin on public.applications;
create policy applications_admin on public.applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- חוות דעת
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select
  using (status = 'approved' or public.is_admin()
         or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())))
  with check (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated using (public.is_admin());

-- מקומות באזור
drop policy if exists places_read on public.places;
create policy places_read on public.places for select using (active or public.is_admin());
drop policy if exists places_write on public.places;
create policy places_write on public.places for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- נרשמים לדילים: כל אחד נרשם, רק מנהל רואה ומוחק
drop policy if exists subscribers_insert on public.subscribers;
create policy subscribers_insert on public.subscribers for insert to anon, authenticated
  with check (confirmed_at is null and unsubscribed_at is null and notified_at is null);
drop policy if exists subscribers_admin on public.subscribers;
create policy subscribers_admin on public.subscribers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- מגזין
drop policy if exists articles_read on public.articles;
create policy articles_read on public.articles for select using (published or public.is_admin());
drop policy if exists articles_write on public.articles;
create policy articles_write on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- סטטיסטיקה: מנהל ומארח המתחם קוראים; כתיבה רק דרך track_event
drop policy if exists stats_read on public.listing_stats;
create policy stats_read on public.listing_stats for select to authenticated
  using (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));

-- הגדרות
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());


-- ------------------------------------------------------------ גישה לטבלאות דרך ה-API
-- גם אם בפרויקט כובתה האפשרות "Automatically expose new tables".
-- מה שכל משתמש רואה ומשנה בפועל נקבע ע"י מדיניות ה-RLS שלמעלה.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.is_service() to anon, authenticated, service_role;
grant execute on function public.moderation_on() to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;

-- ------------------------------------------------------------ תמונות (אם לא משתמשים ב-Cloudinary)

insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
do $$ begin
  update storage.buckets set file_size_limit = 6291456, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'photos';
exception when others then null;
end $$;
drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (public.is_admin() or exists (select 1 from public.my_advertiser_ids())));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());

-- =====================================================================
-- שלב 4 במדריך: הוסיפו את האימייל שלכם כמנהל (החליפו את הכתובת והריצו לבד):
--   insert into public.admins (email) values ('you@example.com');
-- =====================================================================
