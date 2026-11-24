-- Run once in Supabase → SQL Editor. Lets candidates submit without guarantor details,
-- the guarantor form, health answers or the medical certificate (collected later, before training).

-- Final submit: checks required details and documents, then locks the application.
create or replace function public.submit_application() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sid     uuid;
  v_status  candidate_status;
  s         submissions;
  v_needed  doc_type[];
  v_missing text[];
begin
  select id, status into v_sid, v_status from shortlist where user_id = auth.uid();
  if v_sid is null then raise exception 'You are not on the WDNI shortlist.'; end if;
  if v_status not in ('shortlisted', 'in_progress', 'needs_changes') then
    raise exception 'This application has already been submitted.';
  end if;

  select * into s from submissions where shortlist_id = v_sid;
  if not found then raise exception 'Please complete the form before submitting.'; end if;
  if not s.declaration_accepted then raise exception 'Please accept the declaration before submitting.'; end if;

  if s.surname is null or s.first_name is null or s.date_of_birth is null
     or s.phone is null or s.nin is null or s.residential_address is null
     or s.nok_full_name is null or s.nok_phone is null
     or s.has_drivers_licence is null then
    raise exception 'Some required details are missing. Please check each section.';
  end if;

  -- Guarantor and medical fitness are collected at a later stage; the app checks them when
  -- NEXT_PUBLIC_COLLECT_FINAL_STAGE=true (lib/form-config.ts).
  v_needed := array['passport_photo', 'nin_document']::doc_type[];
  if s.has_drivers_licence then v_needed := v_needed || 'drivers_licence'::doc_type; end if;

  select array_agg(t::text) into v_missing
    from unnest(v_needed) as t
   where not exists (select 1 from documents d where d.shortlist_id = v_sid and d.doc_type = t);

  if v_missing is not null then
    raise exception 'Missing documents: %', array_to_string(v_missing, ', ');
  end if;

  update submissions set submitted_at = now() where shortlist_id = v_sid;
  update shortlist set status = 'submitted' where id = v_sid;
end $$;
