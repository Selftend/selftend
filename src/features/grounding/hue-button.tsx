import { ActivityIndicator, Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useColorSchemeName } from "@/src/lib/color-scheme";

// Hues bright enough in light mode that white text fails contrast — use dark text.
// In dark mode every hue is pastel, so dark text is always used.
// "be" moved out when its light token darkened to 330 56% 47% (white 5.4:1, dark text 3.4:1).
const LIGHT_MODE_DARK_TEXT = new Set<ExerciseHue>(["iris", "think"]);
const DARK_TEXT = "#15121b";
const LIGHT_TEXT = "#ffffff";

function foreground(hue: ExerciseHue, isDark: boolean) {
  if (isDark) return DARK_TEXT;
  return LIGHT_MODE_DARK_TEXT.has(hue) ? DARK_TEXT : LIGHT_TEXT;
}

interface HueButtonProps {
  hue: ExerciseHue;
  label: string;
  onPress: () => void;
  icon?: MaterialIconName;
  disabled?: boolean;
  loading?: boolean;
}

// Solid hue-filled primary CTA with theme-aware foreground for accessible contrast.
export function HueButton({ hue, label, onPress, icon, disabled, loading }: HueButtonProps) {
  const isDark = useColorSchemeName() === "dark";
  const fg = foreground(hue, isDark);
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
        backgroundColor: hueHsl(hue, isDark, 1),
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
