import { screen, waitFor } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";

import ProtectedLayout from "./protected-layout";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { policyVersion } from "@/src/features/policies/policy-content";
import {
  useUpdateOnboardingPreferences,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useCompleteAppOnboarding } from "@/src/features/onboarding/queries";
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
    usePathname: () => "/",
  };
});

jest.mock("@/src/components/app/sidebar-nav", () => ({
  SidebarNav: () => null,
}));

// The date strip and native widget bridge each own timers/listeners and have dedicated
// tests. This suite only verifies the protected-layout gates, so render inert boundaries.
jest.mock("@/src/features/widgets/widget-snapshot-sync", () => ({
  WidgetSnapshotSync: () => null,
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
  useUpdateOnboardingPreferences: jest.fn(),
  useUpdateUserPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

jest.mock("@/src/features/onboarding/queries", () => ({
  useCompleteAppOnboarding: jest.fn(),
}));

// Notification deep-linking touches the native expo-notifications module; it has its own
// unit test (use-notification-deep-link.test.tsx), so stub it out of the layout render.
jest.mock("@/src/features/notifications/use-notification-deep-link", () => ({
  useNotificationDeepLink: jest.fn(),
}));

// Background notification reconciliation has dedicated unit coverage. Keeping it out of
// this layout test also prevents the native Expo notifications module from registering
// listeners merely because the layout rendered.
jest.mock("@/src/features/notifications/use-notification-sync", () => ({
  useNotificationSync: jest.fn(),
}));

// The layout reads routines only to fold "any routine reminder enabled" into the
// notification-sync condition (#47); the data layer has its own tests. Keep the rest
// of the module real - the onboarding wizard consumes its other hooks.
jest.mock("@/src/features/routines/queries", () => ({
  ...jest.requireActual("@/src/features/routines/queries"),
  useRoutines: jest.fn(() => ({ data: [] })),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseCompleteAppOnboarding = useCompleteAppOnboarding as jest.MockedFunction<
  typeof useCompleteAppOnboarding
>;
const mockUseUpdateUserPreferences = useUpdateUserPreferences as jest.MockedFunction<
  typeof useUpdateUserPreferences
>;
const mockUseUpdateOnboardingPreferences = useUpdateOnboardingPreferences as jest.MockedFunction<
  typeof useUpdateOnboardingPreferences
>;

describe("ProtectedLayout app onboarding", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    // AppLockGate (native) waits for the app-lock store to hydrate before rendering
    // protected children. These tests aren't about app-lock, so put the store in its
    // hydrated, disabled steady state for synchronous assertions on the content.
    useAppLockStore.setState({ hydrated: true, enabled: false });
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
    mutateAsync.mockResolvedValue(undefined);
    mockUseCompleteAppOnboarding.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: jest.fn(),
      mutateAsync,
    } as unknown as ReturnType<typeof useCompleteAppOnboarding>);
    mockUseUpdateUserPreferences.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateUserPreferences>);
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: jest.fn(),
      mutateAsync: jest.fn().mockResolvedValue(defaultUserPreferences),
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);
  });

  it("shows the wizard panel-1 title when app onboarding is needed", async () => {
    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());
  });

  it("hides the wizard when app onboarding is complete", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.queryByText("Welcome to Selftend")).toBeNull());
  });

  it("replays only the introduction after Settings resets onboarding", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        appOnboardingCompletedVia: "finish",
        policyVersionAccepted: policyVersion,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Welcome to Selftend")).toBeTruthy());
    expect(screen.queryByText("What brings you here?")).toBeNull();
  });

  it("shows the policy gate before app onboarding when consent is outdated", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: false,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
  });

  it("does not flash the consent gate when the preferences fetch fails (#164)", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    // Acceptance state is unknown — the layout must fail open into the app
    // shell, not re-prompt a user who may already have accepted.
    await waitFor(() => expect(screen.queryByText("Consent gate")).toBeNull());
    expect(screen.queryByText("Welcome to Selftend")).toBeNull();
    expect(screen.queryByText("Signed-out landing")).toBeNull();
  });

  it("keeps the gate when cached preferences are stale and a refetch fails", async () => {
    // TanStack retains last data alongside isError on background-refetch
    // failure; a known-stale acceptance must still gate.
    mockUseUserPreferences.mockReturnValue({
      data: {
        ...defaultUserPreferences,
        appOnboardingCompleted: true,
        policyVersionAccepted: "2026-05-01",
      },
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
  });

  it("still gates a loaded user with no acceptance on record", async () => {
    mockUseUserPreferences.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useUserPreferences>);

    renderWithProviders(<ProtectedLayout />);
    await waitFor(() => expect(screen.getByText("Consent gate")).toBeTruthy());
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
