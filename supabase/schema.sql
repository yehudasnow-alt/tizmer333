-- =====================================================================
-- תמרה – צימרים ווילות · סכמת מסד הנתונים ל-Supabase
-- מריצים: Supabase → SQL Editor → New query → הדבקה → Run
-- בטוח להריץ שוב גם על מסד קיים (מוסיף רק מה שחסר, לא מוחק נתונים).
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

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
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
    if public.moderation_on() then
      new.name := old.name; new.type := old.type; new.region := old.region; new.settlement := old.settlement;
      new.tagline := old.tagline; new.description := old.description; new.photos := old.photos;
      new.amenities := old.amenities; new.audience := old.audience; new.video_url := old.video_url;
    else
      new.pending := null;
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

create or replace function public.submit_review(p_token text, p_rating integer, p_text text, p_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare q public.leads;
  months text[] := array['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
begin
  select * into q from public.leads where review_token = p_token and status = 'closed' limit 1;
  if q.id is null then raise exception 'הקישור לחוות הדעת אינו בתוקף'; end if;
  if exists (select 1 from public.reviews where lead_id = q.id) then raise exception 'כבר נכתבה חוות דעת על ההזמנה הזאת'; end if;
  if char_length(coalesce(p_text, '')) < 10 then raise exception 'חוות הדעת קצרה מדי'; end if;
  insert into public.reviews (listing_id, lead_id, name, rating, text, status, stay_month)
  values (q.listing_id, q.id, left(coalesce(nullif(trim(p_name), ''), 'אורח'), 60), greatest(1, least(5, p_rating)), left(p_text, 1500), 'pending',
          coalesce(months[extract(month from q.check_in)::int], ''));
  return true;
end $$;

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

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_advertiser_ids() to anon, authenticated;
grant execute on function public.review_invite(text) to anon, authenticated;
grant execute on function public.submit_review(text, integer, text, text) to anon, authenticated;
grant execute on function public.track_event(text, text) to anon, authenticated;

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

-- מתחמים
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select
  using (active or public.is_admin() or owner_id in (select public.my_advertiser_ids()));
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
              and listing_id in (select l.id from public.listings l where l.active));
drop policy if exists leads_read on public.leads;
create policy leads_read on public.leads for select to authenticated
  using (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())))
  with check (public.is_admin() or listing_id in (select l.id from public.listings l where l.owner_id in (select public.my_advertiser_ids())));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated using (public.is_admin());

-- בקשות הצטרפות
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to anon, authenticated with check (status = 'new' and notified_at is null);
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
drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (public.is_admin() or exists (select 1 from public.my_advertiser_ids())));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());

-- =====================================================================
-- שלב 4 במדריך: הוסיפו את האימייל שלכם כמנהל (החליפו את הכתובת והריצו לבד):
--   insert into public.admins (email) values ('you@example.com');
-- =====================================================================
