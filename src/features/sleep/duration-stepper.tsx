import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatDuration } from "@/src/features/sleep/format";

const STEP = 30;

// Single +/- control that nudges sleep duration by 30 minutes, clamped to [min, max].
export function DurationStepper({
  value,
  onChange,
  min = 30,
  max = 14 * 60,
}: {
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
}) {
  const { t } = useTranslation("sleep");

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-3">
      <Button
        size="icon"
        variant="outline"
        accessibilityLabel={t("log.decreaseDuration")}
        onPress={() => onChange(Math.max(min, value - STEP))}
      >
        <Icon name="remove" className="size-5" />
      </Button>
      <Text className="text-2xl font-semibold">{formatDuration(value)}</Text>
      <Button
        size="icon"
        variant="outline"
        accessibilityLabel={t("log.increaseDuration")}
        onPress={() => onChange(Math.min(max, value + STEP))}
      >
        <Icon name="add" className="size-5" />
      </Button>
    </View>
  );
}
