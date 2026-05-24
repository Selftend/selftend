import {
  atOrAfter,
  CBT_PROGRAM,
  type ProgramPillar,
  type ProgramSignalData,
} from "@/src/features/cbt/program-definition";
import type { Href } from "expo-router";

import type { ActivityLog } from "@/src/features/activities/types";
import type { CoreBelief } from "@/src/features/beliefs/types";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type { ExposureHierarchy } from "@/src/features/exposure/types";
import type { Goal } from "@/src/features/goals/types";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";
import type { MoodLog } from "@/src/features/mood/types";
import type { ProcrastinationTask } from "@/src/features/procrastination/types";
import type { RecoveryPlan } from "@/src/features/recovery/types";
import type { SelfCareLog } from "@/src/features/self-care/types";
import type { ValuesProfile } from "@/src/features/values/types";

export type ProgramStatus = "not_started" | "in_progress" | "graduated";

export interface DeriveProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  now: number;
  goals: Goal[];
  valuesProfile: ValuesProfile | null;
  thoughtRecords: ThoughtRecord[];
  beliefs: CoreBelief[];
  activities: ActivityLog[];
  exposures: ExposureHierarchy[];
  tasks: ProcrastinationTask[];
  mindfulnessSessions: MindfulnessSession[];
  selfCareLogs: SelfCareLog[];
  moodLogs: MoodLog[];
  recoveryPlan: RecoveryPlan | null;
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

export interface ProgramSummaryStats {
  thoughtRecords: number;
  activitiesCompleted: number;
  goalsSet: number;
  beliefsExamined: number;
}

export interface CbtProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  currentWeekIndex: number;
  totalWeeks: number;
  weeks: ProgramWeekView[];
  weeksComplete: number;
  allWeeksComplete: boolean;
  summaryStats: ProgramSummaryStats;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function deriveCbtProgram(inputData: DeriveProgramInput): CbtProgramView {
  const { startedAt, completedAt, now } = inputData;
  const totalWeeks = CBT_PROGRAM.length;

  if (!startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      currentWeekIndex: 0,
      totalWeeks,
      weeks: [],
      weeksComplete: 0,
      allWeeksComplete: false,
      summaryStats: { thoughtRecords: 0, activitiesCompleted: 0, goalsSet: 0, beliefsExamined: 0 },
    };
  }

  const since = new Date(startedAt).getTime();
  const signalData: ProgramSignalData = {
    since,
    goals: inputData.goals,
    valuesProfile: inputData.valuesProfile,
    thoughtRecords: inputData.thoughtRecords,
    beliefs: inputData.beliefs,
    activities: inputData.activities,
    exposures: inputData.exposures,
    tasks: inputData.tasks,
    mindfulnessSessions: inputData.mindfulnessSessions,
    selfCareLogs: inputData.selfCareLogs,
    moodLogs: inputData.moodLogs,
    recoveryPlan: inputData.recoveryPlan,
  };

  const weeks: ProgramWeekView[] = CBT_PROGRAM.map((week) => {
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

  const summaryStats: ProgramSummaryStats = {
    thoughtRecords: inputData.thoughtRecords.filter((r) => atOrAfter(r.createdAt, since)).length,
    activitiesCompleted: inputData.activities.filter((a) => atOrAfter(a.completedAt, since)).length,
    goalsSet: inputData.goals.filter((g) => atOrAfter(g.createdAt, since)).length,
    beliefsExamined: inputData.beliefs.filter((b) => atOrAfter(b.createdAt, since)).length,
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
