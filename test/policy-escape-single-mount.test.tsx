import { useEffect } from "react";
import { Text } from "react-native";
import { Link, Slot, Stack } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import "@/src/i18n";

/**
 * The Escape returns to a route already in the stack by POPPING to it, never by
 * mounting a second copy (#2824).
 *
 * The case that found it: the consent gate links a policy page, and the policy
 * page's "Back to Home" Escape used to `replace` - which swaps the policy page
 * for a NEW `(app)` route while the original still sits below it, so
 * `ProtectedLayout` and everything under it ran twice for the rest of the
 * session. A real router rather than a mocked one, because what is being pinned
 * is the navigation state the press leaves behind, not the call it makes.
 */
let appLayoutMounts = 0;

function AppLayout() {
  useEffect(() => {
    appLayoutMounts += 1;
  }, []);
  return <Slot />;
}

const ROUTES = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  "(app)/_layout": AppLayout,
  "(app)/index": () => (
    <>
      <Text testID="consent-gate">gate</Text>
      <Link href="/privacy">Read Privacy Policy</Link>
    </>
  ),
  privacy: () => <ScreenEscape />,
};

beforeEach(() => {
  appLayoutMounts = 0;
});

describe("the Escape from a policy page (#2824)", () => {
  it("pops back to the gate it was opened from instead of mounting the app a second time", () => {
    const app = renderRouter(ROUTES, { initialUrl: "/" });
    expect(appLayoutMounts).toBe(1);

    act(() => {
      fireEvent.press(screen.getByText("Read Privacy Policy"));
    });
    expect(app.getPathname()).toBe("/privacy");

    act(() => {
      fireEvent.press(screen.getByLabelText("Back to Home"));
    });

    expect(app.getPathname()).toBe("/");
    expect(screen.getAllByTestId("consent-gate", { includeHiddenElements: true })).toHaveLength(1);
    expect(appLayoutMounts).toBe(1);
  });

  it("still reaches Home, once, when the policy page was the first thing opened", () => {
    const app = renderRouter(ROUTES, { initialUrl: "/privacy" });
    expect(appLayoutMounts).toBe(0);

    act(() => {
      fireEvent.press(screen.getByLabelText("Back to Home"));
    });

    expect(app.getPathname()).toBe("/");
    expect(screen.getAllByTestId("consent-gate", { includeHiddenElements: true })).toHaveLength(1);
    expect(appLayoutMounts).toBe(1);
  });
});
