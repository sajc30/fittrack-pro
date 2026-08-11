-- ─────────────────────────────────────────────────────────────────────────────
-- FitTrack Pro — Training context
-- Foundation for last-time suggestions, recent-exercise lists, progression
-- hints, notes, and superset/dropset structure. See docs/feature-plan-2026-08.md.
-- Purely additive: no existing column or policy changes, so released clients
-- keep working untouched.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1) Superset / dropset structure ─────────────────────────────────────────
-- A dropset is a chain of real set rows: the top set is normal, each drop
-- points at it via parent_set_id. Keeping drops as rows means the PR trigger,
-- volume math and every existing aggregation keep working unchanged.
-- A superset is sets across exercises sharing (workout_id, superset_group).

alter table workout_sets
  add column parent_set_id  uuid references workout_sets(id) on delete cascade,
  add column superset_group smallint;

create index on workout_sets (parent_set_id);

comment on column workout_sets.parent_set_id is
  'Set this drop belongs to. Null for a working set — count these for set totals, all rows for volume.';
comment on column workout_sets.superset_group is
  'Sets sharing this value within a workout were performed as one superset.';

-- ─── 2) Movement pattern ─────────────────────────────────────────────────────
-- Better neighbours than muscle_group when estimating a starting load: bench
-- press and cable flyes are both 'chest' but differ 3-4x in working weight.

create type movement_pattern as enum (
  'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull',
  'squat', 'hinge', 'lunge', 'carry', 'isolation', 'core', 'cardio'
);

alter table exercises add column movement_pattern movement_pattern;
create index on exercises (movement_pattern);

comment on column exercises.movement_pattern is
  'Nullable on purpose: seeded by rule below, so unclassified must read as unknown '
  '(callers fall back to muscle_group) rather than as a confident wrong answer.';

-- Rule-based seed. First matching branch wins. Plyometric, sprint and strongman
-- drills deliberately fall through to null — they have no meaningful load
-- comparison to offer.
update exercises set movement_pattern = (case
  when exercise_type = 'cardio' or muscle_group = 'cardio'
    or name ~* '(treadmill|elliptical|stationary|stairmaster|step mill|recumbent|rope jumping|bicycling|skating|trail running)'
    then 'cardio'

  when muscle_group = 'core' then 'core'
  when name ~* '(farmer|yoke walk|suitcase|conan)' then 'carry'

  when muscle_group = 'chest' then case
    when name ~* '(fly|flye|crossover|pec deck|butterfly|pullover|around the world|squeeze|iron cross)' then 'isolation'
    else 'horizontal_push' end

  when muscle_group = 'shoulders' then case
    when name ~* '(raise|fly|flye|rear delt|face pull|shrug|rotation|scaption|upright row|pull-?apart|crucifix|neck resistance)' then 'isolation'
    when name ~* 'row' then 'horizontal_pull'
    else 'vertical_push' end

  when muscle_group = 'back' then case
    when name ~* '(deadlift|good morning|hyper|back extension|rack pull|keg load|atlas stone|sandbag)' then 'hinge'
    when name ~* 'shrug' then 'isolation'
    when name ~* '(pulldown|pull-?up|pullup|chin|muscle up|straight-arm|pull-?over)' then 'vertical_pull'
    else 'horizontal_pull' end

  when muscle_group = 'quadriceps' then case
    when name ~* '(jump|hop|bound|skip|sprint|drag|crawl|carioca|butt kick|stride|leap|shuffle|push-off|yoke)' then null
    when name ~* '(lunge|split squat|step-?up|bulgarian)' then 'lunge'
    when name ~* '(leg extension|adduct|abduct|hip flexion|thigh)' then 'isolation'
    when name ~* 'deadlift' then 'hinge'
    else 'squat' end

  when muscle_group = 'hamstrings' then case
    when name ~* '(jump|hop|bound|skip|sprint|stairs|claw|wall drill|start technique|box)' then null
    when name ~* '(curl|nordic|glute ham raise|slide)' then 'isolation'
    else 'hinge' end

  when muscle_group = 'glutes' then case
    when name ~* '(abduct|adduct|clamshell|monster walk|fire hydrant|donkey kick|kickback|leg lift|balance)' then 'isolation'
    when name ~* '(lunge|step-?back|step-?up)' then 'lunge'
    when name ~* 'squat' then 'squat'
    else 'hinge' end

  when muscle_group = 'triceps' then case
    when name ~* 'dip' then 'horizontal_push'
    else 'isolation' end

  when muscle_group in ('biceps', 'forearms', 'calves') then 'isolation'

  when muscle_group = 'full_body' then case
    when name ~* '(clean|snatch|swing|deadlift)' then 'hinge'
    when name ~* '(thruster|squat)' then 'squat'
    when name ~* '(carry|walk)' then 'carry'
    else null end

  else null
end)::movement_pattern;

-- ─── 3) Target rep range ─────────────────────────────────────────────────────
-- Fallback only. Per-exercise ranges are inferred from median reps once an
-- exercise has enough history, so there is nothing to configure per lift.

alter table profiles
  add column target_rep_min int not null default 8,
  add column target_rep_max int not null default 10,
  add constraint profiles_target_rep_range_valid check (target_rep_min between 1 and 50
                                                    and target_rep_max between target_rep_min and 50);

-- ─── 4) Notes ────────────────────────────────────────────────────────────────
-- Deliberately no schema here. Notes are one free-form entry per workout on the
-- existing workouts.notes column, which already existed with no UI attached.
--
-- An earlier draft of this migration created an exercise_notes table carrying
-- two tiers (a standing note per exercise plus dated per-session observations).
-- It was built, then cut: the standing note is the kind of thing that sounds
-- useful and quietly goes stale, and the split forced a distinction on the user
-- at the moment they just wanted to jot something down. See 005 for the drop.

-- ─── 5) Per user+exercise training context ───────────────────────────────────
-- One read powers the last-time suggestion card, the recent-exercise list, and
-- the progression hints. Only finished sessions count, so the workout in
-- progress never shadows the previous one as "last time".

create or replace view exercise_last_performance
with (security_invoker = true) as
with last_session as (
  select distinct on (ws.user_id, ws.exercise_id)
         ws.user_id, ws.exercise_id, ws.workout_id, w.started_at
    from workout_sets ws
    join workouts w on w.id = ws.workout_id
   where w.finished_at is not null
   order by ws.user_id, ws.exercise_id, w.started_at desc
)
select ls.user_id,
       ls.exercise_id,
       ls.workout_id as last_workout_id,
       ls.started_at as last_performed_at,
       (select jsonb_agg(
                 jsonb_build_object('set_number', s.set_number,
                                    'weight_kg',  s.weight_kg,
                                    'reps',       s.reps,
                                    'set_type',   s.set_type)
                 order by s.set_number)
          from workout_sets s
         where s.workout_id  = ls.workout_id
           and s.exercise_id = ls.exercise_id
           and s.parent_set_id is null) as last_sets
  from last_session ls;

comment on view exercise_last_performance is
  'security_invoker: RLS on workout_sets applies to the caller. If distinct on '
  'over the full set log ever gets slow, convert to an RPC filtered on auth.uid().';

-- ─── 6) Drop the leaky latest_workouts view ──────────────────────────────────
-- Created in 001 without security_invoker and owned by postgres, so it ran with
-- the owner's privileges and bypassed RLS on workouts: any authenticated user
-- could read every user's most recent session via /rest/v1/latest_workouts.
-- Nothing in web or iOS ever queried it.

drop view if exists latest_workouts;
