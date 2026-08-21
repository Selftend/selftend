import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getEmotionsSeeded,
  insertDefaultEmotions,
  listEmotionPreferences,
  listEmotionUsageCounts,
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

const emotionPrefKeys = {
  list: (userId: string) => ["emotion-prefs", userId] as const,
  /**
   * Rooted under `["mood", ...]` on purpose, even though it lives in this file.
   *
   * The value is derived entirely from `mood_logs`, and every mood mutation already
   * invalidates `moodKeys.all` (`["mood"]`), which prefix-matches this. Keying it under
   * `emotion-prefs` instead would leave a lifetime count stale for the whole 60s
   * `staleTime` after a check-in was created or deleted - and this is the number a delete
   * confirmation quotes as exact.
   */
  usage: (userId: string) => ["mood", "emotionUsage", userId] as const,
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

/**
 * Lifetime uses per emotion (#743). A separate query rather than a field on the preference
 * rows, because only the manage-emotions surface asks for it - the picker on the check-in
 * form must not pay for an aggregate it never renders.
 *
 * ⚠️ `enabled` is what makes that true, and it is load-bearing. The check-in editor mounts
 * `ManageEmotionsModal` unconditionally and merely passes `visible={false}`, so without
 * this gate the RPC would fire on every create and edit screen - unnesting a long-tenured
 * user's entire mood history for a number nothing on that screen shows.
 */
export function useEmotionUsageCounts(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: userId ? emotionPrefKeys.usage(userId) : emotionPrefKeys.usage("anon"),
    queryFn: listEmotionUsageCounts,
    enabled: Boolean(userId) && enabled,
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

/**
 * ☠️ Every mutation below opts out of the global save-failed toast, and none of them
 * may be given it back (#1335, spec §10).
 *
 * The only surface that calls them is `ManageEmotionsModal`, an opaque `pageSheet` that
 * stays OPEN across all four writes. On Android there is no mechanism that can lift a
 * toast over a native modal - `FullWindowOverlay` is iOS-only, and putting the toast in
 * its own Android `Modal` would block every touch below it, which the inert-body rule
 * disqualifies. A toast raised from here is therefore raised where nobody can see it.
 *
 * The modal renders the failure inline instead, off the `onError` each caller passes to
 * `mutate`. `emotion-preferences-queries.test.tsx` holds the proof, with a control that
 * keeps the absence assertions honest.
 *
 * ⚠️ That `onError` must be handed over by a component that OUTLIVES the write.
 * `MutationObserver` gates every mutate-level callback on `hasListeners()`, so one passed
 * from a view that unmounts on submit is dropped - and with the toast suppressed here,
 * the write would then fail in total silence. See `ManageEmotionsModal`.
 */
export function useUpsertEmotionPreference(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: UpsertEmotionPreferenceInput) =>
      upsertEmotionPreference(userId!, variables),

    meta: { suppressGlobalErrorToast: true }, // the modal shows this failure inline

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

    meta: { suppressGlobalErrorToast: true }, // the modal shows this failure inline

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
            userId,
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
    /**
     * Soft-remove, for custom emotions as well as builtin ones (#743).
     *
     * A custom emotion used to be **hard-deleted**, and that quietly destroyed history:
     * a check-in stores only the id (`custom_1754…`), and the name and emoji live on the
     * preference row. Delete the row and `resolveEmotion` falls through to rendering the
     * raw id with a placeholder glyph — so an entry from six months ago stopped saying
     * "Wistful 🌧️" and started saying "custom_1754673920117 💭".
     *
     * That also made the delete confirmation's promise false. It says the entries that
     * already name this emotion keep it; for a custom one they kept an unreadable id.
     * Marking the row `removed` instead takes it out of the picker (`allEmotions` filters
     * on it) while leaving `resolveEmotion` able to name it forever.
     */
    mutationFn: async ({ emotionId }: { emotionId: string; isCustom: boolean }) => {
      await upsertEmotionPreference(userId!, { emotionId, removed: true });
    },

    meta: { suppressGlobalErrorToast: true }, // the modal shows this failure inline

    onMutate: async ({ emotionId }) => {
      if (!userId) return;
      const key = emotionPrefKeys.list(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<EmotionPreference[]>(key);

      queryClient.setQueryData<EmotionPreference[]>(key, (old = []) =>
        mergeRowIntoList(old, { emotionId, removed: true }),
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

    meta: { suppressGlobalErrorToast: true }, // the modal shows this failure inline

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
