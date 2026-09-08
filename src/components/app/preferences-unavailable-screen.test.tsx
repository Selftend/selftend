import { fireEvent, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { PreferencesUnavailableScreen } from "./preferences-unavailable-screen";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so the
    // real link target can be asserted (the shape under-floor-screen.test uses).
    Link: ({
      href,
      asChild: _asChild,
      dangerouslySingular: _dangerouslySingular,
      children,
    }: {
      href: string;
      asChild?: boolean;
      dangerouslySingular?: boolean;
      children: ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

/**
 * The screen that stands where the app would be while neither legal verdict can
 * be read (#2200 for the errored half, #2229 for the in-flight one).
 *
 * `protected-layout.test.tsx` owns WHEN it renders. What this file owns is what
 * it offers once it has: the two halves say different things, only one of them
 * carries a retry, and BOTH have to leave crisis guidance reachable.
 */
describe("PreferencesUnavailableScreen", () => {
  it("offers a retry on the errored half, and runs it", () => {
    const onRetry = jest.fn();
    renderWithProviders(<PreferencesUnavailableScreen onRetry={onRetry} state="error" />);

    expect(screen.getByText("We can't open the app just yet")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("says the read is still running on the in-flight half, and offers no retry", () => {
    // ⚠️ A retry for a fetch that has not finished is a control that does
    // nothing. The state clears itself when the row lands or when the query
    // finally errors into the half above.
    renderWithProviders(<PreferencesUnavailableScreen onRetry={jest.fn()} state="loading" />);

    expect(screen.getByText("Getting your account ready")).toBeTruthy();
    expect(screen.queryByText("Retry")).toBeNull();
    expect(screen.queryByText("We can't open the app just yet")).toBeNull();
  });

  /**
   * ☠️☠️ Gate test A2 (#2228). This screen replaces the WHOLE protected tree,
   * and the state it replaces it in reached the app shell on shipped 0.17.0 -
   * from which Support -> Crisis was about two taps away. A guest is the case
   * that decides it: guests have no sign-out, so without this card there is no
   * route to crisis guidance at all while the block holds.
   *
   * `/crisis` is a ROOT route, a sibling of the `(app)` group, so it renders
   * outside the layout that is blocking - which is the whole reason the link can
   * work from here.
   */
  it.each(["error", "loading"] as const)("routes to crisis guidance on the %s half", (state) => {
    renderWithProviders(<PreferencesUnavailableScreen onRetry={jest.fn()} state={state} />);

    expect(screen.getByText("If you need support right now")).toBeTruthy();
    expect(screen.getByText("Open crisis guidance")).toBeTruthy();
    expect(screen.queryAllByRole("link").map((node) => node.props.href)).toEqual(["/crisis"]);
    // Not "/(app)/crisis": inside the group it would render under the very
    // layout that is refusing to render, and lead nowhere.
    expect(screen.queryAllByRole("link").map((node) => String(node.props.href))).not.toContain(
      "(app)",
    );
  });

  it("offers Find A Helpline beside it, which needs no account either", () => {
    renderWithProviders(<PreferencesUnavailableScreen onRetry={jest.fn()} state="error" />);

    expect(screen.getByText("Open Find A Helpline")).toBeTruthy();
  });
});
