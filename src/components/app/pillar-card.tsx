import { createContext, useContext, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Card } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAccentHsl } from "@/src/lib/theme-palette";
import { CHROME_MARK, CHROME_RULE, CHROME_TEXT, CHROME_WASH } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

// A pillar is identified by its letter, its name and its kicker (#587). It used
// to be identified by a colour as well - CBT's three pillars each in the hue
// they are NAMED after (think gold, act green, be blue), which is as close as
// the app came to a hue that meant something. It still is not: the letter "T"
// in a tile above the word "Think" is not made clearer by the tile being gold,
// and the ruling is explicit that distinguishing items in a set is not enough.
//
// The 3px stripe survives as a stripe. It is a shape, not an encoding, so its
// neutral form is the same gradient drawn from the app accent instead of the
// pillar's hue.
//
// It is built from `useAccentHsl` rather than `tintStripeColors("primary", …)`.
// That helper resolves `PRIMARY_TRIPLES`, a module-scope constant holding the
// DEFAULT palette's violet, so the stripe stayed lilac under all eight palettes
// while the rest of the card followed the style - reported against the CBT and
// ACT pillar cards. A colour that has to follow the selected palette cannot come
// from a constant; it has to come from a hook.

interface PillarCardProps {
  letter: string;
  title: string;
  kicker: string;
  description: string;
  onToolPress?: (toolKey: string) => void;
  children?: ReactNode;
}

interface PillarToolProps {
  toolKey: string;
  icon: MaterialIconName;
  name: string;
  desc: string;
}

const PillarContext = createContext<{
  onToolPress?: (toolKey: string) => void;
} | null>(null);

function PillarCardRoot({
  letter,
  title,
  kicker,
  description,
  onToolPress,
  children,
}: PillarCardProps) {
  const accent = useAccentHsl();
  // Full strength into half strength, the same two-stop shape the hue stripes
  // used - only the colour now comes from the active palette.
  const stripe: [string, string] = [accent(1), accent(0.5)];
  return (
    <PillarContext.Provider value={{ onToolPress }}>
      <Card className="relative overflow-hidden px-5 py-4">
        <LinearGradient
          testID="pillar-stripe"
          colors={stripe}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3 }}
        />
        <View className="flex-row items-start gap-3.5">
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            className={cn(
              "h-14 w-14 items-center justify-center rounded-2xl border",
              CHROME_WASH,
              CHROME_RULE,
            )}
          >
            <Text className={cn("text-[26px] font-extrabold tracking-tighter", CHROME_TEXT)}>
              {letter}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-baseline gap-2 flex-wrap">
              <Text className={cn("text-[22px] font-bold tracking-tight", CHROME_TEXT)}>
                {title}
              </Text>
              <Text className="text-[12.5px] text-muted-foreground">· {kicker}</Text>
            </View>
            <Text className="mt-1.5 text-[13.5px] leading-[1.55] text-muted-foreground">
              {description}
            </Text>
          </View>
        </View>
        {children ? <View className="mt-4 flex-row flex-wrap gap-2.5">{children}</View> : null}
      </Card>
    </PillarContext.Provider>
  );
}

function PillarTool({ toolKey, icon, name, desc }: PillarToolProps) {
  const ctx = useContext(PillarContext);
  if (!ctx) {
    throw new Error("PillarCard.Tool must be rendered inside <PillarCard>");
  }
  const { onToolPress } = ctx;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityHint={desc}
      onPress={() => onToolPress?.(toolKey)}
      className="basis-[calc(50%-5px)] md:basis-[calc(25%-7.5px)] rounded-xl border border-border bg-card p-3.5"
    >
      <View className={cn("mb-1 h-8 w-8 items-center justify-center rounded-lg", CHROME_WASH)}>
        <Icon name={icon} size={18} className={CHROME_MARK} />
      </View>
      <Text className="text-[13.5px] font-semibold leading-tight">{name}</Text>
      <Text className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{desc}</Text>
    </Pressable>
  );
}

export const PillarCard = Object.assign(PillarCardRoot, {
  Tool: PillarTool,
});
