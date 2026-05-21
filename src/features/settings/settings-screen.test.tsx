import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable as mockPressable, Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import SettingsScreen from "./settings-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
  },
  usePathname: () => "/(app)/(tabs)/settings",
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
  useUpdateUserDisplayName: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUploadUserAvatar: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUserProfile: () => ({ data: null, error: null }),
}));

jest.mock("@/src/features/profile/repository", () => ({
  getOAuthAvatarUrl: jest.fn(() => null),
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

describe("SettingsScreen onboarding reset", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        cbtOnboardingCompleted: true,
        cbtWizardCompleted: true,
        meditationOnboardingCompleted: true,
        policyVersionAccepted: "2026-05-01",
        shownButtonTours: ["tune", "notifications", "info"],
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
          gratitudeOnboardingCompleted: false,
          meditationInfoCompleted: false,
          habitsOnboardingCompleted: false,
          shownButtonTours: [],
          // wizard flags must be preserved
          cbtWizardCompleted: true,
          meditationOnboardingCompleted: true,
          policyVersionAccepted: "2026-05-01",
        }),
      );
    });
  });
});
