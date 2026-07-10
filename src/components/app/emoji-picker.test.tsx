import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/render-with-providers";
import { EmojiPicker } from "./emoji-picker";

describe("EmojiPicker", () => {
  it("renders a labelled radiogroup with one radio per emoji tile", () => {
    renderWithProviders(<EmojiPicker value="" onSelect={() => {}} />);
    // byRole skips plain Views (not accessibility elements), so assert the
    // container's group semantics through its label instead.
    expect(screen.getByLabelText("Emoji").props.accessibilityRole).toBe("radiogroup");
    // 68 emojis in the curated list
    expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(60);
  });

  it("calls onSelect with the tapped emoji", () => {
    const onSelect = jest.fn();
    renderWithProviders(<EmojiPicker value="" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText("😊"));
    expect(onSelect).toHaveBeenCalledWith("😊");
  });

  it("marks the current value tile as checked in the a11y tree", () => {
    renderWithProviders(<EmojiPicker value="😭" onSelect={() => {}} />);
    expect(screen.getByRole("radio", { name: "😭" })).toBeChecked();
  });

  it("does not mark other tiles as checked", () => {
    renderWithProviders(<EmojiPicker value="😭" onSelect={() => {}} />);
    expect(screen.getByRole("radio", { name: "😊" })).not.toBeChecked();
  });
});
