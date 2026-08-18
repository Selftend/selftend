import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import NotificationsScreen from "@/src/features/notifications/notifications-screen";
import { NOTIFICATION_TARGETS } from "@/src/features/notifications/registry";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { cancelAllReminders } from "@/src/lib/notifications";
import type { ReminderChannelStatus, ReminderScheduleResult } from "@/src/lib/notifications";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const mockShowToast = jest.fn();
const mockScrollTo = jest.fn();
const mockReduceMotionEnabled = jest.fn(() => false);

// The arrival scroll goes through the ScrollView's imperative handle, which jest's
// renderer cannot reach from outside the screen - so the mock captures the ref and
// exposes `scrollTo` as a spy (same react-native Proxy shape the repo has used for
// Modal before).
jest.mock("react-native", () => {
  const React = require("react") as typeof import("react");
  const actual = jest.requireActual("react-native");
  const MockScrollView = React.forwardRef(function MockScrollView(
    props: { children?: React.ReactNode },
    ref: React.Ref<{ scrollTo: typeof mockScrollTo }>,
  ) {
    React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return React.createElement(actual.View, props, props.children);
  });

  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "ScrollView") {
        return MockScrollView;
      }

      return Reflect.get(target, prop, receiver);
    },
  });
});

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: () => "/notifications",
}));

