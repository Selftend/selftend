import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable as mockPressable, Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import SettingsScreen from "@/app/(app)/(tabs)/settings";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
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

jest.mock("@/components/profile-avatar", () => ({
  ProfileAvatar: () => null,
}));

jest.mock("@/components/ui/alert-dialog", () => {
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

jest.mock("@/components/ui/label", () => {
  const Text = mockText;

  return {
    Label: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock("@/components/ui/switch", () => {
  const Pressable = mockPressable;

  return {
    Switch: ({
      onCheckedChange,
    }: {
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }) => <Pressable onPress={() => onCheckedChange?.(true)} />,
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
});
