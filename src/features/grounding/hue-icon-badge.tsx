import { View } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { CHROME_ACCENT_MARK } from "@/src/lib/theme/chrome";
import { useAccentHsl } from "@/src/lib/theme-palette";

interface HueIconBadgeProps {
  icon: MaterialIconName;
  size: number;
  iconSize: number;
  shape?: "square" | "circle";
}

// Decorative hue-tinted container holding a single centered icon. Used by the
// session step (circle 92/34) and the done screen (circle 84/32).
export function HueIconBadge({ icon, size, iconSize, shape = "square" }: HueIconBadgeProps) {
  const accent = useAccentHsl();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === "circle" ? size / 2 : size * 0.28,
        backgroundColor: accent(0.14),
        borderWidth: 1,
        borderColor: accent(0.4),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name={icon}
        size={iconSize}
        className={CHROME_ACCENT_MARK}
        // The shared Icon defaults to a `size-6` (24px) box class, and NativeWind
        // cannot compile a size class from a runtime prop — so the box is sized
        // inline, where it overrides the class-derived box and matches the glyph
        // for any iconSize instead of only table-listed values.
        style={{ width: iconSize, height: iconSize }}
      />
    </View>
  );
}
