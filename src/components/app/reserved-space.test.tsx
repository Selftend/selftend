import { render, screen } from "@testing-library/react-native";
import { ActivityIndicator, Text as RNText, View } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { ReservedSpace } from "@/src/components/app/reserved-space";
import { SelectableChip } from "@/src/components/app/selectable-chip";

/**
 * ADR-0009's reservation technique, and the two things about it that a caller cannot be
 * trusted to remember. Its one shipped application, `ChipRunReservation`, is covered beside
 * the chips it stands in for, in `selectable-chip.test.tsx`.
 *
 * ⚠️ What this file deliberately does NOT assert is the reserved HEIGHT. NativeWind resolves
 * no width or height into `props.style` under jest, so a geometry assertion here is
 * *vacuously green* — it passes without measuring anything (the reasoning is written out at
 * `item-card.tsx`). The height half is guarded in a real engine by
 * `test/e2e/loading-reserves-space.e2e.test.ts`; what is testable here is the a11y and
 * pointer consequences of holding real content in an invisible subtree.
 *
 * ☠️ Every query into a reservation needs `includeHiddenElements`. RNTL excludes hidden
 * subtrees from ALL queries, `*ByTestId` included, so hiding the stick correctly is exactly
 * what puts it out of reach of the assertions about it.
 */

/** Host nodes only — `findAll` returns the composite element as well, and both carry props. */
function hosts(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[] {
  return screen.UNSAFE_root.findAll((node) => typeof node.type === "string" && predicate(node));
}

/**
 * The measuring stick, identified by the one prop only it carries.
 *
 * ☠️ Never "any node with `aria-hidden`": `Icon` sets that on itself, so such a search finds
 * a decorative glyph inside the stick and passes with the stick's own hiding deleted.
 */
function stick(): ReactTestInstance {
  const found = hosts((node) => node.props.pointerEvents === "none");
  expect(found).toHaveLength(1);
  return found[0];
}

describe("ReservedSpace", () => {
  it("hides the measuring stick from the accessibility tree on all three platforms", () => {
    render(
      <ReservedSpace>
        <RNText>Anxious</RNText>
      </ReservedSpace>,
    );

    // All three, not any one: the two React Native props cover iOS and Android, and
    // `aria-hidden` covers web, where react-native-web implements NEITHER of them. The stick
    // holds real words, and a word in the DOM is a word a screen reader reads out.
    const props = stick().props;
    expect(props.accessibilityElementsHidden).toBe(true);
    expect(props.importantForAccessibility).toBe("no-hide-descendants");
    expect(props["aria-hidden"]).toBe(true);
  });

  it("takes no pointer events, so an invisible control cannot be pressed", () => {
    const onPress = jest.fn();
    render(
      <ReservedSpace>
        <SelectableChip label="Anxious" selected={false} onToggle={onPress} />
      </ReservedSpace>,
    );

    // `opacity-0` hides a control from the eye and from nothing else: on web an invisible
    // `Pressable` is still perfectly clickable, which would turn a reservation meant to
    // protect a tap into a way of stealing one.
    expect(stick().props.pointerEvents).toBe("none");
  });

  it("renders the visible signal outside the hidden subtree", () => {
    render(
      <ReservedSpace overlay={<RNText>Loading</RNText>}>
        <RNText>Anxious</RNText>
      </ReservedSpace>,
    );

    // Found WITHOUT the opt-in, which is the assertion: the signal the reader sees is not
    // swept up by the hiding that the stick needs.
    expect(screen.getByText("Loading")).toBeTruthy();
    expect(screen.queryByText("Anxious")).toBeNull();
    expect(screen.getByText("Anxious", { includeHiddenElements: true })).toBeTruthy();
  });

  it("holds no space at all when given no children", () => {
    // The degenerate case a caller hits by passing an empty list: nothing to reserve, and
    // the overlay still draws. Guards against the stick wrapper acquiring a height of its own.
    render(
      <ReservedSpace overlay={<ActivityIndicator />}>
        <View />
      </ReservedSpace>,
    );

    expect(stick().props.className).toBe("opacity-0");
  });
});
