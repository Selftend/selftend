import type { CardId, CardPayload } from "@/src/features/widgets/snapshot-types";
import type { TintName } from "@/src/features/widgets/palette";
import { ShortcutCard, type CardViewProps } from "@/src/features/widgets/cards/shortcut-card";
import { PromptCard } from "@/src/features/widgets/cards/prompt-card";
import { MoodCheckinCard } from "@/src/features/widgets/cards/mood-checkin-card";
import { StatTilesCard } from "@/src/features/widgets/cards/stat-tiles-card";
import { BreathingCard } from "@/src/features/widgets/cards/breathing-card";
import { StatsCard } from "@/src/features/widgets/cards/stats-card";
import { ActivitiesCard } from "@/src/features/widgets/cards/activities-card";
import { CommittedActionsCard } from "@/src/features/widgets/cards/committed-actions-card";
import { DefusionCard } from "@/src/features/widgets/cards/defusion-card";
import { ProgrammeCard } from "@/src/features/widgets/cards/programme-card";

export interface CardReplicaEntry {
  kind: CardPayload["kind"];
  /** Icon as the in-app CARD renders it (may differ from WIDGET_META). */
  icon: string;
  tint: TintName;
  Component: (props: CardViewProps) => React.JSX.Element;
}

const shortcut = (icon: string): CardReplicaEntry => ({
  kind: "shortcut",
  icon,
  tint: "primary",
  Component: ShortcutCard,
});
const prompt = (icon: string): CardReplicaEntry => ({
  kind: "prompt",
  icon,
  tint: "act",
  Component: PromptCard,
});
const stats = (icon: string, tint: TintName): CardReplicaEntry => ({
  kind: "stats",
  icon,
  tint,
  Component: StatsCard,
});

export const CARD_REPLICAS: Record<CardId, CardReplicaEntry> = {
  "mood-checkin": {
    kind: "mood-checkin",
    icon: "mood",
    tint: "be",
    Component: MoodCheckinCard,
  },
  "mood-trend": {
    kind: "stat-tiles",
    icon: "show-chart",
    tint: "be",
    Component: StatTilesCard,
  },
  "breathing-suggested": {
    kind: "breathing",
    icon: "air",
    tint: "aqua",
    Component: BreathingCard,
  },
  "gratitude-latest": stats("favorite", "think"),
  "meditation-pick": stats("self-improvement", "iris"),
  // Registry id kept: it is a storage key in widget_preferences.widget_id. The card
  // itself is scheduled CBT activities, not habits (#330).
  "habits-today": {
    kind: "activities",
    icon: "directions-run",
    tint: "act",
    Component: ActivitiesCard,
  },
  "self-care": shortcut("spa"),
  "cbt-open-record": shortcut("psychology"),
  "act-drop-anchor": prompt("anchor"),
  "act-observing-self": prompt("visibility"),
  "act-choice-point": prompt("alt-route"),
  "sleep-latest": stats("bedtime", "ink"),
  "cbt-distortion-guide": shortcut("menu-book"),
  "cbt-programme": {
    kind: "programme",
    icon: "school",
    tint: "primary",
    Component: ProgrammeCard,
  },
  "act-programme": {
    kind: "programme",
    icon: "school",
    tint: "act",
    Component: ProgrammeCard,
  },
  "cbt-module-shortcut": shortcut("psychology"),
  "act-module-shortcut": {
    ...shortcut("explore"),
    tint: "act",
  },
  "cbt-worry": shortcut("psychology"),
  "cbt-beliefs": shortcut("anchor"),
  "cbt-activities": shortcut("directions-run"),
  "cbt-exposure": shortcut("layers"),
  "cbt-goals": shortcut("gps-fixed"),
  "act-committed-actions": {
    kind: "committed-actions",
    icon: "checklist",
    tint: "act",
    Component: CommittedActionsCard,
  },
  "act-defusion": {
    kind: "defusion",
    icon: "filter-drama",
    tint: "act",
    Component: DefusionCard,
  },
  "act-acceptance-prompt": prompt("open-in-full"),
  "journal-week": stats("edit-note", "ink"),
  "grounding-log": stats("history", "clay"),
  "routines-today": {
    ...shortcut("repeat"),
    tint: "iris",
  },
};
