-- CoachSheet schema
create extension if not exists pgcrypto;

create table if not exists coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  name text not null,
  email text,
  notes text default '',
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  unit text not null default 'kg' check (unit in ('kg','lb')),
  rest_seconds int not null default 90,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists clients_coach_idx on clients(coach_id);

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null default 'Program',
  source_filename text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists programs_client_idx on programs(client_id);

create table if not exists program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  position int not null,
  name text not null,
  is_rest boolean not null default false
);
create index if not exists program_days_program_idx on program_days(program_id);

create table if not exists program_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references program_days(id) on delete cascade,
  position int not null,
  name text not null,
  sets int not null default 1,
  reps text not null default '',
  notes text not null default '',
  optional boolean not null default false,
  video_id text
);
create index if not exists program_exercises_day_idx on program_exercises(day_id);

-- global video cache: normalized exercise key -> youtube id (coach overrides stored with coach_id)
create table if not exists exercise_videos (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  name text not null,
  video_id text not null,
  title text,
  source text not null default 'coach',
  coach_id uuid references coaches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (key, coach_id)
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  day_id uuid references program_days(id) on delete set null,
  day_name text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  duration_min int not null default 0,
  notes text default ''
);
create index if not exists sessions_client_idx on workout_sessions(client_id, finished_at desc);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid references program_exercises(id) on delete set null,
  exercise_name text not null,
  set_index int not null,
  weight numeric,
  reps int,
  extra text,
  done boolean not null default true
);
create index if not exists sets_session_idx on workout_sets(session_id);

-- auto-create coach profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into coaches (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'name',''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- RLS
alter table coaches enable row level security;
alter table clients enable row level security;
alter table programs enable row level security;
alter table program_days enable row level security;
alter table program_exercises enable row level security;
alter table exercise_videos enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;

drop policy if exists coaches_self on coaches;
create policy coaches_self on coaches for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists clients_owner on clients;
create policy clients_owner on clients for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists programs_owner on programs;
create policy programs_owner on programs for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists days_owner on program_days;
create policy days_owner on program_days for all
  using (exists (select 1 from programs p where p.id = program_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from programs p where p.id = program_id and p.coach_id = auth.uid()));
drop policy if exists exercises_owner on program_exercises;
create policy exercises_owner on program_exercises for all
  using (exists (select 1 from program_days d join programs p on p.id = d.program_id where d.id = day_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from program_days d join programs p on p.id = d.program_id where d.id = day_id and p.coach_id = auth.uid()));
drop policy if exists videos_read on exercise_videos;
create policy videos_read on exercise_videos for select using (coach_id is null or coach_id = auth.uid());
drop policy if exists videos_write on exercise_videos;
create policy videos_write on exercise_videos for insert with check (coach_id = auth.uid());
drop policy if exists videos_update on exercise_videos;
create policy videos_update on exercise_videos for update using (coach_id = auth.uid());
drop policy if exists videos_delete on exercise_videos;
create policy videos_delete on exercise_videos for delete using (coach_id = auth.uid());
drop policy if exists sessions_owner_read on workout_sessions;
create policy sessions_owner_read on workout_sessions for select
  using (exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid()));
drop policy if exists sessions_owner_delete on workout_sessions;
create policy sessions_owner_delete on workout_sessions for delete
  using (exists (select 1 from clients c where c.id = client_id and c.coach_id = auth.uid()));
drop policy if exists sets_owner_read on workout_sets;
create policy sets_owner_read on workout_sets for select
  using (exists (select 1 from workout_sessions s join clients c on c.id = s.client_id where s.id = session_id and c.coach_id = auth.uid()));

-- ===== Client portal (no login; access by secret token) =====
create or replace function client_portal(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_client clients; v_result jsonb;
begin
  select * into v_client from clients where token = p_token and archived = false;
  if not found then return null; end if;
  select jsonb_build_object(
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.name, 'unit', v_client.unit, 'rest_seconds', v_client.rest_seconds),
    'coach', (select jsonb_build_object('name', name) from coaches where id = v_client.coach_id),
    'program', (
      select jsonb_build_object('id', p.id, 'name', p.name, 'days', (
        select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'is_rest', d.is_rest, 'position', d.position, 'exercises', (
          select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'sets', e.sets, 'reps', e.reps, 'notes', e.notes, 'optional', e.optional, 'video_id', e.video_id, 'position', e.position) order by e.position), '[]'::jsonb)
          from program_exercises e where e.day_id = d.id
        )) order by d.position), '[]'::jsonb)
        from program_days d where d.program_id = p.id
      ))
      from programs p where p.client_id = v_client.id and p.is_active order by created_at desc limit 1
    ),
    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'day_id', s.day_id, 'day_name', s.day_name, 'started_at', s.started_at, 'finished_at', s.finished_at, 'duration_min', s.duration_min, 'sets', (
        select coalesce(jsonb_agg(jsonb_build_object('exercise_id', w.exercise_id, 'exercise_name', w.exercise_name, 'set_index', w.set_index, 'weight', w.weight, 'reps', w.reps, 'extra', w.extra, 'done', w.done) order by w.set_index), '[]'::jsonb)
        from workout_sets w where w.session_id = s.id
      )) order by s.finished_at desc), '[]'::jsonb)
      from (select * from workout_sessions where client_id = v_client.id order by finished_at desc limit 200) s
    )
  ) into v_result;
  return v_result;
end $$;

create or replace function client_save_session(p_token text, p_session jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_client clients; v_id uuid; s jsonb;
begin
  select * into v_client from clients where token = p_token and archived = false;
  if not found then raise exception 'invalid token'; end if;
  insert into workout_sessions (client_id, day_id, day_name, started_at, finished_at, duration_min, notes)
  values (v_client.id, nullif(p_session->>'day_id','')::uuid, coalesce(p_session->>'day_name',''),
          coalesce((p_session->>'started_at')::timestamptz, now()), now(),
          coalesce((p_session->>'duration_min')::int, 0), coalesce(p_session->>'notes',''))
  returning id into v_id;
  for s in select * from jsonb_array_elements(coalesce(p_session->'sets','[]'::jsonb)) loop
    insert into workout_sets (session_id, exercise_id, exercise_name, set_index, weight, reps, extra, done)
    values (v_id, nullif(s->>'exercise_id','')::uuid, coalesce(s->>'exercise_name',''), coalesce((s->>'set_index')::int,0),
            nullif(s->>'weight','')::numeric, nullif(s->>'reps','')::int, nullif(s->>'extra',''), coalesce((s->>'done')::boolean, true));
  end loop;
  return v_id;
end $$;

create or replace function client_delete_session(p_token text, p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from workout_sessions s using clients c
  where s.id = p_session_id and s.client_id = c.id and c.token = p_token;
end $$;

create or replace function client_update_settings(p_token text, p_unit text, p_rest int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update clients set unit = coalesce(p_unit, unit), rest_seconds = coalesce(p_rest, rest_seconds) where token = p_token;
end $$;

grant execute on function client_portal(text) to anon, authenticated;
grant execute on function client_save_session(text, jsonb) to anon, authenticated;
grant execute on function client_delete_session(text, uuid) to anon, authenticated;
grant execute on function client_update_settings(text, text, int) to anon, authenticated;
