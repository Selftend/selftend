import {
  abandonProgramPatch,
  advancePhasePatch,
  dismissGraduationPatch,
  dismissProgramPromptPatch,
  replayProgramPatch,
  showProgramPromptPatch,
  startProgramPatch,
  type ProgramPreferenceKeys,
} from "@/src/features/modules/program-patches";
import type { UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";

/** The transitions a programme hook exposes, plus the state its card renders. */
export interface ProgramActions {
  startProgram: () => void;
  dismissProgramPrompt: () => void;
  showProgramPrompt: () => void;
  abandonProgram: () => void;
  replayProgram: () => void;
  advancePhase: () => void;
  dismissGraduation: () => void;
  promptDismissedAt: string | null;
  graduationDismissedAt: string | null;
  isUpdating: boolean;
}

/**
 * The mutation half shared by `use-cbt-program.ts`, `use-act-program.ts` and
 * `use-dbt-program.ts` (#2810). Each hook keeps its own derivation; the seven
 * transitions and their failure handling live once, here.
 */
export function useProgramActions(
  userId: string | null,
  keys: ProgramPreferenceKeys,
  totalPhases: number,
): ProgramActions {
  const { data: preferences } = useUserPreferences(userId);
  // ☠️ The opt-out of the opt-out: these actions expose no error state a screen
  // renders, so the global save-failed toast is the ONLY thing standing between
  // a failed start/advance/abandon and silence. Before #2810 they suppressed it
  // and a failed write rolled back with no message and no retry.
  const updatePreferences = useUpdateUserPreferences(userId, { suppressGlobalErrorToast: false });

  // `mutate`, not `mutateAsync`: nothing awaits these, and the dangling promise
  // is what forced the 21 `.catch(() => undefined)` sites this replaced. Errors
  // still roll back optimistic state, reach Sentry, and now raise the toast.
  const save = (patch: Partial<UserPreferences>) => {
    if (!preferences) return;
    updatePreferences.mutate(patch);
  };

  const now = () => new Date().toISOString();

  return {
    startProgram: () => save(startProgramPatch(keys, now())),
    dismissProgramPrompt: () => save(dismissProgramPromptPatch(keys, now())),
    showProgramPrompt: () => save(showProgramPromptPatch(keys)),
    abandonProgram: () => save(abandonProgramPatch(keys, now())),
    replayProgram: () => save(replayProgramPatch(keys, now())),
    advancePhase: () =>
      save(advancePhasePatch(keys, preferences?.[keys.phaseIndex] ?? 0, totalPhases, now())),
    dismissGraduation: () => save(dismissGraduationPatch(keys, now())),
    promptDismissedAt: preferences?.[keys.promptDismissedAt] ?? null,
    graduationDismissedAt: preferences?.[keys.graduationDismissedAt] ?? null,
    isUpdating: updatePreferences.isPending,
  };
}
