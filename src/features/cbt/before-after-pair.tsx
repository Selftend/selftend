import { View } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

/**
 * Two labelled numbers around an arrow - the record's before/after read-back.
 *
 * Shared by the completion screen and the record detail screen (#1384) so the
 * belief pair renders as the same fact on both: the chart IS the observation,
 * and no sentence interprets it (#1227). Either caller omits the pair entirely,
 * never dashes it, when a number is missing.
 */
export function BeforeAfterPair({
  beforeLabel,
  beforeValue,
  afterLabel,
  afterValue,
}: {
  beforeLabel: string;
  beforeValue: number | null | undefined;
  afterLabel: string;
  afterValue: number | null | undefined;
}) {
  return (
    <View className="flex-row items-center justify-center gap-6">
      <View className="items-center gap-1">
        <Text variant="muted">{beforeLabel}</Text>
        <Text variant="h3">{beforeValue}</Text>
      </View>
      <Icon name="arrow-forward" className="size-5 text-muted-foreground" />
      <View className="items-center gap-1">
        <Text variant="muted">{afterLabel}</Text>
        <Text variant="h3">{afterValue}</Text>
      </View>
    </View>
  );
}
