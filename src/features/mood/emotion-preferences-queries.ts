import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteEmotionPreference,
  getEmotionsSeeded,
  insertDefaultEmotions,
  listEmotionPreferences,
  markEmotionsSeeded,
  setEmotionOrder,
  upsertEmotionPreference,
} from "@/src/features/mood/emotion-preferences-repository";
import type {
  EmotionPreference,
  UpsertEmotionPreferenceInput,
} from "@/src/features/mood/emotion-preferences-repository";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const emotionPrefKeys = {
  all: ["emotion-prefs"] as const,
  list: (userId: string) => ["emotion-prefs", userId] as const,
};

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

// Seed defaults once per user (mirrors the Home widget listOrSeed): list rows;
// if empty AND not yet seeded, insert the default emotions, mark seeded, re-list.
// An emptied list that has already been seeded stays empty.
async function listOrSeedEmotions(userId: string): Promise<EmotionPreference[]> {
  const existing = await listEmotionPreferences(userId);
  if (existing.length > 0) return existing;

  if (await getEmotionsSeeded(userId)) return [];

  await insertDefaultEmotions(userId);
  await markEmotionsSeeded(userId);
  return listEmotionPreferences(userId);
}

export function useEmotionPreferences(userId: string | null) {
  return useQuery({
    queryKey: userId ? emotionPrefKeys.list(userId) : emotionPrefKeys.list("anon"),
    queryFn: () => listOrSeedEmotions(userId!),
    enabled: Boolean(userId),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Merge an updated/new row into a cached list. Appends if not found. */
function mergeRowIntoList(
  list: EmotionPreference[],
  updated: Partial<EmotionPreference> & Pick<EmotionPreference, "emotionId">,
): EmotionPreference[] {
  const idx = list.findIndex((r) => r.emotionId === updated.emotionId);
  if (idx === -1) {
    // Add optimistic row (id will be replaced on settle via invalidation)
    return [
      ...list,
      {
        id: `optimistic-${updated.emotionId}`,
        userId: "",
        name: null,
        emoji: null,
        position: list.length,
        removed: false,
        isCustom: false,
        ...updated,
      } as EmotionPreference,
    ];
  }
  return list.map((r, i) => (i === idx ? { ...r, ...updated } : r));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpsertEmotionPreference(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: UpsertEmotionPreferenceInput) =>
      upsertEmotionPreference(userId!, variables),

    onMutate: async (variables) => {
      if (!userId) return;
      const key = emotionPrefKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<EmotionPreference[]>(key);
      queryClient.setQueryData<EmotionPreference[]>(key, (old = []) =>
        mergeRowIntoList(old, {
          emotionId: variables.emotionId,
          ...(variables.name !== undefined && { name: variables.name }),
          ...(variables.emoji !== undefined && { emoji: variables.emoji }),
          ...(variables.position !== undefined && { position: variables.position }),
          ...(variables.removed !== undefined && { removed: variables.removed }),
          ...(variables.isCustom !== undefined && { isCustom: variables.isCustom }),
        }),
      );
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (!userId || !context?.snapshot) return;
      queryClient.setQueryData(emotionPrefKeys.list(userId), context.snapshot);
    },

    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: emotionPrefKeys.list(userId) });
    },
  });
}

export function useReorderEmotions(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => setEmotionOrder(userId!, orderedIds),

    onMutate: async (orderedIds) => {
      if (!userId) return;
      const key = emotionPrefKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<EmotionPreference[]>(key);

      queryClient.setQueryData<EmotionPreference[]>(key, (old = []) => {
        // Build a map of existing rows by emotionId for quick lookup
        const byId = new Map(old.map((r) => [r.emotionId, r]));

        // Apply new positions to known rows; create lightweight optimistic rows
        // for ids not yet in cache so the order reflects immediately.
        const reordered = orderedIds.map((emotionId, index) => {
          const existing = byId.get(emotionId);
          if (existing) return { ...existing, position: index };
          return {
            id: `optimistic-${emotionId}`,
            userId: userId,
            emotionId,
            name: null,
            emoji: null,
            position: index,
            removed: false,
            isCustom: false,
          } satisfies EmotionPreference;
        });

        // Preserve any rows not mentioned in orderedIds (e.g. removed ones)
        // at the end so they are not lost from the cache.
        const mentioned = new Set(orderedIds);
        const rest = old.filter((r) => !mentioned.has(r.emotionId));
        return [...reordered, ...rest];
      });

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (!userId || !context?.snapshot) return;
      queryClient.setQueryData(emotionPrefKeys.list(userId), context.snapshot);
    },

    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: emotionPrefKeys.list(userId) });
    },
  });
}

export function useRemoveEmotion(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emotionId, isCustom }: { emotionId: string; isCustom: boolean }) => {
      if (isCustom) {
        await deleteEmotionPreference(userId!, emotionId);
      } else {
        await upsertEmotionPreference(userId!, { emotionId, removed: true });
      }
    },

    onMutate: async ({ emotionId, isCustom }) => {
      if (!userId) return;
      const key = emotionPrefKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<EmotionPreference[]>(key);

      if (isCustom) {
        // Hard-remove the row from the cache immediately.
        queryClient.setQueryData<EmotionPreference[]>(key, (old = []) =>
          old.filter((r) => r.emotionId !== emotionId),
        );
      } else {
        // Soft-remove: mark the row as removed (or add a removed placeholder).
        queryClient.setQueryData<EmotionPreference[]>(key, (old = []) =>
          mergeRowIntoList(old, { emotionId, removed: true }),
        );
      }

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (!userId || !context?.snapshot) return;
      queryClient.setQueryData(emotionPrefKeys.list(userId), context.snapshot);
    },

    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: emotionPrefKeys.list(userId) });
    },
  });
}

export function useAddCustomEmotion(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { emotionId: string; name: string; emoji: string; position: number }) =>
      upsertEmotionPreference(userId!, {
        emotionId: variables.emotionId,
        name: variables.name,
        emoji: variables.emoji,
        position: variables.position,
        isCustom: true,
      }),

    onMutate: async (variables) => {
      if (!userId) return;
      const key = emotionPrefKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<EmotionPreference[]>(key);

      queryClient.setQueryData<EmotionPreference[]>(key, (old = []) =>
        mergeRowIntoList(old, {
          emotionId: variables.emotionId,
          name: variables.name,
          emoji: variables.emoji,
          position: variables.position,
          isCustom: true,
        }),
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (!userId || !context?.snapshot) return;
      queryClient.setQueryData(emotionPrefKeys.list(userId), context.snapshot);
    },

    onSettled: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: emotionPrefKeys.list(userId) });
    },
  });
}
