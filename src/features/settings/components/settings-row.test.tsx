import { fireEvent, render, screen } from "@testing-library/react-native";

import { SettingsRow } from "@/src/features/settings/components/settings-row";

/**
 * The trailing slot is the row's whole contract (#958), so these tests are about
 * the slot rather than about the pixels: one mark at a time, and a switch row
 * that is not also a button.
 */
describe("SettingsRow trailing slot", () => {
  it("navigating rows carry a chevron that assistive tech never sees", () => {
    render(
      <SettingsRow
        icon="shield"
        label="Privacy"
        description="What we store, and how it is handled."
        trailing={{ kind: "chevron" }}
        onPress={jest.fn()}
        testID="row"
      />,
    );

    // The row's accessible name is the LABEL alone. Three e2e specs address rows
    // by exact button name, so appending the description would break all three.
    expect(screen.getByLabelText("Privacy")).toBeTruthy();
    expect(screen.queryByLabelText("What we store, and how it is handled.")).toBeNull();
  });

  it("an acting row shows a spinner instead of its mark, and refuses further presses", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        icon="download"
        label="Export my data"
        trailing={{ kind: "act" }}
        pending
        pendingLabel="Exporting..."
        onPress={onPress}
        testID="row"
      />,
    );

    expect(screen.getByTestId("row-pending")).toBeTruthy();
    fireEvent.press(screen.getByTestId("row"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("a switch row is not itself pressable - one setting, one target", () => {
    const onCheckedChange = jest.fn();
    render(
      <SettingsRow
        icon="lock"
        label="App lock"
        trailing={{ kind: "switch", checked: false, onCheckedChange }}
        testID="row"
      />,
    );

    // Pressing the row body does nothing; only the switch flips the setting.
    fireEvent.press(screen.getByTestId("row"));
    expect(onCheckedChange).not.toHaveBeenCalled();

    fireEvent(screen.getByLabelText("App lock"), "checkedChange", true);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("a pending switch row shows the spinner in the switch's own slot", () => {
    render(
      <SettingsRow
        icon="lock"
        label="App lock"
        trailing={{ kind: "switch", checked: false, onCheckedChange: jest.fn() }}
        pending
        testID="row"
      />,
    );

    expect(screen.getByTestId("row-pending")).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("a destructive row is destructive ink and carries no chevron", () => {
    render(
      <SettingsRow
        icon="delete-forever"
        label="Delete my account"
        description="This cannot be undone."
        trailing={{ kind: "act" }}
        destructive
        onPress={jest.fn()}
        testID="row"
      />,
    );

    // A chevron would promise a destination; this row opens a confirmation in
    // place. `queryByTestId` on a removed node rots silently, so the assertion is
    // on the row's rendered icon set instead.
    expect(screen.UNSAFE_queryAllByProps({ name: "chevron-right" })).toHaveLength(0);
    // ...and the ink IS the whole treatment. `className` never becomes `style` in
    // jest, so the class string is what there is to assert.
    expect(screen.UNSAFE_queryAllByProps({ name: "delete-forever" })[0].props.className).toContain(
      "text-destructive",
    );
  });
});
