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

// Number of distinct calendar days (UTC) on which a qualifying event occurred
// at or after the program start. Used for recurring "daily practice" tasks so
// they cannot be completed in a single sitting.
const distinctDays = (timestamps: (string | null | undefined)[], since: number) => {
  const days = new Set<string>();
  for (const ts of timestamps) {
    if (atOrAfter(ts, since)) days.add(new Date(ts as string).toISOString().slice(0, 10));
  }
  return days.size;
};

// Distinct-day target for the recurring "daily practice" in each week. Counted
// across the whole program (not within a fixed week window), so the practice
// can't be cleared in one sitting but a missed week isn't punished.
const DAILY_PRACTICE_TARGET = 4;

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
        signal: ({ valuesProfile, since }) => ({
          current:
            valuesProfile &&
            valuesProfile.priorityValues.length > 0 &&
            atOrAfter(valuesProfile.updatedAt, since)
              ? 1
              : 0,
          target: 1,
        }),
      },
      {
        // Daily practice: fold the old morning/evening check-in into the program.
        key: "dailyMoodCheckIn",
        labelKey: "program.tasks.dailyMoodCheckIn",
        route: "/tools/mood-tracker/new",
        signal: ({ moodLogs, since }) => ({
          current: distinctDays(
            moodLogs.map((m) => m.loggedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
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
        // Daily practice: a thought record on several separate days.
        key: "thoughtRecordDays",
        labelKey: "program.tasks.thoughtRecordDays",
        route: "/modules/cbt/new",
        signal: ({ thoughtRecords, since }) => ({
          current: distinctDays(
            thoughtRecords.map((r) => r.createdAt),
            since,
          ),
          target: 3,
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
        // Daily practice: PACE-style - complete a meaningful activity on
        // several separate days.
        key: "activityDays",
        labelKey: "program.tasks.activityDays",
        route: "/modules/cbt/activities",
        signal: ({ activities, since }) => ({
          current: distinctDays(
            activities.map((a) => a.completedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
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
    ],
  },
  {
    key: "sustainBe",
    themeLabelKey: "program.weeks.sustainBe",
    pillar: "be",
    tasks: [
      {
        // Daily practice: a calming exercise on several separate days.
        key: "calmingDays",
        labelKey: "program.tasks.calmingDays",
        route: "/tools/mindfulness",
        signal: ({ mindfulnessSessions, since }) => ({
          current: distinctDays(
            mindfulnessSessions.map((s) => s.completedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
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
