import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

interface ProgressSegmentsProps {
  total: number;
  current: number; // 0-based index of the active step
  hue: ExerciseHue;
}

export function ProgressSegments({ total, current, hue }: ProgressSegmentsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation("cbt");
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("grounding.step", { current: current + 1, total })}
      style={{ flexDirection: "row", gap: 6 }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const alpha = i < current ? 1 : i === current ? 0.6 : 0.16;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: hueHsl(hue, isDark, alpha),
            }}
          />
        );
      })}
    </View>
  );
}
