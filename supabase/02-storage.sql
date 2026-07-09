-- ═══════════════════════════════════════════════════════════════
-- RISER PARTNER PORTAL — Part 2: Storage buckets & policies
-- Run AFTER 01-riser-portal-core-schema.sql
--
-- NOTE: If the CREATE POLICY statements below fail with
-- "must be owner of table objects", your Supabase project has the
-- locked-down storage schema. In that case:
--   Dashboard -> Storage -> [bucket] -> Policies -> New policy
-- and recreate each policy there using the same USING / WITH CHECK
-- expressions shown below.
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- Storage buckets (run once; policies below)
-- ═══════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values
  ('kyc-documents','kyc-documents', false),
  ('collateral','collateral', false),
  ('ticket-attachments','ticket-attachments', false)
on conflict do nothing;

-- KYC: partner uploads under {partner_id}/..., reads own; admin reads all
create policy kyc_partner_rw on storage.objects for all
  using (bucket_id = 'kyc-documents'
    and (is_riser_admin() or (storage.foldername(name))[1] = my_partner_id()::text))
  with check (bucket_id = 'kyc-documents'
    and (is_riser_admin() or (storage.foldername(name))[1] = my_partner_id()::text));

-- Collateral: partners read, admin writes
create policy collat_read on storage.objects for select
  using (bucket_id = 'collateral' and auth.uid() is not null);
create policy collat_admin_write on storage.objects for insert
  with check (bucket_id = 'collateral' and is_riser_admin());

-- Ticket attachments: scoped like KYC
create policy tickets_files on storage.objects for all
  using (bucket_id = 'ticket-attachments'
    and (is_riser_admin() or (storage.foldername(name))[1] = my_partner_id()::text))
  with check (bucket_id = 'ticket-attachments'
    and (is_riser_admin() or (storage.foldername(name))[1] = my_partner_id()::text));

