import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteActionStep,
  deleteCommittedAction,
  deleteConnectionLog,
  deleteDefusionLog,
  deleteExpansionLog,
  deleteObservingSelfSession,
  deleteUrgeSurfLog,
  getACTProgramState,
  getCommittedAction,
  getConnectionLog,
  getDefusionLog,
  getExpansionLog,
  getObservingSelfSession,
  getValueEntryByDomain,
  listActionSteps,
  listBullsEyeSnapshots,
  listCommittedActions,
  listConnectionLogs,
  listDefusionLogs,
  listExpansionLogs,
  listObservingSelfSessions,
  listUrgeSurfLogs,
  listValueEntries,
  saveBullsEyeSnapshot,
  saveActionStep,
  saveCommittedAction,
  saveConnectionLog,
  saveDefusionLog,
  saveExpansionLog,
  saveObservingSelfSession,
  saveUrgeSurfLog,
  toggleActionStep,
  updateCommittedAction,
  upsertACTProgramState,
  upsertValueEntry,
} from "@/src/features/act/repository";
import type {
  ACTLifeDomain,
  ACTProgramStateInput,
  ActionStatus,
  ActionStepInput,
  BullsEyeSnapshotInput,
  CommittedActionInput,
  CommittedActionPatch,
  ConnectionLogInput,
  DefusionLogInput,
  ExpansionLogInput,
  ObservingSelfSessionInput,
  UrgeSurfLogInput,
  ValueEntryInput,
} from "@/src/features/act/types";

const actKeys = {
  all: ["act"] as const,
  programState: (userId: string) => ["act", "programState", userId] as const,
  defusionList: (userId: string) => ["act", "defusion", "list", userId] as const,
  defusionDetail: (userId: string, logId: string) =>
    ["act", "defusion", "detail", userId, logId] as const,
  expansionList: (userId: string) => ["act", "expansion", "list", userId] as const,
  expansionDetail: (userId: string, logId: string) =>
    ["act", "expansion", "detail", userId, logId] as const,
  urgeSurfList: (userId: string) => ["act", "urgeSurf", "list", userId] as const,
  connectionList: (userId: string) => ["act", "connection", "list", userId] as const,
  connectionDetail: (userId: string, logId: string) =>
    ["act", "connection", "detail", userId, logId] as const,
  observingList: (userId: string) => ["act", "observing", "list", userId] as const,
  observingDetail: (userId: string, sessionId: string) =>
    ["act", "observing", "detail", userId, sessionId] as const,
  valuesList: (userId: string) => ["act", "values", "list", userId] as const,
  valueDomain: (userId: string, domain: string) =>
    ["act", "values", "domain", userId, domain] as const,
  bullsEyeList: (userId: string) => ["act", "bullsEye", "list", userId] as const,
  committedActionList: (userId: string, status?: ActionStatus) =>
    ["act", "committedAction", "list", userId, status] as const,
  committedActionDetail: (userId: string, actionId: string) =>
    ["act", "committedAction", "detail", userId, actionId] as const,
  actionStepList: (userId: string, actionId: string) =>
    ["act", "actionStep", "list", userId, actionId] as const,
};

export function useACTProgramState(userId: string | null) {
  return useQuery({
    queryKey: userId ? actKeys.programState(userId) : ["act", "programState", "anonymous"],
    queryFn: () => getACTProgramState(userId!),
    enabled: Boolean(userId),
  });
}

export function useUpsertACTProgramState(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ACTProgramStateInput) => upsertACTProgramState(userId!, patch),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.programState(userId) });
    },
  });
}

export function useDefusionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? actKeys.defusionList(userId) : ["act", "defusion", "list", "anonymous"],
    queryFn: () => listDefusionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useDefusionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey:
      userId && logId
        ? actKeys.defusionDetail(userId, logId)
        : ["act", "defusion", "detail", "anonymous"],
    queryFn: () => getDefusionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveDefusionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DefusionLogInput) => saveDefusionLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.defusionList(userId) });
    },
  });
}

export function useDeleteDefusionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteDefusionLog(userId!, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.defusionList(userId) });
    },
  });
}

// ─── Expansion ────────────────────────────────────────────────────────────────

export function useExpansionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? actKeys.expansionList(userId) : ["act", "expansion", "list", "anonymous"],
    queryFn: () => listExpansionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useExpansionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey:
      userId && logId
        ? actKeys.expansionDetail(userId, logId)
        : ["act", "expansion", "detail", "anonymous"],
    queryFn: () => getExpansionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveExpansionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpansionLogInput) => saveExpansionLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.expansionList(userId) });
    },
  });
}

export function useDeleteExpansionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteExpansionLog(userId!, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.expansionList(userId) });
    },
  });
}

// ─── Urge Surfing ─────────────────────────────────────────────────────────────

export function useUrgeSurfLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? actKeys.urgeSurfList(userId) : ["act", "urgeSurf", "list", "anonymous"],
    queryFn: () => listUrgeSurfLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useSaveUrgeSurfLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UrgeSurfLogInput) => saveUrgeSurfLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.urgeSurfList(userId) });
    },
  });
}

export function useDeleteUrgeSurfLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteUrgeSurfLog(userId!, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.urgeSurfList(userId) });
    },
  });
}

