-- ═══════════════════════════════════════════════════════════════
-- RISER PARTNER PORTAL — Supabase Schema v1
-- Run in SQL Editor of the NEW dedicated Supabase project.
-- Deny-by-default RLS throughout. Partner users only ever see
-- rows matching their partner_id; admins (Riser) see everything.
-- ═══════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────
create type partner_type   as enum ('distributor','reseller');
create type partner_tier   as enum ('silver','gold','platinum');
create type partner_status as enum ('application','in_review','active','pricing_paused','suspended','rejected');
create type doc_type       as enum ('trade_license','vat_certificate','director_id','moa','bank_letter','other');
create type doc_status     as enum ('pending_review','verified','rejected','expiring','expired');
create type quote_status   as enum ('draft','pending_approval','approved','sent','won','lost','declined');
create type ticket_status  as enum ('open','in_progress','awaiting_partner','awaiting_riser','resolved','closed');
create type ticket_category as enum ('technical','billing','sales_support','customer_issue','other');
create type user_role      as enum ('partner_owner','partner_member','riser_admin','riser_staff');

-- ── Core: partners & users ───────────────────────────────────
create table partners (
  id                uuid primary key default gen_random_uuid(),
  legal_name        text not null,
  display_name      text,
  type              partner_type not null default 'reseller',
  tier              partner_tier not null default 'silver',
  status            partner_status not null default 'application',
  country           text not null,
  registration_no   text,
  vat_no            text,
  address           text,
  primary_contact_name  text,
  primary_contact_email text,
  primary_contact_phone text,
  payment_terms     text default '50% advance, 50% on delivery',
  parent_partner_id uuid references partners(id),   -- distributor → sub-reseller tree
  annual_target_aed numeric default 100000,
  notes_internal    text,                            -- Riser-only notes
  created_at        timestamptz not null default now(),
  approved_at       timestamptz
);

create table portal_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  partner_id  uuid references partners(id) on delete cascade,  -- null for Riser staff
  role        user_role not null default 'partner_member',
  full_name   text,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- helper: current user's role / partner
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from portal_users where id = auth.uid() $$;

create or replace function my_partner_id() returns uuid
language sql stable security definer set search_path = public as
$$ select partner_id from portal_users where id = auth.uid() $$;

create or replace function is_riser_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(my_role() in ('riser_admin','riser_staff'), false) $$;

-- ── KYC documents ────────────────────────────────────────────
create table partner_documents (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references partners(id) on delete cascade,
  doc_type     doc_type not null,
  label        text,                          -- e.g. "CAC Certificate"
  file_path    text not null,                 -- storage path in bucket kyc-documents
  file_size_kb int,
  status       doc_status not null default 'pending_review',
  expiry_date  date,
  verified_at  timestamptz,
  verified_by  uuid references portal_users(id),
  reject_reason text,
  uploaded_by  uuid references portal_users(id),
  created_at   timestamptz not null default now()
);
create index on partner_documents (partner_id);
create index on partner_documents (expiry_date) where expiry_date is not null;

-- ── Products & pricing ───────────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,            -- 'spaciohub', 'nexus-panel'
  name        text not null,
  category    text not null,                   -- 'SaaS' | 'Hardware'
  unit        text not null,                   -- 'per room/month', 'per unit'
  description text,
  msrp_aed    numeric not null,
  visible     boolean not null default false,  -- hidden from ALL partners until true
  sort_order  int default 100,
  created_at  timestamptz not null default now()
);

-- tier discount bands per product (percentage off MSRP)
create table tier_pricing (
  product_id   uuid not null references products(id) on delete cascade,
  tier         partner_tier not null,
  discount_pct numeric not null check (discount_pct between 0 and 90),
  floor_discount_pct numeric not null default 0,  -- max customer discount before Riser approval
  primary key (product_id, tier)
);

