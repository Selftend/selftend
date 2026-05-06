import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import CbtHomeScreen from "@/app/(app)/cbt";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
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

    expect(screen.getByText("Using CBT gently")).toBeTruthy();
    expect(screen.getByText("Continue to CBT")).toBeTruthy();
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

    fireEvent.press(screen.getByText("Continue to CBT"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          appOnboardingCompleted: true,
          cbtOnboardingCompleted: true,
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

    expect(screen.queryByText("Using CBT gently")).toBeNull();
  });
});
