import { Pressable } from "react-native";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface FabProps {
  icon: MaterialIconName;
  /** Omit for an icon-only pill (e.g. the completed checkmark state). */
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

// The app's first floating action button primitive (the UI is otherwise
// inline-only): a small labelled pill. It only draws the button - corner
// placement (and safe-area offsets) belong to the host that renders it.
export function Fab({ icon, label, accessibilityLabel, onPress, testID }: FabProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      role="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      testID={testID}
      className="flex-row items-center gap-2 rounded-full bg-primary px-4 py-3 shadow-lg active:opacity-90"
    >
      <Icon name={icon} className="size-5 text-primary-foreground" />
      {label ? (
        <Text className="text-sm font-semibold text-primary-foreground">{label}</Text>
      ) : null}
    </Pressable>
  );
}
