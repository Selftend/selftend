"use no memo";

import { catalogEntryByName } from "@/src/features/widgets/widget-catalog";
import type { Snapshot } from "@/src/features/widgets/snapshot-types";
import {
  type WidgetInstanceConfig,
  DEFAULT_CONFIG,
} from "@/src/features/widgets/widget-config-store";
import { effectiveThemes } from "@/src/features/widgets/palette";
import { MoodWidgetView } from "@/src/features/widgets/mood-widget-view";
import { TodayWidgetView } from "@/src/features/widgets/today-widget-view";
import { ShortcutsWidgetView } from "@/src/features/widgets/shortcuts-widget-view";

interface RenderArgs {
  widgetName: string;
  width: number;
  height: number;
  snapshot: Snapshot | null;
  config: WidgetInstanceConfig | null;
}

export function renderWidget({ widgetName, width, height, snapshot, config }: RenderArgs) {
  const entry = catalogEntryByName(widgetName);
  const signedIn = snapshot?.auth === "signed-in";
  const cfg = config ?? DEFAULT_CONFIG;
  const themes = effectiveThemes(cfg.theme, snapshot?.appThemePref ?? "system");
  const opacity = cfg.opacity;

  const viewFor = (theme: "light" | "dark") => {
    switch (entry?.kind) {
      case "mood": {
        const p = signedIn ? snapshot!.widgets["mood"] : undefined;
        const payload = p?.kind === "mood" ? p : null;
        return (
          <MoodWidgetView
            payload={payload}
            width={width}
            height={height}
            theme={theme}
            opacity={opacity}
          />
        );
      }
      case "today": {
        const p = signedIn ? snapshot!.widgets["today"] : undefined;
        const payload = p?.kind === "today" ? p : null;
        return (
          <TodayWidgetView
            payload={payload}
            statKeys={cfg.statKeys}
            width={width}
            height={height}
            theme={theme}
            opacity={opacity}
          />
        );
      }
      case "shortcuts":
        return (
          <ShortcutsWidgetView
            shortcuts={cfg.shortcuts}
            width={width}
            height={height}
            theme={theme}
            opacity={opacity}
          />
        );
      default:
        return (
          <TodayWidgetView
            payload={null}
            statKeys={[]}
            width={width}
            height={height}
            theme={theme}
            opacity={opacity}
          />
        );
    }
  };

  if (themes.length === 1) return viewFor(themes[0]);
  return { light: viewFor("light"), dark: viewFor("dark") };
}
