import { type Href } from "expo-router";

import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { SharedTool } from "@/src/components/app/shared-tools-row";
import type { HelpKey } from "@/src/features/help/help-content";

export type Pillar = "think" | "act" | "be";

export interface PillarStrategy {
  key: string;
  route: Href;
  icon: MaterialIconName;
  labelKey: string;
  descKey: string;
  helpKey: HelpKey;
}

export const PILLAR_STRATEGIES: Record<Pillar, PillarStrategy[]> = {
  think: [
    {
      key: "thoughts",
      route: "/modules/cbt/new",
      icon: "article",
      labelKey: "dashboard.strategies.thoughts",
      descKey: "pillars.strategyDescriptions.thoughts",
      helpKey: "thoughtRecords",
    },
    {
      key: "beliefs",
      route: "/modules/cbt/beliefs",
      icon: "anchor",
      labelKey: "dashboard.strategies.beliefs",
      descKey: "pillars.strategyDescriptions.beliefs",
      helpKey: "beliefs",
    },
    {
      key: "worry",
      route: "/modules/cbt/worry",
      icon: "psychology",
      labelKey: "dashboard.strategies.worry",
      descKey: "pillars.strategyDescriptions.worry",
      helpKey: "worry",
    },
    {
      key: "distortions",
      route: "/modules/cbt/learn",
      icon: "menu-book",
      labelKey: "home.distortionGuide",
      descKey: "pillars.strategyDescriptions.distortions",
      helpKey: "distortions",
    },
  ],
  act: [
    {
      key: "goals",
      route: "/modules/cbt/goals",
      icon: "gps-fixed",
      labelKey: "dashboard.strategies.goals",
      descKey: "pillars.strategyDescriptions.goals",
      helpKey: "goals",
    },
    {
      key: "values",
      route: "/modules/cbt/values",
      icon: "explore",
      labelKey: "dashboard.strategies.values",
      descKey: "pillars.strategyDescriptions.values",
      helpKey: "values",
    },
    {
      key: "activities",
      route: "/modules/cbt/activities",
      icon: "directions-run",
      labelKey: "dashboard.strategies.activities",
      descKey: "pillars.strategyDescriptions.activities",
      helpKey: "activities",
    },
    {
      key: "exposure",
      route: "/modules/cbt/exposure",
      icon: "layers",
      labelKey: "dashboard.strategies.exposure",
      descKey: "pillars.strategyDescriptions.exposure",
      helpKey: "exposure",
    },
    {
      key: "tasks",
      route: "/modules/cbt/tasks",
      icon: "hiking",
      labelKey: "dashboard.strategies.tasks",
      descKey: "pillars.strategyDescriptions.tasks",
      helpKey: "tasks",
    },
    {
      key: "anger",
      route: "/modules/cbt/anger",
      icon: "local-fire-department",
      labelKey: "dashboard.strategies.anger",
      descKey: "pillars.strategyDescriptions.anger",
      helpKey: "anger",
    },
  ],
  be: [
    {
      key: "selfCare",
      route: "/modules/cbt/self-care",
      icon: "favorite",
      labelKey: "dashboard.strategies.selfCare",
      descKey: "pillars.strategyDescriptions.selfCare",
      helpKey: "selfCare",
    },
  ],
};

const THINK_SHARED_TOOLS: SharedTool[] = [
  {
    key: "journal",
    route: "/tools/journal",
    icon: "edit-note",
    labelKey: "navigation:sidebar.journal",
  },
  {
    key: "gratitudeLog",
    route: "/tools/gratitude-log",
    icon: "favorite",
    labelKey: "navigation:sidebar.gratitudeLog",
  },
];

const ACT_SHARED_TOOLS: SharedTool[] = [
  {
    key: "habits",
    route: "/tools/habits",
    icon: "task-alt",
    labelKey: "navigation:sidebar.habits",
  },
];

const BE_SHARED_TOOLS: SharedTool[] = [
  {
    key: "breathing",
    route: "/tools/breathing",
    icon: "air",
    labelKey: "navigation:sidebar.breathing",
  },
  {
    key: "meditation",
    route: "/tools/meditation",
    icon: "self-improvement",
    labelKey: "navigation:sidebar.meditation",
  },
  {
    key: "grounding",
    route: "/tools/grounding",
    icon: "anchor",
    labelKey: "navigation:sidebar.grounding",
  },
  {
    key: "moodTracker",
    route: "/tools/check-in",
    icon: "mood",
    labelKey: "navigation:sidebar.moodTracker",
  },
  {
    key: "sleep",
    route: "/tools/sleep",
    icon: "bedtime",
    labelKey: "navigation:sidebar.sleep",
  },
];

export const SHARED_TOOLS_BY_PILLAR: Record<Pillar, SharedTool[]> = {
  think: THINK_SHARED_TOOLS,
  act: ACT_SHARED_TOOLS,
  be: BE_SHARED_TOOLS,
};

export const REVIEW_LINKS = [
  {
    key: "weeklyReview",
    route: "/modules/cbt/weekly-review",
    icon: "event-available" as MaterialIconName,
    labelKey: "dashboard.strategies.weeklyReview",
    descKey: "pillars.strategyDescriptions.weeklyReview",
  },
  {
    key: "recovery",
    route: "/modules/cbt/recovery",
    icon: "map" as MaterialIconName,
    labelKey: "dashboard.strategies.recovery",
    descKey: "pillars.strategyDescriptions.recovery",
  },
] as const;
