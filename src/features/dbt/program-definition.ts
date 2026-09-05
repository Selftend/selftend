import type { Href } from "expo-router";

import type {
  CopingPlan,
  DbtSession,
  EmotionRecord,
  Judgement,
  OppositeActionPlan,
  Script,
  WiseMindCheckin,
} from "@/src/features/dbt/types";

/**
 * The DBT programme: four phases on the four skill-group keys, in the book's
 * order (spec §4).
 *
 * The phase keys ARE the home's group keys, and the phase's title, kicker and
 * description are the same strings the group cards render - read from one
 * place, so the programme and the home can never say different things about the
 * same group.
 *
 * ☠️ **A DBT phase reads DBT tables only.** A breathing session, a grounding
 * session, a meditation sit, a journal entry or a thought record appears on
 * these phases as a LINK without a signal - even though CBT's `calmingDaily`
 * counts any meditation row, which would have been the precedent for doing
 * otherwise. A phase that lit from another module's work would tell the person
 * they had practised DBT when they had not.
 *
 * ☠️ **Every signal buckets by the row's OWN captured day**, never by
 * re-deriving the day through the viewer's zone. That is `didOnCapturedDay`,
 * CBT's predicate - never ACT's viewer-local `didOnDate`, which exists only
 * because ACT's tables capture no offset. Every DBT table captures one.
 */

/** Data the signal functions read. `since` = the current phase's start (ms). */
export interface DbtProgramSignalData {
  since: number;
  /** YYYY-MM-DD (local) for the daily-practice tasks. */
  selectedDate: string;
  copingPlan: CopingPlan | null;
  sessions: DbtSession[];
  wiseMindCheckins: WiseMindCheckin[];
  judgements: Judgement[];
  emotionRecords: EmotionRecord[];
  oppositeActionPlans: OppositeActionPlan[];
  scripts: Script[];
}

interface SignalResult {
  current: number;
  target: number;
}

export interface DbtProgramTaskDef {
  key: string;
  /** i18n key under `dbt:program.tasks`. */
  labelKey: string;
  route: Href;
  signal: (data: DbtProgramSignalData) => SignalResult;
}

export interface DbtProgramPhase {
  key: string;
  /** The home's own group strings - one source for both surfaces. */
  themeLabelKey: string;
  themeSubKey: string;
  themeDescKey: string;
  milestones: DbtProgramTaskDef[];
  dailyPractice?: DbtProgramTaskDef;
}

export const atOrAfter = (iso: string | null | undefined, since: number) =>
  iso != null && new Date(iso).getTime() >= since;

/** Rows created at or after a cutoff. */
export const countSince = (items: { createdAt: string }[], since: number) =>
  items.filter((item) => atOrAfter(item.createdAt, since)).length;

/**
 * 1 if a qualifying row names the given day AS ITS OWN, else 0.
 *
 * ☠️ The row's `dayKey` is resolved once, on read, from the instant and the
 * offset captured with it. Comparing a re-derived viewer-local day here would
 * move a person's practice between days when they travel - the exact failure
 * the captured frame exists to prevent, and the reason ACT's predicate is the
 * wrong one to copy.
 */
const didOnCapturedDay = (dayKeys: (string | null | undefined)[], date: string) =>
  dayKeys.some((dayKey) => dayKey === date) ? 1 : 0;

const oneIf = (condition: boolean): SignalResult => ({ current: condition ? 1 : 0, target: 1 });

