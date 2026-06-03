import {
  atOrAfter,
  CBT_PROGRAM,
  type ProgramSignalData,
  type ProgramTaskDef,
} from "@/src/features/cbt/program-definition";

import type { ActivityLog } from "@/src/features/activities/types";
import type { CoreBelief } from "@/src/features/beliefs/types";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type { ExposureHierarchy } from "@/src/features/exposure/types";
import type { Goal } from "@/src/features/goals/types";
import type { MeditationSession } from "@/src/features/meditation/types";
import type { ProgramStatus, ProgramTaskView } from "@/src/features/modules/program-types";
import type { MoodLog } from "@/src/features/mood/types";
import type { RecoveryPlan } from "@/src/features/recovery/types";
import type { SelfCareLog } from "@/src/features/self-care/types";
import type { ValuesProfile } from "@/src/features/values/types";

export interface DeriveProgramInput {
  startedAt: string | null;
  completedAt: string | null;
  selectedDate: string;
  phaseIndex: number;
  phaseStartedAt: string | null;
  goals: Goal[];
  valuesProfile: ValuesProfile | null;
  thoughtRecords: ThoughtRecord[];
  beliefs: CoreBelief[];
  activities: ActivityLog[];
  exposures: ExposureHierarchy[];
  meditationSessions: MeditationSession[];
  selfCareLogs: SelfCareLog[];
  moodLogs: MoodLog[];
  recoveryPlan: RecoveryPlan | null;
}

interface ProgramSummaryStats {
  thoughtRecords: number;
  activitiesCompleted: number;
  goalsSet: number;
  beliefsExamined: number;
}

export interface CurrentPhaseView {
  key: string;
  themeLabelKey: string;
  themeSubKey?: string;
  themeDescKey?: string;
  milestones: ProgramTaskView[];
  dailyPractice: ProgramTaskView | null;
}

export interface CbtProgramView {
  status: ProgramStatus;
  startedAt: string | null;
  summaryStats: ProgramSummaryStats;
  phaseIndex: number;
  totalPhases: number;
  isLastPhase: boolean;
  phase: CurrentPhaseView | null;
  phaseReady: boolean;
}

function toView(task: ProgramTaskDef, data: ProgramSignalData): ProgramTaskView {
  const { current, target } = task.signal(data);
  return {
    key: task.key,
    labelKey: task.labelKey,
    route: task.route,
    current,
    target,
    done: current >= target,
  };
}

export function deriveCbtProgram(inputData: DeriveProgramInput): CbtProgramView {
  const { startedAt, completedAt } = inputData;
  const totalPhases = CBT_PROGRAM.length;

  if (!startedAt) {
    return {
      status: "not_started",
      startedAt: null,
      summaryStats: { thoughtRecords: 0, activitiesCompleted: 0, goalsSet: 0, beliefsExamined: 0 },
      phaseIndex: 0,
      totalPhases,
      isLastPhase: false,
      phase: null,
      phaseReady: false,
    };
  }

  const since = new Date(startedAt).getTime();
  const signalData: ProgramSignalData = {
    since,
    selectedDate: inputData.selectedDate,
    goals: inputData.goals,
    valuesProfile: inputData.valuesProfile,
    thoughtRecords: inputData.thoughtRecords,
    beliefs: inputData.beliefs,
    activities: inputData.activities,
    exposures: inputData.exposures,
    meditationSessions: inputData.meditationSessions,
    selfCareLogs: inputData.selfCareLogs,
    moodLogs: inputData.moodLogs,
    recoveryPlan: inputData.recoveryPlan,
  };

  const summaryStats: ProgramSummaryStats = {
    thoughtRecords: inputData.thoughtRecords.filter((r) => atOrAfter(r.createdAt, since)).length,
    activitiesCompleted: inputData.activities.filter((a) => atOrAfter(a.completedAt, since)).length,
    goalsSet: inputData.goals.filter((g) => atOrAfter(g.createdAt, since)).length,
    beliefsExamined: inputData.beliefs.filter((b) => atOrAfter(b.createdAt, since)).length,
  };

  const phaseIndex = Math.min(Math.max(inputData.phaseIndex, 0), totalPhases - 1);
  const isLastPhase = phaseIndex === totalPhases - 1;
  const phaseStart = new Date(inputData.phaseStartedAt ?? startedAt).getTime();
  const def = CBT_PROGRAM[phaseIndex];
  const milestoneData: ProgramSignalData = { ...signalData, since: phaseStart };
  const milestones = def.milestones.map((m) => toView(m, milestoneData));
  const dailyPractice = def.dailyPractice ? toView(def.dailyPractice, signalData) : null;
  const phaseReady = milestones.every((m) => m.done);

  const phase: CurrentPhaseView | null = completedAt
    ? null // graduated
    : {
        key: def.key,
        themeLabelKey: def.themeLabelKey,
        themeSubKey: def.themeSubKey,
        themeDescKey: def.themeDescKey,
        milestones,
        dailyPractice,
      };

  return {
    status: completedAt ? "graduated" : "in_progress",
    startedAt,
    summaryStats,
    phaseIndex,
    totalPhases,
    isLastPhase,
    phase,
    phaseReady,
  };
}
