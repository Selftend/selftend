import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccessibleCardLink } from "./accessible-card-link";

describe("AccessibleCardLink", () => {
  it("uses the visible title as the accessible action name", () => {
    const onPress = jest.fn();

    render(
      <AccessibleCardLink
        description="Review saved thought records."
        onPress={onPress}
        title="Thought history"
      />,
    );

    fireEvent.press(screen.getByLabelText("Thought history"));

    expect(screen.getByText("Thought history")).toBeTruthy();
    expect(screen.getByText("Review saved thought records.")).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
