import AsyncStorage from "@react-native-async-storage/async-storage";

export type WidgetThemePref = "app" | "light" | "dark";

export interface WidgetInstanceConfig {
  theme: WidgetThemePref;
  opacity: number; // 0..1
  cardId: string;
}

export const DEFAULT_CONFIG: WidgetInstanceConfig = {
  theme: "app",
  opacity: 1,
  cardId: "mood-checkin",
};

const keyFor = (widgetId: number) => `selftend.widgets.config.${widgetId}`;

export async function writeConfig(widgetId: number, config: WidgetInstanceConfig): Promise<void> {
  await AsyncStorage.setItem(keyFor(widgetId), JSON.stringify(config));
}

export async function readConfig(widgetId: number): Promise<WidgetInstanceConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(widgetId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy bare-array shortcuts config from before cardId existed - nothing in it
      // maps to the current shape, so fall back to the default.
      return { ...DEFAULT_CONFIG };
    }
    if (parsed && typeof parsed === "object") {
      const p = parsed as Partial<WidgetInstanceConfig>;
      return {
        theme: p.theme === "light" || p.theme === "dark" ? p.theme : "app",
        opacity: typeof p.opacity === "number" ? Math.max(0, Math.min(1, p.opacity)) : 1,
        cardId: typeof p.cardId === "string" ? p.cardId : "mood-checkin",
      };
    }
    return null;
  } catch {
    return null;
  }
}
