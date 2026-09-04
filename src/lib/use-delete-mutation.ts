import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * @param alsoInvalidate Extra query-key roots to invalidate alongside the
 * feature's own. ⚠️ Added for `recordDaysKeys.all` (#1906): `record_days` spans
 * ten tools, so no feature's own invalidation reaches it, and five of its write
 * paths are deletes that run through this helper. Passed as keys by the caller
 * rather than imported here, so this stays a generic helper with no feature
 * dependency - and so a caller that is NOT a record source (ACT, routines,
 * breathing exercises) keeps invalidating exactly what it did before.
 */
export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
  ...alsoInvalidate: readonly (readonly unknown[])[]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFn(userId!, id),
    // Every delete detail screen shows its own inline error on failure.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: invalidationKey });
      for (const key of alsoInvalidate) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
