import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable as mockPressable, Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import SettingsScreen from "./settings-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { cancelCbtReminder, scheduleCbtReminder } from "@/src/lib/notifications";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  UIImagePickerPreferredAssetRepresentationMode: {
    Compatible: "compatible",
  },
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

jest.mock("@/src/components/app/profile-avatar", () => ({
  ProfileAvatar: () => null,
}));

jest.mock("@/src/components/react-native-reusables/alert-dialog", () => {
  const Pressable = mockPressable;
  const View = mockView;

  function MockView({ children }: { children?: ReactNode }) {
    return <View>{children}</View>;
  }

  function MockPressable({ children, onPress }: { children?: ReactNode; onPress?: () => void }) {
    return <Pressable onPress={onPress}>{children}</Pressable>;
  }

  return {
    AlertDialog: MockView,
    AlertDialogAction: MockPressable,
    AlertDialogCancel: MockView,
    AlertDialogContent: MockView,
    AlertDialogDescription: MockView,
    AlertDialogFooter: MockView,
    AlertDialogHeader: MockView,
    AlertDialogTitle: MockView,
    AlertDialogTrigger: MockView,
  };
});

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock("@/src/components/react-native-reusables/switch", () => {
  const Pressable = mockPressable;

  return {
    Switch: ({
      checked,
      onCheckedChange,
    }: {
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }) => (
      <Pressable
        accessibilityRole="switch"
        onPress={() => onCheckedChange?.(!checked)}
        testID="settings-reminder-switch"
      />
    ),
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      email: "person@example.com",
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/auth/api", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/src/features/profile/queries", () => ({
  useRemoveUserAvatar: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useResetUserAvatarToOAuth: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUploadUserAvatar: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUserProfile: () => ({ data: null, error: null }),
}));

jest.mock("@/src/features/profile/repository", () => ({
  getOAuthAvatarUrl: jest.fn(() => null),
}));

jest.mock("@/src/lib/notifications", () => ({
  cancelCbtReminder: jest.fn(),
  getReminderTimeZone: jest.fn(() => "Europe/Sofia"),
  scheduleCbtReminder: jest.fn(),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useDeleteUserAccount: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useExportUserData: () => ({ isError: false, isPending: false, mutateAsync: jest.fn() }),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockCancelCbtReminder = jest.mocked(cancelCbtReminder);
const mockScheduleCbtReminder = jest.mocked(scheduleCbtReminder);

describe("SettingsScreen onboarding reset", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockCancelCbtReminder.mockResolvedValue(undefined);
    mockScheduleCbtReminder.mockResolvedValue({ enabled: true });
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        cbtOnboardingCompleted: true,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("resets all onboarding flags while preserving the rest of preferences", async () => {
    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByText("Reset onboarding"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          appOnboardingCompleted: false,
          cbtOnboardingCompleted: false,
          policyVersionAccepted: "2026-05-01",
        }),
      );
    });
  });

  it("persists reminder opt-in after scheduling succeeds", async () => {
    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("settings-reminder-switch"));
    fireEvent.press(screen.getByText("Save reminder settings"));

    await waitFor(() => {
      expect(mockScheduleCbtReminder).toHaveBeenCalledWith(19, 0, "user-1");
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          cbtReminderHour: 19,
          cbtReminderMinute: 0,
          cbtReminderTimezone: "Europe/Sofia",
          cbtRemindersEnabled: true,
          reminderConsent: true,
          reminderConsentUpdatedAt: expect.any(String),
        }),
      );
    });
  });

  it("persists reminders as off when permission is denied", async () => {
    mockScheduleCbtReminder.mockResolvedValue({
      enabled: false,
      reason: "permission-denied",
    });

    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("settings-reminder-switch"));
    fireEvent.press(screen.getByText("Save reminder settings"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          cbtReminderTimezone: "Europe/Sofia",
          cbtRemindersEnabled: false,
          reminderConsent: false,
          reminderConsentUpdatedAt: null,
        }),
      );
      expect(
        screen.getByText(
          "Notification permission was not granted. Reminder settings were saved as off.",
        ),
      ).toBeTruthy();
    });
  });

  it("shows the unsupported web reminder message when browser push is unavailable", async () => {
    mockScheduleCbtReminder.mockResolvedValue({
      enabled: false,
      reason: "unsupported",
    });

    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("settings-reminder-switch"));
    fireEvent.press(screen.getByText("Save reminder settings"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          cbtRemindersEnabled: false,
          reminderConsent: false,
        }),
      );
      expect(
        screen.getByText(
          "Web reminders are not supported in this browser. On iPhone or iPad, add Selftend to the Home Screen before enabling reminders.",
        ),
      ).toBeTruthy();
    });
  });

  it("cancels reminders and records withdrawal when disabled", async () => {
    const previousReminderConsentUpdatedAt = "2026-05-01T10:05:00.000Z";
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtRemindersEnabled: true,
        policyVersionAccepted: "2026-05-01",
        reminderConsent: true,
        reminderConsentUpdatedAt: previousReminderConsentUpdatedAt,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("settings-reminder-switch"));
    fireEvent.press(screen.getByText("Save reminder settings"));

    await waitFor(() => {
      expect(mockCancelCbtReminder).toHaveBeenCalledWith("user-1");
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          cbtReminderTimezone: "Europe/Sofia",
          cbtRemindersEnabled: false,
          reminderConsent: false,
          reminderConsentUpdatedAt: expect.any(String),
        }),
      );
    });

    const savedPreferences = mutateAsync.mock.calls.at(-1)?.[0];
    expect(savedPreferences?.reminderConsentUpdatedAt).not.toBe(previousReminderConsentUpdatedAt);
  });
});
