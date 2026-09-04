import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMeditationSessions,
  getMeditationProgramState,
  getMeditationSession,
  listMeditationMinutesSince,
  listMeditationSessions,
  listMeditationSessionsPage,
  listStagePracticeNotes,
  medianMeditationMinutes,
  saveMeditationSession,
  saveStagePracticeNote,
  updateMeditationSessionReflection,
  upsertMeditationProgramState,
  type MeditationReflectionPatch,
} from "@/src/features/meditation/repository";
import type {
  MeditationProgramStateInput,
  MeditationSessionInput,
} from "@/src/features/meditation/types";
import { invalidateRecordDays } from "@/src/features/progress/queries";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";
import { nextDescendingCursor, type RecordCursor } from "@/src/lib/descending-cursor";

const meditationKeys = {
  all: ["meditation"] as const,
  list: (userId: string) => ["meditation", "list", userId] as const,
  detail: (userId: string, sessionId: string) =>
    ["meditation", "detail", userId, sessionId] as const,
  count: (userId: string) => ["meditation", "count", userId] as const,
  sessionPages: (userId: string) => ["meditation", "sessionPages", userId] as const,
  minutesWindow: (userId: string) => ["meditation", "minutes-window", userId] as const,
  medianMinutes: (userId: string) => ["meditation", "median-minutes", userId] as const,
  programState: (userId: string) => ["meditation", "programState", userId] as const,
  notes: (userId: string, stage?: number) =>
    ["meditation", "notes", userId, stage ?? "all"] as const,
};

export function useMeditationSessions(userId: string | null, limit = 30) {
  return useQuery({
    // Include `limit` in the key so callers requesting 30/100/200 rows don't collide on
    // one cache entry (invalidation by the limit-less prefix still matches every variant).
    queryKey: userId
      ? [...meditationKeys.list(userId), limit]
      : ["meditation", "list", "anonymous"],
    queryFn: () => listMeditationSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

/** One page of the all-sits screen. Twenty rows reaches the fold on a phone with one fetch. */
export const MEDITATION_HISTORY_PAGE_SIZE = 20;

/**
 * Every sit, a page at a time (#696).
 *
 * The screen this feeds asked for 100 rows once and called that all history.
 */
export function useMeditationSessionPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId ? meditationKeys.sessionPages(userId) : ["meditation", "sessionPages", "anon"],
    queryFn: ({ pageParam }) =>
      listMeditationSessionsPage(userId!, MEDITATION_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: null as RecordCursor | null,
    // A short page is the end of the data. A full one may or may not be, so ask
    // again: one empty round trip at the exact boundary beats stopping early.
    getNextPageParam: (lastPage) =>
      lastPage.length < MEDITATION_HISTORY_PAGE_SIZE
        ? undefined
        : nextDescendingCursor(lastPage, (session) => session.completedAt),
    enabled: Boolean(userId),
  });
}

/**
 * The sits inside the overview's thirty-day chart window.
 *
 * `fromIso` rides the key so a window that rolls over midnight refetches rather
 * than redrawing yesterday's thirty days under today's labels. An empty string
 * is the caller saying it has not read the clock yet - the screen reads it on
 * focus, never during render - and fetching a window from the epoch in the
 * meantime would be worse than waiting a frame for it.
 */
export function useMeditationMinutesWindow(userId: string | null, fromIso: string) {
  return useQuery({
    queryKey: userId
      ? [...meditationKeys.minutesWindow(userId), fromIso]
      : ["meditation", "minutes-window", "anonymous"],
    queryFn: () => listMeditationMinutesSince(userId!, fromIso),
    enabled: Boolean(userId) && fromIso !== "",
  });
}

export function useMeditationSessionCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? meditationKeys.count(userId) : ["meditation", "count", "anonymous"],
    queryFn: () => countMeditationSessions(userId!),
    enabled: Boolean(userId),
  });
}

// The RPC takes the median over the signed-in user's own sessions via auth.uid(), so it
// takes no argument; `userId` only gates and scopes the cache, exactly as it does for the
// sibling count hook.
export function useMeditationMedianMinutes(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? meditationKeys.medianMinutes(userId)
      : ["meditation", "median-minutes", "anonymous"],
    queryFn: medianMeditationMinutes,
    enabled: Boolean(userId),
  });
}

export function useMeditationSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey:
      userId && sessionId
        ? meditationKeys.detail(userId, sessionId)
        : ["meditation", "detail", "anonymous"],
    queryFn: () => getMeditationSession(userId!, sessionId!),
    enabled: Boolean(userId) && Boolean(sessionId),
  });
}

export function useSaveMeditationSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MeditationSessionInput) => saveMeditationSession(userId!, input),
    onSuccess: async () => {
      requestReminderPrompt("meditation");
      if (!userId) return;
      // Invalidate the whole meditation prefix rather than the list alone: logging a sit
      // moves the server-derived session count and median too, and invalidating only
      // `list` left both stale until a remount (#337).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meditationKeys.all }),
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

/**
 * The reflection half of #786: patches the sit the timer already saved.
 * Invalidates the whole prefix for the same reason the save mutation does -
 * the reflection text rides the recent-sits rows and the history pages.
 */
export function useUpdateMeditationSessionReflection(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, patch }: { sessionId: string; patch: MeditationReflectionPatch }) =>
      updateMeditationSessionReflection(userId!, sessionId, patch),
    onSuccess: async () => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: meditationKeys.all }),
        // A reflection patch cannot move `completed_at`, so no mark moves.
        // Invalidated anyway, under the rule the guard enforces: any mutation
        // writing a source table invalidates it, rather than each one
        // re-deciding whether its particular edit can reach a civil day.
        invalidateRecordDays(queryClient),
      ]);
    },
  });
}

export function useMeditationProgramState(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? meditationKeys.programState(userId)
      : ["meditation", "programState", "anonymous"],
    queryFn: () => getMeditationProgramState(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpsertMeditationProgramState(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: MeditationProgramStateInput) =>
      upsertMeditationProgramState(userId!, patch),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: meditationKeys.programState(userId) });
    },
  });
}

export function useStagePracticeNotes(userId: string | null, stage?: number) {
  return useQuery({
    queryKey: userId ? meditationKeys.notes(userId, stage) : ["meditation", "notes", "anonymous"],
    queryFn: () => listStagePracticeNotes(userId!, stage),
    enabled: Boolean(userId),
  });
}

export function useSaveStagePracticeNote(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, note }: { stage: number; note: string }) =>
      saveStagePracticeNote(userId!, stage, note),
    onSuccess: async (_data, vars) => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: meditationKeys.notes(userId, vars.stage) });
      await queryClient.invalidateQueries({ queryKey: meditationKeys.notes(userId) });
    },
  });
}
