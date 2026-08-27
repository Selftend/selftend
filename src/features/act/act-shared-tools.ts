import type { SharedTool } from "@/src/components/app/shared-tools-row";

// The four standalone tools ACT's `Also try` rows offer (#1216). Which of them
// a screen offers is that screen's editorial call - the arrays stay at the call
// sites - but the tool entries themselves are one fact each, kept here so a
// route or icon change is one edit, the way CBT keeps its in
// `cbt-home-config.ts`. The `labelKey`s stay literal: the static i18n key guard
// can never see a runtime-assembled key.
export const ACT_SHARED_TOOLS = {
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
  grounding: {
    key: "grounding",
    route: "/tools/grounding",
    icon: "anchor",
    labelKey: "navigation:sidebar.grounding",
  },
  habits: {
    key: "habits",
    route: "/tools/habits",
    icon: "task-alt",
    labelKey: "navigation:sidebar.habits",
  },
} satisfies Record<string, SharedTool>;
