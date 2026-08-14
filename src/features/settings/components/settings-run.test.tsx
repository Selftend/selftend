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
});
