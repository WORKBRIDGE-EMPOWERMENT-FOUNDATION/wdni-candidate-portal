-- Run once in Supabase → SQL Editor. Safe to re-run. Also included in supabase/schema.sql.

-- ---------- Bulk SMS log (/admin/sms) ----------
-- One row per SMS sent (or failed) to a candidate. `message` is the text HR wrote (before
-- {first_name} is filled in), so HR can skip people who already got the same message.
create table if not exists public.sms_log (
  id           bigint generated always as identity primary key,
  shortlist_id uuid not null references public.shortlist(id) on delete cascade,
  to_phone     text not null,
  message      text not null,
  status       text not null check (status in ('sent', 'failed')),
  provider_id  text,
  error        text,
  sent_by      text,
  created_at   timestamptz not null default now()
);
create index if not exists sms_log_shortlist_idx on public.sms_log (shortlist_id, created_at desc);

alter table public.sms_log enable row level security;

drop policy if exists "sms log admin read" on public.sms_log;
create policy "sms log admin read" on public.sms_log for select to authenticated
  using (public.is_admin());

drop policy if exists "sms log admin insert" on public.sms_log;
create policy "sms log admin insert" on public.sms_log for insert to authenticated
  with check (public.is_admin());

grant select, insert on public.sms_log to authenticated;
grant all on public.sms_log to service_role;
grant all on all sequences in schema public to service_role;
