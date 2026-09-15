import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
  /**
   * Further roots this delete has to reach, beyond the tool's own.
   *
   * These are the queries that span tools and so have no owning feature to nest
   * under, which no tool prefix can reach: `homeToolStatsKeys.all` (#2212, seven
   * tables) is the one such root today. The five deletes that move a Home figure
   * - check-ins, gratitude, journal, sleep and a whole habit - pass it. Still
   * varargs: there were two until `recordDaysKeys.all` left with Looking back
   * (#2431), and the next cross-tool root takes the same slot.
   */
  ...alsoInvalidate: readonly (readonly unknown[])[]
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFn(userId!, id),
    // Every delete detail screen shows its own inline error on failure.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      const roots = [invalidationKey, ...alsoInvalidate];
      await Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}
