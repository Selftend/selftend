import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import ProtectedLayout from "./protected-layout";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { renderWithProviders } from "@/test/render-with-providers";

type MockSessionState = {
  session: {
    user: {
      email_confirmed_at: string | null;
      id: string;
    };
  } | null;
  status: "loading" | "ready";
  user: {
    email_confirmed_at: string | null;
    id: string;
  } | null;
};

let mockSessionState: MockSessionState = {
  session: {
    user: {
      email_confirmed_at: "2026-05-06T10:00:00.000Z",
      id: "user-1",
    },
  },
  status: "ready",
  user: {
    email_confirmed_at: "2026-05-06T10:00:00.000Z",
    id: "user-1",
  },
};

jest.mock("expo-router", () => {
  const Text = mockText;
  const View = mockView;

  function Stack({ children }: { children?: ReactNode }) {
    return <View>{children}</View>;
  }

  function StackScreen() {
    return null;
  }

  Stack.Screen = StackScreen;

  return {
    Redirect: ({ href }: { href: string }) => <Text>Redirect: {href}</Text>,
    Stack,
  };
});

jest.mock("@/src/components/app/sidebar-nav", () => ({
  SidebarNav: () => null,
}));

jest.mock("@/src/components/app/auth-landing-screen", () => {
  const Text = mockText;

  return {
    AuthLandingScreen: () => <Text>Signed-out landing</Text>,
  };
});

jest.mock("@/src/components/app/consent-gate", () => {
  const Text = mockText;

  return {
    ConsentGate: () => <Text>Consent gate</Text>,
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSessionState,
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;

describe("ProtectedLayout app onboarding", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionState = {
      session: {
        user: {
          email_confirmed_at: "2026-05-06T10:00:00.000Z",
          id: "user-1",
        },
      },
      status: "ready",
      user: {
        email_confirmed_at: "2026-05-06T10:00:00.000Z",
        id: "user-1",
      },
    };
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockUseUpdateUserPreferences.mockReturnValue({
      isError: false,
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("marks app onboarding complete when the user continues", async () => {
    renderWithProviders(<ProtectedLayout />);

    expect(screen.getByText("Welcome to Selftend")).toBeTruthy();

    fireEvent.press(screen.getByText("Got it"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          appOnboardingCompleted: true,
          cbtOnboardingCompleted: false,
        }),
      );
    });
  });

  it("shows the policy gate before app onboarding when consent is outdated", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);

    expect(screen.getByText("Consent gate")).toBeTruthy();
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  });

  it("shows the landing page when the session is cleared", () => {
    mockSessionState = {
      session: null,
      status: "ready",
      user: null,
    };

    renderWithProviders(<ProtectedLayout />);

    expect(screen.getByText("Signed-out landing")).toBeTruthy();
  });
});