-- per-partner negotiated overrides (beats tier band when present)
create table partner_pricing_overrides (
  partner_id   uuid not null references partners(id) on delete cascade,
  product_id   uuid not null references products(id) on delete cascade,
  discount_pct numeric not null check (discount_pct between 0 and 90),
  note         text,
  set_by       uuid references portal_users(id),
  created_at   timestamptz not null default now(),
  primary key (partner_id, product_id)
);

-- per-partner visibility override (soft-launch a hidden product to select partners)
create table partner_product_visibility (
  partner_id uuid not null references partners(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  visible    boolean not null,
  primary key (partner_id, product_id)
);

-- effective price resolver
create or replace function effective_discount(p_partner uuid, p_product uuid)
returns numeric language sql stable as $$
  select coalesce(
    (select discount_pct from partner_pricing_overrides
      where partner_id = p_partner and product_id = p_product),
    (select tp.discount_pct from tier_pricing tp
      join partners pa on pa.tier = tp.tier
      where pa.id = p_partner and tp.product_id = p_product),
    0)
$$;

-- ── Quotes ───────────────────────────────────────────────────
create table quotes (
  id             uuid primary key default gen_random_uuid(),
  quote_no       text unique not null,          -- Q-2026-118, generated by trigger
  partner_id     uuid not null references partners(id) on delete cascade,
  customer_name  text not null,
  customer_email text,
  status         quote_status not null default 'draft',
  currency       text not null default 'AED',
  total_sell     numeric not null default 0,    -- what customer pays
  total_buy      numeric not null default 0,    -- partner's cost from Riser
  needs_approval boolean not null default false,-- true when below floor
  approval_note  text,
  approved_by    uuid references portal_users(id),
  created_by     uuid references portal_users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table quote_items (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references quotes(id) on delete cascade,
  product_id  uuid not null references products(id),
  description text,
  qty         numeric not null default 1,
  unit_buy    numeric not null,     -- partner buy price at time of quote
  unit_sell   numeric not null      -- price offered to customer
);

-- quote number sequence: Q-YYYY-NNN
create sequence quote_seq;
create or replace function set_quote_no() returns trigger language plpgsql as $$
begin
  if new.quote_no is null or new.quote_no = '' then
    new.quote_no := 'Q-' || to_char(now(),'YYYY') || '-' || lpad(nextval('quote_seq')::text, 3, '0');
  end if;
  return new;
end $$;
create trigger trg_quote_no before insert on quotes
  for each row execute function set_quote_no();

-- ── Collateral ───────────────────────────────────────────────
create table collateral (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null,                 -- Sales | Technical | Marketing | Price list
  product_id  uuid references products(id),  -- null = all products
  version     text not null default 'v1',
  file_path   text not null,                 -- storage path in bucket collateral
  file_size_kb int,
  updated_at  timestamptz not null default now()
);

create table collateral_downloads (
  id            uuid primary key default gen_random_uuid(),
  collateral_id uuid not null references collateral(id) on delete cascade,
  user_id       uuid not null references portal_users(id),
  created_at    timestamptz not null default now()
);

-- ── Tickets ──────────────────────────────────────────────────
create table tickets (
  id          uuid primary key default gen_random_uuid(),
  ticket_no   text unique not null,
  partner_id  uuid not null references partners(id) on delete cascade,
  subject     text not null,
  category    ticket_category not null default 'technical',
  status      ticket_status not null default 'open',
  created_by  uuid references portal_users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create sequence ticket_seq start 2200;
create or replace function set_ticket_no() returns trigger language plpgsql as $$
begin
  if new.ticket_no is null or new.ticket_no = '' then
    new.ticket_no := 'T-' || nextval('ticket_seq')::text;
  end if;
  return new;
end $$;
create trigger trg_ticket_no before insert on tickets
  for each row execute function set_ticket_no();

create table ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets(id) on delete cascade,
  author_id  uuid not null references portal_users(id),
  body       text not null,
  attachment_path text,
  created_at timestamptz not null default now()
);

-- ── Announcements ────────────────────────────────────────────
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Mira AI ──────────────────────────────────────────────────
create table mira_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references portal_users(id) on delete cascade,
  partner_id uuid references partners(id),   -- null for Riser admin chats
  title      text,
  created_at timestamptz not null default now()
);

create table mira_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references mira_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index on mira_messages (conversation_id, created_at);

-- ── Activity log (audit trail) ───────────────────────────────
create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references portal_users(id),
  partner_id uuid references partners(id),
  action     text not null,          -- 'doc.verified', 'quote.approved', 'tier.changed'
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- RLS — deny by default, then explicit grants
-- ═══════════════════════════════════════════════════════════════
alter table partners                   enable row level security;
alter table portal_users               enable row level security;
alter table partner_documents          enable row level security;
alter table products                   enable row level security;
alter table tier_pricing               enable row level security;
alter table partner_pricing_overrides  enable row level security;
alter table partner_product_visibility enable row level security;
alter table quotes                     enable row level security;
alter table quote_items                enable row level security;
alter table collateral                 enable row level security;
alter table collateral_downloads       enable row level security;
alter table tickets                    enable row level security;
alter table ticket_messages            enable row level security;
alter table announcements              enable row level security;
alter table mira_conversations         enable row level security;
alter table mira_messages              enable row level security;
alter table activity_log               enable row level security;

-- Riser admin: full access everywhere
create policy admin_all on partners                   for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on portal_users               for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on partner_documents          for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on products                   for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on tier_pricing               for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on partner_pricing_overrides  for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on partner_product_visibility for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on quotes                     for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on quote_items                for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on collateral                 for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on collateral_downloads       for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on tickets                    for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on ticket_messages            for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on announcements              for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on mira_conversations         for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on mira_messages              for all using (is_riser_admin()) with check (is_riser_admin());
create policy admin_all on activity_log               for all using (is_riser_admin()) with check (is_riser_admin());

-- Partner users: own-partner reads
create policy p_read_own_partner on partners
  for select using (id = my_partner_id() and status in ('active','pricing_paused'));

create policy p_read_self on portal_users
  for select using (id = auth.uid() or partner_id = my_partner_id());

create policy p_docs_read on partner_documents
  for select using (partner_id = my_partner_id());
create policy p_docs_insert on partner_documents
  for insert with check (partner_id = my_partner_id() and uploaded_by = auth.uid());

-- Products: visible flag + per-partner override; pricing hidden when partner is pricing_paused
create policy p_products_read on products
  for select using (
    coalesce(
      (select visible from partner_product_visibility v
        where v.partner_id = my_partner_id() and v.product_id = products.id),
      visible)
  );

create policy p_tier_pricing_read on tier_pricing
  for select using (
    exists (select 1 from partners pa
      where pa.id = my_partner_id()
        and pa.tier = tier_pricing.tier
        and pa.status = 'active')      -- pricing_paused partners lose price visibility
  );

create policy p_overrides_read on partner_pricing_overrides
  for select using (
    partner_id = my_partner_id()
    and exists (select 1 from partners pa where pa.id = my_partner_id() and pa.status = 'active')
  );

-- Quotes: own quotes, full lifecycle except approving own discounts
create policy p_quotes_read   on quotes for select using (partner_id = my_partner_id());
create policy p_quotes_insert on quotes for insert with check (partner_id = my_partner_id() and created_by = auth.uid());
create policy p_quotes_update on quotes for update
  using (partner_id = my_partner_id())
  with check (partner_id = my_partner_id() and approved_by is null);  -- partners cannot self-approve

create policy p_qitems_read   on quote_items for select
  using (exists (select 1 from quotes q where q.id = quote_id and q.partner_id = my_partner_id()));
create policy p_qitems_write  on quote_items for insert
  with check (exists (select 1 from quotes q where q.id = quote_id and q.partner_id = my_partner_id()));

-- Collateral: readable by any active partner user
create policy p_collateral_read on collateral
  for select using (my_partner_id() is not null);
create policy p_downloads_insert on collateral_downloads
  for insert with check (user_id = auth.uid());
create policy p_downloads_read on collateral_downloads
  for select using (user_id = auth.uid());

-- Tickets
create policy p_tickets_read   on tickets for select using (partner_id = my_partner_id());
create policy p_tickets_insert on tickets for insert with check (partner_id = my_partner_id() and created_by = auth.uid());
create policy p_tickets_update on tickets for update using (partner_id = my_partner_id());
create policy p_tmsg_read on ticket_messages
  for select using (exists (select 1 from tickets t where t.id = ticket_id and t.partner_id = my_partner_id()));
create policy p_tmsg_insert on ticket_messages
  for insert with check (author_id = auth.uid()
    and exists (select 1 from tickets t where t.id = ticket_id and t.partner_id = my_partner_id()));

-- Announcements: read-only for all logged-in users
create policy p_announcements_read on announcements
  for select using (published = true and auth.uid() is not null);

-- Mira: strictly own conversations
create policy p_mira_conv on mira_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy p_mira_msg on mira_messages
  for all using (exists (select 1 from mira_conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from mira_conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- Seed data — products & tier bands (placeholder MSRPs, edit freely)
-- ═══════════════════════════════════════════════════════════════
insert into products (slug, name, category, unit, msrp_aed, visible, sort_order, description) values
  ('spaciohub',      'SpacioHub',        'SaaS',     'per room/month',      45,    true,  1, 'Room booking, door displays, visitor management and workspace analytics.'),
  ('nexus-panel',    'Nexus AI Panel',   'Hardware', 'per unit (75")',      10900, true,  2, 'Interactive AI panels 55"–86" with built-in conferencing and whiteboarding. RTLIP588 Series.'),
  ('socialwifi',     'SocialWiFiOnline', 'SaaS',     'per AP/month',        18,    true,  3, 'Branded splash pages, social login, vouchers and guest analytics.'),
  ('riser-lumen',    'Riser Lumen',      'SaaS',     'per screen/month',    35,    true,  4, 'Cloud digital signage with playlists, scheduling and multi-zone layouts.'),
  ('heysynk',        'heySynk',          'SaaS',     'per workspace/month', 220,   false, 5, 'Shared inbox, website chat widget and Mira AI assistant.'),
  ('devlokr',        'DevLokr',          'SaaS',     'per team/month',      90,    false, 6, 'AES-256 encrypted credential vault for dev teams and agencies.'),
  ('formello',       'Formello',         'SaaS',     'per workspace/month', 55,    false, 7, 'Form builder with logic, integrations and submission analytics.');

insert into tier_pricing (product_id, tier, discount_pct, floor_discount_pct)
select id, t.tier, t.d, t.f from products,
  (values ('silver'::partner_tier, 22, 5), ('gold'::partner_tier, 29, 10), ('platinum'::partner_tier, 36, 15)) as t(tier, d, f);

-- hardware gets slightly tighter bands
update tier_pricing tp set discount_pct = v.d
from (values ('silver',20),('gold',27),('platinum',33)) as v(tier, d),
     products p
where p.slug = 'nexus-panel' and tp.product_id = p.id and tp.tier::text = v.tier;

insert into announcements (title, body) values
  ('Welcome to the Riser Partner Portal', 'Your pricing, documents, quotes and support — all in one place. Ask Mira if you need anything.');

-- ═══════════════════════════════════════════════════════════════
-- After running this file:
-- 1. Create your own admin user: sign up via the app, then run:
--    update portal_users set role='riser_admin', partner_id=null where email='you@risertechnologies.net';
-- 2. Deploy the mira-chat edge function (next step of the build).
-- ═══════════════════════════════════════════════════════════════
