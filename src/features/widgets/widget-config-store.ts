import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ResolvedShortcut {
  label: string;
  emoji: string;
  path: string;
}

export type WidgetThemePref = "app" | "light" | "dark";

export interface WidgetInstanceConfig {
  shortcuts: ResolvedShortcut[];
  statKeys: string[];
  theme: WidgetThemePref;
  opacity: number; // 0..1
}

export const DEFAULT_CONFIG: WidgetInstanceConfig = {
  shortcuts: [],
  statKeys: [],
  theme: "app",
  opacity: 1,
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
      return { ...DEFAULT_CONFIG, shortcuts: parsed as ResolvedShortcut[] };
    }
    if (parsed && typeof parsed === "object") {
      const p = parsed as Partial<WidgetInstanceConfig>;
      return {
        shortcuts: Array.isArray(p.shortcuts) ? p.shortcuts : [],
        statKeys: Array.isArray(p.statKeys) ? p.statKeys : [],
        theme: p.theme === "light" || p.theme === "dark" ? p.theme : "app",
        opacity: typeof p.opacity === "number" ? Math.max(0, Math.min(1, p.opacity)) : 1,
      };
    }
    return null;
  } catch {
    return null;
  }
}
