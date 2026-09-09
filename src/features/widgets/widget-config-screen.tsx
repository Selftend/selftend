import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { type WidgetConfigurationScreenProps } from "react-native-android-widget";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { WIDGET_META } from "@/src/features/widgets/widget-meta";
import { tintClasses } from "@/src/features/widgets/widget-tint";
import { CARD_IDS } from "@/src/features/widgets/snapshot-types";
import {
  readConfig,
  writeConfig,
  DEFAULT_CONFIG,
  type WidgetThemePref,
} from "@/src/features/widgets/widget-config-store";
import { renderWidget } from "@/src/features/widgets/render-widget";
import { readSnapshot } from "@/src/features/widgets/snapshot-store";
import { spaceKeyActivationProps } from "@/src/lib/accessibility";

const THEME_OPTIONS: { value: WidgetThemePref; labelKey: string }[] = [
  { value: "app", labelKey: "home.widgets.config.themeApp" },
  { value: "light", labelKey: "home.widgets.config.themeLight" },
  { value: "dark", labelKey: "home.widgets.config.themeDark" },
];

const GROUPS: { labelKey: string; ids: string[] }[] = [
  {
    labelKey: "home.widgets.config.groupTools",
    ids: CARD_IDS.filter((id) => !["cbt", "act"].includes(WIDGET_META[id].toolKey)),
  },
  {
    labelKey: "home.widgets.config.groupCbt",
    ids: CARD_IDS.filter((id) => WIDGET_META[id].toolKey === "cbt"),
  },
  {
    labelKey: "home.widgets.config.groupAct",
    ids: CARD_IDS.filter((id) => WIDGET_META[id].toolKey === "act"),
  },
];

// registerWidgetConfigurationScreen mounts this as a bare RN root without the app's
// providers, so the screen brings its own safe-area context - edge-to-edge Android
// otherwise draws the system nav bar over the bottom of the scroll content.
export function WidgetConfigurationScreen(props: WidgetConfigurationScreenProps) {
  return (
    <SafeAreaProvider>
      <WidgetConfigurationScreenContent {...props} />
    </SafeAreaProvider>
  );
}

function WidgetConfigurationScreenContent({
  widgetInfo,
  renderWidget: render,
  setResult,
}: WidgetConfigurationScreenProps) {
  const { t } = useTranslation("navigation");
  const insets = useSafeAreaInsets();
  const widgetName = widgetInfo.widgetName;

  const [cardId, setCardId] = useState<string>(DEFAULT_CONFIG.cardId);
  const [theme, setTheme] = useState<WidgetThemePref>("app");
  const [opacity, setOpacity] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readConfig(widgetInfo.widgetId).then((cfg) => {
      if (cancelled) return;
      const c = cfg ?? DEFAULT_CONFIG;
      setCardId(c.cardId);
      setTheme(c.theme);
      setOpacity(c.opacity);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [widgetInfo.widgetId]);

  const onSave = async () => {
    const config = { cardId, theme, opacity };
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
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-5 p-6"
      contentContainerStyle={{
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <Text variant="h3">{t("home.widgets.config.title")}</Text>

      <View
        accessibilityLabel={t("home.widgets.config.cardSection")}
        accessibilityRole="radiogroup"
        className="gap-2"
        role="radiogroup"
      >
        <Text className="font-semibold">{t("home.widgets.config.cardSection")}</Text>
        {GROUPS.map((g) => (
          <View key={g.labelKey} className="gap-2">
            <Text variant="muted" className="text-xs uppercase tracking-wider">
              {t(g.labelKey)}
            </Text>
            {g.ids.map((id) => {
              const meta = WIDGET_META[id];
              const c = tintClasses(meta.tint);
              const selected = cardId === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  onPress={() => setCardId(id)}
                  className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                    selected ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  role="radio"
                  {...spaceKeyActivationProps(() => setCardId(id))}
                >
                  <View className={`size-8 items-center justify-center rounded-lg ${c.chip}`}>
                    <Icon name={meta.icon as MaterialIconName} className={`size-5 ${c.icon}`} />
                  </View>
                  <Text className="flex-1">{t(meta.titleKey)}</Text>
                  {selected ? <Text className="text-primary">✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="gap-2">
        <Text className="font-semibold">{t("home.widgets.config.themeLabel")}</Text>
        <View
          accessibilityLabel={t("home.widgets.config.themeLabel")}
          accessibilityRole="radiogroup"
          className="flex-row gap-2"
          role="radiogroup"
        >
          {THEME_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              aria-checked={theme === opt.value}
              onPress={() => setTheme(opt.value)}
              className={`flex-1 items-center rounded-xl border p-2 ${
                theme === opt.value ? "border-primary bg-primary/10" : "border-border"
              }`}
              role="radio"
              {...spaceKeyActivationProps(() => setTheme(opt.value))}
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

      <Button onPress={() => void onSave()}>
        <Text>{t("home.widgets.config.save")}</Text>
      </Button>
    </ScrollView>
  );
}
