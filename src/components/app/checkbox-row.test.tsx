import { fireEvent, render, screen } from "@testing-library/react-native";

import { CheckboxRow } from "@/src/components/app/checkbox-row";

/**
 * The row the two lists in a thought record share (#2349).
 *
 * ☠️ The point of the component is that Feelings and Patterns cannot drift
 * apart, so what is asserted here is asserted once for both: the same press
 * targets, the same structure, an optional description in the same column.
 *
 * The press targets are three and each must fire EXACTLY once - the row nests
 * a pressable label inside a pressable body, and a double fire would toggle
 * twice and read as a dead tap.
 */
describe("CheckboxRow", () => {
  it("renders the label, and a description when one is given", () => {
    render(
      <CheckboxRow
        checked={false}
        description="Seeing the situation in extremes."
        label="All-or-nothing thinking"
        onToggle={jest.fn()}
        testID="row-all-or-nothing"
      />,
    );

    expect(screen.getByText("All-or-nothing thinking")).toBeTruthy();
    expect(screen.getByText("Seeing the situation in extremes.")).toBeTruthy();
  });

  it("renders nothing but the label when there is no description", () => {
    render(
      <CheckboxRow checked={false} label="Anxious" onToggle={jest.fn()} testID="row-anxious" />,
    );

    expect(screen.getByText("Anxious")).toBeTruthy();
    expect(screen.getAllByText(/\S/)).toHaveLength(1);
  });

  it("toggles from the checkbox, once", () => {
    const onToggle = jest.fn();
    render(
      <CheckboxRow checked={false} label="Anxious" onToggle={onToggle} testID="row-anxious" />,
    );

    fireEvent.press(screen.getByRole("checkbox", { name: "Anxious" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("toggles from the label text, once", () => {
    const onToggle = jest.fn();
    render(
      <CheckboxRow checked={false} label="Anxious" onToggle={onToggle} testID="row-anxious" />,
    );

    fireEvent.press(screen.getByText("Anxious"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("☠️ toggles from the row body - the hit area is no longer the text box", () => {
    const onToggle = jest.fn();
    render(
      <CheckboxRow
        checked={false}
        description="Jumping to the worst case."
        label="Catastrophizing"
        onToggle={onToggle}
        testID="row-catastrophizing"
      />,
    );

    fireEvent.press(screen.getByTestId("row-catastrophizing-body"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("announces the checked state on the checkbox", () => {
    render(<CheckboxRow checked label="Anxious" onToggle={jest.fn()} testID="row-anxious" />);

    expect(screen.getByRole("checkbox", { name: "Anxious" })).toBeChecked();
  });
});
