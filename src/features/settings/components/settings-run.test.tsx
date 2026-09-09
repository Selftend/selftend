import { render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { SettingsRun } from "@/src/features/settings/components/settings-run";

/** Every wrapper the run draws, in order, with the classes it gave them. */
function rowWrapperClasses(testID: string): string[] {
  return screen
    .getByTestId(testID)
    .props.children.map((child: { props: { className?: string } }) => child.props.className ?? "");
}

describe("SettingsRun", () => {
  it("rules between rows and never above the first or below the last", () => {
    render(
      <SettingsRun label="App" testID="run">
        <View testID="a" />
        <View testID="b" />
        <View testID="c" />
      </SettingsRun>,
    );

    expect(rowWrapperClasses("run")).toEqual([
      "",
      "border-t border-border",
      "border-t border-border",
    ]);
  });

  /**
   * The regression this file exists for. A platform-gated row must be `null` AT
   * THE MOUNT POINT: `Children.toArray` drops a `null` child, but a child element
   * that returns `null` once rendered is still a child - so a self-hiding row
   * leaves its hairline behind as a rule with nothing under it.
   */
  it("drops a null child entirely, hairline included", () => {
    render(
      <SettingsRun label="Your data" testID="run">
        <View testID="a" />
        {null}
        <View testID="c" />
      </SettingsRun>,
    );

    expect(rowWrapperClasses("run")).toEqual(["", "border-t border-border"]);
  });

  it("names the run as a heading, so four runs are four landmarks", () => {
    render(
      <SettingsRun label="Account" testID="run">
        <View testID="a" />
      </SettingsRun>,
    );

    expect(screen.getByRole("header", { name: "Account" })).toBeTruthy();
  });

  /** The run's own classes, token-wise - `className` never becomes `style` in jest. */
  function runClasses(testID: string): string[] {
    return String(screen.getByTestId(testID).props.className ?? "")
      .split(/\s+/)
      .filter(Boolean);
  }

  it("draws the card when no surface is asked for - today's look is the default", () => {
    render(
      <SettingsRun label="App" testID="run">
        <View testID="a" />
      </SettingsRun>,
    );

    expect(runClasses("run")).toEqual(
      expect.arrayContaining(["bg-card", "border", "border-border"]),
    );
  });

  /**
   * #1725: a run inside a titled `Section` already sits on that section's
   * chrome, so it draws no fill and no box of its own.
   *
   * #1800: but it DOES rule above every row including the first, and closes with
   * a rule of its own - `13a` and `14a` both draw that, and the card's reason for
   * ruling between rows only ("a fifth, empty row against the card's own
   * border") has no border to apply to here. The `Children.toArray` contract
   * still holds: the `null` child below leaves no rule.
   */
  it("a hairline run has no card chrome, and rules above every row", () => {
    render(
      <SettingsRun surface="hairline" label="Other ways to reach us" testID="run">
        <View testID="a" />
        {null}
        <View testID="c" />
      </SettingsRun>,
    );

    const classes = runClasses("run");
    expect(classes).not.toContain("bg-card");
    expect(classes).not.toContain("rounded-xl");
    // No all-sides border - only the closing rule.
    expect(classes).not.toContain("border");
    expect(classes).toContain("border-b");

    expect(rowWrapperClasses("run")).toEqual(["border-t border-border", "border-t border-border"]);
    // The eyebrow's inset is optical, against the card's edge; with no card it
    // sits on the rows' own left edge (the spec's "inset 0").
    const eyebrow = screen.getByRole("header", { name: "Other ways to reach us" });
    expect(String(eyebrow.props.className ?? "").split(/\s+/)).not.toContain("px-1");
  });

  /**
   * The closing rule is the one part of a hairline run that has nothing to hang
   * off, so it is drawn by the run itself - and must not survive when every row
   * was gated away at its mount point, or the run becomes a lone rule.
   */
  it("a hairline run with every row gated away draws no closing rule", () => {
    render(
      <SettingsRun surface="hairline" label="Your data" testID="run">
        {null}
        {null}
      </SettingsRun>,
    );

    expect(runClasses("run")).not.toContain("border-b");
    expect(rowWrapperClasses("run")).toEqual([]);
  });

  /** The card is unchanged by #1800: its own border still ends the run. */
  it("a card run draws no closing rule of its own", () => {
    render(
      <SettingsRun label="App" testID="run">
        <View testID="a" />
      </SettingsRun>,
    );

    expect(runClasses("run")).not.toContain("border-b");
  });

  it("the card keeps the eyebrow's optical inset", () => {
    render(
      <SettingsRun label="App" testID="run">
        <View testID="a" />
      </SettingsRun>,
    );

    expect(String(screen.getByRole("header", { name: "App" }).props.className)).toContain("px-1");
  });
});
