import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { SteppableToolId } from "@/src/features/routines/derive";
import { useAddStep, useCreateRoutine, useDeleteRoutine } from "@/src/features/routines/queries";
import { useSingleFlight } from "@/src/lib/use-single-flight";

// The shared "Keep" write path for the declinable starter-routine offer
// (spec #37, "Onboarding starter routine"): one routine + N steps through the
// normal repository mutations - the exact same path manual creation uses.
// Shared by the Routines-page empty state (#45) and the onboarding `routines`
// panel (#46) so neither surface reimplements (or silently diverges from) the
// opt-in write. Nothing is ever written until `keep` is explicitly invoked.
export function useKeepStarterRoutine(userId: string | null) {
  const { t } = useTranslation("routines");
  const createRoutine = useCreateRoutine(userId);
  const addStep = useAddStep(userId);
  const deleteRoutine = useDeleteRoutine(userId);
  const [error, setError] = useState("");

  const keep = useSingleFlight(
    async ({
      name,
      steps,
      onKept,
    }: {
      name: string;
      steps: readonly SteppableToolId[];
      /** Runs only after every write succeeded (e.g. advance the wizard). */
      onKept?: () => void;
    }) => {
      if (!userId || steps.length === 0) return;
      setError("");
      let routineId: string | null = null;
      try {
        const routine = await createRoutine.mutateAsync({ name });
        routineId = routine.id;
        for (const [index, toolId] of steps.entries()) {
          await addStep.mutateAsync({ routineId: routine.id, toolId, position: index });
        }
        onKept?.();
      } catch (cause) {
        // Keep is atomic from the user's perspective: a step insert failing
        // after createRoutine would strand a partial routine, and retrying
        // Keep would then duplicate it. Roll the routine back (cascade clears
        // any inserted steps); best-effort - a failed rollback still surfaces
        // the original error.
        if (routineId) {
          await deleteRoutine.mutateAsync(routineId).catch(() => undefined);
        }
        setError(cause instanceof Error ? cause.message : t("form.saveError"));
      }
    },
  );

  return {
    keep,
    saving: createRoutine.isPending || addStep.isPending,
    error,
  };
}
