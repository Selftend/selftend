import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import SettingsScreen from "./settings-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { RESET_ONBOARDING_PREFERENCES } from "@/src/features/settings/onboarding-reset";
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
  usePathname: () => "/settings",
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

// SecuritySection calls isBiometricAvailable() inside a useEffect .then() which
// fires setAvailable() outside act() unless we resolve it synchronously. Mocking
// it as a resolved Promise prevents the async state update from leaking out.
jest.mock("@/src/features/security/biometric", () => ({
  authenticate: jest.fn().mockResolvedValue(false),
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
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

  it("renders hero with eyebrow + title", async () => {
    renderWithProviders(<SettingsScreen />);
    // waitFor flushes the SecuritySection useEffect microtasks (isBiometricAvailable
    // and hydrate) so their async setState calls land inside act() boundaries.
    await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());
    // "Account" appears as eyebrow and as the account section card title
    expect(screen.getAllByText("Account").length).toBeGreaterThanOrEqual(1);
  });

  it("labels the display name input for assistive tech", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Display name")).toBeTruthy());
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
    // Flush SecuritySection's useEffect microtasks (isBiometricAvailable + hydrate)
    // so async setState calls land inside act() before we interact with the screen.
    await waitFor(() => expect(screen.getByText("Reset onboarding")).toBeTruthy());

    fireEvent.press(screen.getByText("Reset onboarding"));

    await waitFor(() => {
      // Assert against the shared constant rather than a third inline copy of the
      // same key list. Restating it here is what let the reset drift unnoticed in
      // the first place (#822): the screen test agreed with the reset test because
      // both had been edited together, and neither was compared to `UserPreferences`.
      // `onboarding-reset.test.ts` owns the question of which keys belong; this test
      // only owns "the button sends the reset patch, plus the funnel marker".
      expect(mutateAsync).toHaveBeenCalledWith({
        ...RESET_ONBOARDING_PREFERENCES,
        appOnboardingCompletedVia: "finish",
      });
    });
  });
});
