"use client";

import { useMemo } from "react";
import { useWorkouts } from "@/lib/hooks/use-workouts";
import { useProfile } from "@/lib/hooks/use-profile";
import { subDays } from "date-fns";
import { BODY_FRONT_M, BODY_BACK_M, BODY_FRONT_F, BODY_BACK_F } from "./muscle-map-paths";

// ── Muscle group → slug(s) to hatch ─────────────────────────────────────────
// Slug names match MuscleMapJS exactly. Sub-groups (upper-chest etc.) render
// as silhouette anatomy lines but are not hatched separately.

const MG_FRONT: Record<string, string[]> = {
  chest:      ["chest"],
  shoulders:  ["deltoids"],
  biceps:     ["biceps"],
  forearms:   ["forearm"],
  core:       ["abs", "obliques"],
  quadriceps: ["quadriceps"],
  calves:     ["calves"],
  full_body:  ["chest","deltoids","biceps","forearm","abs","obliques","quadriceps","calves"],
};

const MG_BACK: Record<string, string[]> = {
  back:       ["upper-back", "lower-back"],
  shoulders:  ["deltoids", "trapezius"],
  triceps:    ["triceps"],
  forearms:   ["forearm"],
  hamstrings: ["hamstring"],
  glutes:     ["gluteal"],
  calves:     ["calves"],
  full_body:  ["upper-back","lower-back","deltoids","trapezius","triceps","gluteal","hamstring","calves"],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function regionSetsMap(
  mapping: Record<string, string[]>,
  perMuscle: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [mg, slugs] of Object.entries(mapping)) {
    const n = perMuscle[mg] ?? 0;
    for (const slug of slugs) out[slug] = Math.max(out[slug] ?? 0, n);
  }
  return out;
}

function hatchId(sets: number): string {
  if (sets <= 2)  return "url(#bh1)";
  if (sets <= 4)  return "url(#bh2)";
  if (sets <= 7)  return "url(#bh3)";
  return "url(#bh4)";
}

// ── SVG figure ───────────────────────────────────────────────────────────────

interface FigureProps {
  paths: Record<string, string[]>;
  regionSets: Record<string, number>;
  label: string;
}

