import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMeditationProgramState,
  getMeditationSession,
  listMeditationSessions,
  listStagePracticeNotes,
  saveMeditationSession,
  saveStagePracticeNote,
  upsertMeditationProgramState,
} from "@/src/features/meditation/repository";
import type {
  MeditationProgramStateInput,
  MeditationSessionInput,
} from "@/src/features/meditation/types";

const meditationKeys = {
  all: ["meditation"] as const,
  list: (userId: string) => ["meditation", "list", userId] as const,
  detail: (userId: string, sessionId: string) =>
    ["meditation", "detail", userId, sessionId] as const,
  programState: (userId: string) => ["meditation", "programState", userId] as const,
  notes: (userId: string, stage?: number) =>
    ["meditation", "notes", userId, stage ?? "all"] as const,
};

export function useMeditationSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? meditationKeys.list(userId) : ["meditation", "list", "anonymous"],
    queryFn: () => listMeditationSessions(userId!, limit),
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
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: meditationKeys.list(userId) });
      await queryClient.invalidateQueries({ queryKey: meditationKeys.programState(userId) });
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
