-- =============================================================
-- WDNI Candidate Portal — Supabase schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Safe to read top to bottom: tables, helper functions, security rules, storage.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Types ----------
do $$ begin
  create type public.candidate_status as enum
    ('shortlisted', 'in_progress', 'submitted', 'needs_changes', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.doc_type as enum
    ('passport_photo', 'nin_document', 'drivers_licence', 'guarantor_form',
     'medical_certificate', 'education_certificate');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------

-- HR staff who can open /admin. Add rows by email (see README).
create table if not exists public.admins (
  email      text primary key check (email = lower(email)),
  full_name  text,
  created_at timestamptz not null default now()
);

-- One row per shortlisted candidate. Only people listed here can use the portal.
create table if not exists public.shortlist (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text unique check (email is null or email = lower(email)),
  phone       text unique,                      -- stored as +234XXXXXXXXXX
  cohort      text not null default 'Pioneer 100',
  status      public.candidate_status not null default 'shortlisted',
  user_id     uuid unique references auth.users(id) on delete set null,
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint shortlist_has_contact check (email is not null or phone is not null)
);

-- The candidate's biodata form (one per shortlisted candidate).
create table if not exists public.submissions (
  shortlist_id uuid primary key references public.shortlist(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,

  -- Personal details
  surname text, first_name text, middle_name text,
  date_of_birth date, gender text, marital_status text,
  phone text, alt_phone text, email text,
  residential_address text,
  state_of_residence text, lga_of_residence text,
  state_of_origin text, lga_of_origin text,
  nin text, highest_education text, occupation text,

  -- Next of kin
  nok_full_name text, nok_relationship text, nok_phone text, nok_email text, nok_address text,

  -- Driving experience
  has_drivers_licence boolean, licence_number text, licence_class text, licence_expiry date,
  driving_experience_years integer, vehicle_types text,

  -- Guarantor
  guarantor_full_name text, guarantor_relationship text, guarantor_phone text,
  guarantor_email text, guarantor_occupation text, guarantor_years_known integer,
  guarantor_address text,

  -- Health & fitness
  blood_group text, genotype text,
  has_medical_condition boolean, medical_condition_details text,
  wears_corrective_lenses boolean,

  -- Declaration
  declaration_accepted boolean not null default false,
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uploaded files (the file itself lives in the private "candidate-docs" storage bucket).
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  shortlist_id uuid not null references public.shortlist(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  doc_type     public.doc_type not null,
  storage_path text not null,
  file_name    text,
  mime_type    text,
  size_bytes   integer,
  uploaded_at  timestamptz not null default now(),
  unique (shortlist_id, doc_type)
);

create index if not exists shortlist_status_idx on public.shortlist(status);

-- ---------- Helper functions ----------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists shortlist_updated_at on public.shortlist;
create trigger shortlist_updated_at before update on public.shortlist
  for each row execute function public.set_updated_at();

drop trigger if exists submissions_updated_at on public.submissions;
create trigger submissions_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- Is the signed-in user an HR admin?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.email <> ''
  );
$$;

-- The shortlist row that belongs to the signed-in candidate (null if none).
create or replace function public.my_shortlist_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.shortlist where user_id = auth.uid();
$$;

-- Can the signed-in candidate still edit their application?
create or replace function public.can_edit() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shortlist
    where user_id = auth.uid()
      and status in ('shortlisted', 'in_progress', 'needs_changes')
  );
$$;

-- Links a newly signed-in account to its shortlist row by email or phone.
create or replace function public.claim_shortlist() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id    uuid;
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_phone text := nullif(auth.jwt() ->> 'phone', '');
begin
  if auth.uid() is null then return null; end if;

  select id into v_id from shortlist where user_id = auth.uid();
  if v_id is not null then return v_id; end if;

  if v_phone is not null then v_phone := '+' || ltrim(v_phone, '+'); end if;

  select id into v_id from shortlist
   where user_id is null
     and ((v_email is not null and email = v_email)
       or (v_phone is not null and phone = v_phone))
   order by created_at
   limit 1;

  if v_id is not null then
    update shortlist set user_id = auth.uid() where id = v_id;
  end if;
  return v_id;
end $$;

-- Moves a candidate from "shortlisted" to "in_progress" the first time they save.
create or replace function public.mark_in_progress() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update shortlist set status = 'in_progress'
   where id = new.shortlist_id and status = 'shortlisted';
  return new;
end $$;

drop trigger if exists submissions_mark_in_progress on public.submissions;
create trigger submissions_mark_in_progress after insert or update on public.submissions
  for each row execute function public.mark_in_progress();

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

revoke execute on function public.claim_shortlist()    from anon;
revoke execute on function public.submit_application() from anon;

-- ---------- Row-level security ----------
alter table public.admins      enable row level security;
alter table public.shortlist   enable row level security;
alter table public.submissions enable row level security;
alter table public.documents   enable row level security;

-- admins: only admins can see the list; changes are made in the SQL editor.
drop policy if exists "admins read" on public.admins;
create policy "admins read" on public.admins for select to authenticated
  using (public.is_admin());

-- shortlist: candidates see their own row; admins manage everything.
drop policy if exists "shortlist read" on public.shortlist;
create policy "shortlist read" on public.shortlist for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "shortlist admin insert" on public.shortlist;
create policy "shortlist admin insert" on public.shortlist for insert to authenticated
  with check (public.is_admin());

drop policy if exists "shortlist admin update" on public.shortlist;
create policy "shortlist admin update" on public.shortlist for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "shortlist admin delete" on public.shortlist;
create policy "shortlist admin delete" on public.shortlist for delete to authenticated
  using (public.is_admin());

-- submissions: candidates read/write their own while editable; admins read all.
drop policy if exists "submissions read" on public.submissions;
create policy "submissions read" on public.submissions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "submissions insert own" on public.submissions;
create policy "submissions insert own" on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and shortlist_id = public.my_shortlist_id() and public.can_edit());

