import { Pressable, View } from "react-native";

import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";

interface CheckboxRowProps {
  checked: boolean;
  /** Optional second line, in the same column as the label. */
  description?: string;
  label: string;
  onToggle: () => void;
  /** The row; the pressable body carries `${testID}-body`. */
  testID?: string;
}

/**
 * One checkbox and its label as a row (#2349).
 *
 * Shared so that the two lists a thought record puts next to each other -
 * Feelings and Patterns - are one control in one shape rather than two that
 * drift apart. The descriptions Patterns carries sit in the same column as
 * the label, not in card chrome: the chrome was a third of that block's
 * height and no other checkbox list in the app wears it.
 *
 * ☠️ The label keeps its own `onPress`. `Label`'s root is a `Pressable`
 * whether or not it is given a handler, so it claims the touch over its own
 * text either way - dropping the handler would make the label dead rather
 * than deferring to the body. Only one responder wins a touch, so the two
 * nested handlers fire once between them, never twice.
 *
 * Rows are deliberately NOT raised to a 44px minimum height: measured on
 * #2333 that costs ~936px across the two lists against the 864px this shape
 * reclaims, and `Checkbox` already presents a 44px effective target through
 * `COMPACT_CONTROL_HIT_SLOP` while consuming no layout height.
 */
export function CheckboxRow({ checked, description, label, onToggle, testID }: CheckboxRowProps) {
  return (
    <View className="flex-row items-start gap-3" testID={testID}>
      <Checkbox accessibilityLabel={label} checked={checked} onCheckedChange={onToggle} />
      <Pressable
        accessible={false}
        className="flex-1 gap-1"
        focusable={false}
        onPress={onToggle}
        testID={testID ? `${testID}-body` : undefined}
      >
        <Label onPress={onToggle}>{label}</Label>
        {description ? <Text variant="muted">{description}</Text> : null}
      </Pressable>
    </View>
  );
}
