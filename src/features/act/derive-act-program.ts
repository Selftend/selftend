import {
  atOrAfter,
  ACT_PROGRAM,
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
  ProgramPillar,
} from "@/src/features/act/types";

export type ProgramStatus = "not_started" | "in_progress" | "graduated";

export interface DeriveActProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  now: number;
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

export interface ProgramWeekView {
  key: string;
  themeLabelKey: string;
  pillar: ProgramPillar;
  tasks: ProgramTaskView[];
  done: boolean;
}

export interface ActProgramSummaryStats {
  choicePoints: number;
  defusionLogs: number;
  expansionLogs: number;
  committedActions: number;
}

export interface ActProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  currentWeekIndex: number;
  totalWeeks: number;
  weeks: ProgramWeekView[];
  weeksComplete: number;
  allWeeksComplete: boolean;
  summaryStats: ActProgramSummaryStats;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function deriveActProgram(inputData: DeriveActProgramInput): ActProgramView {
  const { startedAt, completedAt, now } = inputData;
  const totalWeeks = ACT_PROGRAM.length;

  const emptyStats: ActProgramSummaryStats = {
    choicePoints: 0,
    defusionLogs: 0,
    expansionLogs: 0,
    committedActions: 0,
  };

  if (!startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      currentWeekIndex: 0,
      totalWeeks,
      weeks: [],
      weeksComplete: 0,
      allWeeksComplete: false,
      summaryStats: emptyStats,
    };
  }

  const since = new Date(startedAt).getTime();
  const signalData: ActProgramSignalData = {
    since,
    choicePoints: inputData.choicePoints,
    valueEntries: inputData.valueEntries,
    connectionLogs: inputData.connectionLogs,
    observingSessions: inputData.observingSessions,
    defusionLogs: inputData.defusionLogs,
    expansionLogs: inputData.expansionLogs,
    urgeSurfLogs: inputData.urgeSurfLogs,
    committedActions: inputData.committedActions,
    actionSteps: inputData.actionSteps,
  };

  const weeks: ProgramWeekView[] = ACT_PROGRAM.map((week) => {
    const tasks: ProgramTaskView[] = week.tasks.map((task) => {
      const { current, target } = task.signal(signalData);
      return {
        key: task.key,
        labelKey: task.labelKey,
        route: task.route,
        current,
        target,
        done: current >= target,
      };
    });
    return {
      key: week.key,
      themeLabelKey: week.themeLabelKey,
      pillar: week.pillar,
      tasks,
      done: tasks.every((t) => t.done),
    };
  });

  const weeksComplete = weeks.filter((w) => w.done).length;
  const allWeeksComplete = weeksComplete === totalWeeks;

  const daysSinceStart = Math.floor((now - since) / MS_PER_DAY);
  const currentWeekIndex = Math.min(Math.max(Math.floor(daysSinceStart / 7), 0), totalWeeks - 1);

  const summaryStats: ActProgramSummaryStats = {
    choicePoints: inputData.choicePoints.filter((c) => atOrAfter(c.createdAt, since)).length,
    defusionLogs: inputData.defusionLogs.filter((d) => atOrAfter(d.createdAt, since)).length,
    expansionLogs: inputData.expansionLogs.filter((e) => atOrAfter(e.createdAt, since)).length,
    committedActions: inputData.committedActions.filter((a) => atOrAfter(a.createdAt, since))
      .length,
  };

  return {
    status: completedAt ? "graduated" : "in_progress",
    startedAt,
    currentWeekIndex,
    totalWeeks,
    weeks,
    weeksComplete,
    allWeeksComplete,
    summaryStats,
  };
}
