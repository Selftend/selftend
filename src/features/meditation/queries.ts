import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listMeditationSessions,
  saveMeditationSession,
} from "@/src/features/meditation/repository";

const meditationKeys = {
  all: ["meditation"] as const,
  list: (userId: string) => ["meditation", "list", userId] as const,
};

export function useMeditationSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? meditationKeys.list(userId) : ["meditation", "list", "anonymous"],
    queryFn: () => listMeditationSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveMeditationSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (durationMinutes: number) => saveMeditationSession(userId!, durationMinutes),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: meditationKeys.list(userId) });
    },
  });
}
