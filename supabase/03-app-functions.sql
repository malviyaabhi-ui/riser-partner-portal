-- ═══════════════════════════════════════════════════════════════
-- Part 3: Application-flow RPCs (security definer)
-- Run after parts 1, 2 and the v1.1 addendum.
-- Applicants have no partner yet, so RLS would block their inserts;
-- these controlled functions handle only the application flow.
-- ═══════════════════════════════════════════════════════════════

create or replace function submit_partner_application(
  p_legal_name text, p_type text, p_country text,
  p_registration_no text, p_vat_no text, p_address text,
  p_contact_name text, p_contact_email text, p_contact_phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_partner_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  -- one application per user
  if exists (select 1 from portal_users where id = auth.uid() and partner_id is not null) then
    raise exception 'An application already exists for this account';
  end if;

  insert into partners (legal_name, type, country, registration_no, vat_no, address,
    primary_contact_name, primary_contact_email, primary_contact_phone, status)
  values (p_legal_name, p_type::partner_type, p_country, p_registration_no, p_vat_no,
    p_address, p_contact_name, p_contact_email, p_contact_phone, 'in_review')
  returning id into v_partner_id;

  insert into portal_users (id, partner_id, role, full_name, email)
  values (auth.uid(), v_partner_id, 'partner_owner', p_contact_name, p_contact_email)
  on conflict (id) do update set partner_id = v_partner_id,
    full_name = excluded.full_name, email = excluded.email;

  return v_partner_id;
end $$;

create or replace function register_partner_document(
  p_partner_id uuid, p_doc_type text, p_label text,
  p_file_path text, p_file_size_kb int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from portal_users where id = auth.uid() and partner_id = p_partner_id) then
    raise exception 'Not a member of this partner';
  end if;
  insert into partner_documents (partner_id, doc_type, label, file_path, file_size_kb, uploaded_by)
  values (p_partner_id, p_doc_type::doc_type, p_label, p_file_path, p_file_size_kb, auth.uid());
end $$;

-- Admin approval helper: activates partner and logs it
create or replace function approve_partner(p_partner_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_riser_admin() then raise exception 'Admin only'; end if;
  update partners set status = 'active', approved_at = now() where id = p_partner_id;
  update partner_documents set status = 'verified', verified_at = now(), verified_by = auth.uid()
    where partner_id = p_partner_id and status = 'pending_review';
  insert into activity_log (actor_id, partner_id, action)
  values (auth.uid(), p_partner_id, 'partner.approved');
end $$;

grant execute on function submit_partner_application to authenticated;
grant execute on function register_partner_document to authenticated;
grant execute on function approve_partner to authenticated;
