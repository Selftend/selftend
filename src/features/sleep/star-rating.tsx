import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useRovingFocus } from "@/src/lib/roving-focus";

// Tap-to-rate stars for sleep quality: empty stars fill up to the tapped one,
// and the chosen value is echoed as "n/max".
export function StarRating({
  value,
  onChange,
  max = 5,
}: {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
}) {
  const { t } = useTranslation("sleep");
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const roving = useRovingFocus({
    count: max,
    // No rating yet: treat the first star as active so the group stays tab-reachable.
    activeIndex: value === null ? 0 : value - 1,
    onActivate: (index) => onChange(index + 1),
  });

  return (
    <View className="gap-2">
      <View
        accessibilityLabel={t("log.qualityLabel")}
        accessibilityRole="radiogroup"
        className="flex-row gap-1"
        role="radiogroup"
      >
        {stars.map((n, index) => {
          const filled = value !== null && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              aria-checked={value === n}
              accessibilityLabel={t("log.qualityStarLabel", { value: n, max })}
              onPress={() => onChange(n)}
              className="p-1 active:opacity-70"
              role="radio"
              {...roving.getItemProps(index, () => onChange(n))}
            >
              <Icon
                name={filled ? "star" : "star-outline"}
                size={32}
                // Sleep quality is an ordered 1-5 input control - the twin of
                // the mood scale, which the ruling keeps ("the same 5-step scale
                // on the input control"). The sweep took it by accident and left
                // both branches identical; `sleep-quality-ramp` is a keeps-hue
                // encoding, and this is that encoding's input.
                className={filled ? "text-ink" : "text-muted-foreground"}
              />
            </Pressable>
          );
        })}
      </View>
      {value !== null ? (
        <Text variant="muted" className="text-sm">
          {t("log.qualityValue", { value, max })}
        </Text>
      ) : null}
    </View>
  );
}
