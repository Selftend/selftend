import { fireEvent, render, screen } from "@testing-library/react-native";

import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { setPlatformOS } from "@/test/modal-marker-mock";

afterEach(() => {
  setPlatformOS("ios");
});

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

  /**
   * The fourth mark (#1725): a row that LEAVES THE APP is a link, not a button,
   * and says so with `open-in-new` rather than a chevron - a chevron promises a
   * screen inside the app.
   */
  it("an external row is a link marked open-in-new, and assistive tech never sees the mark", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        icon="forum"
        label="Join the Discord"
        description="Other people using the app, plus the maintainers."
        trailing={{ kind: "external" }}
        onPress={onPress}
        testID="row"
      />,
    );

    expect(screen.getByRole("link", { name: "Join the Discord" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();

    // `name` is forwarded down the icon's wrappers, so `[0]` is the `Icon` element
    // itself - the one that carries the hiding props.
    const mark = screen.UNSAFE_queryAllByProps({ name: "open-in-new" })[0];
    expect(mark.props.accessibilityElementsHidden).toBe(true);
    expect(mark.props.importantForAccessibility).toBe("no");
    expect(screen.UNSAFE_queryAllByProps({ name: "chevron-right" })).toHaveLength(0);

    fireEvent.press(screen.getByTestId("row"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("a disabled external row keeps its description - the second line is WHY it is off", () => {
    const onPress = jest.fn();
    render(
      <SettingsRow
        icon="mail-outline"
        label="Email support"
        description="Email support is not set up."
        trailing={{ kind: "external" }}
        disabled
        onPress={onPress}
        testID="row"
      />,
    );

    expect(screen.getByText("Email support is not set up.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Email support", disabled: true })).toBeTruthy();
    fireEvent.press(screen.getByTestId("row"));
    expect(onPress).not.toHaveBeenCalled();
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and an href-less Pressable is a `<div role="link">` the browser
   * does nothing with. So the external row activates itself on Enter, once, and
   * a button row must NOT (RNW already activates buttons; a second handler
   * would fire the press twice - the Space-activation trap, on the other key).
   */
  it("on web, an external row activates on Enter and only on Enter; a button row has no handler of its own", () => {
    setPlatformOS("web");
    const onExternal = jest.fn();
    const onButton = jest.fn();
    render(
      <>
        <SettingsRow
          icon="forum"
          label="Join the Discord"
          trailing={{ kind: "external" }}
          onPress={onExternal}
          testID="external"
        />
        <SettingsRow
          icon="shield"
          label="Privacy"
          trailing={{ kind: "chevron" }}
          onPress={onButton}
          testID="button"
        />
      </>,
    );

    const external = screen.getByTestId("external");
    const preventDefault = jest.fn();
    external.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
    expect(onExternal).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    external.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
    external.props.onKeyDown({ key: " ", repeat: false, preventDefault });
    expect(onExternal).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("button").props.onKeyDown).toBeUndefined();
  });

  it("on web, a disabled external row has no Enter handler at all", () => {
    setPlatformOS("web");
    render(
      <SettingsRow
        icon="mail-outline"
        label="Email support"
        trailing={{ kind: "external" }}
        disabled
        onPress={jest.fn()}
        testID="row"
      />,
    );

    expect(screen.getByTestId("row").props.onKeyDown).toBeUndefined();
  });
});
