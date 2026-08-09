/**
 * Stored breathing-exercise `color` values.
 *
 * This list is the STORAGE vocabulary, not the picker. It only ever grows: a
 * value that has ever been written to `breathing_exercises.color` has to keep
 * parsing forever, because the Zod enum in exercise-schema.ts gates reads as
 * well as writes. Dropping one would make an existing row fail validation and
 * take the user's pattern with it.
 *
 * `amber`, `emerald`, `violet` and `rose` predate the token system and used to
 * render raw Tailwind palette literals (`bg-amber-500/10`), so they missed
 * palette retunes and had no contrast certification - the same defect habits
 * fixed in #278. They now alias onto their nearest token hue in
 * exercise-colors.ts. `ink`, `be` and `act` are new here: they are offered by
 * the picker below and so must be storable.
 */
export const BREATHING_EXERCISE_COLORS = [
  "aqua",
  "mist",
  "iris",
  "clay",
  "amber",
  "emerald",
  "violet",
  "rose",
  "ink",
  "be",
  "act",
] as const;

export type BreathingExerciseColor = (typeof BREATHING_EXERCISE_COLORS)[number];

/**
 * The colours the picker OFFERS, in declaration order - habits' six, adopted
 * wholesale and for the same measurements (#715).
 *
 * The design draws eight swatches (`aqua, mist, ink, iris, be, act, think,
 * clay`). #715 measured that exact set: it contains two pairs no fully-sighted
 * user can separate as pale fills - `act`/`mist` at ΔE76 6.5 and
 * `primary`/`iris` at 4.5 - and cutting `mist` and `think` leaves six with no
 * pair below ΔE 11.8. Breathing has no argument for differing, so it doesn't.
 *
 * The ORDER is not the design's either. With auto-assignment (see
 * `nextUnusedBreathingColor`) the design's order hands the 4th and 5th pattern
 * `ink` and `iris`, which collapse to ΔE 0.4 under protanopia. This order
 * maximises the worst separation between neighbouring and next-neighbouring
 * entries instead.
 *
 * ⚠️ `primary` is deliberately absent and must never be added: it is the one
 * token that moves with the theme (`global.css` calls the eight hues "the
 * pinned encoding palette" and gives `--primary` to the theme contract), so a
 * user's saved patterns would recolour when they changed theme style. A
 * categorical encoding whose members shift under a setting is not one.
 */
export const BREATHING_EXERCISE_COLOR_CHOICES = [
  "act",
  "clay",
  "ink",
  "aqua",
  "be",
  "iris",
] as const satisfies readonly BreathingExerciseColor[];

export interface BreathingExercise {
  id: string;
  userId: string;
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
  createdAt: string;
  updatedAt: string;
}

export interface BreathingExerciseInput {
  name: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
  cycles: number;
  color: BreathingExerciseColor;
}

/**
 * The first offered colour not already worn by one of the user's patterns,
 * cycling once all six are taken.
 *
 * Every custom pattern used to be born `aqua`, so a user with four patterns had
 * four identical dots on the overview until they went and changed them - and
 * the categorical encoding the dot exists for did not work until they did.
 * Falls back to the first choice when the list has not loaded: a duplicate
 * colour is a cosmetic miss, not a failure.
 */
export function nextUnusedBreathingColor(
  existing: readonly { color: BreathingExerciseColor }[] | undefined,
): BreathingExerciseColor {
  const used = new Set((existing ?? []).map((e) => e.color));
  return (
    BREATHING_EXERCISE_COLOR_CHOICES.find((c) => !used.has(c)) ??
    BREATHING_EXERCISE_COLOR_CHOICES[0]
  );
}
