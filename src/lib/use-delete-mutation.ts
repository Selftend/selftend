import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFn(userId!, id),
    // Every delete detail screen shows its own inline error on failure.
    meta: { suppressGlobalErrorToast: true },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: invalidationKey });
    },
  });
}
