import type { ReactNode } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { exerciseHue, hueGradient, type ToolHue } from "@/src/features/mindfulness/exercise-hue";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { cn } from "@/lib/utils";

interface ToolHeroProps {
  hue: ToolHue;
  icon: MaterialIconName;
  title: string;
  tagline?: string;
  meta?: ReactNode;
}

// The eyebrow breadcrumb above the hero already shows the tool name, so the hero
// no longer renders a visible title. The title is kept as a visually-hidden
// heading to preserve the screen's heading landmark for assistive tech.
export function ToolHero({ hue, icon, title, tagline, meta }: ToolHeroProps) {
  const isDark = useAppColorScheme() === "dark";
  const { classes } = exerciseHue(hue);

  return (
    <View className={cn("overflow-hidden rounded-[20px] border bg-card p-6", classes.border)}>
      <LinearGradient
        colors={hueGradient(hue, isDark)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.7]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 200,
          pointerEvents: "none",
        }}
      />
      <Text
        variant="h1"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 }}
      >
        {title}
      </Text>
      <View className="flex-row items-start gap-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={cn("size-12 items-center justify-center rounded-[14px]", classes.chipBg)}
        >
          <Icon name={icon} className={classes.text} size={26} />
        </View>
        {tagline ? (
          <Text variant="muted" className="flex-1 self-center text-[15px] leading-snug">
            {tagline}
          </Text>
        ) : null}
      </View>
      {meta ? <View className="mt-4">{meta}</View> : null}
    </View>
  );
}