jest.mock("@/src/lib/accessibility", () => ({
  ...jest.requireActual("@/src/lib/accessibility"),
  useReduceMotionEnabled: () => mockReduceMotionEnabled(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/notifications/use-reminder-channel", () => ({
  useReminderChannel: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
  getReminderTimeZone: () => "Europe/Sofia",
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

const mockUseLocalSearchParams = jest.mocked(useLocalSearchParams);
const mockUseUserPreferences = jest.mocked(useUserPreferences);
const mockUseUpdatePreferences = jest.mocked(useUpdateUserPreferences);
const mockUseReminderChannel = jest.mocked(useReminderChannel);
const mockCancelAllReminders = jest.mocked(cancelAllReminders);
const mockMutateAsync = jest.fn();
const mockEnsure = jest.fn<Promise<ReminderScheduleResult>, []>();

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({});
  mockReduceMotionEnabled.mockReturnValue(false);
  mockMutateAsync.mockResolvedValue(undefined);
  mockEnsure.mockResolvedValue({ enabled: true });
  mockUseUpdatePreferences.mockReturnValue({
    isPending: false,
    mutateAsync: mockMutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  setChannel("granted");
  setPreferences();
});

function setChannel(status: ReminderChannelStatus) {
  mockUseReminderChannel.mockReturnValue({ status, ensure: mockEnsure });
}

function setPreferences(overrides: Partial<UserPreferences> | null = {}) {
  mockUseUserPreferences.mockReturnValue({
    data: overrides ? { ...defaultUserPreferences, ...overrides } : undefined,
    isLoading: overrides === null,
  } as unknown as ReturnType<typeof useUserPreferences>);
}

describe("NotificationsScreen", () => {
  it("is titled Reminders", () => {
    renderWithProviders(<NotificationsScreen />);

    expect(screen.getByText("Reminders")).toBeTruthy();
    expect(screen.queryByText("Notifications")).toBeNull();
  });

  it("renders ten rows in the registry's order, each switch named for its target", () => {
    renderWithProviders(<NotificationsScreen />);

    // The registry order IS the dashboard order (asserted in registry.test.ts), so this
    // pins that the screen reads it rather than re-sorting into its own sections.
    const rendered = NOTIFICATION_TARGETS.map((target) =>
      screen.getByTestId(`notification-row-${target.key}`),
    );
    expect(rendered).toHaveLength(10);
    for (const target of NOTIFICATION_TARGETS) {
      expect(screen.getByLabelText(i18n.t(`notifications:${target.labelKey}`))).toBeTruthy();
    }
  });

  it.each([
    [390, "h-[88px]"],
    [1280, "h-16"],
  ])("renders ten skeleton rows at the real %ipx row height while loading", (width, height) => {
    const spy = jest
      .spyOn(Dimensions, "get")
      .mockReturnValue({ width, height: 844, scale: 3, fontScale: 1 });
    try {
      setPreferences(null);
      renderWithProviders(<NotificationsScreen />);

      for (const target of NOTIFICATION_TARGETS) {
        // `includeHiddenElements` because the skeletons are deliberately hidden from
        // assistive tech - ten empty rows are worth nothing to announce.
        const skeleton = screen.getByTestId(`notification-row-skeleton-${target.key}`, {
          includeHiddenElements: true,
        });
        // The REAL height for this width, so nothing jumps when the data lands: the desktop
        // row is one line at 64px against the phone's stacked 88px.
        expect(skeleton.props.className).toContain(height);
      }
      // A loading surface claims nothing: no control is offered yet.
      expect(screen.queryByLabelText("Sleep")).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("shows no rows and no skeletons when the query settles with no preferences", () => {
    // Signed out, or a failed read. Skeletons here would claim "still loading" forever.
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    renderWithProviders(<NotificationsScreen />);

    expect(
      screen.queryByTestId("notification-row-skeleton-sleep", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByLabelText("Sleep")).toBeNull();
    // The screen itself still renders - the master and the notice are not preference-shaped.
    expect(screen.getByText("Reminders")).toBeTruthy();
  });

  it("shows a page-level notice when the channel is blocked, and leaves rows interactive", () => {
    setChannel("blocked");
    renderWithProviders(<NotificationsScreen />);

    expect(screen.getByText("Notifications are turned off")).toBeTruthy();
    // The columns are what the server reads the moment a channel returns, so the rows keep
    // working even with no channel to deliver through.
    expect(screen.getByLabelText("Sleep").props.accessibilityState.disabled).toBe(false);
  });

  it("master off writes the column and then tears the channel down", async () => {
    renderWithProviders(<NotificationsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText("Notifications enabled"), "checkedChange", false);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabledGlobal: false });
    expect(mockCancelAllReminders).toHaveBeenCalledWith("user-1");
  });

  it("master on re-arms the channel first when a reminder is already enabled", async () => {
    setPreferences({ notificationsEnabledGlobal: false, sleepRemindersEnabled: true });
    setChannel("prompt-needed");
    renderWithProviders(<NotificationsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText("Notifications enabled"), "checkedChange", true);
    });

    // Master-off deleted the subscription; writing only the preference back is what made
    // every reminder come back silently dead (#981).
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabledGlobal: true });
  });

  it("master on writes nothing when the re-arm fails", async () => {
    setPreferences({ notificationsEnabledGlobal: false, sleepRemindersEnabled: true });
    setChannel("prompt-needed");
    mockEnsure.mockResolvedValue({ enabled: false, reason: "permission-denied" });
    renderWithProviders(<NotificationsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText("Notifications enabled"), "checkedChange", true);
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
  });

  it("master on is a pure column write when there is nothing to re-arm", async () => {
    setPreferences({ notificationsEnabledGlobal: false });
    setChannel("prompt-needed");
    renderWithProviders(<NotificationsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText("Notifications enabled"), "checkedChange", true);
    });

    // No reminder is on, so there is no channel to arm and no reason to prompt.
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabledGlobal: true });
  });

  it("master on writes the column even with a blocked channel", async () => {
    setPreferences({ notificationsEnabledGlobal: false, sleepRemindersEnabled: true });
    setChannel("blocked");
    renderWithProviders(<NotificationsScreen />);

    await act(async () => {
      fireEvent(screen.getByLabelText("Notifications enabled"), "checkedChange", true);
    });

    expect(mockEnsure).not.toHaveBeenCalled();
    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabledGlobal: true });
  });

  it("locks the master and every other row while one row's request is open", async () => {
    setChannel("prompt-needed");
    let resolveEnsure: (result: ReminderScheduleResult) => void = () => {};
    mockEnsure.mockReturnValue(
      new Promise((resolve) => {
        resolveEnsure = resolve;
      }),
    );
    renderWithProviders(<NotificationsScreen />);

    fireEvent(screen.getByLabelText("Sleep"), "checkedChange", true);
    await waitFor(() => expect(screen.getByTestId("notification-row-pending-sleep")).toBeTruthy());

    // One permission dialog is open; a second request would queue behind something the user
    // is already looking at.
    expect(screen.getByLabelText("Notifications enabled").props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.getByLabelText("Journal").props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      resolveEnsure({ enabled: true });
    });
    expect(screen.getByLabelText("Journal").props.accessibilityState.disabled).toBe(false);
  });

  it("dims and disables every row while the master is off, without lying about their state", () => {
    setPreferences({ notificationsEnabledGlobal: false, sleepRemindersEnabled: true });
    renderWithProviders(<NotificationsScreen />);

    const sleep = screen.getByLabelText("Sleep");
    expect(sleep.props.accessibilityState.disabled).toBe(true);
    // Still ON, because it IS on. `checked && master` would show ten off switches under a
    // sentence that says the times are kept.
    expect(sleep.props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("notification-row-sleep").props.className).toContain(
      "opacity-[0.55]",
    );
  });

  it("has no per-row Save button and no section headings left", () => {
    renderWithProviders(<NotificationsScreen />);

    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.queryByText("Modules")).toBeNull();
    expect(screen.queryByText("Tools")).toBeNull();
  });
});

