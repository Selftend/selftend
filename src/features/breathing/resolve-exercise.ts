import { breathingLookup } from "@/src/constants/breathing";
import type { BreathingPhase } from "@/src/constants/breathing";
import type {
  BreathingExercise,
  BreathingExerciseColor,
} from "@/src/features/breathing/exercise-types";
import { useBreathingExercise } from "@/src/features/breathing/exercises-queries";
import { useSession } from "@/src/providers/session-provider";

export interface ResolvedExercise {
  routeId: string;
  /** Stored in mindfulness_sessions.exercise_name: slug for built-ins, row id for custom. */
  exerciseName: string;
  source: "builtin" | "custom";
  title: string;
  /** i18n key suffix for built-ins (description/benefit live in cbt.json); null for custom. */
  i18nSlug: string | null;
  phases: BreathingPhase[];
  defaultCycles: number;
  cycleOptions: number[];
  color: BreathingExerciseColor | null;
}

export function resolveBuiltin(slug: string): ResolvedExercise | null {
  const pattern = breathingLookup[slug];
  if (!pattern) return null;
  return {
    routeId: slug,
    exerciseName: slug,
    source: "builtin",
    title: slug, // runner renders i18n title from i18nSlug; title is a fallback
    i18nSlug: slug,
    phases: pattern.phases,
    defaultCycles: pattern.defaultCycles,
    cycleOptions: pattern.cycleOptions,
    color: null,
  };
}

const PHASE_ORDER: { label: BreathingPhase["label"]; pick: (e: BreathingExercise) => number }[] = [
  { label: "inhale", pick: (e) => e.inhaleSeconds },
  { label: "hold", pick: (e) => e.holdInSeconds },
  { label: "exhale", pick: (e) => e.exhaleSeconds },
  { label: "holdOut", pick: (e) => e.holdOutSeconds },
];

export function resolveCustom(exercise: BreathingExercise): ResolvedExercise {
  const phases: BreathingPhase[] = PHASE_ORDER.map((p) => ({
    label: p.label,
    durationSeconds: p.pick(exercise),
  })).filter((p) => p.durationSeconds > 0);

  const c = exercise.cycles;
  const cycleOptions = Array.from(new Set([Math.max(1, Math.round(c / 2)), c, c * 2])).sort(
    (a, b) => a - b,
  );

  return {
    routeId: exercise.id,
    exerciseName: exercise.id,
    source: "custom",
    title: exercise.name,
    i18nSlug: null,
    phases,
    defaultCycles: c,
    cycleOptions,
    color: exercise.color,
  };
}

/** Resolve a route id to a built-in or a fetched custom exercise. */
export function useResolvedExercise(routeId: string | undefined): {
  resolved: ResolvedExercise | null;
  isLoading: boolean;
  notFound: boolean;
} {
  const { user } = useSession();
  const builtin = routeId ? resolveBuiltin(routeId) : null;
  const { data, isLoading } = useBreathingExercise(
    builtin || !routeId ? null : (user?.id ?? null),
    builtin || !routeId ? null : routeId,
  );
  const resolved = builtin ?? (data ? resolveCustom(data) : null);
  return {
    resolved,
    isLoading: !builtin && isLoading,
    notFound: !builtin && !isLoading && !data,
  };
}
