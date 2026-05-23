import type { Href } from "expo-router";

import type {
  ChoicePoint,
  CommittedAction,
  ActionStep,
  ConnectionLog,
  DefusionLog,
  ExpansionLog,
  ObservingSelfSession,
  ProgramPillar,
  UrgeSurfLog,
  ValueEntry,
} from "@/src/features/act/types";

/** All data the signal functions may read. Arrays are the user's full history. */
export interface ActProgramSignalData {
  since: number; // Date.now() of program start; only data created at/after counts
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

export interface SignalResult {
  current: number;
  target: number;
}

export interface ProgramTaskDef {
  key: string;
  labelKey: string; // i18n key under act:program.tasks
  route: Href;
  signal: (data: ActProgramSignalData) => SignalResult;
}

export interface ProgramWeek {
  key: string;
  themeLabelKey: string; // i18n key under act:program.weeks
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

const DAILY_PRACTICE_TARGET = 4;

// The program follows the structure of The Happiness Trap (2nd ed): a Foundation
// week (the Choice Point + Dropping Anchor, the book's first daily skill), then
// the three pillars - Be Present, Open Up, Do What Matters. There is no mood
// tracking: ACT teaches getting better at feeling, not monitoring/improving mood.
export const ACT_PROGRAM: ProgramWeek[] = [
  {
    key: "foundation",
    themeLabelKey: "program.weeks.foundation",
    pillar: "foundation",
    tasks: [
      {
        // Ch 5: Dropping Anchor is the book's first practical skill, meant to be
        // practiced repeatedly throughout the day. Drop anchor is logged as a
        // connection entry with technique "dropAnchor".
        key: "dropAnchorDays",
        labelKey: "program.tasks.dropAnchorDays",
        route: "/modules/act/connection/drop-anchor",
        signal: ({ connectionLogs, since }) => ({
          current: distinctDays(
            connectionLogs.filter((c) => c.technique === "dropAnchor").map((c) => c.createdAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
        }),
      },
      {
        // Ch 2: map the toward/away moves and the hooks.
        key: "mapChoicePoint",
        labelKey: "program.tasks.mapChoicePoint",
        route: "/modules/act/choice-point/new",
        signal: ({ choicePoints, since }) => ({
          current: countSince(choicePoints, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "bePresent",
    themeLabelKey: "program.weeks.bePresent",
    pillar: "bePresent",
    tasks: [
      {
        // Ch 16-17: bring full attention to the present. Counts present-moment
        // connection practices (anything other than dropAnchor, which belongs to
        // the Foundation week's daily).
        key: "bePresentDays",
        labelKey: "program.tasks.bePresentDays",
        route: "/modules/act/connection",
        signal: ({ connectionLogs, since }) => ({
          current: distinctDays(
            connectionLogs.filter((c) => c.technique !== "dropAnchor").map((c) => c.createdAt),
            since,
          ),
          target: 3,
        }),
      },
      {
        // Ch 9, 19: the observing/noticing self.
        key: "observeSelf",
        labelKey: "program.tasks.observeSelf",
        route: "/modules/act/observing-self",
        signal: ({ observingSessions, since }) => ({
          current: countSince(observingSessions, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "openUp",
    themeLabelKey: "program.weeks.openUp",
    pillar: "openUp",
    tasks: [
      {
        // Ch 6-8: unhook from thoughts (defusion).
        key: "unhookThoughtDays",
        labelKey: "program.tasks.unhookThoughtDays",
        route: "/modules/act/defusion",
        signal: ({ defusionLogs, since }) => ({
          current: distinctDays(
            defusionLogs.map((d) => d.createdAt),
            since,
          ),
          target: 3,
        }),
      },
      {
        // Ch 12-15: make room for a feeling (TAME) or surf an urge.
        key: "makeRoomOrSurf",
        labelKey: "program.tasks.makeRoomOrSurf",
        route: "/modules/act/expansion",
        signal: ({ expansionLogs, urgeSurfLogs, since }) => ({
          current: countSince(expansionLogs, since) + countSince(urgeSurfLogs, since),
          target: 1,
        }),
      },
    ],
  },
  {
    key: "doWhatMatters",
    themeLabelKey: "program.weeks.doWhatMatters",
    pillar: "doWhatMatters",
    tasks: [
      {
        // Ch 23, 27: take values-guided steps and keep them going (a completed
        // action step on several separate days).
        key: "valuesStepDays",
        labelKey: "program.tasks.valuesStepDays",
        route: "/modules/act/committed-action",
        signal: ({ actionSteps, since }) => ({
          current: distinctDays(
            actionSteps.map((s) => s.completedAt),
            since,
          ),
          target: DAILY_PRACTICE_TARGET,
        }),
      },
      {
        // Ch 22: clarify what matters (a value entry, e.g. via the Bull's-Eye).
        key: "clarifyValue",
        labelKey: "program.tasks.clarifyValue",
        route: "/modules/act/values",
        signal: ({ valueEntries, since }) => ({
          current: valueEntries.filter((v) => atOrAfter(v.updatedAt, since)).length,
          target: 1,
        }),
      },
      {
        // Ch 23: set a committed-action plan. Phase 3 replaces this capstone with
        // the maintenance plan (the 7 R's).
        key: "buildActionPlan",
        labelKey: "program.tasks.buildActionPlan",
        route: "/modules/act/committed-action/new",
        signal: ({ committedActions, since }) => ({
          current: countSince(committedActions, since),
          target: 1,
        }),
      },
    ],
  },
];
