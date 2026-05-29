import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getHierarchy,
  listAllItems,
  listHierarchies,
  listItems,
  listSessions,
  saveHierarchy,
  saveItems,
  saveSession,
} from "@/src/features/exposure/repository";
import type {
  ExposureHierarchyInput,
  ExposureItemInput,
  ExposureSessionInput,
} from "@/src/features/exposure/types";

const exposureKeys = {
  all: ["exposure"] as const,
  hierarchies: (userId: string) => ["exposure", "hierarchies", userId] as const,
  hierarchy: (userId: string, hierarchyId: string) =>
    ["exposure", "hierarchy", userId, hierarchyId] as const,
  allItems: (userId: string) => ["exposure", "items", userId] as const,
  items: (userId: string, hierarchyId: string) =>
    ["exposure", "items", userId, hierarchyId] as const,
  item: (userId: string, itemId: string) => ["exposure", "item", userId, itemId] as const,
  sessions: (userId: string, itemId: string) => ["exposure", "sessions", userId, itemId] as const,
};

export function useHierarchies(userId: string | null) {
  return useQuery({
    queryKey: userId ? exposureKeys.hierarchies(userId) : ["exposure", "hierarchies", "anonymous"],
    queryFn: () => listHierarchies(userId!),
    enabled: Boolean(userId),
  });
}

export function useHierarchy(userId: string | null, hierarchyId: string | null) {
  return useQuery({
    queryKey:
      userId && hierarchyId
        ? exposureKeys.hierarchy(userId, hierarchyId)
        : ["exposure", "hierarchy", "anonymous"],
    queryFn: () => getHierarchy(userId!, hierarchyId!),
    enabled: Boolean(userId && hierarchyId),
  });
}

export function useExposureItems(userId: string | null, hierarchyId: string | null) {
  return useQuery({
    queryKey:
      userId && hierarchyId
        ? exposureKeys.items(userId, hierarchyId)
        : ["exposure", "items", "anonymous"],
    queryFn: () => listItems(userId!, hierarchyId!),
    enabled: Boolean(userId && hierarchyId),
  });
}

export function useAllExposureItems(userId: string | null) {
  return useQuery({
    queryKey: userId ? exposureKeys.allItems(userId) : ["exposure", "items", "anonymous"],
    queryFn: () => listAllItems(userId!),
    enabled: Boolean(userId),
  });
}

export function useExposureSessions(userId: string | null, itemId: string | null) {
  return useQuery({
    queryKey:
      userId && itemId
        ? exposureKeys.sessions(userId, itemId)
        : ["exposure", "sessions", "anonymous"],
    queryFn: () => listSessions(userId!, itemId!),
    enabled: Boolean(userId && itemId),
  });
}

export function useSaveHierarchy(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      items,
    }: {
      input: ExposureHierarchyInput;
      items: ExposureItemInput[];
    }) => {
      const hierarchy = await saveHierarchy(userId!, input);
      await saveItems(userId!, hierarchy.id, items);
      return hierarchy;
    },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exposureKeys.all });
    },
  });
}

export function useSaveExposureSession(userId: string | null, hierarchyId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: ExposureSessionInput }) =>
      saveSession(userId!, itemId, input),
    onSuccess: async () => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: exposureKeys.all }),
        hierarchyId
          ? queryClient.invalidateQueries({
              queryKey: exposureKeys.items(userId, hierarchyId),
            })
          : Promise.resolve(),
      ]);
    },
  });
}
