import type { Href } from "expo-router";

import { toLocalDateKey } from "@/src/stores/selected-date-store";
import type { ActivityLog } from "@/src/features/activities/types";
import type { CoreBelief } from "@/src/features/beliefs/types";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import type { ExposureHierarchy } from "@/src/features/exposure/types";
import type { Goal } from "@/src/features/goals/types";
import type { MeditationSession } from "@/src/features/meditation/types";
import type { MoodLog } from "@/src/features/mood/types";
import type { RecoveryPlan } from "@/src/features/recovery/types";
import type { ValuesProfile } from "@/src/features/values/types";

/** All data the signal functions may read. Arrays are the user's full history. */
export interface ProgramSignalData {
  since: number; // Date.now() of program start; only data created at/after counts
  selectedDate: string; // YYYY-MM-DD of the currently viewed date (for daily-practice signals)
  goals: Goal[];
  valuesProfile: ValuesProfile | null;
  thoughtRecords: ThoughtRecord[];
  beliefs: CoreBelief[];
  activities: ActivityLog[];
  exposures: ExposureHierarchy[];
  meditationSessions: MeditationSession[];
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

interface ProgramWeek {
  key: string;
  themeLabelKey: string; // i18n key under cbt:program.weeks.<key>.title
  themeSubKey: string; // i18n key under cbt:program.weeks.<key>.sub
  themeDescKey: string; // i18n key under cbt:program.weeks.<key>.description
  milestones: ProgramTaskDef[];
  dailyPractice?: ProgramTaskDef;
}

export const atOrAfter = (iso: string | null | undefined, since: number) =>
  iso != null && new Date(iso).getTime() >= since;

const countSince = (items: { createdAt: string }[], since: number) =>
  items.filter((item) => atOrAfter(item.createdAt, since)).length;

// True (1) if a qualifying event occurred on the given YYYY-MM-DD; else 0.
const didOnDate = (timestamps: (string | null | undefined)[], date: string) =>
  timestamps.some((ts) => typeof ts === "string" && toLocalDateKey(ts) === date) ? 1 : 0;

// ── Task const definitions ──────────────────────────────────────────────────

const SET_GOALS: ProgramTaskDef = {
  key: "setGoals",
  labelKey: "program.tasks.setGoals",
  route: "/modules/cbt/goals/new",
  signal: ({ goals, since }) => ({ current: countSince(goals, since), target: 1 }),
};

const CLARIFY_VALUES: ProgramTaskDef = {
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
};

const DAILY_NOTICING: ProgramTaskDef = {
  key: "dailyNoticing",
  labelKey: "program.tasks.dailyNoticing",
  route: "/tools/mood-tracker/new",
  signal: ({ moodLogs, selectedDate }) => ({
    current: didOnDate(
      moodLogs
        .filter(
          (m) =>
            m.situation.trim() ||
            m.thoughts.trim() ||
            m.behaviours.trim() ||
            m.bodilySensations.trim(),
        )
        .map((m) => m.loggedAt),
      selectedDate,
    ),
    target: 1,
  }),
};

const EXAMINE_BELIEF: ProgramTaskDef = {
  key: "examineBelief",
  labelKey: "program.tasks.examineBelief",
  route: "/modules/cbt/beliefs",
  signal: ({ beliefs, since }) => ({ current: countSince(beliefs, since) >= 1 ? 1 : 0, target: 1 }),
};

const THOUGHT_RECORD_ONCE: ProgramTaskDef = {
  key: "thoughtRecordOnce",
  labelKey: "program.tasks.thoughtRecordOnce",
  route: "/modules/cbt/new",
  signal: ({ thoughtRecords, since }) => ({
    current: countSince(thoughtRecords, since) >= 1 ? 1 : 0,
    target: 1,
  }),
};

const THOUGHT_RECORD_DAILY: ProgramTaskDef = {
  key: "thoughtRecordDaily",
  labelKey: "program.tasks.thoughtRecordDaily",
  route: "/modules/cbt/new",
  signal: ({ thoughtRecords, selectedDate }) => ({
    current: didOnDate(
      thoughtRecords.map((r) => r.createdAt),
      selectedDate,
    ),
    target: 1,
  }),
};

const ACTIVITY_ONCE: ProgramTaskDef = {
  key: "activityOnce",
  labelKey: "program.tasks.activityOnce",
  route: "/modules/cbt/activities",
  signal: ({ activities, since }) => ({
    current:
      activities.filter((a) => a.completedAt && atOrAfter(a.completedAt, since)).length >= 1
        ? 1
        : 0,
    target: 1,
  }),
};

const ACTIVITY_DAILY: ProgramTaskDef = {
  key: "activityDaily",
  labelKey: "program.tasks.activityDaily",
  route: "/modules/cbt/activities",
  signal: ({ activities, selectedDate }) => ({
    current: didOnDate(
      activities.map((a) => a.completedAt),
      selectedDate,
    ),
    target: 1,
  }),
};

const EXPOSURE_LADDER: ProgramTaskDef = {
  key: "exposureLadder",
  labelKey: "program.tasks.exposureLadder",
  route: "/modules/cbt/exposure",
  signal: ({ exposures, since }) => ({
    current: countSince(exposures, since) >= 1 ? 1 : 0,
    target: 1,
  }),
};

const RESILIENCE_PLAN: ProgramTaskDef = {
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
};

const CALMING_ONCE: ProgramTaskDef = {
  key: "calmingOnce",
  labelKey: "program.tasks.calmingOnce",
  route: "/tools/meditation",
  signal: ({ meditationSessions, since }) => ({
    current: meditationSessions.filter((s) => atOrAfter(s.completedAt, since)).length >= 1 ? 1 : 0,
    target: 1,
  }),
};

const CALMING_DAILY: ProgramTaskDef = {
  key: "calmingDaily",
  labelKey: "program.tasks.calmingDaily",
  route: "/tools/meditation",
  signal: ({ meditationSessions, selectedDate }) => ({
    current: didOnDate(
      meditationSessions.map((s) => s.completedAt),
      selectedDate,
    ),
    target: 1,
  }),
};

// ── Program definition ──────────────────────────────────────────────────────

export const CBT_PROGRAM: ProgramWeek[] = [
  {
    key: "assessment",
    themeLabelKey: "program.weeks.assessment.title",
    themeSubKey: "program.weeks.assessment.sub",
    themeDescKey: "program.weeks.assessment.description",
    milestones: [SET_GOALS, CLARIFY_VALUES],
    dailyPractice: DAILY_NOTICING,
  },
  {
    key: "formulation",
    themeLabelKey: "program.weeks.formulation.title",
    themeSubKey: "program.weeks.formulation.sub",
    themeDescKey: "program.weeks.formulation.description",
    milestones: [EXAMINE_BELIEF],
  },
  {
    key: "thinking",
    themeLabelKey: "program.weeks.thinking.title",
    themeSubKey: "program.weeks.thinking.sub",
    themeDescKey: "program.weeks.thinking.description",
    milestones: [THOUGHT_RECORD_ONCE],
    dailyPractice: THOUGHT_RECORD_DAILY,
  },
  {
    key: "behavioural",
    themeLabelKey: "program.weeks.behavioural.title",
    themeSubKey: "program.weeks.behavioural.sub",
    themeDescKey: "program.weeks.behavioural.description",
    milestones: [ACTIVITY_ONCE, EXPOSURE_LADDER],
    dailyPractice: ACTIVITY_DAILY,
  },
  {
    key: "resilience",
    themeLabelKey: "program.weeks.resilience.title",
    themeSubKey: "program.weeks.resilience.sub",
    themeDescKey: "program.weeks.resilience.description",
    milestones: [RESILIENCE_PLAN, CALMING_ONCE],
    dailyPractice: CALMING_DAILY,
  },
];
