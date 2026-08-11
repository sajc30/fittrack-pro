-- ─────────────────────────────────────────────────────────────────────────────
-- Drop exercise_notes
--
-- 004 shipped a two-tier per-exercise notes table: workout_id null meant a
-- standing note shown every time you picked the exercise, workout_id set meant
-- a dated observation. It was replaced by a single free-form note per workout
-- on the existing workouts.notes column.
--
-- 004 no longer creates this table, so a database built from scratch never sees
-- it. This migration exists for the one database that already applied 004.
-- ─────────────────────────────────────────────────────────────────────────────

drop table if exists exercise_notes;