drop policy if exists "submissions update own" on public.submissions;
create policy "submissions update own" on public.submissions for update to authenticated
  using (user_id = auth.uid() and public.can_edit())
  with check (user_id = auth.uid() and shortlist_id = public.my_shortlist_id() and public.can_edit());

-- documents: same pattern.
drop policy if exists "documents read" on public.documents;
create policy "documents read" on public.documents for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "documents insert own" on public.documents;
create policy "documents insert own" on public.documents for insert to authenticated
  with check (user_id = auth.uid() and shortlist_id = public.my_shortlist_id() and public.can_edit()
              and storage_path like auth.uid()::text || '/%');

drop policy if exists "documents update own" on public.documents;
create policy "documents update own" on public.documents for update to authenticated
  using (user_id = auth.uid() and public.can_edit())
  with check (user_id = auth.uid() and shortlist_id = public.my_shortlist_id() and public.can_edit()
              and storage_path like auth.uid()::text || '/%');

drop policy if exists "documents delete own" on public.documents;
create policy "documents delete own" on public.documents for delete to authenticated
  using ((user_id = auth.uid() and public.can_edit()) or public.is_admin());

-- ---------- Private file storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-docs', 'candidate-docs', false, 5242880,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files are stored as <user_id>/<doc_type>-<timestamp>.<ext>
drop policy if exists "candidate docs upload own" on storage.objects;
create policy "candidate docs upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'candidate-docs'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.can_edit());

drop policy if exists "candidate docs read" on storage.objects;
create policy "candidate docs read" on storage.objects for select to authenticated
  using (bucket_id = 'candidate-docs'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "candidate docs delete" on storage.objects;
create policy "candidate docs delete" on storage.objects for delete to authenticated
  using (bucket_id = 'candidate-docs'
         and (((storage.foldername(name))[1] = auth.uid()::text and public.can_edit())
              or public.is_admin()));

-- ---------- Bulk email log (/admin/messages) ----------
-- One row per email sent (or failed) to a candidate, so HR can see who has been emailed.
create table if not exists public.email_log (
  id           bigint generated always as identity primary key,
  shortlist_id uuid not null references public.shortlist(id) on delete cascade,
  to_email     text not null,
  subject      text not null,
  status       text not null check (status in ('sent', 'failed')),
  error        text,
  sent_by      text,
  created_at   timestamptz not null default now()
);
create index if not exists email_log_shortlist_idx on public.email_log (shortlist_id, created_at desc);

alter table public.email_log enable row level security;

drop policy if exists "email log admin read" on public.email_log;
create policy "email log admin read" on public.email_log for select to authenticated
  using (public.is_admin());

drop policy if exists "email log admin insert" on public.email_log;
create policy "email log admin insert" on public.email_log for insert to authenticated
  with check (public.is_admin());

-- ---------- Table privileges ----------
-- Row-level security decides WHICH rows; these grants allow the operations at all.
-- Without them Supabase returns "42501 permission denied".
grant usage on schema public to anon, authenticated;
grant select                         on public.admins      to authenticated;
grant select, insert, update, delete on public.shortlist   to authenticated;
grant select, insert, update         on public.submissions to authenticated;
grant select, insert, update, delete on public.documents   to authenticated;
grant select, insert                 on public.email_log   to authenticated;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------- First admin (edit and run separately) ----------
-- insert into public.admins (email, full_name) values ('you@workbridgefoundation.org', 'HR Desk');
