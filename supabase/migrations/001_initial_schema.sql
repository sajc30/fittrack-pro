-- ─────────────────────────────────────────────────────────────────────────────
-- FitTrack Pro — Initial Schema
-- Run this in your Supabase SQL editor to set up the full database.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type activity_level as enum (
  'sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'
);

create type fitness_goal as enum (
  'lose_fat', 'maintain', 'build_muscle', 'strength'
);

create type gender_type as enum ('male', 'female');

create type muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio'
);

create type exercise_type as enum ('strength', 'cardio', 'bodyweight', 'olympic');

create type equipment_type as enum (
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'bands', 'other'
);

create type set_type as enum ('normal', 'warmup', 'dropset', 'failure', 'superset');

create type goal_type as enum (
  'weight_target', 'lift_target', 'body_fat_target', 'workout_frequency'
);

-- ─── Profiles ────────────────────────────────────────────────────────────────

create table profiles (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null default '',
  avatar_url        text,
  date_of_birth     date,
  gender            gender_type,
  height_cm         numeric(5,1),
  weight_kg         numeric(5,1),
  activity_level    activity_level not null default 'moderately_active',
  goal              fitness_goal not null default 'build_muscle',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(user_id)
);

alter table profiles enable row level security;
create policy "Users can view own profile"  on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Exercises ───────────────────────────────────────────────────────────────

create table exercises (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  muscle_group      muscle_group not null,
  secondary_muscles muscle_group[] not null default '{}',
  equipment         equipment_type not null default 'barbell',
  exercise_type     exercise_type not null default 'strength',
  description       text,
  instructions      text[] not null default '{}',
  image_url         text,
  video_url         text,
  is_custom         boolean not null default false,
  user_id           uuid references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now()
);

-- Public exercises visible to all; custom exercises visible to creator only
alter table exercises enable row level security;
create policy "Public exercises visible to all" on exercises
  for select using (is_custom = false or auth.uid() = user_id);
create policy "Users can create custom exercises" on exercises
  for insert with check (auth.uid() = user_id and is_custom = true);
create policy "Users can update own custom exercises" on exercises
  for update using (auth.uid() = user_id and is_custom = true);
create policy "Users can delete own custom exercises" on exercises
  for delete using (auth.uid() = user_id and is_custom = true);

-- ─── Workout Templates ───────────────────────────────────────────────────────

create table workout_templates (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table workout_templates enable row level security;
create policy "Users manage own templates" on workout_templates
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table template_exercises (
  id                uuid primary key default uuid_generate_v4(),
  template_id       uuid not null references workout_templates(id) on delete cascade,
  exercise_id       uuid not null references exercises(id) on delete cascade,
  "order"           int not null default 0,
  default_sets      int not null default 3,
  default_reps      int,
  default_weight_kg numeric(6,2)
);

alter table template_exercises enable row level security;
create policy "Users manage own template exercises" on template_exercises
  using (
    exists (
      select 1 from workout_templates t
      where t.id = template_exercises.template_id and t.user_id = auth.uid()
    )
  );

-- ─── Workouts ────────────────────────────────────────────────────────────────

create table workouts (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  notes            text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  duration_minutes int,
  template_id      uuid references workout_templates(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table workouts enable row level security;
create policy "Users manage own workouts" on workouts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Workout Sets ────────────────────────────────────────────────────────────

create table workout_sets (
  id                  uuid primary key default uuid_generate_v4(),
  workout_id          uuid not null references workouts(id) on delete cascade,
  exercise_id         uuid not null references exercises(id),
  set_number          int not null,
  reps                int,
  weight_kg           numeric(6,2),
  duration_seconds    int,
  distance_meters     numeric(8,2),
  rpe                 int check (rpe between 6 and 20),
  set_type            set_type not null default 'normal',
  is_pr               boolean not null default false,
  notes               text,
  logged_at           timestamptz not null default now()
);

alter table workout_sets enable row level security;
create policy "Users manage own sets" on workout_sets
  using (
    exists (
      select 1 from workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

-- ─── Personal Records ────────────────────────────────────────────────────────

create table personal_records (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  exercise_id             uuid not null references exercises(id) on delete cascade,
  weight_kg               numeric(6,2) not null,
  reps                    int not null,
  estimated_one_rep_max   numeric(6,2) not null,
  achieved_at             timestamptz not null,
  created_at              timestamptz not null default now(),
  unique(user_id, exercise_id)
);

alter table personal_records enable row level security;
create policy "Users manage own PRs" on personal_records
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Body Measurements ───────────────────────────────────────────────────────

create table body_measurements (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  measured_at  timestamptz not null default now(),
  weight_kg    numeric(5,1),
  body_fat_pct numeric(4,1),
  chest_cm     numeric(5,1),
  waist_cm     numeric(5,1),
  hips_cm      numeric(5,1),
  bicep_cm     numeric(5,1),
  thigh_cm     numeric(5,1),
  notes        text,
  created_at   timestamptz not null default now()
);

alter table body_measurements enable row level security;
create policy "Users manage own measurements" on body_measurements
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Goals ───────────────────────────────────────────────────────────────────

create table goals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          goal_type not null,
  title         text not null,
  target_value  numeric not null,
  current_value numeric,
  unit          text not null,
  deadline      date,
  completed     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table goals enable row level security;
create policy "Users manage own goals" on goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Helpful views ───────────────────────────────────────────────────────────

-- Most recent workout per user
create view latest_workouts as
  select distinct on (user_id) *
  from workouts
  order by user_id, started_at desc;

-- ─── Indexes for performance ─────────────────────────────────────────────────

create index on workouts (user_id, started_at desc);
create index on workout_sets (workout_id);
create index on workout_sets (exercise_id);
create index on personal_records (user_id, exercise_id);
create index on body_measurements (user_id, measured_at desc);
create index on exercises (muscle_group);
create index on exercises (is_custom, user_id);
