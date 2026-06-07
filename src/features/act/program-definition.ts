import type { Href } from "expo-router";

import { toLocalDateKey } from "@/src/stores/selected-date-store";
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

/** Data the signal functions read. `since` = the current phase's start (ms). */
export interface ActProgramSignalData {
  since: number;
  selectedDate: string; // YYYY-MM-DD (local) for daily-practice tasks
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

interface SignalResult {
  current: number;
  target: number;
}

interface ProgramTaskDef {
  key: string;
  labelKey: string; // i18n key under act:program.tasks
  route: Href;
  signal: (data: ActProgramSignalData) => SignalResult;
}

interface ProgramPhase {
  key: string;
  themeLabelKey: string; // act:pillars.<key>.title
  themeSubKey: string; // act:pillars.<key>.sub
  themeDescKey: string; // act:pillars.<key>.description
  milestones: ProgramTaskDef[];
  dailyPractice?: ProgramTaskDef;
}

export const atOrAfter = (iso: string | null | undefined, since: number) =>
  iso != null && new Date(iso).getTime() >= since;

const countSince = (items: { createdAt: string }[], since: number) =>
  items.filter((item) => atOrAfter(item.createdAt, since)).length;

// 1 if a qualifying event happened on the selected local day, else 0.
const didOnDate = (timestamps: (string | null | undefined)[], date: string) =>
  timestamps.some((ts) => typeof ts === "string" && toLocalDateKey(ts) === date) ? 1 : 0;

export const ACT_PROGRAM: ProgramPhase[] = [
  {
    key: "foundation",
    themeLabelKey: "pillars.foundation.title",
    themeSubKey: "pillars.foundation.sub",
    themeDescKey: "pillars.foundation.description",
    milestones: [
      {
        key: "mapChoicePoint",
        labelKey: "program.tasks.mapChoicePoint",
        route: "/modules/act/choice-point/new",
        signal: ({ choicePoints, since }) => ({
          current: countSince(choicePoints, since),
          target: 1,
        }),
      },
    ],
    dailyPractice: {
      key: "dropAnchorDaily",
      labelKey: "program.tasks.dropAnchorDaily",
      route: "/modules/act/connection/drop-anchor",
      signal: ({ connectionLogs, selectedDate }) => ({
        current: didOnDate(
          connectionLogs.filter((c) => c.technique === "dropAnchor").map((c) => c.createdAt),
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "bePresent",
    themeLabelKey: "pillars.bePresent.title",
    themeSubKey: "pillars.bePresent.sub",
    themeDescKey: "pillars.bePresent.description",
    milestones: [
      {
        key: "observeSelfOnce",
        labelKey: "program.tasks.observeSelfOnce",
        route: "/modules/act/observing-self",
        signal: ({ observingSessions, since }) => ({
          current: countSince(observingSessions, since),
          target: 1,
        }),
      },
    ],
    dailyPractice: {
      key: "bePresentDaily",
      labelKey: "program.tasks.bePresentDaily",
      route: "/modules/act/connection",
      signal: ({ connectionLogs, selectedDate }) => ({
        current: didOnDate(
          connectionLogs.filter((c) => c.technique !== "dropAnchor").map((c) => c.createdAt),
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "openUp",
    themeLabelKey: "pillars.openUp.title",
    themeSubKey: "pillars.openUp.sub",
    themeDescKey: "pillars.openUp.description",
    milestones: [
      {
        key: "unhookOnce",
        labelKey: "program.tasks.unhookOnce",
        route: "/modules/act/defusion",
        signal: ({ defusionLogs, since }) => ({
          current: countSince(defusionLogs, since),
          target: 1,
        }),
      },
      {
        key: "makeRoomOnce",
        labelKey: "program.tasks.makeRoomOnce",
        route: "/modules/act/expansion",
        signal: ({ expansionLogs, urgeSurfLogs, since }) => ({
          current: countSince(expansionLogs, since) + countSince(urgeSurfLogs, since),
          target: 1,
        }),
      },
    ],
    dailyPractice: {
      key: "unhookOrMakeRoomDaily",
      labelKey: "program.tasks.unhookOrMakeRoomDaily",
      route: "/modules/act/defusion",
      signal: ({ defusionLogs, expansionLogs, urgeSurfLogs, selectedDate }) => ({
        current: didOnDate(
          [
            ...defusionLogs.map((d) => d.createdAt),
            ...expansionLogs.map((e) => e.createdAt),
            ...urgeSurfLogs.map((u) => u.createdAt),
          ],
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "doWhatMatters",
    themeLabelKey: "pillars.doWhatMatters.title",
    themeSubKey: "pillars.doWhatMatters.sub",
    themeDescKey: "pillars.doWhatMatters.description",
    milestones: [
      {
        key: "clarifyValue",
        labelKey: "program.tasks.clarifyValue",
        route: "/modules/act/values",
        signal: ({ valueEntries, since }) => ({
          current: valueEntries.filter((v) => atOrAfter(v.updatedAt, since)).length,
          target: 1,
        }),
      },
      {
        key: "commitActionOnce",
        labelKey: "program.tasks.commitActionOnce",
        route: "/modules/act/committed-action/new",
        signal: ({ committedActions, since }) => ({
          current: countSince(committedActions, since),
          target: 1,
        }),
      },
    ],
    dailyPractice: {
      key: "valuesStepDaily",
      labelKey: "program.tasks.valuesStepDaily",
      route: "/modules/act/committed-action",
      signal: ({ actionSteps, selectedDate }) => ({
        current: didOnDate(
          actionSteps.map((s) => s.completedAt),
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
];
