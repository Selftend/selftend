import { Pressable, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { useAccentHsl } from "@/src/lib/theme-palette";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface TechniqueCardProps {
  technique: GroundingTechnique;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
}

// Senses techniques show a dot grid; guided techniques show a single icon tile.
// The grid used to be multi-hue, one colour per sense. What the thumbnail says
// is "this technique walks senses" versus "this one is guided", and the SHAPE
// says that - five dots against one glyph. The colours said which senses, to a
// user who has not opened the technique yet and has no key to read them by
// (#558 rules the technique hues neutral).
function SenseDots({ technique }: { technique: GroundingTechnique }) {
  const accent = useAccentHsl();
  return (
    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: accent(0.07),
        borderWidth: 1,
        borderColor: accent(0.3),
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
              backgroundColor: accent(1),
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
      <View className="flex-row items-center gap-3.5 border-b border-border px-1 py-3.5">
        {technique.kind === "senses" ? (
          <SenseDots technique={technique} />
        ) : (
          <HueIconBadge icon={technique.icon} size={50} iconSize={24} />
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold">{title}</Text>
          <Text variant="muted" className="mt-0.5">
            {description}
          </Text>
          <Text className="mt-2 text-xs font-semibold">{meta}</Text>
        </View>
        <Icon name="chevron-right" size={22} className="text-muted-foreground" />
      </View>
    </Pressable>
  );
}
