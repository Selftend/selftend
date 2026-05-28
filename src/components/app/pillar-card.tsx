import { createContext, useContext, type ReactNode } from "react";
import { Pressable, View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Card } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { TINT_TEXT, type TintToken } from "@/src/lib/design-tokens";
import { cn } from "@/lib/utils";

interface PillarCardProps {
  tint: TintToken;
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
  tint: TintToken;
  onToolPress?: (toolKey: string) => void;
} | null>(null);

const LETTER_BG: Record<TintToken, string> = {
  primary: "bg-primary/10 border-primary/30",
  act: "bg-[hsl(var(--act)/0.12)] border-[hsl(var(--act)/0.30)]",
  be: "bg-[hsl(var(--be)/0.12)] border-[hsl(var(--be)/0.30)]",
  think: "bg-[hsl(var(--think)/0.12)] border-[hsl(var(--think)/0.30)]",
  aqua: "bg-[hsl(var(--aqua)/0.12)] border-[hsl(var(--aqua)/0.30)]",
  iris: "bg-[hsl(var(--iris)/0.12)] border-[hsl(var(--iris)/0.30)]",
  ink: "bg-[hsl(var(--ink)/0.12)] border-[hsl(var(--ink)/0.30)]",
  clay: "bg-[hsl(var(--clay)/0.12)] border-[hsl(var(--clay)/0.30)]",
  mist: "bg-[hsl(var(--mist)/0.12)] border-[hsl(var(--mist)/0.30)]",
};

const TOOL_ICON_BG: Record<TintToken, string> = {
  primary: "bg-primary/10",
  act: "bg-[hsl(var(--act)/0.10)]",
  be: "bg-[hsl(var(--be)/0.10)]",
  think: "bg-[hsl(var(--think)/0.10)]",
  aqua: "bg-[hsl(var(--aqua)/0.10)]",
  iris: "bg-[hsl(var(--iris)/0.10)]",
  ink: "bg-[hsl(var(--ink)/0.10)]",
  clay: "bg-[hsl(var(--clay)/0.10)]",
  mist: "bg-[hsl(var(--mist)/0.10)]",
};

const STRIPE_COLORS: Record<TintToken, [string, string]> = {
  primary: ["hsl(262, 62%, 56%)", "hsla(262, 62%, 56%, 0.5)"],
  act: ["hsl(160, 46%, 38%)", "hsla(160, 46%, 38%, 0.5)"],
  be: ["hsl(330, 56%, 60%)", "hsla(330, 56%, 60%, 0.5)"],
  think: ["hsl(43, 74%, 52%)", "hsla(43, 74%, 52%, 0.5)"],
  aqua: ["hsl(196, 52%, 45%)", "hsla(196, 52%, 45%, 0.5)"],
  iris: ["hsl(280, 48%, 60%)", "hsla(280, 48%, 60%, 0.5)"],
  ink: ["hsl(232, 46%, 56%)", "hsla(232, 46%, 56%, 0.5)"],
  clay: ["hsl(20, 52%, 50%)", "hsla(20, 52%, 50%, 0.5)"],
  mist: ["hsl(178, 40%, 40%)", "hsla(178, 40%, 40%, 0.5)"],
};

function PillarCardRoot({
  tint,
  letter,
  title,
  kicker,
  description,
  onToolPress,
  children,
}: PillarCardProps) {
  return (
    <PillarContext.Provider value={{ tint, onToolPress }}>
      <Card className="relative overflow-hidden px-5 py-4">
        <LinearGradient
          colors={STRIPE_COLORS[tint]}
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
              LETTER_BG[tint],
            )}
          >
            <Text className={cn("text-[26px] font-extrabold tracking-tighter", TINT_TEXT[tint])}>
              {letter}
            </Text>
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-baseline gap-2 flex-wrap">
              <Text className={cn("text-[22px] font-bold tracking-tight", TINT_TEXT[tint])}>
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
  const { tint, onToolPress } = ctx;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onToolPress?.(toolKey)}
      className="basis-[calc(50%-5px)] md:basis-[calc(25%-7.5px)] rounded-xl border border-border bg-card p-3.5"
    >
      <View
        className={cn("mb-1 h-8 w-8 items-center justify-center rounded-lg", TOOL_ICON_BG[tint])}
      >
        <Icon name={icon} size={18} className={TINT_TEXT[tint]} />
      </View>
      <Text className="text-[13.5px] font-semibold leading-tight">{name}</Text>
      <Text className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{desc}</Text>
    </Pressable>
  );
}

export const PillarCard = Object.assign(PillarCardRoot, {
  Tool: PillarTool,
});
