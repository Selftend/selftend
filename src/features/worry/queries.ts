import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listWorryEntries,
  saveWorryEntry,
  toggleWorryResolved,
} from "@/src/features/worry/repository";
import type { WorryEntryInput } from "@/src/features/worry/types";

const worryKeys = {
  all: ["worry"] as const,
  list: (userId: string) => ["worry", "list", userId] as const,
};

export function useWorryEntries(userId: string | null) {
  return useQuery({
    queryKey: userId ? worryKeys.list(userId) : ["worry", "list", "anonymous"],
    queryFn: () => listWorryEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveWorryEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorryEntryInput) => saveWorryEntry(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: worryKeys.list(userId) });
    },
  });
}

export function useToggleWorryResolved(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, resolved }: { entryId: string; resolved: boolean }) =>
      toggleWorryResolved(userId!, entryId, resolved),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: worryKeys.list(userId) });
    },
  });
}
