-- ═══════════════════════════════════════════════════════════════
-- Part 8: Quote lifecycle — status guard + partner draft deletion
-- ═══════════════════════════════════════════════════════════════

-- Replace the restrictive partner update policy (it blocked updates
-- on approved quotes) with a simple ownership policy…
drop policy if exists p_quotes_update on quotes;
create policy p_quotes_update on quotes
  for update using (partner_id = my_partner_id())
  with check (partner_id = my_partner_id());

-- …and enforce approval rules with a trigger instead:
create or replace function guard_quote_status() returns trigger
language plpgsql as $$
begin
  if not is_riser_admin() then
    -- partners can never grant approval or touch approval fields
    if new.approved_by is distinct from old.approved_by then
      raise exception 'Only Riser can set approval';
    end if;
    if old.status = 'pending_approval' and new.status in ('approved','sent','won')
       and old.needs_approval then
      raise exception 'This quote needs Riser approval before it can progress';
    end if;
    if new.status = 'approved' then
      raise exception 'Only Riser can approve quotes';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_guard_quote_status on quotes;
create trigger trg_guard_quote_status before update on quotes
  for each row execute function guard_quote_status();

-- partners may delete their own drafts
create policy p_quotes_delete on quotes
  for delete using (partner_id = my_partner_id() and status = 'draft');
create policy p_qitems_delete on quote_items
  for delete using (exists (select 1 from quotes q
    where q.id = quote_id and q.partner_id = my_partner_id() and q.status = 'draft'));