// ─── Connection ───────────────────────────────────────────────────────────────

export function useConnectionLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? actKeys.connectionList(userId) : ["act", "connection", "list", "anonymous"],
    queryFn: () => listConnectionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useConnectionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey:
      userId && logId
        ? actKeys.connectionDetail(userId, logId)
        : ["act", "connection", "detail", "anonymous"],
    queryFn: () => getConnectionLog(userId!, logId!),
    enabled: Boolean(userId) && Boolean(logId),
  });
}

export function useSaveConnectionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectionLogInput) => saveConnectionLog(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.connectionList(userId) });
    },
  });
}

export function useDeleteConnectionLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => deleteConnectionLog(userId!, logId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.connectionList(userId) });
    },
  });
}

// ─── Observing Self ───────────────────────────────────────────────────────────

export function useObservingSelfSessions(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? actKeys.observingList(userId) : ["act", "observing", "list", "anonymous"],
    queryFn: () => listObservingSelfSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useObservingSelfSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey:
      userId && sessionId
        ? actKeys.observingDetail(userId, sessionId)
        : ["act", "observing", "detail", "anonymous"],
    queryFn: () => getObservingSelfSession(userId!, sessionId!),
    enabled: Boolean(userId) && Boolean(sessionId),
  });
}

export function useSaveObservingSelfSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ObservingSelfSessionInput) => saveObservingSelfSession(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.observingList(userId) });
    },
  });
}

export function useDeleteObservingSelfSession(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteObservingSelfSession(userId!, sessionId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.observingList(userId) });
    },
  });
}

// ─── Values ───────────────────────────────────────────────────────────────────

export function useValueEntries(userId: string | null) {
  return useQuery({
    queryKey: userId ? actKeys.valuesList(userId) : ["act", "values", "list", "anonymous"],
    queryFn: () => listValueEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useValueEntryByDomain(userId: string | null, domain: ACTLifeDomain | null) {
  return useQuery({
    queryKey:
      userId && domain
        ? actKeys.valueDomain(userId, domain)
        : ["act", "values", "domain", "anonymous"],
    queryFn: () => getValueEntryByDomain(userId!, domain!),
    enabled: Boolean(userId) && Boolean(domain),
  });
}

export function useUpsertValueEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ValueEntryInput) => upsertValueEntry(userId!, input),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.valuesList(userId) });
      await queryClient.invalidateQueries({
        queryKey: actKeys.valueDomain(userId, data.lifeDomain),
      });
    },
  });
}

export function useBullsEyeSnapshots(userId: string | null) {
  return useQuery({
    queryKey: userId ? actKeys.bullsEyeList(userId) : ["act", "bullsEye", "list", "anonymous"],
    queryFn: () => listBullsEyeSnapshots(userId!),
    enabled: Boolean(userId),
  });
}

export function useSaveBullsEyeSnapshot(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BullsEyeSnapshotInput) => saveBullsEyeSnapshot(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.bullsEyeList(userId) });
    },
  });
}

// ─── Committed Action ─────────────────────────────────────────────────────────

export function useCommittedActions(userId: string | null, status?: ActionStatus) {
  return useQuery({
    queryKey: userId
      ? actKeys.committedActionList(userId, status)
      : ["act", "committedAction", "list", "anonymous"],
    queryFn: () => listCommittedActions(userId!, status),
    enabled: Boolean(userId),
  });
}

export function useCommittedAction(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey:
      userId && actionId
        ? actKeys.committedActionDetail(userId, actionId)
        : ["act", "committedAction", "detail", "anonymous"],
    queryFn: () => getCommittedAction(userId!, actionId!),
    enabled: Boolean(userId) && Boolean(actionId),
  });
}

export function useSaveCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommittedActionInput) => saveCommittedAction(userId!, input),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: ["act", "committedAction", "list", userId] });
    },
  });
}

export function useUpdateCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actionId, patch }: { actionId: string; patch: CommittedActionPatch }) =>
      updateCommittedAction(userId!, actionId, patch),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: ["act", "committedAction", "list", userId] });
      await queryClient.invalidateQueries({
        queryKey: actKeys.committedActionDetail(userId, data.id),
      });
    },
  });
}

export function useDeleteCommittedAction(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => deleteCommittedAction(userId!, actionId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: ["act", "committedAction", "list", userId] });
    },
  });
}

// ─── Action Steps ─────────────────────────────────────────────────────────────

export function useActionSteps(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey:
      userId && actionId
        ? actKeys.actionStepList(userId, actionId)
        : ["act", "actionStep", "list", "anonymous"],
    queryFn: () => listActionSteps(userId!, actionId!),
    enabled: Boolean(userId) && Boolean(actionId),
  });
}

export function useSaveActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActionStepInput) => saveActionStep(userId!, input),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, data.actionId),
      });
    },
  });
}

export function useToggleActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      stepId,
      completed,
      actionId,
    }: {
      stepId: string;
      completed: boolean;
      actionId: string;
    }) => toggleActionStep(userId!, stepId, completed),
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, data.actionId),
      });
    },
  });
}

export function useDeleteActionStep(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, actionId }: { stepId: string; actionId: string }) =>
      deleteActionStep(userId!, stepId),
    onSuccess: async (_data, variables) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, variables.actionId),
      });
    },
  });
}
