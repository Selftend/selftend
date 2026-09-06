import { screen } from "@testing-library/react-native";

import SignInScreen from "@/app/(auth)/sign-in";
import SignUpScreen from "@/app/(auth)/sign-up";
import i18n from "@/src/i18n";
import { useSession } from "@/src/providers/session-provider";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The (auth) session gates became `is_anonymous`-aware with conversion
 * (#1443). Today's unconditional `session -> redirect` would make sign-up
 * unreachable for exactly the people it invites - a guest reaching sign-up
 * must fall through to the form (which renders its conversion mode), and a
 * guest must be able to land on sign-in, where the collision link's prefill
 * arrives (#1444 adds the warn-and-abandon dialog there). Registered
 * sessions keep today's redirect.
 */

jest.mock("expo-router", () => {
  const { View } = jest.requireActual("react-native");
  return {
    router: { replace: jest.fn(), push: jest.fn() },
    usePathname: () => "/sign-in",
    Redirect: ({ href }: { href: string }) => <View testID={`redirect-${href}`} />,
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/src/components/app/sign-in-form", () => {
  const { View } = jest.requireActual("react-native");
  return { SignInForm: () => <View testID="auth-form" /> };
});
jest.mock("@/src/components/app/sign-up-form", () => {
  const { View } = jest.requireActual("react-native");
  return { SignUpForm: () => <View testID="auth-form" /> };
});

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

type SessionValue = ReturnType<typeof useSession>;

const sessionValue = (user: { id: string; is_anonymous?: boolean; email?: string } | null) =>
  ({
    hasSupabaseConfig: true,
    session: user ? { user } : null,
    status: "ready",
    user,
  }) as unknown as SessionValue;

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each([
  ["sign-up", SignUpScreen],
  ["sign-in", SignInScreen],
])("%s screen gate", (_name, Screen) => {
  it("redirects a registered session into the app", () => {
    mockUseSession.mockReturnValue(
      sessionValue({ id: "u1", is_anonymous: false, email: "person@example.com" }),
    );
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("redirect-/(app)")).toBeTruthy();
    expect(screen.queryByTestId("auth-form")).toBeNull();
  });

  /**
   * ☠️ The stale-flag window (#1896). `convertGuestWithPassword` flips
   * `is_anonymous` server-side while the live JWT keeps claiming it, so this
   * person is registered and still carries a true flag. Gating on the flag left
   * them on the auth screens - and on sign-up that meant being shown the
   * conversion form a second time, for an account they had just created.
   */
  it("redirects a just-converted session whose token still claims anonymous", () => {
    mockUseSession.mockReturnValue(
      sessionValue({ id: "u1", is_anonymous: true, email: "person@example.com" }),
    );
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("redirect-/(app)")).toBeTruthy();
    expect(screen.queryByTestId("auth-form")).toBeNull();
  });

  it("lets a guest session through to the form", () => {
    mockUseSession.mockReturnValue(sessionValue({ id: "g1", is_anonymous: true }));
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("auth-form")).toBeTruthy();
    expect(screen.queryByTestId("redirect-/(app)")).toBeNull();
  });

  it("still shows the form when signed out", () => {
    mockUseSession.mockReturnValue(sessionValue(null));
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("auth-form")).toBeTruthy();
  });
});
