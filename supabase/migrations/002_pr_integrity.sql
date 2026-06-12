-- ─────────────────────────────────────────────────────────────────────────────
-- FitTrack Pro — PR integrity
-- Personal records are now maintained by the database via triggers, not the
-- client. Any insert/update/delete of a workout set (including cascades from
-- workout deletes) recalculates the affected exercise's PR transactionally.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1) Ownership on the set row ─────────────────────────────────────────────
-- Needed so cascaded deletes can still resolve the owner (the parent workout
-- row is already gone when child triggers fire), and it makes RLS a direct
-- column check instead of a join.

alter table workout_sets
  add column user_id uuid references auth.users(id) on delete cascade;

update workout_sets ws
   set user_id = w.user_id
  from workouts w
 where w.id = ws.workout_id;

alter table workout_sets alter column user_id set not null;

create index on workout_sets (user_id, exercise_id);

-- Always derive user_id from the parent workout — clients cannot spoof it.
create or replace function public.set_workout_set_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  select w.user_id into new.user_id from workouts w where w.id = new.workout_id;
  return new;
end;
$$;

create trigger workout_sets_set_owner
  before insert or update of workout_id on workout_sets
  for each row execute procedure set_workout_set_owner();

-- ─── 2) Simpler, faster RLS ──────────────────────────────────────────────────

drop policy "Users manage own sets" on workout_sets;
create policy "Users manage own sets" on workout_sets
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── 3) Recalculate one user+exercise PR from the sets that remain ──────────
-- Epley estimate matches packages/shared estimateOneRepMax: weight for a
-- single, otherwise round(weight × (1 + reps/30)).

create or replace function public.recalc_personal_record(p_user uuid, p_exercise uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  best record;
begin
  select ws.weight_kg,
         ws.reps,
         ws.logged_at,
         (case when ws.reps = 1 then ws.weight_kg
               else round(ws.weight_kg * (1 + ws.reps / 30.0)) end) as e1rm
    into best
    from workout_sets ws
   where ws.user_id = p_user
     and ws.exercise_id = p_exercise
     and ws.weight_kg is not null
     and ws.reps is not null
     and ws.reps > 0
   order by e1rm desc, ws.logged_at asc
   limit 1;

  if best is null then
    delete from personal_records
     where user_id = p_user and exercise_id = p_exercise;
  else
    insert into personal_records
      (user_id, exercise_id, weight_kg, reps, estimated_one_rep_max, achieved_at)
    values
      (p_user, p_exercise, best.weight_kg, best.reps, best.e1rm, best.logged_at)
    on conflict (user_id, exercise_id) do update
      set weight_kg             = excluded.weight_kg,
          reps                  = excluded.reps,
          estimated_one_rep_max = excluded.estimated_one_rep_max,
          achieved_at           = excluded.achieved_at;
  end if;
end;
$$;

-- ─── 4) Keep PRs in sync on every set change ─────────────────────────────────

create or replace function public.handle_workout_set_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform recalc_personal_record(old.user_id, old.exercise_id);
    return old;
  end if;
  perform recalc_personal_record(new.user_id, new.exercise_id);
  if tg_op = 'UPDATE' and old.exercise_id <> new.exercise_id then
    perform recalc_personal_record(old.user_id, old.exercise_id);
  end if;
  return new;
end;
$$;

create trigger workout_sets_recalc_pr
  after insert or update of weight_kg, reps, exercise_id or delete on workout_sets
  for each row execute procedure handle_workout_set_change();

-- ─── 5) Hygiene — these run via triggers, never directly from clients ───────

revoke execute on function public.recalc_personal_record(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.handle_workout_set_change() from public, anon, authenticated;
revoke execute on function public.set_workout_set_owner() from public, anon, authenticated;