function Figure({ paths, regionSets, label }: FigureProps) {
  const entries = Object.entries(paths);
  return (
    <>
      {/* Pass 1 — full body silhouette (all slugs, dim outline) */}
      {entries.flatMap(([slug, pathList]) =>
        pathList.map((d, i) => (
          <path
            key={`s-${slug}-${i}`}
            d={d}
            fill="none"
            stroke="var(--color-line-bright)"
            strokeWidth={0.5}
          />
        ))
      )}
      {/* Pass 2 — active muscle slugs with hatching rendered on top */}
      {entries.flatMap(([slug, pathList]) => {
        const sets = regionSets[slug] ?? 0;
        if (sets === 0) return [];
        return pathList.map((d, i) => (
          <path
            key={`h-${slug}-${i}`}
            d={d}
            fill={hatchId(sets)}
            stroke="var(--color-paper)"
            strokeWidth={0.85}
          />
        ));
      })}
      <text
        x={60} y={282}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={8}
        letterSpacing="0.12em"
        fill="var(--color-text-ghost)"
      >
        {label}
      </text>
    </>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND: { key: string; label: string }[] = [
  { key: "chest",      label: "CHEST" },
  { key: "back",       label: "BACK" },
  { key: "shoulders",  label: "DELTS" },
  { key: "biceps",     label: "BICEPS" },
  { key: "triceps",    label: "TRICEPS" },
  { key: "core",       label: "CORE" },
  { key: "quadriceps", label: "QUADS" },
  { key: "hamstrings", label: "HAMS" },
  { key: "glutes",     label: "GLUTES" },
  { key: "calves",     label: "CALVES" },
  { key: "forearms",   label: "FOREARMS" },
  { key: "full_body",  label: "FULL BODY" },
];

// ── Main export ───────────────────────────────────────────────────────────────

export function MuscleMapCard() {
  const { data: workouts } = useWorkouts();
  const { data: profile } = useProfile();

  const gender: "male" | "female" = (profile?.gender as "male" | "female" | null | undefined) ?? "male";

  const frontPaths = gender === "female" ? BODY_FRONT_F : BODY_FRONT_M;
  const backPaths  = gender === "female" ? BODY_BACK_F  : BODY_BACK_M;

  const setsPerMuscle = useMemo<Record<string, number>>(() => {
    const cutoff = subDays(new Date(), 7);
    const result: Record<string, number> = {};
    for (const w of workouts ?? []) {
      if (new Date(w.started_at) < cutoff) continue;
      for (const s of w.workout_sets ?? []) {
        const mg = s.exercises?.muscle_group as string | undefined;
        if (mg) result[mg] = (result[mg] ?? 0) + 1;
      }
    }
    return result;
  }, [workouts]);

  const frontSets = useMemo(() => regionSetsMap(MG_FRONT, setsPerMuscle), [setsPerMuscle]);
  const backSets  = useMemo(() => regionSetsMap(MG_BACK,  setsPerMuscle), [setsPerMuscle]);

  const hasActivity = Object.values(setsPerMuscle).some((n) => n > 0);

  return (
    <div className="sheet p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-y-3 mb-3">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <p className="fig-label">Fig. 3 — Muscle activity map</p>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.1em",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-line)",
                borderRadius: 2,
                padding: "1px 6px",
                lineHeight: 1.6,
              }}
            >
              {gender === "male" ? "♂ M" : "♀ F"}
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--color-text-ghost)" }}>
            SETS PER GROUP · PAST 7 DAYS
          </p>
        </div>
        {/* Intensity scale key */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexShrink: 0 }}>
          {[
            { label: "0 SETS",  id: null },
            { label: "1–2",     id: "bh1" },
            { label: "3–4",     id: "bh2" },
            { label: "5–7",     id: "bh3" },
            { label: "8+",      id: "bh4" },
          ].map(({ label, id }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                {id && (
                  <defs>
                    <pattern
                      id={`key-${id}`}
                      width={id === "bh1" ? 7 : id === "bh2" ? 5 : id === "bh3" ? 3.5 : 2.5}
                      height={id === "bh1" ? 7 : id === "bh2" ? 5 : id === "bh3" ? 3.5 : 2.5}
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(-45 0 0)"
                    >
                      <line x1="0" y1="0" x2="0"
                        y2={id === "bh1" ? 7 : id === "bh2" ? 5 : id === "bh3" ? 3.5 : 2.5}
                        stroke="var(--color-paper)"
                        strokeWidth={1.2}
                        strokeOpacity={id === "bh1" ? 0.35 : id === "bh2" ? 0.55 : id === "bh3" ? 0.75 : 0.92}
                      />
                    </pattern>
                  </defs>
                )}
                <rect
                  x={0} y={0} width={16} height={16}
                  fill={id ? `url(#key-${id})` : "none"}
                  stroke="var(--color-line-bright)"
                  strokeWidth={0.75}
                />
              </svg>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--color-text-ghost)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t mb-4" style={{ borderColor: "var(--color-line)" }} />

      {!hasActivity && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-text-ghost)", marginBottom: 16, textAlign: "center" }}>
          LOG A SESSION THIS WEEK TO SEE YOUR MAP
        </p>
      )}

      {/* Body SVG */}
      <div className="flex justify-center">
        <svg
          viewBox="0 0 280 290"
          style={{ width: "100%", maxWidth: 400, height: "auto" }}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {[
              { id: "bh1", spacing: 7,   opacity: 0.35 },
              { id: "bh2", spacing: 5,   opacity: 0.55 },
              { id: "bh3", spacing: 3.5, opacity: 0.75 },
              { id: "bh4", spacing: 2.5, opacity: 0.92 },
            ].map(({ id, spacing, opacity }) => (
              <pattern
                key={id}
                id={id}
                width={spacing}
                height={spacing}
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-45 0 0)"
              >
                <line
                  x1="0" y1="0" x2="0" y2={spacing}
                  stroke="var(--color-paper)"
                  strokeWidth={1.2}
                  strokeOpacity={opacity}
                />
              </pattern>
            ))}
          </defs>

          {/* Divider */}
          <line
            x1={140} y1={4} x2={140} y2={276}
            stroke="var(--color-line)"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />

          {/* Front figure */}
          <g transform="translate(4,4)">
            <Figure paths={frontPaths} regionSets={frontSets} label="FRONT" />
          </g>

          {/* Back figure */}
          <g transform="translate(152,4)">
            <Figure paths={backPaths} regionSets={backSets} label="BACK" />
          </g>
        </svg>
      </div>

      {/* Legend chips */}
      <div className="border-t mt-2 pt-3 flex flex-wrap gap-1.5" style={{ borderColor: "var(--color-line)" }}>
        {LEGEND.map(({ key, label }) => {
          const sets = setsPerMuscle[key] ?? 0;
          if (key === "full_body" && sets === 0) return null;
          return (
            <div
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                border: `1px solid ${sets > 0 ? "var(--color-line-bright)" : "var(--color-line)"}`,
                borderRadius: 2,
                opacity: sets === 0 ? 0.35 : 1,
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.08em",
                color: sets > 0 ? "var(--color-text-primary)" : "var(--color-text-ghost)",
              }}>
                {label}
              </span>
              {sets > 0 && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-text-secondary)",
                }}>
                  {sets}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
