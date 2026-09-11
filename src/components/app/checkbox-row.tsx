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
  /** Lands on the row itself, which is the pressable. */
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
 * The whole row is the target, not the label's text box, which was the one
 * real gap: `Checkbox` already had a forgiving hit area on native and the
 * label had none beyond its own glyphs.
 *
 * `items-start`, matching the row `ConsentCheckbox` already ships. It is
 * forced rather than chosen: a row carrying a description must align its box
 * to the FIRST LINE, and centring against a two-line block would sit it
 * between them. Feelings rows were `items-center` before and now top-align
 * too - a couple of px on a single-line row, and the price of the two lists
 * being one control rather than two that drift.
 *
 * ☠️ The label keeps its own `onPress` even though the row now has one.
 * `Label`'s root is a `Pressable` whether or not it is given a handler, so it
 * claims the touch over its own text either way - dropping the handler would
 * make the label DEAD rather than deferring to the row.
 *
 * ☠️ The three nested handlers (row, label, checkbox) fire once between them,
 * never twice: the responder system grants the touch to the first node that
 * wants it walking out from the target, and on web `PressResponder`'s click
 * path stops propagation for the same reason. That is a platform guarantee,
 * NOT something the tests below prove - RNTL's `fireEvent.press` walks to the
 * nearest handler and stops, so it cannot observe a double fire at all.
 *
 * Rows are deliberately NOT raised to a 44px minimum height: measured on
 * #2333 that costs ~936px across the two lists against the 864px this shape
 * reclaims, a net loss. What the row gives instead differs by platform, and
 * ☠️ the two must not be conflated:
 *
 * - Native: `Checkbox` carries `COMPACT_CONTROL_HIT_SLOP`, so the 16px box is
 *   already a 44px effective target consuming no layout height.
 * - Web: `hitSlop` does nothing there (`docs/accessibility.md`) - the DOM box
 *   is the target. What widens it is the `flex-1` body below, which makes the
 *   whole remaining width of the row pressable. The rows stay under the
 *   24 x 24 WCAG 2.5.8 floor on height, as the Feelings list already shipped;
 *   that is the accepted, measured cost recorded on #2333 and in
 *   `docs/accessibility.md`, not an oversight to quietly fix here.
 */
export function CheckboxRow({ checked, description, label, onToggle, testID }: CheckboxRowProps) {
  return (
    <Pressable
      accessible={false}
      className="flex-row items-start gap-3"
      focusable={false}
      onPress={onToggle}
      testID={testID}
    >
      <Checkbox accessibilityLabel={label} checked={checked} onCheckedChange={onToggle} />
      <View className="flex-1 gap-1">
        <Label onPress={onToggle}>{label}</Label>
        {description ? <Text variant="muted">{description}</Text> : null}
      </View>
    </Pressable>
  );
}
