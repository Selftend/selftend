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

const u = (userId: string | null) => userId ?? "anonymous";

const actKeys = {
  all: ["act"] as const,
  programState: (userId: string | null) => ["act", "programState", u(userId)] as const,
  defusionList: (userId: string | null) => ["act", "defusion", "list", u(userId)] as const,
  defusionDetail: (userId: string | null, logId: string | null) =>
    ["act", "defusion", "detail", u(userId), u(logId)] as const,
  expansionList: (userId: string | null) => ["act", "expansion", "list", u(userId)] as const,
  expansionDetail: (userId: string | null, logId: string | null) =>
    ["act", "expansion", "detail", u(userId), u(logId)] as const,
  urgeSurfList: (userId: string | null) => ["act", "urgeSurf", "list", u(userId)] as const,
  connectionList: (userId: string | null) => ["act", "connection", "list", u(userId)] as const,
  connectionDetail: (userId: string | null, logId: string | null) =>
    ["act", "connection", "detail", u(userId), u(logId)] as const,
  observingList: (userId: string | null) => ["act", "observing", "list", u(userId)] as const,
  observingDetail: (userId: string | null, sessionId: string | null) =>
    ["act", "observing", "detail", u(userId), u(sessionId)] as const,
  valuesList: (userId: string | null) => ["act", "values", "list", u(userId)] as const,
  valueDomain: (userId: string | null, domain: string | null) =>
    ["act", "values", "domain", u(userId), u(domain)] as const,
  bullsEyeList: (userId: string | null) => ["act", "bullsEye", "list", u(userId)] as const,
  committedActionList: (userId: string | null, status?: ActionStatus) =>
    ["act", "committedAction", "list", u(userId), status] as const,
  // Prefix matcher used by mutations to invalidate every status filter at once.
  committedActionListPrefix: (userId: string | null) =>
    ["act", "committedAction", "list", u(userId)] as const,
  committedActionDetail: (userId: string | null, actionId: string | null) =>
    ["act", "committedAction", "detail", u(userId), u(actionId)] as const,
  actionStepList: (userId: string | null, actionId: string | null) =>
    ["act", "actionStep", "list", u(userId), u(actionId)] as const,
};

export function useACTProgramState(userId: string | null) {
  return useQuery({
    queryKey: actKeys.programState(userId),
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
    queryKey: actKeys.defusionList(userId),
    queryFn: () => listDefusionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useDefusionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.defusionDetail(userId, logId),
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
    queryKey: actKeys.expansionList(userId),
    queryFn: () => listExpansionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useExpansionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.expansionDetail(userId, logId),
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
    queryKey: actKeys.urgeSurfList(userId),
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
    queryKey: actKeys.connectionList(userId),
    queryFn: () => listConnectionLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useConnectionLog(userId: string | null, logId: string | null) {
  return useQuery({
    queryKey: actKeys.connectionDetail(userId, logId),
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
    queryKey: actKeys.observingList(userId),
    queryFn: () => listObservingSelfSessions(userId!, limit),
    enabled: Boolean(userId),
  });
}

export function useObservingSelfSession(userId: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: actKeys.observingDetail(userId, sessionId),
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
    queryKey: actKeys.valuesList(userId),
    queryFn: () => listValueEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useValueEntryByDomain(userId: string | null, domain: ACTLifeDomain | null) {
  return useQuery({
    queryKey: actKeys.valueDomain(userId, domain),
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
    queryKey: actKeys.bullsEyeList(userId),
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
    queryKey: actKeys.committedActionList(userId, status),
    queryFn: () => listCommittedActions(userId!, status),
    enabled: Boolean(userId),
  });
}

export function useCommittedAction(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey: actKeys.committedActionDetail(userId, actionId),
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
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
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
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
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
      await queryClient.invalidateQueries({ queryKey: actKeys.committedActionListPrefix(userId) });
    },
  });
}

// ─── Action Steps ─────────────────────────────────────────────────────────────

export function useActionSteps(userId: string | null, actionId: string | null) {
  return useQuery({
    queryKey: actKeys.actionStepList(userId, actionId),
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
    mutationFn: ({ stepId, completed }: { stepId: string; completed: boolean; actionId: string }) =>
      toggleActionStep(userId!, stepId, completed),
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
    mutationFn: ({ stepId }: { stepId: string; actionId: string }) =>
      deleteActionStep(userId!, stepId),
    onSuccess: async (_data, variables) => {
      if (!userId) return;
      await queryClient.invalidateQueries({
        queryKey: actKeys.actionStepList(userId, variables.actionId),
      });
    },
  });
}
