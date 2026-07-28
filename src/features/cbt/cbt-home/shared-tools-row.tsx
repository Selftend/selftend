import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import type { AdvancedToolInfoKey, Pillar, SharedTool } from "./cbt-home-config";

interface SharedToolsRowProps {
  tools: SharedTool[];
  tint: Pillar;
  onOpenInfo: (key: AdvancedToolInfoKey) => void;
}

export function SharedToolsRow({ tools, tint, onOpenInfo }: SharedToolsRowProps) {
  const { t } = useTranslation(["navigation", "cbt"]);

  // Pill glyphs are decorative — the tool's name sits right beside them — so
  // `act` (3.92:1) and `be` (5.26:1) keep the published accent. `think` reads
  // 2.03:1 on `bg-card` and cannot be seen as think at all, so it takes the
  // room-less ink instead; this row renders on the neutral surface (#403).
  const PILL_ICON_CLASS: Record<Pillar, string> = {
    think: "text-think-ink",
    act: "text-act",
    be: "text-be",
  };

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
          <Icon
            name={tool.icon}
            size={13}
            className={cn("text-muted-foreground", PILL_ICON_CLASS[tint])}
          />
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
