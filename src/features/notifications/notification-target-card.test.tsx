import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { defaultUserPreferences } from "@/src/features/modules/types";
import { NotificationTargetCard } from "@/src/features/notifications/notification-target-card";
import { getNotificationTarget } from "@/src/features/notifications/registry";
import { scheduleReminder } from "@/src/lib/notifications";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const mockShowToast = jest.fn();

jest.mock("@/src/lib/notifications", () => ({
  cancelReminder: jest.fn().mockResolvedValue(undefined),
  getReminderTimeZone: jest.fn().mockReturnValue("Europe/Sofia"),
  scheduleReminder: jest.fn().mockResolvedValue({ enabled: true }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

const mockScheduleReminder = jest.mocked(scheduleReminder);
const mockUseUpdatePreferences = jest.mocked(useUpdateUserPreferences);
const mockMutateAsync = jest.fn();

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockScheduleReminder.mockResolvedValue({ enabled: true });
  mockMutateAsync.mockResolvedValue(undefined);
  mockUseUpdatePreferences.mockReturnValue({
    isPending: false,
    mutateAsync: mockMutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
});

function renderCard() {
  renderWithProviders(
    <NotificationTargetCard
      target={getNotificationTarget("sleep")}
      preferences={defaultUserPreferences}
      userId="user-1"
      globalEnabled
    />,
  );
}

// Flushes the whole async save chain inside act - handleSave keeps updating
// state after several awaits, and those updates would otherwise land outside
// the act() window and trip the console.error guard in test/setup.js.
async function enableAndSave() {
  fireEvent.press(screen.getByLabelText("Enable reminders"));
  await act(async () => {
    fireEvent.press(screen.getByText("Save"));
  });
}

describe("NotificationTargetCard", () => {
  it("renders live reminder controls (no 'Coming soon') for a promoted tool target", () => {
    renderCard();

    // The placeholder badge must be gone now that the target is live.
    expect(screen.queryByText("Coming soon")).toBeNull();
    // The daily-reminder TimeField only renders for live targets.
    expect(screen.getByLabelText("Reminder time")).toBeTruthy();
  });

  it("renders the promoted target's label", () => {
    renderWithProviders(
      <NotificationTargetCard
        target={getNotificationTarget("habits")}
        preferences={defaultUserPreferences}
        userId="user-1"
        globalEnabled
      />,
    );

    expect(screen.getByText("Habits")).toBeTruthy();
  });

  it("disables Save and shows a pending state while the subscription is in flight", async () => {
    let resolveSchedule: (result: { enabled: true }) => void = () => {};
    mockScheduleReminder.mockReturnValue(
      new Promise((resolve) => {
        resolveSchedule = resolve;
      }),
    );
    renderCard();

    await enableAndSave();

    // The hangable step (permission prompt + push subscribe) runs BEFORE the
    // preferences mutation, so the pending state must not depend on isPending.
    expect(await screen.findByText("Saving...")).toBeTruthy();
    fireEvent.press(screen.getByText("Saving..."));
    expect(mockScheduleReminder).toHaveBeenCalledTimes(1);

    resolveSchedule({ enabled: true });
    // Flush the resumed save chain inside act.
    await act(async () => {});
    expect(screen.getByText("Save")).toBeTruthy();
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("shows translated copy, not the raw reason slug, when the subscription fails", async () => {
    mockScheduleReminder.mockResolvedValue({ enabled: false, reason: "timeout" });
    renderCard();

    await enableAndSave();

    expect(
      await screen.findByText(
        "Couldn't reach this browser's notification service. Reminders may not work here.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("timeout")).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "error",
        description:
          "Couldn't reach this browser's notification service. Reminders may not work here.",
      }),
    );
    // The failed enable is rolled back in preferences.
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sleepRemindersEnabled: false }),
    );
  });

  it("gives feedback instead of silently returning when there is no user", async () => {
    renderWithProviders(
      <NotificationTargetCard
        target={getNotificationTarget("sleep")}
        preferences={defaultUserPreferences}
        userId={null}
        globalEnabled
      />,
    );

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    });
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });
});
