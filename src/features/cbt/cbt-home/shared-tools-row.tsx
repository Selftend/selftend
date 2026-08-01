import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import type { AdvancedToolInfoKey, SharedTool } from "./cbt-home-config";

interface SharedToolsRowProps {
  tools: SharedTool[];
  onOpenInfo: (key: AdvancedToolInfoKey) => void;
}

// The pill glyphs took the owning pillar's hue (#587). It never distinguished
// anything the row did not already say - every pill in a row shared one tint, so
// the colour repeated the heading above it - and it cost this file a per-hue
// exception: `think` read 2.03:1 on `bg-card` and could not be seen as think at
// all, so it alone had to take the ink.
export function SharedToolsRow({ tools, onOpenInfo }: SharedToolsRowProps) {
  const { t } = useTranslation(["navigation", "cbt"]);

  return (
    <View className="ml-1 flex-row flex-wrap items-center gap-2">
      <View className="flex-row items-center gap-1">
        <Icon name="auto-awesome" size={11} className="text-muted-foreground" />
        <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-wider">
          {t("cbt:pillars.usesSharedTools")}
        </Text>
      </View>
      {tools.map((tool) => (
        <Pressable
          key={tool.key}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => {
            if ("infoKey" in tool && tool.infoKey) {
              onOpenInfo(tool.infoKey);
            } else {
              router.push(tool.route);
            }
          }}
          className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 active:bg-accent/40"
        >
          <Icon name={tool.icon} size={13} className={CHROME_MARK} />
          <Text className="text-xs font-medium">{t(tool.labelKey)}</Text>
          <Icon
            name={"infoKey" in tool && tool.infoKey ? "help-outline" : "open-in-new"}
            size={12}
            className="text-muted-foreground"
          />
        </Pressable>
      ))}
    </View>
  );
}
