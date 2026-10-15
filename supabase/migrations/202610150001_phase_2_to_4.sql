-- LEGACY / NOT DEPLOYED: Supabase Auth prototype for Phases 2–4.
-- Do not apply for the Clerk integration. owner_id/auth.users/auth.uid() must
-- be replaced with Clerk subject policies; lifecycle RPCs are still local.
-- See docs/cloud-integration.md before provisioning the cloud database.
begin;

create table public.commitments (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create table public.attempts (
  id uuid primary key,
  commitment_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status = 'active'),
  created_at timestamptz not null default now(),
  foreign key (commitment_id, owner_id) references public.commitments(id, owner_id) on delete cascade,
  unique (id, owner_id)
);
create table public.check_ins (
  attempt_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  count integer not null check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, date),
  foreign key (attempt_id, owner_id) references public.attempts(id, owner_id) on delete cascade
);
create index commitments_owner on public.commitments(owner_id);
create index attempts_owner on public.attempts(owner_id);
create index check_ins_owner on public.check_ins(owner_id);
alter table public.commitments enable row level security;
alter table public.attempts enable row level security;
alter table public.check_ins enable row level security;
create policy read_own_commitments on public.commitments for select to authenticated using ((select auth.uid()) = owner_id);
create policy read_own_attempts on public.attempts for select to authenticated using ((select auth.uid()) = owner_id);
create policy read_own_check_ins on public.check_ins for select to authenticated using ((select auth.uid()) = owner_id);
revoke all on public.commitments, public.attempts, public.check_ins from anon, authenticated;
grant select on public.commitments, public.attempts, public.check_ins to authenticated;

create function public.lockin_snapshot() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'commitments', coalesce((select jsonb_agg(c.definition || jsonb_build_object('id',c.id,'attemptId',a.id,'status',a.status,'createdAt',a.created_at) order by a.created_at desc) from public.attempts a join public.commitments c on c.id=a.commitment_id where a.owner_id=auth.uid()),'[]'::jsonb),
    'checkIns', coalesce((select jsonb_agg(jsonb_build_object('attemptId',l.attempt_id,'date',l.date,'count',l.count,'updatedAt',l.updated_at)) from public.check_ins l where l.owner_id=auth.uid()),'[]'::jsonb)
  );
$$;

create function public.lockin_create(p_request_id uuid, p_definition jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  def jsonb;
  existing jsonb;
  pace jsonb := p_definition->'pace';
  kind text := p_definition->'pace'->>'kind';
  target integer;
  duration integer := (p_definition->>'duration')::integer;
  starts date := (p_definition->>'startDate')::date;
  tz text := p_definition->>'timeZone';
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if p_request_id is null then raise exception 'Request ID required'; end if;
  select c.definition || jsonb_build_object('id',c.id,'attemptId',a.id,'status',a.status,'createdAt',a.created_at)
    into existing from public.commitments c join public.attempts a on a.commitment_id=c.id where c.id=p_request_id and c.owner_id=uid;
  if existing is not null then return existing; end if;
  if tz is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'Invalid time zone'; end if;
  if p_definition->>'path' is null or p_definition->>'path' not in ('build','quit') then raise exception 'Invalid path'; end if;
  if coalesce(length(btrim(p_definition->>'name')),0) not between 1 and 80 or coalesce(length(p_definition->>'description'),0)>300 then raise exception 'Invalid target'; end if;
  if coalesce(length(btrim(p_definition->>'reward')),0) not between 1 and 120 then raise exception 'Invalid reward'; end if;
  if starts is null or starts < (now() at time zone tz)::date or duration is null or duration not between 1 and 365 then raise exception 'Invalid dates'; end if;
  if kind='custom' then
    if jsonb_typeof(pace->'days') is distinct from 'array' or jsonb_array_length(pace->'days') not between 1 and 7 then raise exception 'Invalid weekdays'; end if;
    if exists(select 1 from jsonb_array_elements_text(pace->'days') x where x::integer not between 0 and 6)
       or (select count(distinct x) from jsonb_array_elements_text(pace->'days') x) <> jsonb_array_length(pace->'days') then raise exception 'Invalid weekdays'; end if;
    if not exists(select 1 from generate_series(0,duration-1) n where (pace->'days') @> jsonb_build_array(extract(isodow from starts+n)::integer-1)) then raise exception 'No scheduled dates'; end if;
    pace := jsonb_build_object('kind',kind,'days',pace->'days');
  elsif kind in ('daily','weekly') then
    target := (pace->>'count')::integer;
    if target is null or target not between 1 and case when kind='weekly' then 7 when p_definition->>'path'='quit' then 1 else 99 end then raise exception 'Invalid count'; end if;
    pace := jsonb_build_object('kind',kind,'count',target);
  else raise exception 'Invalid pace'; end if;
  def := jsonb_build_object('path',p_definition->>'path','name',btrim(p_definition->>'name'),'description',btrim(coalesce(p_definition->>'description','')),'startDate',starts,'duration',duration,'pace',pace,'reward',btrim(p_definition->>'reward'),'timeZone',tz);
  insert into public.commitments(id,owner_id,definition) values(p_request_id,uid,def) on conflict do nothing;
  if not exists(select 1 from public.commitments where id=p_request_id and owner_id=uid) then raise exception 'Request unavailable'; end if;
  insert into public.attempts(id,commitment_id,owner_id) values(p_request_id,p_request_id,uid) on conflict do nothing;
  select c.definition || jsonb_build_object('id',c.id,'attemptId',a.id,'status',a.status,'createdAt',a.created_at) into existing
    from public.commitments c join public.attempts a on a.commitment_id=c.id where c.id=p_request_id and c.owner_id=uid;
  return existing;
end;
$$;

create function public.lockin_log(p_attempt uuid,p_date date,p_count integer) returns void language plpgsql security definer set search_path = '' as $$
declare def jsonb; tz text; target integer; starts date; finishes date;
begin
  select c.definition into def from public.attempts a join public.commitments c on c.id=a.commitment_id
    where a.id=p_attempt and a.owner_id=auth.uid() and a.status='active' for update of a;
  if def is null then raise exception 'Attempt unavailable'; end if;
  tz:=def->>'timeZone'; starts:=(def->>'startDate')::date; finishes:=starts+(def->>'duration')::integer-1;
  if p_date is null or p_date<starts or p_date>finishes or p_date>(now() at time zone tz)::date
     or clock_timestamp() >= (((p_date+1)::timestamp at time zone tz) + interval '24 hours') then raise exception 'Check-in window closed'; end if;
  if def->'pace'->>'kind'='custom' and not ((def->'pace'->'days') @> jsonb_build_array(extract(isodow from p_date)::integer-1)) then raise exception 'Rest date'; end if;
  target:=case when def->'pace'->>'kind'='daily' then (def->'pace'->>'count')::integer else 1 end;
  if p_count is null or p_count<0 or p_count>target then raise exception 'Invalid count'; end if;
  insert into public.check_ins(attempt_id,owner_id,date,count) values(p_attempt,auth.uid(),p_date,p_count)
    on conflict(attempt_id,date) do update set count=excluded.count,updated_at=clock_timestamp();
end;
$$;

revoke all on function public.lockin_snapshot(), public.lockin_create(uuid,jsonb), public.lockin_log(uuid,date,integer) from public, anon;
grant execute on function public.lockin_snapshot(), public.lockin_create(uuid,jsonb), public.lockin_log(uuid,date,integer) to authenticated;
commit;
