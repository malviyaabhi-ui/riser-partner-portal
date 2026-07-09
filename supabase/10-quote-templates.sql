-- Part 10: fields for the two quote print templates
alter table quotes add column if not exists subject text;
alter table product_variants add column if not exists hsn_code text;
