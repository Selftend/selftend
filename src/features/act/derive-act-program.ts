import {
  ACT_PROGRAM,
  atOrAfter,
  type ActProgramSignalData,
} from "@/src/features/act/program-definition";
import type { Href } from "expo-router";
import type {
  ChoicePoint,
  CommittedAction,
  ActionStep,
  ConnectionLog,
  DefusionLog,
  ExpansionLog,
  ObservingSelfSession,
  UrgeSurfLog,
  ValueEntry,
} from "@/src/features/act/types";

export type ProgramStatus = "not_started" | "in_progress" | "graduated";

export interface DeriveActProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  selectedDate: string;
  phaseIndex: number;
  phaseStartedAt: string | null;
  choicePoints: ChoicePoint[];
  valueEntries: ValueEntry[];
  connectionLogs: ConnectionLog[];
  observingSessions: ObservingSelfSession[];
  defusionLogs: DefusionLog[];
  expansionLogs: ExpansionLog[];
  urgeSurfLogs: UrgeSurfLog[];
  committedActions: CommittedAction[];
  actionSteps: ActionStep[];
}

export interface ProgramTaskView {
  key: string;
  labelKey: string;
  route: Href;
  current: number;
  target: number;
  done: boolean;
}

export interface CurrentActPhaseView {
  key: string;
  themeLabelKey: string;
  themeSubKey: string;
  themeDescKey: string;
  milestones: ProgramTaskView[];
  dailyPractice: ProgramTaskView | null;
}

interface ActProgramSummaryStats {
  choicePoints: number;
  defusionLogs: number;
  expansionLogs: number;
  committedActions: number;
}

export interface ActProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  phaseIndex: number;
  totalPhases: number;
  isLastPhase: boolean;
  phase: CurrentActPhaseView | null;
  phaseReady: boolean;
  summaryStats: ActProgramSummaryStats;
}

function buildSignalData(input: DeriveActProgramInput, since: number): ActProgramSignalData {
  return {
    since,
    selectedDate: input.selectedDate,
    choicePoints: input.choicePoints,
    valueEntries: input.valueEntries,
    connectionLogs: input.connectionLogs,
    observingSessions: input.observingSessions,
    defusionLogs: input.defusionLogs,
    expansionLogs: input.expansionLogs,
    urgeSurfLogs: input.urgeSurfLogs,
    committedActions: input.committedActions,
    actionSteps: input.actionSteps,
  };
}

export function deriveActProgram(input: DeriveActProgramInput): ActProgramView {
  const totalPhases = ACT_PROGRAM.length;
  const startedSince = input.startedAt ? new Date(input.startedAt).getTime() : 0;
  const summaryStats: ActProgramSummaryStats = {
    choicePoints: input.choicePoints.filter((c) => atOrAfter(c.createdAt, startedSince)).length,
    defusionLogs: input.defusionLogs.filter((d) => atOrAfter(d.createdAt, startedSince)).length,
    expansionLogs: input.expansionLogs.filter((e) => atOrAfter(e.createdAt, startedSince)).length,
    committedActions: input.committedActions.filter((a) => atOrAfter(a.createdAt, startedSince))
      .length,
  };

  if (!input.startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      phaseIndex: 0,
      totalPhases,
      isLastPhase: false,
      phase: null,
      phaseReady: false,
      summaryStats,
    };
  }
  if (input.completedAt) {
    return {
      status: "graduated",
      startedAt: input.startedAt,
      phaseIndex: input.phaseIndex,
      totalPhases,
      isLastPhase: input.phaseIndex >= totalPhases - 1,
      phase: null,
      phaseReady: false,
      summaryStats,
    };
  }

  const phaseIndex = Math.min(Math.max(input.phaseIndex, 0), totalPhases - 1);
  const def = ACT_PROGRAM[phaseIndex];
  const since = new Date(input.phaseStartedAt ?? input.startedAt).getTime();
  const data = buildSignalData(input, since);

  const toView = (task: {
    key: string;
    labelKey: string;
    route: Href;
    signal: (d: ActProgramSignalData) => { current: number; target: number };
  }): ProgramTaskView => {
    const { current, target } = task.signal(data);
    return {
      key: task.key,
      labelKey: task.labelKey,
      route: task.route,
      current,
      target,
      done: current >= target,
    };
  };

  const milestones = def.milestones.map(toView);
  const dailyPractice = def.dailyPractice ? toView(def.dailyPractice) : null;
  const phaseReady = milestones.every((m) => m.done);

  return {
    status: "in_progress",
    startedAt: input.startedAt,
    phaseIndex,
    totalPhases,
    isLastPhase: phaseIndex >= totalPhases - 1,
    phase: {
      key: def.key,
      themeLabelKey: def.themeLabelKey,
      themeSubKey: def.themeSubKey,
      themeDescKey: def.themeDescKey,
      milestones,
      dailyPractice,
    },
    phaseReady,
    summaryStats,
  };
}
