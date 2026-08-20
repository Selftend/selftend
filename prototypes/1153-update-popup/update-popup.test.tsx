import { render, screen } from "@testing-library/react-native";

import { UpdatePopupPrototype } from "./update-popup";

/**
 * PROTOTYPE test (#1153). Pins the one thing about this shape that is silently
 * load-bearing: "Later" comes FIRST in the tree.
 *
 * On web that ordering IS the C1 mechanism — react-native-web's ModalFocusTrap
 * focuses the first focusable descendant on open, and the Card/Header/Title
 * wrappers carry no tabIndex, so the first `role="button"` receives focus.
 * Swap these two buttons and the irreversible action becomes the Enter-key
 * default for someone who was mid-sentence. Nothing else in the file would
 * look wrong.
 */
describe("update popup prototype", () => {
  it('renders "Later" before the update action, which is what focuses "Later" on web', () => {
    render(<UpdatePopupPrototype onLater={() => {}} onUpdate={() => {}} visible />);

    const buttons = screen.getAllByRole("button");
    const testIDs = buttons.map((button) => button.props.testID);

    expect(testIDs).toEqual(["update-popup-later", "update-popup-act"]);
  });

  it("has no third button — no X, no bare glyph (C3)", () => {
    render(<UpdatePopupPrototype onLater={() => {}} onUpdate={() => {}} visible />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
