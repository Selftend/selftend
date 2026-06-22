import { View } from "react-native";
import { useColorScheme } from "nativewind";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { exerciseHue, hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { cn } from "@/lib/utils";

interface HueIconBadgeProps {
  icon: MaterialIconName;
  hue: ExerciseHue;
  size: number;
  iconSize: number;
  shape?: "square" | "circle";
}

// Static size classes (written out in full so NativeWind's compiler sees them).
// The badge MUST set the icon's box size via className: the shared Icon carries a
// default `size-6` (24px) box, so without an overriding size class a larger glyph
// (32/46/48px) overflows the 24px box and anchors top-left instead of centering.
const ICON_SIZE_CLASS: Record<number, string> = {
  24: "size-6",
  32: "size-8",
  46: "size-[46px]",
  48: "size-12",
};

export function iconSizeClass(iconSize: number): string {
  return ICON_SIZE_CLASS[iconSize] ?? "size-6";
}

// Decorative hue-tinted container holding a single centered icon. Used at four sizes:
// home card (square 50/24), intro hero (square 64/32), session center (circle 108/48),
// done (circle 96/46).
export function HueIconBadge({ icon, hue, size, iconSize, shape = "square" }: HueIconBadgeProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === "circle" ? size / 2 : size * 0.28,
        backgroundColor: hueHsl(hue, isDark, 0.14),
        borderWidth: 1,
        borderColor: hueHsl(hue, isDark, 0.4),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name={icon}
        size={iconSize}
        className={cn(iconSizeClass(iconSize), exerciseHue(hue).classes.text)}
      />
    </View>
  );
}
