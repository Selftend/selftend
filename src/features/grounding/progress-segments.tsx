import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAccentHsl } from "@/src/lib/theme-palette";
import { currentStateProps } from "@/src/lib/accessibility";

interface ProgressSegmentsProps {
  total: number;
  current: number; // 0-based index of the active step
  onSelect?: (index: number) => void;
}

export function ProgressSegments({ total, current, onSelect }: ProgressSegmentsProps) {
  const accent = useAccentHsl();
  const { t } = useTranslation("cbt");
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const alpha = i < current ? 1 : i === current ? 0.6 : 0.16;
        return (
          <Pressable
            key={i}
            accessibilityLabel={t("grounding.goToStep", { current: i + 1, total })}
            accessibilityRole="button"
            disabled={!onSelect}
            onPress={() => onSelect?.(i)}
            role="button"
            {...currentStateProps(i === current, "step")}
            style={{
              flex: 1,
              minHeight: 44,
              justifyContent: "center",
            }}
          >
            <View style={{ height: 4, borderRadius: 2, backgroundColor: accent(alpha) }} />
          </Pressable>
        );
      })}
    </View>
  );
}
