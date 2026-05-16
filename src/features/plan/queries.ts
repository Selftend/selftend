import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deletePlanItem,
  listAllPlanItems,
  listPlanItems,
  savePlanItem,
} from "@/src/features/plan/repository";
import type { CarePlanItemInput } from "@/src/features/plan/types";

const planKeys = {
  all: ["plan"] as const,
  items: (userId: string) => ["plan", "items", userId] as const,
  allItems: (userId: string) => ["plan", "all-items", userId] as const,
};

export function usePlanItems(userId: string | null) {
  return useQuery({
    queryKey: userId ? planKeys.items(userId) : ["plan", "items", "anonymous"],
    queryFn: () => listPlanItems(userId!),
    enabled: Boolean(userId),
  });
}

export function useAllPlanItems(userId: string | null) {
  return useQuery({
    queryKey: userId ? planKeys.allItems(userId) : ["plan", "all-items", "anonymous"],
    queryFn: () => listAllPlanItems(userId!),
    enabled: Boolean(userId),
  });
}

export function useSavePlanItem(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, id }: { input: CarePlanItemInput; id?: string }) =>
      savePlanItem(userId!, input, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: planKeys.items(userId) });
      await queryClient.invalidateQueries({ queryKey: planKeys.allItems(userId) });
    },
  });
}

export function useDeletePlanItem(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlanItem(userId!, id),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: planKeys.items(userId) });
      await queryClient.invalidateQueries({ queryKey: planKeys.allItems(userId) });
    },
  });
}