describe("NotificationsScreen arrival focus (#1071)", () => {
  function layoutEvent(y: number) {
    return { nativeEvent: { layout: { x: 0, y, width: 600, height: 64 } } };
  }

  /** Fires the three anchor layouts the scroll needs: column, rows card, target row. */
  function measureAnchors({ column, card, row }: { column: number; card: number; row: number }) {
    fireEvent(screen.getByTestId("notifications-column"), "layout", layoutEvent(column));
    fireEvent(screen.getByTestId("notification-rows-card"), "layout", layoutEvent(card));
    fireEvent(screen.getByTestId("notification-row-sleep"), "layout", layoutEvent(row));
  }

  it("renders the quiet highlight on the target row only, letting touches through", () => {
    mockUseLocalSearchParams.mockReturnValue({ target: "sleep" });
    renderWithProviders(<NotificationsScreen />);

    const overlay = screen.getByTestId("notification-row-focus-sleep");
    // The prop, not a style: pointerEvents in style is a silent no-op on native.
    expect(overlay.props.pointerEvents).toBe("none");
    for (const target of NOTIFICATION_TARGETS.filter((t) => t.key !== "sleep")) {
      expect(screen.queryByTestId(`notification-row-focus-${target.key}`)).toBeNull();
    }
  });

  it("scrolls to the row once every anchor has measured, and only once", () => {
    mockUseLocalSearchParams.mockReturnValue({ target: "sleep" });
    renderWithProviders(<NotificationsScreen />);

    fireEvent(screen.getByTestId("notifications-column"), "layout", layoutEvent(24));
    fireEvent(screen.getByTestId("notification-rows-card"), "layout", layoutEvent(320));
    // Two of three anchors known: the row's own offset is still missing.
    expect(mockScrollTo).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId("notification-row-sleep"), "layout", layoutEvent(616));

    // 24 + 320 + 616 - 16 of breathing room above the row.
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 944, animated: true });

    // A later re-layout (rotation, width change) must not yank the user back.
    fireEvent(screen.getByTestId("notification-row-sleep"), "layout", layoutEvent(700));
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });

  it("re-arms for a new target on a live instance, and never scrolls on the stale anchor", () => {
    mockUseLocalSearchParams.mockReturnValue({ target: "sleep" });
    const view = renderWithProviders(<NotificationsScreen />);
    measureAnchors({ column: 24, card: 320, row: 616 });
    expect(mockScrollTo).toHaveBeenCalledTimes(1);

    mockUseLocalSearchParams.mockReturnValue({ target: "journal" });
    view.rerender(<NotificationsScreen />);

    // The highlight follows the new target immediately...
    expect(screen.queryByTestId("notification-row-focus-sleep")).toBeNull();
    expect(screen.getByTestId("notification-row-focus-journal")).toBeTruthy();
    // ...but the scroll waits for the NEW row's own measurement - the sleep row's
    // anchor must not stand in for journal's, or this scrolls to the wrong row.
    expect(mockScrollTo).toHaveBeenCalledTimes(1);

    fireEvent(screen.getByTestId("notification-row-journal"), "layout", layoutEvent(680));

    expect(mockScrollTo).toHaveBeenCalledTimes(2);
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 24 + 320 + 680 - 16, animated: true });
  });

  it("does not animate the scroll when reduce motion is on", () => {
    mockReduceMotionEnabled.mockReturnValue(true);
    mockUseLocalSearchParams.mockReturnValue({ target: "sleep" });
    renderWithProviders(<NotificationsScreen />);

    measureAnchors({ column: 24, card: 320, row: 616 });

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 944, animated: false });
  });

  it("does nothing when the param is absent", () => {
    renderWithProviders(<NotificationsScreen />);

    // The anchors still measure (their handlers are unconditional - see the screen's
    // hydration note), so this pins that measuring alone never triggers a scroll.
    fireEvent(screen.getByTestId("notifications-column"), "layout", layoutEvent(24));
    fireEvent(screen.getByTestId("notification-rows-card"), "layout", layoutEvent(320));

    expect(screen.queryByTestId(/notification-row-focus-/)).toBeNull();
    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it("ignores a target key the registry does not know", () => {
    mockUseLocalSearchParams.mockReturnValue({ target: "definitely-not-a-module" });
    renderWithProviders(<NotificationsScreen />);

    expect(screen.queryByTestId(/notification-row-focus-/)).toBeNull();
    expect(mockScrollTo).not.toHaveBeenCalled();
  });
});
