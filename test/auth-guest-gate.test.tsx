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

const sessionValue = (user: { id: string; email?: string; is_anonymous?: boolean } | null) =>
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
    mockUseSession.mockReturnValue(sessionValue({ id: "u1", email: "user@example.com" }));
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("redirect-/(app)")).toBeTruthy();
    expect(screen.queryByTestId("auth-form")).toBeNull();
  });

  // ☠️ `email: ""`, never an absent key (#1896) - that is what a guest's user
  // object actually carries, and a fixture that omits it would pass whether the
  // gate read `!email` or a nullish check.
  it("lets a guest session through to the form", () => {
    mockUseSession.mockReturnValue(sessionValue({ id: "g1", email: "" }));
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("auth-form")).toBeTruthy();
    expect(screen.queryByTestId("redirect-/(app)")).toBeNull();
  });

  /**
   * ☠️☠️ THE WINDOW (#1896). `convertGuestWithPassword` flips `is_anonymous`
   * server-side while the live JWT keeps claiming `true` until the token is
   * minted again. These gates read that flag, so for the length of the window a
   * just-converted person was held on the auth screen - offered a sign-in form
   * for the account they were already signed in to, or a sign-up form for the
   * account they had just made.
   *
   * The stale claim rides on the fixture and is ignored: the gate reads the
   * email now. ⚠️ On sign-up this fires during a successful conversion, which is
   * harmless - `SignUpForm`'s own success path is `router.replace("/(app)")`,
   * the same destination.
   */
  it("redirects a just-converted session whose flag is still stale", () => {
    mockUseSession.mockReturnValue(
      sessionValue({ id: "c1", email: "converted@example.com", is_anonymous: true }),
    );
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("redirect-/(app)")).toBeTruthy();
    expect(screen.queryByTestId("auth-form")).toBeNull();
  });

  it("still shows the form when signed out", () => {
    mockUseSession.mockReturnValue(sessionValue(null));
    renderWithProviders(<Screen />);

    expect(screen.getByTestId("auth-form")).toBeTruthy();
  });
});
