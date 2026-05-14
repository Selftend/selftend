import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Pressable as mockPressable, Text as mockText } from "react-native";
import type { ReactNode } from "react";

import CbtHomeScreen from "./cbt-home-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      id: "user-1",
    },
  }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/components/react-native-reusables/checkbox", () => {
  const Pressable = mockPressable;

  return {
    Checkbox: ({
      accessibilityLabel,
      checked,
      onCheckedChange,
    }: {
      accessibilityLabel?: string;
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }) => (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(checked) }}
        onPress={() => onCheckedChange?.(!checked)}
      />
    ),
  };
});

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

describe("CbtHomeScreen onboarding", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockUseUpdateUserPreferences.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
  });

  it("shows CBT onboarding when the account flag is incomplete", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtOnboardingCompleted: false,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.getByText(/The CBT Toolkit/)).toBeTruthy();
    expect(screen.getByText("Get started")).toBeTruthy();
  });

  it("marks CBT onboarding complete when the user continues", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        cbtOnboardingCompleted: false,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    fireEvent.press(screen.getByText("Get started"));
    fireEvent.press(screen.getByLabelText("Anxiety / Worry"));
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          appOnboardingCompleted: true,
          cbtOnboardingCompleted: true,
          selectedConcerns: ["anxiety"],
        }),
      );
    });
  });

  it("does not show CBT onboarding after completion", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        cbtOnboardingCompleted: true,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<CbtHomeScreen />);

    expect(screen.queryByText(/The CBT Toolkit/)).toBeNull();
  });
});
