import type { ReactNode } from "react";
import { View } from "react-native";

import { Badge } from "@/src/components/react-native-reusables/badge";
import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { type ToolHue } from "@/src/features/mindfulness/exercise-hue";

interface ToolHeroProps {
  /**
   * No longer painted (#587): a tool's identity is its icon and its name, so
   * the leading chip is neutral chrome on every screen. Kept as an accepted
   * prop because ~20 tool screens pass it and because it still records which
   * module a screen belongs to; safe to drop once nothing reads it.
   */
  hue: ToolHue;
  icon: MaterialIconName;
  title: string;
  /** Short module label shown in the leading chip (e.g. "Breathing"). Defaults to title. */
  moduleLabel?: string;
  /** Muted body line beneath the title. */
  tagline?: string;
  /** Optional trailing meta line (e.g. "3 patterns · 1-10 min" or a custom node). */
  meta?: ReactNode;
}

export function ToolHero({ icon, title, moduleLabel, tagline, meta }: ToolHeroProps) {
  return (
    <View className="mt-2">
      <View className="flex-row items-center gap-2.5 mb-3">
        <Badge variant="secondary" icon={icon}>
          <Text>{moduleLabel ?? title}</Text>
        </Badge>
        {meta ? (
          typeof meta === "string" ? (
            <Text className="text-xs text-muted-foreground">{meta}</Text>
          ) : (
            meta
          )
        ) : null}
      </View>
      <Text variant="h1" className="text-[36px] font-extrabold leading-[1.1] tracking-tight">
        {title}
      </Text>
      {tagline ? (
        <Text className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground max-w-[58ch]">
          {tagline}
        </Text>
      ) : null}
    </View>
  );
}
