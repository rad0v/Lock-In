-- LockIn cloud schema for Clerk third-party authentication.
-- Run only after enabling Clerk under Supabase Authentication > Third-Party Auth.
begin;

create table public.commitments (
  id uuid primary key,
  owner_id text not null,
  definition jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (id, owner_id)
);

create table public.attempts (
  id uuid primary key,
  commitment_id uuid not null,
  owner_id text not null,
  state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (commitment_id, owner_id)
    references public.commitments(id, owner_id) on delete cascade,
  unique (id, owner_id)
);

create table public.check_ins (
  attempt_id uuid not null,
  owner_id text not null,
  date date not null,
  count integer not null check (count >= 0),
  outcome text not null check (outcome in ('success', 'missed', 'partial')),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (attempt_id, date),
  foreign key (attempt_id, owner_id)
    references public.attempts(id, owner_id) on delete cascade
);

create index commitments_owner on public.commitments(owner_id);
create index attempts_owner on public.attempts(owner_id);
create index check_ins_owner on public.check_ins(owner_id);

alter table public.commitments enable row level security;
alter table public.attempts enable row level security;
alter table public.check_ins enable row level security;

create policy commitments_owner_only on public.commitments
  for all to authenticated
  using ((select auth.jwt()->>'sub') = owner_id)
  with check ((select auth.jwt()->>'sub') = owner_id);
create policy attempts_owner_only on public.attempts
  for all to authenticated
  using ((select auth.jwt()->>'sub') = owner_id)
  with check ((select auth.jwt()->>'sub') = owner_id);
create policy check_ins_owner_only on public.check_ins
  for all to authenticated
  using ((select auth.jwt()->>'sub') = owner_id)
  with check ((select auth.jwt()->>'sub') = owner_id);

revoke all on public.commitments, public.attempts, public.check_ins from anon, authenticated;

create function public.lockin_owner() returns text
language sql stable security invoker set search_path = '' as $$
  select nullif(auth.jwt()->>'sub', '');
$$;

create function public.lockin_event(p_type text, p_tz text, p_date date default null)
returns jsonb language sql volatile security invoker set search_path = '' as $$
  select jsonb_build_object(
    'type', p_type,
    'at', clock_timestamp(),
    'date', coalesce(p_date, (clock_timestamp() at time zone p_tz)::date)
  );
$$;

create function public.lockin_end_date(p_definition jsonb, p_state jsonb)
returns date language sql immutable security invoker set search_path = '' as $$
  select (p_state->>'startDate')::date
    + (p_definition->>'duration')::integer - 1
    + coalesce((
      select sum(greatest(0, (x->>'end')::date - (x->>'start')::date))::integer
      from jsonb_array_elements(coalesce(p_state->'pauses', '[]'::jsonb)) x
      where x ? 'end'
    ), 0);
$$;

create function public.lockin_paused_on(p_state jsonb, p_date date)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_state->'pauses', '[]'::jsonb)) x
    where p_date >= (x->>'start')::date
      and (not (x ? 'end') or p_date < (x->>'end')::date)
  );
$$;

create function public.lockin_reconcile() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  r record;
  v_state jsonb;
  v_tz text;
  v_kind text;
  v_dates date[];
  v_date date;
  v_end date;
  v_target integer;
  v_count integer;
  v_offset integer;
  v_length integer;
  v_required integer;
  v_satisfied boolean;
  v_changed boolean;
