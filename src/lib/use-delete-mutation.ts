import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
  /**
   * One further root this delete has to reach, beyond the tool's own.
   *
   * Singular rather than variadic because exactly one thing needs it and
   * nothing suggests a second: the five deletes that remove a record day -
   * check-ins, gratitude, journal, sleep and a whole habit - pass
   * `recordDaysKeys.all`. That query spans ten tools, so it has no owning
   * feature to nest under and no tool prefix can reach it (#1906).
   */
  alsoInvalidate?: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFn(userId!, id),
    // Every delete detail screen shows its own inline error on failure.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      const roots = alsoInvalidate ? [invalidationKey, alsoInvalidate] : [invalidationKey];
      await Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}
