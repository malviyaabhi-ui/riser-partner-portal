-- ═══════════════════════════════════════════════════════════════
-- RISER PARTNER PORTAL — Schema Addendum v1.1
-- Platform Integrations & Provisioning
-- Run AFTER riser-partner-portal-schema.sql
--
-- Purpose: connect the portal to product admin platforms
-- (SpacioHub, SocialWiFiOnline, Riser Lumen, and future products)
-- so won quotes auto-provision tenants/licences, and usage &
-- renewal data flows back for AMC tracking.
-- ═══════════════════════════════════════════════════════════════

create type integration_status as enum ('disconnected','connected','error');
create type job_status as enum ('pending','running','success','failed','cancelled');
create type job_action as enum ('create_tenant','create_licence','update_licence','suspend','reactivate','sync_usage');

-- ── Platform connections (one row per product platform) ──────
create table platform_integrations (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) unique,
  platform_key text not null unique,        -- 'spaciohub' | 'swo' | 'lumen'
  base_url     text not null,               -- e.g. https://admin.spaciohub.com/api
  auth_type    text not null default 'api_key',  -- api_key | bearer | hmac
  -- Secret is NOT stored here. Store in Supabase Vault or as an
  -- edge-function secret named INTEGRATION_<PLATFORM_KEY>_KEY.
  secret_ref   text not null,               -- name of the secret, not the value
  status       integration_status not null default 'disconnected',
  last_ping_at timestamptz,
  last_error   text,
  capabilities jsonb not null default '{}', -- {"create_tenant":true,"sync_usage":false,...}
  created_at   timestamptz not null default now()
);

-- ── Provisioning jobs (queued, retried, auditable) ───────────
create table provisioning_jobs (
  id             uuid primary key default gen_random_uuid(),
  integration_id uuid not null references platform_integrations(id),
  partner_id     uuid not null references partners(id),
  quote_id       uuid references quotes(id),
  action         job_action not null,
  payload        jsonb not null,            -- adapter input: tenant name, plan, qty, etc.
  status         job_status not null default 'pending',
  attempts       int not null default 0,
  max_attempts   int not null default 5,
  next_run_at    timestamptz not null default now(),
  response       jsonb,                     -- platform response: tenant_id, licence_key...
  error          text,
  created_by     uuid references portal_users(id),
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index on provisioning_jobs (status, next_run_at);
create index on provisioning_jobs (partner_id);

-- ── Provisioned entities (what exists where, per customer) ───
-- The link between a partner's customer deal and the real tenant/
-- licence living inside a product platform. AMC renewals hang off this.
create table provisioned_entities (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partners(id),
  quote_id       uuid references quotes(id),
  product_id     uuid not null references products(id),
  integration_id uuid not null references platform_integrations(id),
  customer_name  text not null,
  external_id    text not null,             -- tenant id / licence key in the platform
  plan           text,
  quantity       numeric default 1,         -- rooms / APs / screens
  status         text not null default 'active',  -- active | suspended | expired
  starts_at      date,
  renews_at      date,                      -- drives AMC reminders
  last_synced_at timestamptz,
  usage          jsonb,                     -- last sync snapshot from the platform
  created_at     timestamptz not null default now()
);
create index on provisioned_entities (partner_id);
create index on provisioned_entities (renews_at) where renews_at is not null;

-- ── RLS ──────────────────────────────────────────────────────
alter table platform_integrations enable row level security;
alter table provisioning_jobs     enable row level security;
alter table provisioned_entities  enable row level security;

-- Integrations: Riser admin only (contains infrastructure detail)
create policy admin_all on platform_integrations
  for all using (is_riser_admin()) with check (is_riser_admin());

-- Jobs: admin full; partners may read status of their own jobs
create policy admin_all on provisioning_jobs
  for all using (is_riser_admin()) with check (is_riser_admin());
create policy p_jobs_read on provisioning_jobs
  for select using (partner_id = my_partner_id());

-- Provisioned entities: admin full; partners read their own customers
create policy admin_all on provisioned_entities
  for all using (is_riser_admin()) with check (is_riser_admin());
create policy p_entities_read on provisioned_entities
  for select using (partner_id = my_partner_id());

-- ── Seed the three integrations (disconnected until keys set) ─
insert into platform_integrations (product_id, platform_key, base_url, secret_ref, capabilities)
select p.id, v.key, v.url, v.secret, v.caps::jsonb
from products p
join (values
  ('spaciohub', 'spaciohub', 'https://admin.spaciohub.com/api',                'INTEGRATION_SPACIOHUB_KEY', '{"create_tenant":true,"create_licence":true,"suspend":true,"sync_usage":true}'),
  ('socialwifi','swo',       'https://socialwifionline.nav-ag.workers.dev',     'INTEGRATION_SWO_KEY',       '{"create_licence":true,"sync_usage":true}'),
  ('riser-lumen','lumen',    'https://api.riserlumen.com',                      'INTEGRATION_LUMEN_KEY',     '{"create_licence":true}')
) as v(slug, key, url, secret, caps) on v.slug = p.slug;

-- ═══════════════════════════════════════════════════════════════
-- Flow once adapters are built (edge function `provision`):
--   quote.status → 'won'
--     → trigger creates provisioning_jobs (one per product in the quote)
--     → pg_cron (every minute) invokes the `provision` edge function
--     → adapter calls the platform API using the vaulted secret
--     → success: provisioned_entities row created, partner notified
--     → failure: retry with backoff up to max_attempts, then flag
--       in Admin Console "Needs your action"
--   nightly `sync_usage` job refreshes usage + renews_at for AMC.
-- ═══════════════════════════════════════════════════════════════

-- Trigger: when a quote is marked won, enqueue provisioning jobs
create or replace function enqueue_provisioning() returns trigger
language plpgsql security definer as $$
begin
  if new.status = 'won' and old.status is distinct from 'won' then
    insert into provisioning_jobs (integration_id, partner_id, quote_id, action, payload, created_by)
    select pi.id, new.partner_id, new.id, 'create_tenant',
           jsonb_build_object(
             'customer_name', new.customer_name,
             'customer_email', new.customer_email,
             'product', p.slug,
             'qty', qi.qty,
             'unit_sell', qi.unit_sell
           ),
           new.created_by
    from quote_items qi
    join products p on p.id = qi.product_id
    join platform_integrations pi on pi.product_id = p.id
    where qi.quote_id = new.id
      and pi.status = 'connected';   -- only enqueue for live integrations
  end if;
  return new;
end $$;

create trigger trg_quote_won after update on quotes
  for each row execute function enqueue_provisioning();
