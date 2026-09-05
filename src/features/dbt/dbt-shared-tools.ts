import type { SharedTool } from "@/src/components/app/shared-tools-row";

/**
 * The tools DBT's `Also try` rows offer (spec §7).
 *
 * Which of them a list screen offers is that screen's editorial call - the
 * arrays stay at the call sites - but each entry is one fact, kept here so a
 * route or icon change is one edit. The `labelKey`s stay literal: the static
 * i18n key guard can never see a runtime-assembled key. Both siblings keep
 * theirs the same way (`ACT_SHARED_TOOLS`, `cbt-home-config.ts`).
 *
 * ⚠️ **Four of these leave for another MODULE, which is new.** Every shipped
 * `SharedToolsRow` chip roots under `/tools`; these point at ACT and CBT. It is
 * a stated departure rather than an oversight: the row's Up-climb trade holds
 * for a module route too, and these are the surfaces the workbook's own
 * material already lives on in this app. The seed-store hand-offs already cross
 * modules for the same reason.
 */
export const DBT_SHARED_TOOLS = {
  journal: {
    key: "journal",
    route: "/tools/journal",
    icon: "edit-note",
    labelKey: "navigation:sidebar.journal",
  },
  meditation: {
    key: "meditation",
    route: "/tools/meditation",
    icon: "self-improvement",
    labelKey: "navigation:sidebar.meditation",
  },
  breathing: {
    key: "breathing",
    route: "/tools/breathing",
    icon: "air",
    labelKey: "navigation:sidebar.breathing",
  },
  checkIn: {
    key: "checkIn",
    route: "/tools/check-in",
    icon: "mood",
    labelKey: "navigation:sidebar.moodTracker",
  },
  habits: {
    key: "habits",
    route: "/tools/habits",
    icon: "task-alt",
    labelKey: "navigation:sidebar.habits",
  },
  actDefusion: {
    key: "actDefusion",
    route: "/modules/act/defusion",
    icon: "filter-drama",
    labelKey: "dbt:learn.links.actDefusion",
  },
  actExpansion: {
    key: "actExpansion",
    route: "/modules/act/expansion",
    icon: "open-in-full",
    labelKey: "dbt:learn.links.actExpansion",
  },
  actValues: {
    key: "actValues",
    route: "/modules/act/values",
    icon: "explore",
    labelKey: "dbt:learn.links.actValues",
  },
  actCommittedAction: {
    key: "actCommittedAction",
    route: "/modules/act/committed-action",
    icon: "directions-run",
    labelKey: "dbt:learn.links.actCommittedAction",
  },
  cbtActivities: {
    key: "cbtActivities",
    route: "/modules/cbt/activities",
    icon: "directions-run",
    labelKey: "dbt:learn.links.cbtActivities",
  },
  cbtThoughtRecord: {
    key: "cbtThoughtRecord",
    route: "/modules/cbt/new",
    icon: "article",
    labelKey: "dbt:learn.links.cbtThoughtRecord",
  },
  cbtWorry: {
    key: "cbtWorry",
    route: "/modules/cbt/worry",
    icon: "psychology",
    labelKey: "dbt:learn.links.cbtWorry",
  },
  cbtAnger: {
    key: "cbtAnger",
    route: "/modules/cbt/anger",
    icon: "local-fire-department",
    labelKey: "dbt:learn.links.cbtAnger",
  },
} satisfies Record<string, SharedTool>;