begin
  if v_owner is null then raise exception 'Sign in required'; end if;
  for r in
    select a.id, a.state, c.definition
    from public.attempts a join public.commitments c on c.id = a.commitment_id
    where a.owner_id = v_owner and a.state->>'status' in ('active','paused')
    for update of a
  loop
    v_state := r.state;
    v_tz := r.definition->>'timeZone';
    v_kind := r.definition->'pace'->>'kind';
    v_end := public.lockin_end_date(r.definition, v_state);
    select array_agg(d::date order by d)
      into v_dates
      from pg_catalog.generate_series(
        (v_state->>'startDate')::date::timestamp,
        v_end::timestamp,
        interval '1 day'
      ) d
      where not public.lockin_paused_on(v_state, d::date);
    v_satisfied := true;
    v_changed := false;

    if v_kind = 'weekly' then
      v_offset := 1;
      while v_offset <= coalesce(array_length(v_dates, 1), 0) loop
        v_length := least(7, (r.definition->>'duration')::integer - v_offset + 1);
        if v_length <= 0 or v_offset + v_length - 1 > array_length(v_dates, 1) then
          v_satisfied := false;
          exit;
        end if;
        v_date := v_dates[v_offset + v_length - 1];
        v_required := ceil(
          (r.definition->'pace'->>'count')::numeric * v_length::numeric / 7
        )::integer;
        select count(*)::integer into v_count
        from public.check_ins l
        where l.owner_id = v_owner and l.attempt_id = r.id
          and l.date = any(v_dates[v_offset:v_offset + v_length - 1])
          and l.count >= 1;
        if v_count < v_required then
          v_satisfied := false;
          if clock_timestamp() >= (((v_date + 1)::timestamp at time zone v_tz) + interval '24 hours') then
            v_state := v_state || jsonb_build_object(
              'status','broken','failureDate',v_date,'failureReason','quota'
            );
            v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
              || jsonb_build_array(public.lockin_event('broken',v_tz,v_date)));
            v_changed := true;
            exit;
          end if;
        end if;
        v_offset := v_offset + 7;
      end loop;
    else
      foreach v_date in array coalesce(v_dates, array[]::date[]) loop
        if v_kind = 'custom' and not exists (
          select 1 from jsonb_array_elements_text(r.definition->'pace'->'days') x
          where x::integer = extract(isodow from v_date)::integer - 1
        ) then continue; end if;
        v_target := case when v_kind = 'daily'
          then (r.definition->'pace'->>'count')::integer else 1 end;
        select coalesce(max(l.count),0) into v_count
        from public.check_ins l
        where l.owner_id = v_owner and l.attempt_id = r.id and l.date = v_date;
        if v_count < v_target then
          v_satisfied := false;
          if clock_timestamp() >= (((v_date + 1)::timestamp at time zone v_tz) + interval '24 hours') then
            v_state := v_state || jsonb_build_object(
              'status','broken','failureDate',v_date,'failureReason','missed'
            );
            v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
              || jsonb_build_array(public.lockin_event('broken',v_tz,v_date)));
            v_changed := true;
            exit;
          end if;
        end if;
      end loop;
    end if;

    if not v_changed and v_state->>'status' = 'active'
      and coalesce(array_length(v_dates,1),0) = (r.definition->>'duration')::integer
      and v_satisfied
      and clock_timestamp() >= ((v_end + 1)::timestamp at time zone v_tz)
    then
      v_state := v_state || jsonb_build_object(
        'status','completed','completedAt',clock_timestamp()
      );
      v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
        || jsonb_build_array(public.lockin_event('completed',v_tz,v_end)));
      v_changed := true;
    end if;
    if v_changed then
      update public.attempts set state = v_state
      where id = r.id and owner_id = v_owner;
    end if;
  end loop;
end;
$$;

