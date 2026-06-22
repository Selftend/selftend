import { Pressable, View } from "react-native";
import { useColorScheme } from "nativewind";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { hueHsl } from "@/src/features/mindfulness/exercise-hue";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface TechniqueCardProps {
  technique: GroundingTechnique;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
}

// Senses techniques show a multi-hue dot grid (matching the per-sense colours);
// guided techniques show a single hue icon tile.
function SenseDots({ technique }: { technique: GroundingTechnique }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: hueHsl(technique.hue, isDark, 0.07),
        borderWidth: 1,
        borderColor: hueHsl(technique.hue, isDark, 0.3),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 3.5,
          width: 25,
          justifyContent: "center",
        }}
      >
        {technique.steps.map((step, i) => (
          <View
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: 3.5,
              backgroundColor: hueHsl(step.hue, isDark, 1),
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function TechniqueCard({
  technique,
  title,
  description,
  meta,
  onPress,
}: TechniqueCardProps) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
    >
      <Card>
        <CardContent className="flex-row items-center gap-3.5 p-3.5">
          {technique.kind === "senses" ? (
            <SenseDots technique={technique} />
          ) : (
            <HueIconBadge icon={technique.icon} hue={technique.hue} size={50} iconSize={24} />
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold">{title}</Text>
            <Text variant="muted" className="mt-0.5">
              {description}
            </Text>
            <Text tint={technique.hue} className="mt-2 text-xs font-semibold">
              {meta}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} className="text-muted-foreground" />
        </CardContent>
      </Card>
    </Pressable>
  );
}