export const DBT_PROGRAM: DbtProgramPhase[] = [
  {
    key: "distressTolerance",
    themeLabelKey: "groups.distressTolerance.name",
    themeSubKey: "groups.distressTolerance.desc",
    themeDescKey: "groups.distressTolerance.desc",
    milestones: [
      {
        key: "copingPlanReady",
        labelKey: "program.tasks.copingPlanReady",
        route: "/modules/dbt/coping-plan/edit",
        // ☠️ The plan is a singleton, so "one exists" would be true forever
        // after the first build - and a replayed programme would open with its
        // first task already done. What counts is that it was TOUCHED since
        // this phase began, which is what asks a returning person to look at
        // it again (the values-profile precedent).
        signal: ({ copingPlan, since }) => oneIf(atOrAfter(copingPlan?.updatedAt, since)),
      },
      {
        key: "relaxOnce",
        labelKey: "program.tasks.relaxOnce",
        route: "/modules/dbt/sessions/muscle-relaxation",
        signal: ({ sessions, since }) =>
          oneIf(
            sessions.some(
              (session) =>
                session.sessionSlug === "muscle-relaxation" &&
                atOrAfter(session.completedAt, since),
            ),
          ),
      },
    ],
    dailyPractice: {
      key: "relaxDaily",
      labelKey: "program.tasks.relaxDaily",
      route: "/modules/dbt/sessions/muscle-relaxation",
      signal: ({ sessions, selectedDate }) => ({
        current: didOnCapturedDay(
          sessions.map((session) => session.dayKey),
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "mindfulness",
    themeLabelKey: "groups.mindfulness.name",
    themeSubKey: "groups.mindfulness.desc",
    themeDescKey: "groups.mindfulness.desc",
    milestones: [
      {
        key: "wiseMindOnce",
        labelKey: "program.tasks.wiseMindOnce",
        route: "/modules/dbt/wise-mind/new",
        signal: ({ wiseMindCheckins, since }) => oneIf(countSince(wiseMindCheckins, since) > 0),
      },
      {
        key: "judgementOnce",
        labelKey: "program.tasks.judgementOnce",
        route: "/modules/dbt/judgements/new",
        signal: ({ judgements, since }) => oneIf(countSince(judgements, since) > 0),
      },
    ],
    dailyPractice: {
      key: "wiseMindOrJudgementDaily",
      labelKey: "program.tasks.wiseMindOrJudgementDaily",
      route: "/modules/dbt/wise-mind/new",
      signal: ({ wiseMindCheckins, judgements, selectedDate }) => ({
        current: didOnCapturedDay(
          [...wiseMindCheckins, ...judgements].map((row) => row.dayKey),
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "emotionRegulation",
    themeLabelKey: "groups.emotionRegulation.name",
    themeSubKey: "groups.emotionRegulation.desc",
    themeDescKey: "groups.emotionRegulation.desc",
    milestones: [
      {
        key: "emotionRecordOnce",
        labelKey: "program.tasks.emotionRecordOnce",
        route: "/modules/dbt/emotions/new",
        signal: ({ emotionRecords, since }) => oneIf(countSince(emotionRecords, since) > 0),
      },
      {
        key: "oppositeActionDone",
        labelKey: "program.tasks.oppositeActionDone",
        route: "/modules/dbt/opposite-action",
        // ☠️ A plan's EXISTENCE is never the fact. Writing down an opposite
        // action is not doing it, and a milestone that lit on the writing would
        // credit the intention.
        signal: ({ oppositeActionPlans, since }) =>
          oneIf(oppositeActionPlans.some((plan) => atOrAfter(plan.doneAt, since))),
      },
    ],
    dailyPractice: {
      key: "emotionOrOppositeDaily",
      labelKey: "program.tasks.emotionOrOppositeDaily",
      route: "/modules/dbt/emotions/new",
      signal: ({ emotionRecords, oppositeActionPlans, selectedDate }) => ({
        current: didOnCapturedDay(
          [
            ...emotionRecords.map((record) => record.dayKey),
            ...oppositeActionPlans.map((plan) => plan.doneDayKey),
          ],
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
  {
    key: "interpersonal",
    themeLabelKey: "groups.interpersonal.name",
    themeSubKey: "groups.interpersonal.desc",
    themeDescKey: "groups.interpersonal.desc",
    milestones: [
      {
        key: "scriptWrittenOnce",
        labelKey: "program.tasks.scriptWrittenOnce",
        route: "/modules/dbt/scripts/new",
        signal: ({ scripts, since }) => oneIf(countSince(scripts, since) > 0),
      },
      {
        key: "scriptDoneOnce",
        labelKey: "program.tasks.scriptDoneOnce",
        route: "/modules/dbt/scripts",
        signal: ({ scripts, since }) =>
          oneIf(scripts.some((script) => atOrAfter(script.doneAt, since))),
      },
    ],
    dailyPractice: {
      key: "anyDbtRecordDaily",
      labelKey: "program.tasks.anyDbtRecordDaily",
      route: "/modules/dbt",
      // Any DBT record or completed session names today. ☠️ The coping plan is
      // NOT a daily fact: its `updatedAt` moves when someone reorders a list,
      // which is not a day's practice.
      signal: ({
        sessions,
        wiseMindCheckins,
        judgements,
        emotionRecords,
        oppositeActionPlans,
        scripts,
        selectedDate,
      }) => ({
        current: didOnCapturedDay(
          [
            ...sessions.map((row) => row.dayKey),
            ...wiseMindCheckins.map((row) => row.dayKey),
            ...judgements.map((row) => row.dayKey),
            ...emotionRecords.map((row) => row.dayKey),
            ...oppositeActionPlans.map((row) => row.doneDayKey),
            ...scripts.map((row) => row.dayKey),
            ...scripts.map((row) => row.doneDayKey),
          ],
          selectedDate,
        ),
        target: 1,
      }),
    },
  },
];
