import { act, fireEvent, screen } from "@testing-library/react-native";

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

  it("renders ten skeleton rows at final height while preferences load", () => {
    setPreferences(null);
    renderWithProviders(<NotificationsScreen />);

    for (const target of NOTIFICATION_TARGETS) {
      // `includeHiddenElements` because the skeletons are deliberately hidden from
      // assistive tech - ten empty rows are worth nothing to announce.
      const skeleton = screen.getByTestId(`notification-row-skeleton-${target.key}`, {
        includeHiddenElements: true,
      });
      // Final height, so the ten rows do not jump when the data lands. The registry is
      // static, so the shape is known before any query.
      expect(skeleton.props.className).toContain("h-[88px]");
    }
    // A loading surface claims nothing: no control is offered yet.
    expect(screen.queryByLabelText("Sleep")).toBeNull();
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