create function public.lockin_snapshot() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_result jsonb;
begin
  perform public.lockin_reconcile();
  select jsonb_build_object(
    'commitments', coalesce((
      select jsonb_agg(
        c.definition || a.state || jsonb_build_object(
          'id', a.id,
          'attemptId', a.id,
          'commitmentId', a.commitment_id,
          'createdAt', a.created_at
        ) order by a.created_at desc
      )
      from public.attempts a
      join public.commitments c on c.id = a.commitment_id
      where a.owner_id = public.lockin_owner()
    ), '[]'::jsonb),
    'checkIns', coalesce((
      select jsonb_agg(jsonb_build_object(
        'attemptId', l.attempt_id,
        'date', l.date,
        'count', l.count,
        'outcome', l.outcome,
        'updatedAt', l.updated_at
      ) order by l.date)
      from public.check_ins l
      where l.owner_id = public.lockin_owner()
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create function public.lockin_create(p_request_id uuid, p_definition jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_tz text := p_definition->>'timeZone';
  v_start date;
  v_duration integer;
  v_kind text := p_definition->'pace'->>'kind';
  v_target integer;
  v_state jsonb;
  v_created timestamptz;
  v_existing jsonb;
begin
  if v_owner is null then raise exception 'Sign in required'; end if;
  perform public.lockin_reconcile();
  select c.definition || a.state || jsonb_build_object(
    'id', a.id, 'attemptId', a.id, 'commitmentId', a.commitment_id, 'createdAt', a.created_at
  ) into v_existing
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_request_id and a.owner_id = v_owner;
  if v_existing is not null then return v_existing; end if;

  if v_tz is null or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_tz
  ) then raise exception 'Invalid time zone'; end if;
  begin
    v_start := (p_definition->>'startDate')::date;
    v_duration := (p_definition->>'duration')::integer;
  exception when others then raise exception 'Invalid dates'; end;
  if p_definition->>'path' not in ('build', 'quit')
    or coalesce(length(btrim(p_definition->>'name')), 0) not between 1 and 80
    or coalesce(length(p_definition->>'description'), 0) > 300
    or coalesce(length(btrim(p_definition->>'reward')), 0) not between 1 and 120
    or v_start < (clock_timestamp() at time zone v_tz)::date
    or v_duration not between 1 and 365
    or v_kind not in ('daily', 'weekly', 'custom')
  then raise exception 'Invalid commitment'; end if;
  if v_kind in ('daily', 'weekly') then
    v_target := (p_definition->'pace'->>'count')::integer;
    if v_target < 1
      or (v_kind = 'weekly' and v_target > 7)
      or (v_kind = 'daily' and v_target > 99)
    then raise exception 'Invalid pace'; end if;
  elsif jsonb_array_length(coalesce(p_definition->'pace'->'days', '[]'::jsonb)) = 0
    then raise exception 'Invalid pace';
  end if;

  v_created := clock_timestamp();
  v_state := jsonb_build_object(
    'startDate', v_start,
    'status', 'active',
    'pauses', '[]'::jsonb,
    'events', jsonb_build_array(public.lockin_event('locked', v_tz, v_start))
  );
  insert into public.commitments(id, owner_id, definition, created_at)
    values (p_request_id, v_owner, p_definition - 'timeZone' || jsonb_build_object('timeZone', v_tz), v_created);
  insert into public.attempts(id, commitment_id, owner_id, state, created_at)
    values (p_request_id, p_request_id, v_owner, v_state, v_created);
  return p_definition || v_state || jsonb_build_object(
    'id', p_request_id, 'attemptId', p_request_id,
    'commitmentId', p_request_id, 'createdAt', v_created
  );
end;
$$;

create function public.lockin_log(p_attempt uuid, p_date date, p_count integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_def jsonb;
  v_state jsonb;
  v_tz text;
  v_target integer;
  v_kind text;
begin
  if v_owner is null then raise exception 'Sign in required'; end if;
  perform public.lockin_reconcile();
  select c.definition, a.state into v_def, v_state
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_attempt and a.owner_id = v_owner for update of a;
  if v_def is null or v_state->>'status' not in ('active', 'paused')
    then raise exception 'Attempt unavailable'; end if;
  v_tz := v_def->>'timeZone';
  v_kind := v_def->'pace'->>'kind';
  v_target := case when v_kind = 'daily' then (v_def->'pace'->>'count')::integer else 1 end;
  if p_date < (v_state->>'startDate')::date
    or p_date > public.lockin_end_date(v_def, v_state)
    or public.lockin_paused_on(v_state, p_date)
    or p_date > (clock_timestamp() at time zone v_tz)::date
    or clock_timestamp() >= (((p_date + 1)::timestamp at time zone v_tz) + interval '24 hours')
    or p_count < 0 or p_count > v_target
  then raise exception 'Check-in unavailable'; end if;
  if v_kind = 'custom' and not exists (
    select 1 from jsonb_array_elements_text(v_def->'pace'->'days') x
    where x::integer = extract(isodow from p_date)::integer - 1
  ) then raise exception 'Rest date'; end if;
  insert into public.check_ins(attempt_id, owner_id, date, count, outcome)
    values (p_attempt, v_owner, p_date, p_count,
      case when p_count >= v_target then 'success' else 'partial' end)
  on conflict (attempt_id, date) do update
    set count = excluded.count, outcome = excluded.outcome, updated_at = clock_timestamp();
end;
$$;

create function public.lockin_pause(p_attempt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_def jsonb;
  v_state jsonb;
  v_today date;
begin
  perform public.lockin_reconcile();
  select c.definition, a.state into v_def, v_state
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_attempt and a.owner_id = v_owner for update of a;
  if v_def is null then raise exception 'Attempt unavailable'; end if;
  v_today := (clock_timestamp() at time zone (v_def->>'timeZone'))::date;
  if v_state->>'status' <> 'active' or v_today < (v_state->>'startDate')::date
    or v_today >= public.lockin_end_date(v_def, v_state)
  then raise exception 'Attempt cannot be paused'; end if;
  v_state := jsonb_set(v_state, '{status}', '"paused"'::jsonb);
  v_state := jsonb_set(v_state, '{pauses}', coalesce(v_state->'pauses','[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('start', v_today + 1)));
  v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
    || jsonb_build_array(public.lockin_event('paused', v_def->>'timeZone', v_today)));
  update public.attempts set state = v_state where id = p_attempt and owner_id = v_owner;
end;
$$;

create function public.lockin_resume(p_attempt uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_def jsonb;
  v_state jsonb;
  v_today date;
  v_pauses jsonb;
begin
  perform public.lockin_reconcile();
  select c.definition, a.state into v_def, v_state
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_attempt and a.owner_id = v_owner for update of a;
  if v_def is null or v_state->>'status' <> 'paused' then raise exception 'Attempt cannot be resumed'; end if;
  v_today := (clock_timestamp() at time zone (v_def->>'timeZone'))::date;
  select jsonb_agg(case when not (x ? 'end')
    then x || jsonb_build_object('end', greatest(v_today, (x->>'start')::date))
    else x end order by n)
  into v_pauses
  from jsonb_array_elements(coalesce(v_state->'pauses','[]'::jsonb)) with ordinality q(x,n);
  if v_pauses is null then raise exception 'Pause interval missing'; end if;
  v_state := jsonb_set(v_state, '{status}', '"active"'::jsonb);
  v_state := jsonb_set(v_state, '{pauses}', v_pauses);
  v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
    || jsonb_build_array(public.lockin_event('resumed', v_def->>'timeZone', v_today)));
  update public.attempts set state = v_state where id = p_attempt and owner_id = v_owner;
end;
$$;

create function public.lockin_fail(p_attempt uuid, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_def jsonb;
  v_state jsonb;
  v_tz text;
begin
  perform public.lockin_reconcile();
  select c.definition, a.state into v_def, v_state
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_attempt and a.owner_id = v_owner for update of a;
  if v_def is null then raise exception 'Attempt unavailable'; end if;
  v_tz := v_def->>'timeZone';
  if v_state->>'status' not in ('active','paused')
    or p_date < (v_state->>'startDate')::date
    or p_date > public.lockin_end_date(v_def, v_state)
    or public.lockin_paused_on(v_state, p_date)
    or p_date > (clock_timestamp() at time zone v_tz)::date
    or clock_timestamp() >= (((p_date + 1)::timestamp at time zone v_tz) + interval '24 hours')
  then raise exception 'Failure date unavailable'; end if;
  insert into public.check_ins(attempt_id, owner_id, date, count, outcome)
    values (p_attempt, v_owner, p_date, 0, 'missed')
  on conflict (attempt_id, date) do update
    set count = 0, outcome = 'missed', updated_at = clock_timestamp();
  if v_def->'pace'->>'kind' <> 'weekly' then
    v_state := v_state || jsonb_build_object(
      'status','broken','failureDate',p_date,'failureReason','explicit'
    );
    v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
      || jsonb_build_array(public.lockin_event('broken', v_tz, p_date)));
    update public.attempts set state = v_state where id = p_attempt and owner_id = v_owner;
  end if;
end;
$$;

create function public.lockin_restart(
  p_attempt uuid, p_request_id uuid, p_reason text, p_note text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_owner text := public.lockin_owner();
  v_def jsonb;
  v_state jsonb;
  v_root uuid;
  v_tz text;
  v_today date;
  v_created timestamptz := clock_timestamp();
  v_next jsonb;
  v_existing jsonb;
begin
  perform public.lockin_reconcile();
  select c.definition, a.state, a.commitment_id into v_def, v_state, v_root
  from public.attempts a join public.commitments c on c.id = a.commitment_id
  where a.id = p_attempt and a.owner_id = v_owner for update of a;
  if v_def is null then raise exception 'Attempt unavailable'; end if;
  if v_state ? 'restartedBy' then
    select c.definition || a.state || jsonb_build_object(
      'id',a.id,'attemptId',a.id,'commitmentId',a.commitment_id,'createdAt',a.created_at
    ) into v_existing
    from public.attempts a join public.commitments c on c.id = a.commitment_id
    where a.id = (v_state->>'restartedBy')::uuid and a.owner_id = v_owner;
    return v_existing;
  end if;
  if v_state->>'status' <> 'broken' then raise exception 'Only broken attempts can restart'; end if;
  if length(coalesce(p_reason,'')) > 80 or length(coalesce(p_note,'')) > 500
    then raise exception 'Reflection is too long'; end if;
  if exists (select 1 from public.attempts where id = p_request_id)
    then raise exception 'Request ID already used'; end if;
  v_tz := v_def->>'timeZone';
  v_today := (v_created at time zone v_tz)::date;
  v_next := jsonb_build_object(
    'startDate',v_today,'status','active','previousAttemptId',p_attempt,
    'pauses','[]'::jsonb,
    'events',jsonb_build_array(public.lockin_event('locked',v_tz,v_today))
  );
  v_state := v_state || jsonb_build_object(
    'restartedBy',p_request_id,
    'reflection',jsonb_build_object(
      'reason',btrim(coalesce(p_reason,'')),
      'note',btrim(coalesce(p_note,'')),
      'savedAt',v_created
    )
  );
  v_state := jsonb_set(v_state, '{events}', coalesce(v_state->'events','[]'::jsonb)
    || jsonb_build_array(public.lockin_event('restarted',v_tz,v_today)));
  update public.attempts set state = v_state where id = p_attempt and owner_id = v_owner;
  insert into public.attempts(id, commitment_id, owner_id, state, created_at)
    values (p_request_id, v_root, v_owner, v_next, v_created);
  return v_def || v_next || jsonb_build_object(
    'id',p_request_id,'attemptId',p_request_id,
    'commitmentId',v_root,'createdAt',v_created
  );
end;
$$;

revoke all on function public.lockin_owner(), public.lockin_event(text,text,date),
  public.lockin_end_date(jsonb,jsonb), public.lockin_paused_on(jsonb,date),
  public.lockin_reconcile(),
  public.lockin_snapshot(), public.lockin_create(uuid,jsonb),
  public.lockin_log(uuid,date,integer), public.lockin_pause(uuid),
  public.lockin_resume(uuid), public.lockin_fail(uuid,date),
  public.lockin_restart(uuid,uuid,text,text) from public, anon;

grant execute on function public.lockin_snapshot(), public.lockin_create(uuid,jsonb),
  public.lockin_log(uuid,date,integer), public.lockin_pause(uuid),
  public.lockin_resume(uuid), public.lockin_fail(uuid,date),
  public.lockin_restart(uuid,uuid,text,text) to authenticated;

commit;
