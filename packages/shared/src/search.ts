// Exercise name matching for the picker's search box.
//
// Runs client-side against the whole catalog (~750 rows) rather than hitting
// Postgres per keystroke. A plain `ilike '%q%'` returns nothing the moment a
// letter is wrong, and most failed searches aren't typos at all — they're
// vocabulary ("ohp", "rdl", "db"), which the alias table below handles better
// than any edit-distance metric.
//
// The Swift port in apps/ios/FitTrack/Services/ExerciseSearch.swift must stay
// behaviourally identical — iOS cannot import this package.

/** Gym shorthand and common misspellings → the words that appear in catalog names. */
const ALIASES: Record<string, string> = {
  // equipment shorthand
  db: "dumbbell",
  dumbell: "dumbbell",
  dumbbel: "dumbbell",
  bb: "barbell",
  barbel: "barbell",
  kb: "kettlebell",
  ez: "ez bar",
  // movement shorthand
  ohp: "overhead press",
  bp: "bench press",
  dl: "deadlift",
  rdl: "romanian deadlift",
  sldl: "stiff leg deadlift",
  bor: "bent over row",
  bss: "bulgarian split squat",
  ghr: "glute ham raise",
  military: "overhead press",
  skullcrusher: "triceps extension",
  skullcrushers: "triceps extension",
  // pluralisation the catalog doesn't use
  lats: "lat",
  pulldowns: "pulldown",
  curls: "curl",
  rows: "row",
  squats: "squat",
  raises: "raise",
  presses: "press",
  extensions: "extension",
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => (ALIASES[token] ?? token).split(" "));
}

/**
 * True when `candidate` is within a typo's reach of `target`. The allowance
 * scales with length so short words stay strict — at 2 edits, "row" would
 * match "raise".
 */
function withinTypoDistance(candidate: string, target: string): boolean {
  const allowed = target.length <= 3 ? 0 : target.length <= 5 ? 1 : 2;
  if (allowed === 0) return candidate === target;
  if (Math.abs(candidate.length - target.length) > allowed) return false;

  let prev = Array.from({ length: target.length + 1 }, (_, i) => i);
  for (let i = 1; i <= candidate.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= target.length; j++) {
      const cost = candidate[i - 1] === target[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }
    if (best > allowed) return false; // no cell can recover — bail early
    prev = row;
  }
  return prev[target.length] <= allowed;
}

/**
 * Ranked match strength, 0 (no match) to 1 (exact). Tiers are spaced so a
 * weaker-but-shorter name never outranks a stronger match.
 */
export function scoreExerciseName(name: string, query: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 1;

  const nameTokens = tokenize(name);
  const nameText = nameTokens.join(" ");
  const queryText = queryTokens.join(" ");

  if (nameText === queryText) return 1;
  if (nameText.startsWith(queryText)) return 0.9;
  if (nameText.includes(queryText)) return 0.8;

  // "inc db p" → "Incline Dumbbell Press": each token prefixes a later word.
  let cursor = 0;
  const orderedPrefixes = queryTokens.every((token) => {
    while (cursor < nameTokens.length) {
      if (nameTokens[cursor++].startsWith(token)) return true;
    }
    return false;
  });
  if (orderedPrefixes) return 0.7;

  // Same words, any order: "press bench" → "Bench Press".
  if (queryTokens.every((t) => nameTokens.some((n) => n.startsWith(t)))) return 0.6;

  // Last resort — spelling slipped.
  if (queryTokens.every((t) => nameTokens.some((n) => withinTypoDistance(n, t)))) return 0.4;

  return 0;
}

export interface SearchOptions<T> {
  limit?: number;
  /**
   * Tie-break hint, normally "the user has trained this". Close typos can score
   * identically on pure text — "benh pres" is one edit from both "Bent Press"
   * and "Bench Press" — and no lexical rule separates them. What you actually
   * lift does.
   */
  prefer?: (item: T) => boolean;
}

/** Matches ranked best-first: score, then preferred, then shortest name. */
export function searchExercises<T extends { name: string }>(
  items: T[],
  query: string,
  options: SearchOptions<T> = {}
): T[] {
  const { limit = Number.POSITIVE_INFINITY, prefer } = options;
  const rank = (item: T) => (prefer?.(item) ? 1 : 0);

  // An empty query is browsing, not searching — keep the catalog's own
  // ordering. Surfacing trained exercises there is the recents row's job.
  if (!query.trim()) return items.slice(0, limit);

  return items
    .map((item) => ({ item, score: scoreExerciseName(item.name, query) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        rank(b.item) - rank(a.item) ||
        a.item.name.length - b.item.name.length
    )
    .slice(0, limit)
    .map((r) => r.item);
}
