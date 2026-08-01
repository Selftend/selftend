import { ActivityIndicator, Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useAccentHsl, useThemeHex } from "@/src/lib/theme-palette";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

// The label sits on a solid accent fill, so it needs a raw colour rather than a
// class - `style={{ color }}` and `ActivityIndicator color=` cannot read a CSS
// variable.

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
  const accent = useAccentHsl();
  // The PALETTE decides it, not the scheme. Deciding by scheme was right while
  // there was one accent - the default violet is dark enough in light mode to
  // carry white - but it is wrong across eight: amber-noir's light accent is a
  // gold, and white on it measures 4.43:1, below AA. That is precisely why the
  // palette solves a `--primary-foreground` per style (#580, pickPrimaryForeground);
  // reading it here means this button inherits the pairing the contrast gates
  // already hold, instead of re-deciding it from a rule that only held for one
  // palette.
  const fg = useThemeHex("--primary-foreground");
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
