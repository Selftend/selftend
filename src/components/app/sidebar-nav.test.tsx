import { screen, within } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { SidebarNav } from "./sidebar-nav";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
    usePathname: () => "/",
  };
});

/** Every string rendered inside one row, in document order. Icons are `aria-hidden`. */
function textsInRow(accessibilityLabel: string): string[] {
  const row = screen.getByLabelText(accessibilityLabel);
  return within(row)
    .queryAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
}

/**
 * The sidebar carried a status chip on all three module rows: DBT read "Soon"
 * over a screen headed "On the roadmap", and CBT and ACT both read "Beta"
 * despite being fully usable. Apple cited build 6 under Guideline 2.1 *App
 * Completeness* (#998), which is exactly what a nav entry advertising a module
 * the app does not have invites. #1020 took all three off.
 *
 * These assertions count the text nodes in a row rather than querying for the
 * words that were removed. A `queryByText("Soon")).toBeNull()` passes just as
 * happily when the chip returns under new wording, or when the row stops
 * rendering altogether - it rots into a test of nothing. One label and nothing
 * beside it is the property that actually holds.
 */
describe("SidebarNav module rows", () => {
  it.each([
    ["CBT", "CBT module - Cognitive Behavioral Therapy"],
    ["ACT", "ACT module - Acceptance and Commitment Therapy"],
    ["DBT", "DBT overview - Dialectical Behavior Therapy"],
  ])("renders %s as a bare label with no status chip beside it", (label, accessibilityLabel) => {
    renderWithProviders(<SidebarNav />);

    expect(textsInRow(accessibilityLabel)).toEqual([label]);
  });

  // The chip is the visible half; a screen reader heard the other half. The DBT
  // row announced itself as "(coming soon)" whether or not the pill rendered.
  it("announces DBT without a coming-soon suffix", () => {
    renderWithProviders(<SidebarNav />);

    expect(screen.getByLabelText("DBT overview - Dialectical Behavior Therapy")).toBeTruthy();
    expect(screen.queryByLabelText(/coming soon/i)).toBeNull();
  });

  it("still lists all three modules", () => {
    renderWithProviders(<SidebarNav />);

    for (const label of ["CBT", "ACT", "DBT"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
