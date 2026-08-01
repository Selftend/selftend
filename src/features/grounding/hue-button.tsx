import { ActivityIndicator, Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAccentHsl } from "@/src/lib/theme-palette";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";

// The label sits on a solid accent fill, so it is one of two raw colours rather
// than a class - `style={{ color }}` and `ActivityIndicator color=` cannot read a
// CSS variable. Same two constants the hue version used.
const DARK_TEXT = "#15121b";
const LIGHT_TEXT = "#ffffff";

interface HueButtonProps {
  label: string;
  onPress: () => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  loading?: boolean;
}

// The grounding CTA, filled in the app accent (#588).
//
// It used to be filled in the technique's own hue, and it carried a table for
// the consequence: `iris` and `think` are bright enough in light mode that white
// text fails on them, so those two flipped the label to dark while the other six
// kept white. Five techniques are a menu rather than a scale (#558), so the fill
// is the accent now and the label is the accent's own foreground - one pairing,
// already held to AA by the palette gates, with no per-hue exceptions to keep
// straight.
export function HueButton({ label, onPress, icon, disabled, loading }: HueButtonProps) {
  const isDark = useColorSchemeName() === "dark";
  const accent = useAccentHsl();
  // The scheme decides it, and only the scheme. The hue version needed a set of
  // exceptions here - `iris` and `think` are bright enough in light mode that
  // white fails on them - because it was filling with eight different colours.
  // One accent has one answer: the light accent (262 62% 56%) is dark enough to
  // carry white, and the dark accent (264 72% 72%) is a pastel that needs dark
  // text, which is what the file already said about every hue in dark mode.
  const fg = isDark ? DARK_TEXT : LIGHT_TEXT;
  const blocked = Boolean(disabled || loading);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      aria-disabled={blocked}
      disabled={blocked}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      role="button"
      style={{
        backgroundColor: accent(1),
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: blocked ? 0.5 : 1,
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      {icon && !loading ? <Icon name={icon} size={20} style={{ color: fg }} /> : null}
      <Text className="text-[15px] font-semibold" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
