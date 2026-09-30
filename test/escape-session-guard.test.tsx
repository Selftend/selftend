import { useEffect, type PropsWithChildren } from "react";
import { Text } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";
import { I18nContext } from "@/src/providers/i18n-provider";
import { createTestQueryClient } from "@/test/render-with-providers";
import "@/src/i18n";

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessionsByNames: jest.fn().mockResolvedValue([]),
  countMindfulnessSessionsByNames: jest.fn().mockResolvedValue(0),
  saveMindfulnessSession: jest.fn().mockResolvedValue({ id: "s1" }),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

/**
 * The session guards hold under the Escape's `dismissTo` (#2824).
 *
 * The Escape used to `replace`, which only ever removes the one route it sits
 * on. POP_TO can remove SEVERAL - every route above the destination - so this
 * pins, against a real router rather than a captured listener, that a session's
 * `beforeRemove` guard still stops the whole pop: nothing above or below the
 * session is removed while the "Finish this session?" question is open.
 *
 * Grounding stands in for all three focus sessions: breathing, meditation and
 * grounding register the same kind of guard (`preventDefault`, then ask), and
 * none of them lives on `FocusSessionShell` itself, which carries no guard.
 *
 * The second case is the one this test caught: once the exit was confirmed,
 * the session left through its OWN `router.replace("/tools/grounding")`, which
 * mounted a second tool home over the one already in the stack - the same
 * REPLACE duplicate the Escape had. All three sessions now leave with
 * `dismissTo` too.
 */
let appLayoutMounts = 0;

function AppLayout() {
  useEffect(() => {
    appLayoutMounts += 1;
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}

function Session() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <GroundingFlow slug={slug} />;
}

const ROUTES = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  "(app)/_layout": AppLayout,
  "(app)/index": () => <Text>home</Text>,
  "(app)/tools/grounding/index": () => <Text testID="grounding-home">grounding</Text>,
  "(app)/tools/journal": () => <Text>journal</Text>,
  "(app)/tools/grounding/[slug]": Session,
};

function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={createTestQueryClient()}>
        <I18nContext.Provider
          value={{ language: "en", setLanguage: async () => {}, hydrated: true }}
        >
          {children}
        </I18nContext.Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** The (app) stack's route names, bottom to top. */
function appStack(app: ReturnType<typeof renderRouter>): string[] {
  // expo-router's test harness nests the app under its own `__root` stack.
  const root = app.getRouterState()?.routes.find((route) => route.name === "__root")?.state;
  const group = root?.routes.find((route) => route.name === "(app)");
  return (group?.state?.routes ?? []).map((route) => route.name);
}

beforeEach(() => {
  appLayoutMounts = 0;
});

describe("the Escape from a guarded session (#2824)", () => {
  it("is stopped whole by the guard - no screen below the session is popped", () => {
    const app = renderRouter(ROUTES, { initialUrl: "/", wrapper: Providers });
    // A lateral hop between the tool home and the session, so reaching the
    // Escape's destination means popping TWO routes, not one.
    act(() => router.push("/tools/grounding"));
    act(() => router.push("/tools/journal"));
    act(() => router.push("/tools/grounding/cold-water"));
    const before = appStack(app);
    expect(before).toEqual([
      "index",
      "tools/grounding/index",
      "tools/journal",
      "tools/grounding/[slug]",
    ]);

    act(() => {
      fireEvent.press(screen.getByLabelText("Back to Grounding"));
    });

    // (a) the guard fired: it asks instead of leaving.
    expect(screen.getByText("Finish this session?")).toBeTruthy();
    // (b) and the pop was refused as a whole - the stack is exactly as it was.
    expect(app.getPathname()).toBe("/tools/grounding/cold-water");
    expect(appStack(app)).toEqual(before);
    expect(appLayoutMounts).toBe(1);
  });

  it("leaves once the exit is confirmed, with the tool home mounted once", async () => {
    const app = renderRouter(ROUTES, { initialUrl: "/", wrapper: Providers });
    act(() => router.push("/tools/grounding"));
    act(() => router.push("/tools/grounding/cold-water"));

    act(() => {
      fireEvent.press(screen.getByLabelText("Back to Grounding"));
    });
    act(() => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() => expect(app.getPathname()).toBe("/tools/grounding"));
    expect(appStack(app)).toEqual(["index", "tools/grounding/index"]);
    expect(appLayoutMounts).toBe(1);
  });
});
