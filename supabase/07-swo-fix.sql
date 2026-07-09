-- Part 7: SWO On-Prem User-based → USD 12 / user / year (AED 44 @ 3.679)
update product_variants
set billing = 'yearly',
    unit = 'per user/year',
    msrp_aed = 44,
    amc_pct = null,
    note = 'USD 12 per user per year'
where name = 'On-Prem Perpetual (User-based)'
  and product_id = (select id from products where slug = 'socialwifi');
