import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, configure, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform, StyleSheet, Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import ProtectedLayout from "./protected-layout";
import { writeUnderFloorBlock } from "@/src/features/auth/under-floor-block";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import {
  useUpdateOnboardingPreferences,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";

type MockSessionState = {
  session: {
    user: {
      email_confirmed_at: string | null;
      id: string;
    };
  } | null;
  status: "loading" | "ready";
  user: {
    email_confirmed_at: string | null;
    id: string;
  } | null;
};

let mockSessionState: MockSessionState = {
  session: {
    user: {
      email_confirmed_at: "2026-05-06T10:00:00.000Z",
      id: "user-1",
    },
  },
  status: "ready",
  user: {
    email_confirmed_at: "2026-05-06T10:00:00.000Z",
    id: "user-1",
  },
};

jest.mock("expo-router", () => {
  const Text = mockText;
  const View = mockView;

  // The visible marker lets placement tests assert what renders before vs
  // after the route stack in the content column.
  function Stack({ children }: { children?: ReactNode }) {
    return (
      <View>
        <Text>Stack content</Text>
        {children}
      </View>
    );
  }

  function StackScreen() {
    return null;
  }

  Stack.Screen = StackScreen;

  return {
    Redirect: ({ href }: { href: string }) => <Text>Redirect: {href}</Text>,
    Stack,
    usePathname: () => "/",
  };
});

jest.mock("@/src/components/app/sidebar-nav", () => {
  const Text = mockText;

  return {
    SidebarNav: () => <Text>Sidebar column</Text>,
  };
});

// A notched-device bottom inset, so the banner strip's conditional safe-area
// padding (#670) is distinguishable from "no padding" (the default mock
// reports 0 insets). Built on the library's official jest mock — the one
// test/setup.js installs globally — NOT requireActual: the real
// SafeAreaProvider renders nothing in jest without native measurements.
jest.mock("react-native-safe-area-context", () => {
  const mock = jest.requireActual("react-native-safe-area-context/jest/mock").default;
  return {
    ...mock,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }),
  };
});

// The banner strips own network/update listeners and have dedicated tests;
// visible stubs let this suite assert their placement in the shell.
jest.mock("@/src/components/app/offline-banner", () => {
  const Text = mockText;

  return {
    OfflineBanner: () => <Text>Offline banner</Text>,
  };
});

jest.mock("@/src/components/app/verify-email-banner", () => {
  const Text = mockText;

  return {
    VerifyEmailBanner: () => <Text>Verify-email banner</Text>,
  };
});

jest.mock("@/src/components/app/update-popup", () => {
  const Text = mockText;

  return {
    UpdatePopup: () => <Text>Update popup</Text>,
  };
});

