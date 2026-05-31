import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import SettingsScreen from "./settings-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
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

jest.mock("expo-linear-gradient", () => {
  const View = mockView;
  return {
    LinearGradient: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});

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
  useUpdateOnboardingPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateOnboardingPreferences = useUpdateOnboardingPreferences as jest.MockedFunction<
  typeof useUpdateOnboardingPreferences
>;

describe("SettingsScreen hero and profile badge", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUserPreferences.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  });

  it("renders hero with eyebrow + title", () => {
    renderWithProviders(<SettingsScreen />);
    // "Account" appears as eyebrow and as the account section card title
    expect(screen.getAllByText("Account").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Settings")).toBeTruthy();
  });
});

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
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  });

  it("resets all onboarding flags while preserving the rest of preferences", async () => {
    renderWithProviders(<SettingsScreen />);

    fireEvent.press(screen.getByText("Reset onboarding"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        appOnboardingCompleted: false,
        cbtOnboardingCompleted: false,
        gratitudeOnboardingCompleted: false,
        meditationInfoCompleted: false,
        habitsOnboardingCompleted: false,
        moodOnboardingCompleted: false,
        journalOnboardingCompleted: false,
        sleepOnboardingCompleted: false,
        mindfulnessOnboardingCompleted: false,
        groundingOnboardingCompleted: false,
        shownButtonTours: [],
      });
    });
  });
});
