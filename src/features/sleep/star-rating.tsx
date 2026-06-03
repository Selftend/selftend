import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

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

  return (
    <View className="gap-2">
      <View className="flex-row gap-1">
        {stars.map((n) => {
          const filled = value !== null && n <= value;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: value === n }}
              accessibilityLabel={t("log.qualityStarLabel", { value: n, max })}
              onPress={() => onChange(n)}
              className="p-1 active:opacity-70"
              role="button"
            >
              <Icon
                name={filled ? "star" : "star-outline"}
                size={32}
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
