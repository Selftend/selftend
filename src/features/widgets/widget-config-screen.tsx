import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";
import { type WidgetConfigurationScreenProps } from "react-native-android-widget";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { SHORTCUT_CATALOG } from "@/src/features/widgets/shortcut-catalog";
import { TODAY_STAT_CATALOG } from "@/src/features/widgets/today-stat-catalog";
import {
  readConfig,
  writeConfig,
  DEFAULT_CONFIG,
  type ResolvedShortcut,
  type WidgetThemePref,
} from "@/src/features/widgets/widget-config-store";
import { renderWidget } from "@/src/features/widgets/render-widget";
import { readSnapshot } from "@/src/features/widgets/snapshot-store";

const THEME_OPTIONS: { value: WidgetThemePref; labelKey: string }[] = [
  { value: "app", labelKey: "home.widgets.config.themeApp" },
  { value: "light", labelKey: "home.widgets.config.themeLight" },
  { value: "dark", labelKey: "home.widgets.config.themeDark" },
];

export function WidgetConfigurationScreen({
  widgetInfo,
  renderWidget: render,
  setResult,
}: WidgetConfigurationScreenProps) {
  const { t } = useTranslation("navigation");
  const widgetName = widgetInfo.widgetName;
  const isShortcuts = widgetName === "Shortcuts";
  const isToday = widgetName === "Today";

  const [selectedShortcuts, setSelectedShortcuts] = useState<Set<string>>(new Set());
  const [selectedStats, setSelectedStats] = useState<string[]>([]);
  const [theme, setTheme] = useState<WidgetThemePref>("app");
  const [opacity, setOpacity] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readConfig(widgetInfo.widgetId).then((cfg) => {
      if (cancelled) return;
      const c = cfg ?? DEFAULT_CONFIG;
      setSelectedShortcuts(
        new Set(
          SHORTCUT_CATALOG.filter((s) => c.shortcuts.some((rs) => rs.path === s.path)).map(
            (s) => s.id,
          ),
        ),
      );
      setSelectedStats(
        c.statKeys.length > 0
          ? c.statKeys
          : cfg
            ? []
            : TODAY_STAT_CATALOG.slice(0, 4).map((s) => s.key),
      );
      setTheme(c.theme);
      setOpacity(c.opacity);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [widgetInfo.widgetId]);

  const toggleShortcut = (id: string) =>
    setSelectedShortcuts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleStat = (key: string) =>
    setSelectedStats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const onSave = async () => {
    const shortcuts: ResolvedShortcut[] = SHORTCUT_CATALOG.filter((s) =>
      selectedShortcuts.has(s.id),
    ).map((s) => ({
      label: t(s.labelKey),
      emoji: s.emoji,
      path: s.path,
    }));
    const config = { shortcuts, statKeys: isToday ? selectedStats : [], theme, opacity };
    try {
      await writeConfig(widgetInfo.widgetId, config);
      // Render with the latest data snapshot (like the OS task-handler) - passing null
      // here rendered a blank/data-less widget after a config save until the next sync.
      const snapshot = await readSnapshot();
      render(
        renderWidget({
          widgetName,
          width: widgetInfo.width,
          height: widgetInfo.height,
          snapshot,
          config,
        }),
      );
      setResult("ok");
    } catch {
      // The config write or render failed - cancel rather than finalize a half-written
      // config (the library's result is "ok" | "cancel"; there is no error state).
      setResult("cancel");
    }
  };

  if (!loaded) return <View />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 p-6">
      <Text variant="h3">{t("home.widgets.config.title")}</Text>

      {isShortcuts ? (
        <View className="gap-2">
          <Text className="font-semibold">{t("home.widgets.config.shortcutsSection")}</Text>
          {SHORTCUT_CATALOG.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => toggleShortcut(s.id)}
              className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                selectedShortcuts.has(s.id) ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <Text className="text-lg">{s.emoji}</Text>
              <Text className="flex-1">{t(s.labelKey)}</Text>
              {selectedShortcuts.has(s.id) ? <Text className="text-primary">✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {isToday ? (
        <View className="gap-2">
          <Text className="font-semibold">{t("home.widgets.config.statsSection")}</Text>
          {TODAY_STAT_CATALOG.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => toggleStat(s.key)}
              className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                selectedStats.includes(s.key) ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <Text className="text-lg">{s.emoji}</Text>
              <Text className="flex-1">{t(s.labelKey)}</Text>
              {selectedStats.includes(s.key) ? <Text className="text-primary">✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="font-semibold">{t("home.widgets.config.themeLabel")}</Text>
        <View className="flex-row gap-2">
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setTheme(opt.value)}
              className={`flex-1 items-center rounded-xl border p-2 ${
                theme === opt.value ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              <Text className="text-sm">{t(opt.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-semibold">
          {t("home.widgets.config.transparencyLabel")} · {Math.round(opacity * 100)}%
        </Text>
        <View className="py-2">
          <VolumeSlider
            value={opacity}
            onChange={setOpacity}
            onCommit={setOpacity}
            accessibilityLabel={t("home.widgets.config.transparencyLabel")}
          />
        </View>
      </View>

      <Button disabled={isShortcuts && selectedShortcuts.size === 0} onPress={() => void onSave()}>
        <Text>{t("home.widgets.config.save")}</Text>
      </Button>
    </ScrollView>
  );
}
