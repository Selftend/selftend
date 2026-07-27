import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMeditationSessions,
  getMeditationProgramState,
  getMeditationSession,
  listMeditationSessions,
  listStagePracticeNotes,
  medianMeditationMinutes,
  saveMeditationSession,
  saveStagePracticeNote,
  upsertMeditationProgramState,
} from "@/src/features/meditation/repository";
import type {
  MeditationProgramStateInput,
  MeditationSessionInput,
} from "@/src/features/meditation/types";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const meditationKeys = {
  all: ["meditation"] as const,
  list: (userId: string) => ["meditation", "list", userId] as const,
  detail: (userId: string, sessionId: string) =>
    ["meditation", "detail", userId, sessionId] as const,
  count: (userId: string) => ["meditation", "count", userId] as const,
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
      await queryClient.invalidateQueries({ queryKey: meditationKeys.all });
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
