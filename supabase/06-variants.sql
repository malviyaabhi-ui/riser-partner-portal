-- ═══════════════════════════════════════════════════════════════
-- Part 6: Product variants (editions, sizes, deployment models)
-- ═══════════════════════════════════════════════════════════════
create type billing_type as enum ('monthly','yearly','one_time');
create type availability_type as enum ('in_stock','on_order','n_a');

create table product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  name         text not null,                 -- 'Cloud', '75"', 'On-Prem Perpetual (AP-based)'
  sku          text,
  unit         text not null,                 -- 'per room/month', 'per unit', 'per AP'
  billing      billing_type not null default 'monthly',
  msrp_aed     numeric not null,
  amc_pct      numeric,                       -- annual AMC % of licence value (one-time variants)
  availability availability_type not null default 'n_a',
  note         text,                          -- e.g. 'Package pricing available for 50+ rooms'
  visible      boolean not null default true,
  sort_order   int not null default 100
);
create index on product_variants (product_id);

alter table product_variants enable row level security;
create policy admin_all on product_variants
  for all using (is_riser_admin()) with check (is_riser_admin());
-- partners see visible variants of products they can see
create policy p_variants_read on product_variants
  for select using (
    visible and exists (
      select 1 from products p where p.id = product_id and coalesce(
        (select v.visible from partner_product_visibility v
          where v.partner_id = my_partner_id() and v.product_id = p.id),
        p.visible)
    )
  );

-- quote items now reference a variant (nullable for backwards compatibility)
alter table quote_items add column if not exists variant_id uuid references product_variants(id);

-- ── Seed variants (placeholder MSRPs — edit in the admin UI) ──
-- SpacioHub
insert into product_variants (product_id, name, unit, billing, msrp_aed, amc_pct, availability, note, sort_order)
select id, v.* from products, (values
  ('Cloud',                       'per room/month', 'monthly'::billing_type,  45,   null::numeric, 'n_a'::availability_type, null, 1),
  ('On-Premises (perpetual)',     'per room',       'one_time'::billing_type, 500,  18,            'n_a'::availability_type, 'Package pricing available — raise a sales-support ticket for 25+ room sites.', 2)
) as v(name, unit, billing, msrp_aed, amc_pct, availability, note, sort_order)
where slug = 'spaciohub';

-- Nexus AI Panel
insert into product_variants (product_id, name, unit, billing, msrp_aed, availability, sort_order)
select id, v.* from products, (values
  ('65"',  'per unit', 'one_time'::billing_type,  8900, 'in_stock'::availability_type, 1),
  ('75"',  'per unit', 'one_time'::billing_type, 10900, 'in_stock'::availability_type, 2),
  ('86"',  'per unit', 'one_time'::billing_type, 14900, 'in_stock'::availability_type, 3),
  ('98"',  'per unit', 'one_time'::billing_type, 24900, 'on_order'::availability_type, 4),
  ('110"', 'per unit', 'one_time'::billing_type, 34900, 'on_order'::availability_type, 5)
) as v(name, unit, billing, msrp_aed, availability, sort_order)
where slug = 'nexus-panel';

-- SocialWiFiOnline
insert into product_variants (product_id, name, unit, billing, msrp_aed, amc_pct, availability, sort_order)
select id, v.* from products, (values
  ('Cloud',                          'per AP/month', 'monthly'::billing_type,  18,  null::numeric, 'n_a'::availability_type, 1),
  ('Private Cloud',                  'per AP/month', 'monthly'::billing_type,  25,  null::numeric, 'n_a'::availability_type, 2),
  ('On-Prem Perpetual (AP-based)',   'per AP',       'one_time'::billing_type, 350, 18,            'n_a'::availability_type, 3),
  ('On-Prem Perpetual (User-based)', 'per user',     'one_time'::billing_type, 20,  18,            'n_a'::availability_type, 4)
) as v(name, unit, billing, msrp_aed, amc_pct, availability, sort_order)
where slug = 'socialwifi';

-- Riser Lumen
insert into product_variants (product_id, name, unit, billing, msrp_aed, availability, note, sort_order)
select id, v.* from products, (values
  ('Licence',                    'per screen/month', 'monthly'::billing_type,  35,  'n_a'::availability_type,      null, 1),
  ('Lumen Player (media box)',   'per unit',         'one_time'::billing_type, 550, 'in_stock'::availability_type, 'Raspberry Pi-based signage player. List USD 150.', 2)
) as v(name, unit, billing, msrp_aed, availability, note, sort_order)
where slug = 'riser-lumen';
