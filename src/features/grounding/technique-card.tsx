import { Pressable, useWindowDimensions, View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import type { GroundingTechnique } from "@/src/constants/grounding";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface TechniqueCardProps {
  technique: GroundingTechnique;
  title: string;
  description: string;
  meta: string;
  onPress: () => void;
}

/**
 * One technique as the design's 5a hairline row (#875): bare 22px glyph, name
 * + description, the trailing meta column, a chevron — no icon badge box, no
 * dot-grid tile. Rows are top-ruled; the list's caller closes the run with a
 * floor hairline. The glyph stays muted rather than taking a per-technique
 * hue (#558 ruled the technique hues neutral; #691 — hue encodes data, not
 * identity).
 */
export function TechniqueCard({
  technique,
  title,
  description,
  meta,
  onPress,
}: TechniqueCardProps) {
  // The design's phone variant folds the meta under the description instead
  // of keeping a trailing column the narrow row cannot spare.
  const { width: windowWidth } = useWindowDimensions();
  const wideRow = windowWidth >= 640;

  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
    >
      <View className="flex-row items-center gap-4 border-t border-border px-2.5 py-4">
        <Icon name={technique.icon} size={22} className="shrink-0 text-muted-foreground" />
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-[15px] font-semibold">{title}</Text>
          <Text variant="muted" className="text-[13px]">
            {description}
          </Text>
          {!wideRow ? (
            <Text variant="muted" className="text-[11.5px] tabular-nums opacity-75">
              {meta}
            </Text>
          ) : null}
        </View>
        {wideRow ? (
          <Text variant="muted" className="shrink-0 text-[12.5px] tabular-nums">
            {meta}
          </Text>
        ) : null}
        <Icon name="chevron-right" size={18} className="shrink-0 text-muted-foreground/60" />
      </View>
    </Pressable>
  );
}
