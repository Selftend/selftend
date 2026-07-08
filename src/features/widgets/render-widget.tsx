"use no memo";

import type { Snapshot } from "@/src/features/widgets/snapshot-types";
import {
  type WidgetInstanceConfig,
  DEFAULT_CONFIG,
} from "@/src/features/widgets/widget-config-store";
import { effectiveThemes } from "@/src/features/widgets/palette";
import { currentDateKey } from "@/src/utils/date";
import { CARD_REPLICAS } from "@/src/features/widgets/cards/card-registry";
import { SignedOutCard } from "@/src/features/widgets/cards/signed-out-card";

interface RenderArgs {
  widgetName: string;
  width: number;
  height: number;
  snapshot: Snapshot | null;
  config: WidgetInstanceConfig | null;
}

export function renderWidget({ width, height, snapshot, config }: RenderArgs) {
  const cfg = config ?? DEFAULT_CONFIG;
  const themes = effectiveThemes(cfg.theme, snapshot?.appThemePref ?? "system");
  const cardId =
    cfg.cardId in CARD_REPLICAS ? (cfg.cardId as keyof typeof CARD_REPLICAS) : "mood-checkin";
  const entry = CARD_REPLICAS[cardId];
  const signedIn = snapshot?.auth === "signed-in";
  // Data only changes through the app, and opening the app rebuilds the snapshot - so a
  // snapshot from a previous day means nothing was logged today: render the no-data-today
  // branch by nulling the payload's `today` field.
  const stale = snapshot?.dateKey != null && snapshot.dateKey !== currentDateKey();

  const viewFor = (theme: "light" | "dark") => {
    const payload = signedIn ? snapshot!.widgets[cardId] : undefined;
    if (!payload || payload.kind !== entry.kind) {
      return (
        <SignedOutCard
          title={snapshot?.signedOutCard?.title ?? "Selftend"}
          cta={snapshot?.signedOutCard?.cta ?? "Open Selftend"}
          theme={theme}
          opacity={cfg.opacity}
        />
      );
    }
    const p = stale && "today" in payload ? { ...payload, today: null } : payload;
    const Replica = entry.Component;
    return (
      <Replica
        payload={p}
        icon={entry.icon}
        tint={entry.tint}
        width={width}
        height={height}
        theme={theme}
        opacity={cfg.opacity}
      />
    );
  };

  if (themes.length === 1) return viewFor(themes[0]);
  return { light: viewFor("light"), dark: viewFor("dark") };
}
