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

export type ProgramPillar = "foundation" | "think" | "act" | "be";

/** All data the signal functions may read. Arrays are the user's full history. */
export interface ProgramSignalData {
  since: number; // Date.now() of program start; only data created at/after counts
  goals: Goal[];
  values: ValuesProfile[];
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

export interface SignalResult {
  current: number;
  target: number;
}

export interface ProgramTaskDef {
  key: string;
  labelKey: string; // i18n key under cbt:program.tasks
  route: Href;
  signal: (data: ProgramSignalData) => SignalResult;
}

export interface ProgramWeek {
  key: string;
  themeLabelKey: string; // i18n key under cbt:program.weeks
  pillar: ProgramPillar;
  tasks: ProgramTaskDef[];
}

export const atOrAfter = (iso: string | null | undefined, since: number) =>
  iso != null && new Date(iso).getTime() >= since;

const countSince = (items: { createdAt: string }[], since: number) =>
  items.filter((item) => atOrAfter(item.createdAt, since)).length;

export const CBT_PROGRAM: ProgramWeek[] = [
  {
    key: "noticeUnderstand",
    themeLabelKey: "program.weeks.noticeUnderstand",
    pillar: "foundation",
    tasks: [
      {
        key: "setGoals",
        labelKey: "program.tasks.setGoals",
        route: "/modules/cbt/goals/new",
        signal: ({ goals, since }) => ({
          current: countSince(goals, since),
          target: 1,
        }),
      },
      {
        key: "clarifyValues",
        labelKey: "program.tasks.clarifyValues",
        route: "/modules/cbt/values",
        signal: ({ values, since }) => ({
          current: values.filter((v) => atOrAfter(v.updatedAt, since)).length,
          target: 1,
        }),
      },
      {
        key: "firstThoughtRecord",
        labelKey: "program.tasks.firstThoughtRecord",
        route: "/modules/cbt/new",
        signal: ({ thoughtRecords, since }) => ({
          current: countSince(thoughtRecords, since),
          target: 1,
        }),
      },
      {
        key: "startMoodCheckIn",
        labelKey: "program.tasks.startMoodCheckIn",
        route: "/tools/mood-tracker/new",
        signal: ({ moodLogs, since }) => ({
          current: moodLogs.filter((m) => atOrAfter(m.loggedAt, since)).length,
          target: 1,
        }),
      },
    ],
  },
  {
    key: "challengeThinking",
    themeLabelKey: "program.weeks.challengeThinking",
    pillar: "think",
    tasks: [
      {
        key: "threeThoughtRecords",
        labelKey: "program.tasks.threeThoughtRecords",
        route: "/modules/cbt/new",
        signal: ({ thoughtRecords, since }) => ({
          current: countSince(thoughtRecords, since),
          target: 3,
        }),
      },
      {
        key: "spotDistortion",
        labelKey: "program.tasks.spotDistortion",
        route: "/modules/cbt/new",
        signal: ({ thoughtRecords, since }) => ({
          current: thoughtRecords.filter(
            (r) => atOrAfter(r.createdAt, since) && r.distortions.length > 0,
          ).length,
          target: 1,
        }),
      },
      {
        key: "examineBelief",
        labelKey: "program.tasks.examineBelief",
        route: "/modules/cbt/beliefs",
        signal: ({ beliefs, since }) => ({
          current: countSince(beliefs, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "actEngage",
    themeLabelKey: "program.weeks.actEngage",
    pillar: "act",
    tasks: [
      {
        key: "scheduleActivities",
        labelKey: "program.tasks.scheduleActivities",
        route: "/modules/cbt/activities/new",
        signal: ({ activities, since }) => ({
          current: countSince(activities, since),
          target: 3,
        }),
      },
      {
        key: "exposureOrTask",
        labelKey: "program.tasks.exposureOrTask",
        route: "/modules/cbt/exposure",
        signal: ({ exposures, tasks, since }) => ({
          current: countSince(exposures, since) + countSince(tasks, since),
          target: 1,
        }),
      },
      {
        key: "completeActivity",
        labelKey: "program.tasks.completeActivity",
        route: "/modules/cbt/activities",
        signal: ({ activities, since }) => ({
          current: activities.filter((a) => atOrAfter(a.completedAt, since)).length,
          target: 1,
        }),
      },
    ],
  },
  {
    key: "sustainBe",
    themeLabelKey: "program.weeks.sustainBe",
    pillar: "be",
    tasks: [
      {
        key: "dailySelfCare",
        labelKey: "program.tasks.dailySelfCare",
        route: "/modules/cbt/self-care",
        signal: ({ selfCareLogs, since }) => ({
          current: countSince(selfCareLogs, since),
          target: 1,
        }),
      },
      {
        key: "beExercise",
        labelKey: "program.tasks.beExercise",
        route: "/tools/mindfulness",
        signal: ({ mindfulnessSessions, since }) => ({
          current: mindfulnessSessions.filter((s) => atOrAfter(s.completedAt, since)).length,
          target: 1,
        }),
      },
      {
        key: "resiliencePlan",
        labelKey: "program.tasks.resiliencePlan",
        route: "/modules/cbt/recovery",
        signal: ({ recoveryPlan, since }) => ({
          current:
            recoveryPlan &&
            atOrAfter(recoveryPlan.updatedAt, since) &&
            recoveryPlan.personalSlogan.trim().length > 0
              ? 1
              : 0,
          target: 1,
        }),
      },
    ],
  },
];
