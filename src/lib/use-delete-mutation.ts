import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
  /**
   * Further roots this delete has to reach, beyond the tool's own.
   *
   * These are the queries that span tools and so have no owning feature to nest
   * under, which no tool prefix can reach: `recordDaysKeys.all` (#1906, ten
   * tools) and `homeToolStatsKeys.all` (#2212, seven tables). The five deletes
   * that remove a record day - check-ins, gratitude, journal, sleep and a whole
   * habit - pass both. It was singular until the second one existed.
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
