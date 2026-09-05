import { type Href } from "expo-router";

import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { type SharedTool } from "@/src/components/app/shared-tools-row";

/**
 * The four skill groups, in the book's order, and what sits under each on the
 * module home (spec §8.2/§8.3).
 *
 * The order is the book's and the programme's - the same four are the four
 * phases - so it is declared once here and read by both. The badge is the
 * group's ORDINAL, never a colour: `PillarCard` takes it as its `letter`, which
 * is CBT's "T/A/B" and ACT's "1-4" slot, and DBT's is the number.
 */
export type DbtGroupKey =
  "distressTolerance" | "mindfulness" | "emotionRegulation" | "interpersonal";

/**
 * The `[group]` segment of a learn page. Kept beside the key rather than derived
 * from it: a slug is a URL that outlives a rename, so it is data, not a
 * transformation of a symbol.
 */
export const DBT_GROUP_SLUGS: Record<DbtGroupKey, string> = {
  distressTolerance: "distress-tolerance",
  mindfulness: "mindfulness",
  emotionRegulation: "emotion-regulation",
  interpersonal: "interpersonal",
};

/** The reverse lookup a route's `[group]` param needs. */
export const DBT_GROUP_BY_SLUG: Record<string, DbtGroupKey> = Object.fromEntries(
  Object.entries(DBT_GROUP_SLUGS).map(([key, slug]) => [slug, key as DbtGroupKey]),
) as Record<string, DbtGroupKey>;

export interface DbtTool {
  key: string;
  route: Href;
  icon: MaterialIconName;
}

export interface DbtGroup {
  key: DbtGroupKey;
  /**
   * The group's own tools, in the order the design draws them. A tool joins this
   * list in the slice that BUILDS it - a row pointing at a route that does not
   * exist yet would land the reader on `+not-found`, and the module home is the
   * one surface where a dead end is least forgivable. The `learn` row is not
   * here: it renders last on every card, from `DBT_GROUP_SLUGS`.
   */
  tools: DbtTool[];
  /**
   * The everyday tools this group draws on (spec §8.2, CBT's `Shared tools`
   * row). A chip leaves the module, so its Up climbs to `/tools` rather than
   * back here - that is `SharedToolsRow`'s standing trade, unchanged.
   */
  shared: SharedTool[];
}

const JOURNAL: SharedTool = {
  key: "journal",
  route: "/tools/journal",
  icon: "edit-note",
  labelKey: "navigation:sidebar.journal",
};

const MEDITATION: SharedTool = {
  key: "meditation",
  route: "/tools/meditation",
  icon: "self-improvement",
  labelKey: "navigation:sidebar.meditation",
};

export const DBT_GROUPS: DbtGroup[] = [
  {
    key: "distressTolerance",
    tools: [],
    shared: [
      {
        key: "breathing",
        route: "/tools/breathing",
        icon: "air",
        labelKey: "navigation:sidebar.breathing",
      },
      {
        key: "grounding",
        route: "/tools/grounding",
        icon: "anchor",
        labelKey: "navigation:sidebar.grounding",
      },
      MEDITATION,
    ],
  },
  {
    key: "mindfulness",
    tools: [],
    shared: [MEDITATION, JOURNAL],
  },
  {
    key: "emotionRegulation",
    tools: [],
    shared: [
      {
        key: "checkIn",
        route: "/tools/check-in",
        icon: "mood",
        labelKey: "navigation:sidebar.moodTracker",
      },
      JOURNAL,
      {
        key: "sleep",
        route: "/tools/sleep",
        icon: "bedtime",
        labelKey: "navigation:sidebar.sleep",
      },
      {
        key: "habits",
        route: "/tools/habits",
        icon: "task-alt",
        labelKey: "navigation:sidebar.habits",
      },
    ],
  },
  {
    key: "interpersonal",
    tools: [],
    shared: [JOURNAL],
  },
];