// The layout itself mounts the update trigger since #1474 (the banner is
// presentational). The hook owns timers and listeners and has its own suite;
// stub it so this one stays about the shell's gates and placement.
jest.mock("@/src/lib/use-update-availability", () => ({
  useUpdateAvailability: () => ({
    available: false,
    version: null,
    act: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

// The date strip and native widget bridge each own timers/listeners and have dedicated
// tests. This suite only verifies the protected-layout gates, so render inert boundaries.
jest.mock("@/src/features/widgets/widget-snapshot-sync", () => ({
  WidgetSnapshotSync: () => null,
}));

jest.mock("@/src/components/app/auth-landing-screen", () => {
  const Text = mockText;

  return {
    AuthLandingScreen: () => <Text>Signed-out landing</Text>,
  };
});

jest.mock("@/src/components/app/consent-gate", () => {
  const Text = mockText;

  return {
    ConsentGate: () => <Text>Consent gate</Text>,
  };
});

// Visible stubs: the gate's own behaviour (neutral copy, the verdict, what it
// writes) is covered in age-gate.test.tsx. What this suite owns is WHICH
// account sees it, and in what order relative to the consent gate. The stub's
// press is the under-floor exit, so the routing can be driven from here.
jest.mock("@/src/components/app/age-gate", () => {
  const Text = mockText;

  return {
    AgeGate: ({ onUnderFloor }: { onUnderFloor: () => void }) => (
      <Text onPress={onUnderFloor}>Age gate</Text>
    ),
  };
});

jest.mock("@/src/components/app/under-floor-screen", () => {
  const Text = mockText;

  return {
    UnderFloorScreen: () => <Text>Under-floor screen</Text>,
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateOnboardingPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

// Notification deep-linking touches the native expo-notifications module; it has its own
// unit test (use-notification-deep-link.test.tsx), so stub it out of the layout render.
jest.mock("@/src/features/notifications/use-notification-deep-link", () => ({
  useNotificationDeepLink: jest.fn(),
}));

// Background notification reconciliation has dedicated unit coverage. Keeping it out of
// this layout test also prevents the native Expo notifications module from registering
// listeners merely because the layout rendered.
jest.mock("@/src/features/notifications/use-notification-sync", () => ({
  useNotificationSync: jest.fn(),
}));

// The layout reads routines only to fold "any routine reminder enabled" into the
// notification-sync condition (#47); the data layer has its own tests. Keep the rest
// of the module real - the onboarding wizard consumes its other hooks.
jest.mock("@/src/features/routines/queries", () => ({
  ...jest.requireActual("@/src/features/routines/queries"),
  useRoutines: jest.fn(() => ({ data: [] })),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseUpdateOnboardingPreferences = useUpdateOnboardingPreferences as jest.MockedFunction<
  typeof useUpdateOnboardingPreferences
>;

const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

/**
 * ☠️ **Nothing in this layout renders on the first tick, and the default
 * one-second `waitFor` is not enough for that under load (#1932).**
 *
 * Every assertion here waits on a shell that is gated twice before it shows
 * anything: `AppLockGate` waits for the app-lock store, and since #1765 the
 * layout also holds the loading state until the device under-floor flag has
 * been read out of AsyncStorage. Both settle in microtasks, so on an idle
 * machine the first paint lands in tens of milliseconds and the default is
 * ample.
 *
 * Under CPU contention it is not. Running this file while a full suite occupied
 * the machine failed *"shows the wizard panel-1 title"* at **1523 ms** and
 * **1100 ms** — both just past the 1000 ms default, with the tree still showing
 * `Restoring your session...`. Idle, the same file passes 26/26. That is a
 * timeout, not a broken expectation, and it made the file fail on its own while
 * passing in the full suite — which silently blocked `lint-staged` from ever
 * committing a change to it.
 *
 * ⚠️ Raised only for this file, deliberately. A global bump would buy the same
 * tolerance everywhere and also hide a component that genuinely never settles;
 * here the two hydrations are known, named, and expected to finish.
 */
configure({ asyncUtilTimeout: 10_000 });

// Shared across every describe: a signed-in, hydrated, consent-current state.
beforeEach(() => {
  jest.clearAllMocks();
  // AppLockGate (native) waits for the app-lock store to hydrate before rendering
  // protected children. These tests aren't about app-lock, so put the store in its
  // hydrated, disabled steady state for synchronous assertions on the content.
  useAppLockStore.setState({ hydrated: true, enabled: false });
  mockSessionState = {
    session: {
      user: {
        email_confirmed_at: "2026-05-06T10:00:00.000Z",
        id: "user-1",
      },
    },
    status: "ready",
    user: {
      email_confirmed_at: "2026-05-06T10:00:00.000Z",
      id: "user-1",
    },
  };
  mutateAsync.mockResolvedValue(defaultUserPreferences);
  mockUseUpdateUserPreferences.mockReturnValue({
    isPending: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  // The one onboarding writer since #1958: first-run completion and the
  // introduction replay both go through the plain preference update.
  mockUseUpdateOnboardingPreferences.mockReturnValue({
    isError: false,
    isPending: false,
    mutate: jest.fn(),
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  mockUseUserPreferences.mockReturnValue({
    data: {
      ...defaultUserPreferences,
      appOnboardingCompleted: false,
      policyVersionAccepted: policyVersion,
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useUserPreferences>);
});

describe("ProtectedLayout app onboarding", () => {
  it("shows the wizard panel-1 title when app onboarding is needed", async () => {
    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());
  });

  it("wears 'Skip for now' on the gate's pinned Escape, and it skips for good (#1258)", async () => {
    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());

    // The word, promoted out of the footer — exactly one "Skip for now" on
    // the surface, and it is the pinned Escape's accessible name. A bare X
    // here would disguise the only close in the app with a lasting
    // consequence as a free dismissal (M2).
    const escape = screen.getByTestId("modal-escape");
    expect(escape.props.accessibilityLabel).toBe("Skip for now");
    expect(screen.getAllByText("Skip for now")).toHaveLength(1);

    fireEvent.press(escape);
    // The skip path persists onboarding as done — not the step-Back dismiss.
    // All three fields, never the flag alone (#1958) — why is on
    // `finishAppOnboarding` in protected-layout.tsx.
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        appOnboardingCompleted: true,
        appOnboardingCompletedVia: "skip",
        appOnboardingCompletedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it("finishing writes completion with via 'finish' and a timestamp (#1958)", async () => {
    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());

    fireEvent.press(screen.getByText("Finish"));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      appOnboardingCompleted: true,
      appOnboardingCompletedVia: "finish",
      appOnboardingCompletedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it("hides the wizard when app onboarding is complete", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.queryByText("Welcome to Selftend")).toBeNull());
  });

  it("replays only the introduction after Settings resets onboarding", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        appOnboardingCompletedVia: "finish",
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());

    // The replay is recognised by `via` being set while the flag is off, and it
    // must stay recognisable: finishing it re-arms the flag ALONE, so the
    // original completion path and time survive as the record of the first run
    // (the funnel reads `_at` as first completion). Asserted as an exact call,
    // because `objectContaining` would wave through a rewritten `via`.
    fireEvent.press(screen.getByText("Finish"));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({ appOnboardingCompleted: true });
  });

  it("shows the policy gate before app onboarding when consent is outdated", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  });

  it("does not flash the consent gate when the preferences fetch fails (#164)", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    // Acceptance state is unknown — the layout must fail open into the app
    // shell, not re-prompt a user who may already have accepted.
    await waitFor(() => expect(screen.queryByText("Consent gate")).toBeNull());
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
    expect(screen.queryByText("Signed-out landing")).toBeNull();
  });

  it("keeps the gate when cached preferences are stale and a refetch fails", async () => {
    // TanStack retains last data alongside isError on background-refetch
    // failure; a known-stale acceptance must still gate.
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
  });

  it("still gates a loaded user with no acceptance on record", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
  });

  it("shows the landing page when the session is cleared", async () => {
    mockSessionState = {
      session: null,
      status: "ready",
      user: null,
    };

    renderWithProviders(<ProtectedLayout />);
    // Awaited since #1765: the layout holds the loading state until the device
    // under-floor flag has been read, because rendering anything on the tick
    // before it lands would flash a surface at a blocked person.
    await waitFor(() => expect(screen.getByText("Signed-out landing")).toBeTruthy());
  });
});

describe("ProtectedLayout headerless shell (#667)", () => {
  it("renders no persistent sidebar column at any width", async () => {
    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Stack content")).toBeTruthy());
    expect(screen.queryByText("Sidebar column")).toBeNull();
  });

  it("renders the banner strips at the bottom of the content column", async () => {
    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Offline banner")).toBeTruthy());
    // Serialized render order stands in for visual order: everything after the
    // route stack sits at the bottom of the column.
    const output = JSON.stringify(screen.toJSON());
    const stackAt = output.indexOf("Stack content");
    expect(stackAt).toBeGreaterThanOrEqual(0);
    expect(stackAt).toBeLessThan(output.indexOf("Offline banner"));
    expect(stackAt).toBeLessThan(output.indexOf("Verify-email banner"));
    // The update offer left the strip for a modal (#1475) but must still be
    // mounted in the authenticated shell — inside AppLockGate's children,
    // where suppression and the lock screen can gate it (#1142 spec §3).
    expect(output.indexOf("Update popup")).toBeGreaterThanOrEqual(0);
  });

  it("reserves the safe area only while a banner is visible", async () => {
    renderWithProviders(<ProtectedLayout />);

    const content = await screen.findByTestId("bottom-banner-strip-content");

    // Nothing measured yet: no reserved home-indicator padding (#670 — a
    // blanket inset would hold empty space when no banner renders).
    const stripPadding = () =>
      (
        StyleSheet.flatten(screen.getByTestId("bottom-banner-strip").props.style) as {
          paddingBottom?: number;
        }
      ).paddingBottom;
    expect(stripPadding()).toBe(0);

    fireEvent(content, "layout", { nativeEvent: { layout: { height: 40 } } });
    // The inner layout decides the padding only; the published inset is the
    // OUTER strip's measured edge, which covers this padding as well.
    expect(stripPadding()).toBe(34);

    // Banner gone: padding released.
    fireEvent(content, "layout", { nativeEvent: { layout: { height: 0 } } });
    expect(stripPadding()).toBe(0);
  });

  it("publishes the padded strip's top edge into layer 1 from its first frame", async () => {
    renderWithProviders(<ProtectedLayout />);

    const strip = await screen.findByTestId("bottom-banner-strip");

    // ☠️ RNW decides at MOUNT whether a view is observed, so the handler has to
    // be on the very first frame — attaching it once a banner appears would
    // never be heard. What the handler then measures (and that it clears on
    // unmount, which sign-out depends on) is covered in
    // `layered-inset-store.test.tsx`: jest's View is a class mock with no
    // measureInWindow, so no rendered publisher can measure here.
    expect(strip.props.onLayout).toEqual(expect.any(Function));
  });
});

/**
 * The age gate's placement (#1764, spec #227 §3).
 *
 * It shares `ConsentGate`'s slot and sits above it, which is what gives it all
 * four ways into the app - email/password, Google, Apple and the silent guest -
 * rather than the two paths §3 was written against.
 */
describe("ProtectedLayout age gate", () => {
  /** A brand-new account: nothing accepted, nothing attested. */
  function newAccount(over: Record<string, unknown> = {}) {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: null,
        ageFloorMet: null,
        ...over,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  }

  it("asks a brand-new account before anything else in the shell", async () => {
    newAccount();

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Age gate")).toBeTruthy());
    // Above the consent gate, and above the app itself.
    expect(screen.queryByText("Consent gate")).toBeNull();
    expect(screen.queryByText("Stack content")).toBeNull();
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  });

  /**
   * The claim [#1919](https://github.com/Selftend/selftend/issues/1919)
   * corrected, made checkable. `use-under-floor-exit.ts` explains why its
   * deletion always has something to delete: the gate renders below the
   * layout's `!session` branch, so an auth user exists on **all four** entry
   * paths by the time a verdict is known — not the three §3 predicted.
   *
   * ☠️ #1927 fixed that sentence in three places and left nothing holding it
   * true. A comment cannot notice when the code moves out from under it, and
   * this one sits beside an irreversible deletion: if the gate ever rendered
   * above the session branch, the exit would run with no account to erase and
   * the docblock would still say otherwise. This assertion was written then and
   * could not be committed until #1932 unblocked this file.
   *
   * Mutation-tested by deleting the `!session` branch, which turns this red.
   * ⚠️ Not by hoisting the gate above it — that puts a `const` in its temporal
   * dead zone, which Babel leaves `undefined` rather than throwing, so the
   * branch is silently never taken and the mutation proves nothing.
   */
  it("never asks a visitor with no session, so the exit always has an account", async () => {
    newAccount();
    mockSessionState = { session: null, status: "ready", user: null };

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Signed-out landing")).toBeTruthy());
    expect(screen.queryByText("Age gate")).toBeNull();
  });

  it("never re-asks an account that has already been through the consent gate", async () => {
    // ☠️ §7: existing users meet the one-time consent prompt WITHOUT being
    // re-asked for age or country. `ageFloorMet` is null for every account that
    // predates the gate, so null alone cannot be the trigger - without the
    // policy-version clause this fires for the entire install base on the
    // release that ships it.
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        policyVersionAccepted: "2026-05-01",
        ageFloorMet: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
    expect(screen.queryByText("Age gate")).toBeNull();
  });

  it("does not ask again once the floor has been met", async () => {
    newAccount({ ageFloorMet: true });

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
    expect(screen.queryByText("Age gate")).toBeNull();
  });

  it("reads the verdict as `=== true`, so a stored false still gates", async () => {
    // Nothing writes false today - a failure writes nothing at all - but the
    // column allows it, and a truthiness check over the three-state value is
    // the failure mode #1762 warned about from the other side.
    newAccount({ ageFloorMet: false });

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Age gate")).toBeTruthy());
  });

  it("hands an under-floor verdict to the exit and nowhere else", async () => {
    newAccount();

    renderWithProviders(<ProtectedLayout />);
    fireEvent.press(await screen.findByText("Age gate"));

    await waitFor(() => expect(screen.getByText("Under-floor screen")).toBeTruthy());
    expect(screen.queryByText("Age gate")).toBeNull();
    expect(screen.queryByText("Consent gate")).toBeNull();
    expect(screen.queryByText("Stack content")).toBeNull();
  });

  it("does not flash the gate when the preferences fetch fails", async () => {
    // Same fail-open rule as the consent gate beside it (#164): with no cached
    // row the attestation state is UNKNOWN, and a gate that guessed would ask
    // an already-attested person again on any transient network error. It
    // re-evaluates on the next successful load.
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.queryByText("Age gate")).toBeNull());
  });

  it("waits for preferences rather than gating on a loading row", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.queryByText("Age gate")).toBeNull());
  });
});

/**
 * The device-local under-floor block (#1765, spec #227 §3).
 *
 * #1764 blocked in React state alone, and recorded that as a gap: it lasted
 * exactly as long as the screen stayed mounted, and on native the next launch
 * mints a fresh guest a second later. The device flag is what closes it, and
 * WHERE the layout consults it is the part worth pinning down.
 */
describe("ProtectedLayout under-floor block", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("keeps a blocked device out of the app, session and consent notwithstanding", async () => {
    await writeUnderFloorBlock(new Date());

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Under-floor screen")).toBeTruthy());
    expect(screen.queryByText("Stack content")).toBeNull();
    expect(screen.queryByText("Age gate")).toBeNull();
    expect(screen.queryByText("Consent gate")).toBeNull();
  });

  it("still blocks once the exit has deleted the account and signed the person out", async () => {
    // ☠️ The reason the check sits ABOVE the '!session' branch. The exit's own
    // success is what produces this state, so a block consulted below it would
    // answer the completed erasure with the auth landing - a fresh way in, one
    // tap after the block.
    await writeUnderFloorBlock(new Date());
    mockSessionState = { session: null, status: "ready", user: null };

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Under-floor screen")).toBeTruthy());
    expect(screen.queryByText("Signed-out landing")).toBeNull();
  });

  it("lets an unblocked device through, so the gate above is not vacuous", async () => {
    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Stack content")).toBeTruthy());
    expect(screen.queryByText("Under-floor screen")).toBeNull();
  });

  it("shows nothing at all until the device flag has been read", async () => {
    // The flag arrives a tick late from AsyncStorage and reads false until it
    // does, so anything rendered on that tick is a surface flashed at the
    // person the block exists to keep out.
    await writeUnderFloorBlock(new Date());

    renderWithProviders(<ProtectedLayout />);

    // The first frame, before the storage read has settled: the shared loading
    // state, and nothing of the app.
    expect(screen.queryByText("Stack content")).toBeNull();
    expect(screen.getByText("Restoring your session...")).toBeTruthy();

    // Flush the hydrate inside act, rather than letting waitFor race it.
    await act(async () => {});
    expect(screen.getByText("Under-floor screen")).toBeTruthy();
  });
});

/**
 * The web signed-out redirect, and the under-floor exit walking straight into
 * it (#1765).
 */
describe("ProtectedLayout under-floor block on web", () => {
  const ORIGINAL_OS = Platform.OS;
  let originalLocation: Location;

  beforeEach(async () => {
    await AsyncStorage.clear();
    setPlatformOS("web");
    originalLocation = window.location;
    // The layout redirects by ASSIGNING window.location.href, which jsdom
    // answers with a navigation error. A plain object records the assignment
    // instead, so the test can assert it never happened.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "http://localhost/" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
  });

  it("does not bounce an under-floor person to the marketing landing", async () => {
    // ☠️☠️ The regression this exists for. On web every under-floor person has
    // a session - the '!session' branch precedes the gate - so the exit's own
    // sign-out lands squarely in 'signedOutOnWeb', and the redirect would
    // replace the exit screen with a page whose whole job is a Start CTA.
    //
    // ⚠️ And the DEVICE FLAG cannot be what stops it: 'useUnderFloorBlock'
    // reads storage once on mount, before the exit writes the flag, so
    // 'blocked' is false for the whole of this mount. The React state is the
    // half that holds here, which is why the condition carries both.
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: null,
        ageFloorMet: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    const { rerender } = renderWithProviders(<ProtectedLayout />);
    fireEvent.press(await screen.findByText("Age gate"));
    await waitFor(() => expect(screen.getByText("Under-floor screen")).toBeTruthy());

    // What the exit does next: deletes the account, then signs out.
    mockSessionState = { session: null, status: "ready", user: null };
    rerender(<ProtectedLayout />);

    await waitFor(() => expect(screen.getByText("Under-floor screen")).toBeTruthy());
    expect(window.location.href).toBe("http://localhost/");
    expect(screen.queryByText("Signed-out landing")).toBeNull();
  });

  it("still redirects an ordinary signed-out visitor, so the guard is not a blanket off-switch", async () => {
    mockSessionState = { session: null, status: "ready", user: null };

    renderWithProviders(<ProtectedLayout />);

    await waitFor(() => expect(window.location.href).toBe("/"));
  });
});
