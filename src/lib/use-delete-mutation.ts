import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDeleteMutation(
  userId: string | null,
  deleteFn: (userId: string, id: string) => Promise<void>,
  invalidationKey: readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFn(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: invalidationKey });
    },
  });
}
