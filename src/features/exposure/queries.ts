import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteHierarchy,
  getHierarchy,
  getLatestExposureSessionAt,
  listAllItems,
  listHierarchies,
  listItems,
  listRecentSessions,
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
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const exposureKeys = {
  all: ["exposure"] as const,
  hierarchies: (userId: string) => ["exposure", "hierarchies", userId] as const,
  hierarchy: (userId: string, hierarchyId: string) =>
    ["exposure", "hierarchy", userId, hierarchyId] as const,
  allItems: (userId: string) => ["exposure", "items", userId] as const,
  items: (userId: string, hierarchyId: string) =>
    ["exposure", "items", userId, hierarchyId] as const,
  sessions: (userId: string, itemId: string) => ["exposure", "sessions", userId, itemId] as const,
  recentSessions: (userId: string, limit: number) =>
    ["exposure", "sessions", "recent", userId, limit] as const,
  // Every exposure mutation invalidates `exposureKeys.all`, which covers this too.
  latestSession: (userId: string) => ["exposure", "sessions", "latest", userId] as const,
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

/**
 * Newest sessions across all items - feeds the routines derive engine ("any
 * exposure session completed on day X"). Invalidated by every session save
 * via the exposureKeys.all prefix.
 */
export function useRecentExposureSessions(userId: string | null, limit = 250) {
  return useQuery({
    queryKey: userId
      ? exposureKeys.recentSessions(userId, limit)
      : ["exposure", "sessions", "recent", "anonymous"],
    queryFn: () => listRecentSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

/**
 * Home's `Last {{when}}` row - one row instead of the 250-row session strip (#990).
 * This is the one row whose tool screen mounts neither list: the exposure index mounts
 * `useHierarchies`, so there was never a session cache entry to share.
 */
export function useLatestExposureSessionAt(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? exposureKeys.latestSession(userId)
      : ["exposure", "sessions", "latest", "anonymous"],
    queryFn: () => getLatestExposureSessionAt(userId!),
    enabled: Boolean(userId),
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
    meta: { suppressGlobalErrorToast: true }, // wizard shows its own save-error toast
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
    meta: { suppressGlobalErrorToast: true }, // detail screen shows its own save-error toast
    onSuccess: async () => {
      requestReminderPrompt("cbt");
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

export function useDeleteHierarchy(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hierarchyId: string) => deleteHierarchy(userId!, hierarchyId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: exposureKeys.all });
    },
  });
}
