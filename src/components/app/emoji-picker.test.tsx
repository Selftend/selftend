import { fireEvent, render, screen } from "@testing-library/react-native";

import { EmojiPicker } from "./emoji-picker";

describe("EmojiPicker", () => {
  it("renders all emoji tiles as buttons", () => {
    render(<EmojiPicker value="" onSelect={() => {}} />);
    // 68 emojis in the curated list
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(60);
  });

  it("calls onSelect with the tapped emoji", () => {
    const onSelect = jest.fn();
    render(<EmojiPicker value="" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText("😊"));
    expect(onSelect).toHaveBeenCalledWith("😊");
  });

  it("marks the current value tile as selected in the a11y tree", () => {
    render(<EmojiPicker value="😭" onSelect={() => {}} />);
    const selected = screen.getByLabelText("😭");
    expect(selected.props.accessibilityState).toMatchObject({ selected: true });
  });

  it("does not mark other tiles as selected", () => {
    render(<EmojiPicker value="😭" onSelect={() => {}} />);
    const unselected = screen.getByLabelText("😊");
    expect(unselected.props.accessibilityState).toMatchObject({ selected: false });
  });
});
