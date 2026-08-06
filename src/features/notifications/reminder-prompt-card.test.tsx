import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { defaultUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { ReminderPromptCard } from "@/src/features/notifications/reminder-prompt-card";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { scheduleReminder } from "@/src/lib/notifications";
import { useBannerInsetStore } from "@/src/stores/banner-inset-store";
import { useReminderPromptStore } from "@/src/stores/reminder-prompt-store";
import { useToastStore } from "@/src/stores/toast-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  scheduleReminder: jest.fn(),
  getReminderTimeZone: () => "Europe/Sofia",
}));

const mockUseUserPreferences = jest.mocked(useUserPreferences);
const mockUseUpdateUserPreferences = jest.mocked(useUpdateUserPreferences);
const mockScheduleReminder = jest.mocked(scheduleReminder);

function setPreferences(overrides: Partial<UserPreferences> = {}) {
  const preferences = { ...defaultUserPreferences, ...overrides };
  mockUseUserPreferences.mockReturnValue({ data: preferences } as ReturnType<
    typeof useUserPreferences
  >);
  return preferences;
}

function setUpdateMutation() {
  const mutateAsync = jest.fn().mockResolvedValue(undefined);
  mockUseUpdateUserPreferences.mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  return mutateAsync;
}

function requestPrompt(targetKey: "mood" | "journal" = "mood") {
  act(() => {
    useReminderPromptStore.getState().requestReminderPrompt(targetKey);
  });
}

describe("ReminderPromptCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useReminderPromptStore.getState().dismissReminderPrompt();
      useBannerInsetStore.getState().setHeight(0);
    });
  });

  it("renders nothing while no prompt was requested", () => {
    setPreferences();
    setUpdateMutation();

    renderWithProviders(<ReminderPromptCard />);

    expect(screen.queryByText("Set reminder")).toBeNull();
  });

  it("shows the card for an eligible tool and marks it prompted", async () => {
    const preferences = setPreferences();
    const mutateAsync = setUpdateMutation();

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    expect(await screen.findByText("Set reminder")).toBeTruthy();
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ reminderPromptedTools: ["mood"] }),
      );
    });
    expect(preferences.reminderPromptedTools).toEqual([]);
  });

  it("renders nothing when the tool was already prompted", () => {
    setPreferences({ reminderPromptedTools: ["mood"] });
    const mutateAsync = setUpdateMutation();

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    expect(screen.queryByText("Set reminder")).toBeNull();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("renders nothing when a reminder is already enabled for the tool", () => {
    setPreferences({ moodRemindersEnabled: true });
    setUpdateMutation();

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    expect(screen.queryByText("Set reminder")).toBeNull();
  });

  it("dismisses on 'No thanks' without enabling a reminder", async () => {
    setPreferences();
    setUpdateMutation();

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    fireEvent.press(await screen.findByText("No thanks"));

    await waitFor(() => {
      expect(screen.queryByText("Set reminder")).toBeNull();
    });
    expect(mockScheduleReminder).not.toHaveBeenCalled();
  });

  it("shows translated copy, not the raw reason slug, when scheduling fails", async () => {
    setPreferences();
    const mutateAsync = setUpdateMutation();
    mockScheduleReminder.mockResolvedValue({ enabled: false, reason: "timeout" } as Awaited<
      ReturnType<typeof scheduleReminder>
    >);
    const showToastSpy = jest.spyOn(useToastStore.getState(), "showToast");

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    fireEvent.press(await screen.findByText("Set reminder"));

    try {
      await waitFor(() => {
        expect(showToastSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            tone: "error",
            description:
              "Couldn't reach this browser's notification service. Reminders may not work here.",
          }),
        );
      });
      // The failed accept must not store consent or enable the reminder.
      expect(mutateAsync).not.toHaveBeenCalledWith(
        expect.objectContaining({ moodRemindersEnabled: true }),
      );
    } finally {
      showToastSpy.mockRestore();
    }
  });

  it("schedules the reminder and stores consent on accept", async () => {
    setPreferences();
    const mutateAsync = setUpdateMutation();
    mockScheduleReminder.mockResolvedValue({ enabled: true } as Awaited<
      ReturnType<typeof scheduleReminder>
    >);

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    fireEvent.press(await screen.findByText("Set reminder"));

    await waitFor(() => {
      expect(mockScheduleReminder).toHaveBeenCalledWith(
        "mood",
        expect.any(Number),
        expect.any(Number),
        "user-1",
      );
    });
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          moodRemindersEnabled: true,
          reminderConsent: true,
        }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("Set reminder")).toBeNull();
    });
  });

  it("rides above the bottom banner strip by the published inset (#667)", async () => {
    setPreferences();
    setUpdateMutation();
    act(() => {
      useBannerInsetStore.getState().setHeight(40);
    });

    renderWithProviders(<ReminderPromptCard />);
    requestPrompt("mood");

    await screen.findByText("Set reminder");
    const host = screen.getByTestId("reminder-prompt-host");
    // Insets are 0 under the test SafeAreaProvider: base 16 + banner 40.
    expect(host.props.style).toEqual(expect.objectContaining({ bottom: 56 }));
  });
});
