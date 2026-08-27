import { screen, within } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { SidebarNav } from "./sidebar-nav";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    // `dangerouslySingular` rides through with `href` because it is half of what a
    // panel link IS (#989) - a link that pushes a duplicate of a screen already in the
    // stack is a different thing from one that returns to it.
    Link: ({
      href,
      asChild: _asChild,
      children,
      dangerouslySingular,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
      // expo-router's real SingularOptions; the panel only ever passes `true`.
      dangerouslySingular?: boolean | ((name: string, params: object) => string | undefined);
    }) => React.cloneElement(React.Children.only(children), { href, dangerouslySingular }),
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
    ["CBT", "CBT module - Cognitive Behavioural Therapy"],
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

/**
 * The panel is LATERAL navigation between peer destinations, and expo-router's default
 * NAVIGATE only reuses the route it is already on: a target sitting deeper in the stack
 * gets pushed again. Routines -> Home therefore mounted a SECOND Home and every query on
 * it ran twice (#989). `dangerouslySingular` moves the existing screen to the top instead.
 *
 * Asserted over every row rather than a sampled one: the defect is per-link, so one
 * un-marked row is the whole bug back for that destination.
 */
describe("SidebarNav link identity", () => {
  it("marks every destination singular so a revisit cannot stack a second copy", () => {
    renderWithProviders(<SidebarNav />);

    // Report the hrefs that are NOT singular rather than asserting row by row: the
    // failure then names the destination that regressed instead of just "false !== true".
    const notSingular = screen
      .getAllByRole("link")
      .filter((link) => link.props.dangerouslySingular !== true)
      .map((link) => String(link.props.href));

    expect(notSingular).toEqual([]);
  });

  // Guards the assertion above against passing vacuously: an empty-array expectation is
  // satisfied forever by a render that produces no links at all. Named destinations
  // rather than a count, so adding a nav item doesn't fail a test about something else.
  it("actually renders the destinations that assertion is about", () => {
    renderWithProviders(<SidebarNav />);

    const hrefs = screen.getAllByRole("link").map((link) => String(link.props.href));

    expect(hrefs).toEqual(expect.arrayContaining(["/(app)", "/(app)/routines", "/(app)/settings"]));
  });
});
