import type { ReactNode } from "react";
import { View } from "react-native";

import { Badge } from "@/src/components/react-native-reusables/badge";
import { type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueToTint, type ToolHue } from "@/src/features/mindfulness/exercise-hue";

interface ToolHeroProps {
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

export function ToolHero({ hue, icon, title, moduleLabel, tagline, meta }: ToolHeroProps) {
  const tint = hueToTint(hue);
  return (
    <View className="mt-2">
      <View className="flex-row items-center gap-2.5 mb-3">
        <Badge variant="tint" tint={tint} icon={icon}>
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
