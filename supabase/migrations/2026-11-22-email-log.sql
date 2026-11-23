-- Run once in Supabase → SQL Editor. Safe to re-run. Also included in supabase/schema.sql.

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
