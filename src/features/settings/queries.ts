import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UserPreferences } from "@/src/features/modules/types";
import { getUserPreferences, updateUserPreferences } from "@/src/features/settings/repository";

const preferenceKeys = {
  detail: (userId: string) => ["preferences", userId] as const,
};

export function useUserPreferences(userId: string | null) {
  return useQuery({
    queryKey: userId ? preferenceKeys.detail(userId) : ["preferences", "anonymous"],
    queryFn: () => getUserPreferences(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpdateUserPreferences(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPreferences) => updateUserPreferences(userId!, preferences),
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: preferenceKeys.detail(userId) });
    },
  });
}
