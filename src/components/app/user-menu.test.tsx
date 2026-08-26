import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Dimensions, Platform, StyleSheet } from "react-native";

import { UserMenu } from "./user-menu";
import { signOut } from "@/src/features/auth/api";
import { appEnv } from "@/src/lib/env";
import { cancelAllReminders } from "@/src/lib/notifications";
import { openExternalUrl } from "@/src/lib/linking";
import { useToastStore } from "@/src/stores/toast-store";
import { renderWithProviders } from "@/test/render-with-providers";

// ☠️ Load-bearing for exactly ONE test: "shows the compact get-the-app section on
// web", which flips `Platform.OS` to "web". `popover.tsx` picks its wrapper at
// MODULE LOAD (`Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment`),
// and jest-expo loads with `defaultPlatform: "ios"` - so the alias is already
// frozen to the real overlay by the time the test moves the platform, and the
// overlay's own off-iOS branch then warns. Nothing else here needs it: verified
// (#1338) that the real overlay renders silently under react-test-renderer on
// iOS, which is why `app-toast.tsx`'s wrapper is tested against the REAL thing
// and this mock deliberately stayed local rather than moving to `test/setup.js`.
jest.mock("react-native-screens", () => ({
  ...jest.requireActual("react-native-screens"),
  FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
}));

let mockPathname = "/";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => mockPathname,
}));

const signedInSession = {
  session: { access_token: "token" },
  user: { id: "user-1", email: "user@example.com" },
};
let mockSession: { session: object | null; user: object | null } = signedInSession;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSession,
}));

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/auth/api", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;
const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCancelAllReminders = cancelAllReminders as jest.MockedFunction<typeof cancelAllReminders>;

const originalDiscordUrl = appEnv.discordUrl;
const originalRedditUrl = appEnv.redditUrl;
const originalYoutubeUrl = appEnv.youtubeUrl;

afterEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  appEnv.discordUrl = originalDiscordUrl;
  appEnv.redditUrl = originalRedditUrl;
  appEnv.youtubeUrl = originalYoutubeUrl;
  mockPathname = "/";
  mockSession = signedInSession;
  // The real teardown rather than a hand-written `setState`: the slot is two
  // fields now, and an error toast no longer expires on its own.
  useToastStore.getState().clearToasts();
  jest.clearAllMocks();
  // `clearAllMocks` wipes recorded calls but NOT implementations, so a
  // `mockRejectedValue` set by one test would still be rejecting in the next.
  mockCancelAllReminders.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

describe("UserMenu", () => {
  // The header (and this menu) persists across routes: navigating from a
  // sidebar link used to leave the open menu hanging over the new screen (#491).
  it("closes when the route changes", () => {
    const { rerender } = renderWithProviders(<UserMenu />);

    fireEvent.press(screen.getByLabelText("Open account menu"));
    expect(screen.getByText("Send feedback")).toBeTruthy();

    mockPathname = "/routines";
    rerender(<UserMenu />);

    expect(screen.queryByText("Send feedback")).toBeNull();
  });

  it("routes to the support page from Send feedback", () => {
    renderWithProviders(<UserMenu />);

    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Send feedback"));

    // Lateral jump to a panel destination, so it must reuse the screen already in the
    // stack rather than push a second copy (#1027).
    expect(mockPush).toHaveBeenCalledWith("/(app)/support", { dangerouslySingular: true });
  });

  it("shows the compact get-the-app section on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Get the mobile app")).toBeTruthy();
  });

  // #92: on mobile the header carries no community icons, so the dropdown's
  // social row is the Discord entry point - pin its presence and its
  // hide-when-unconfigured behavior.
  it("offers the Discord link in the dropdown", () => {
    appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Join our Discord"));
    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");
  });

  it("hides the Discord link when no Discord URL is configured, keeping GitHub", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  // #668: Reddit and YouTube join the social row with the same
  // hide-when-unconfigured contract as Discord; GitHub stays unconditional.
  it("offers the Reddit link in the dropdown", () => {
    appEnv.redditUrl = "https://www.reddit.com/r/Selftend/";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Open the Selftend subreddit"));
    expect(mockOpen).toHaveBeenCalledWith("https://www.reddit.com/r/Selftend/");
  });

  it("offers the YouTube link in the dropdown", () => {
    appEnv.youtubeUrl = "https://www.youtube.com/@Selftend";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Open the Selftend YouTube channel"));
    expect(mockOpen).toHaveBeenCalledWith("https://www.youtube.com/@Selftend");
  });

  it("hides the Reddit link when no Reddit URL is configured, keeping GitHub", () => {
    appEnv.redditUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Open the Selftend subreddit")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  it("hides the YouTube link when no YouTube URL is configured, keeping GitHub", () => {
    appEnv.youtubeUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Open the Selftend YouTube channel")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  // The decided row order (#659): community spaces first in order of
  // interactivity, GitHub last as the transparency door.
  it("renders the social row as Discord, Reddit, YouTube, GitHub", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    const row = screen.getByTestId("social-connections");
    const labels = within(row)
      .getAllByLabelText(/./)
      .map((node) => node.props.accessibilityLabel as string);

    expect(labels).toEqual([
      "Join our Discord",
      "Open the Selftend subreddit",
      "Open the Selftend YouTube channel",
      "View the source code on GitHub",
    ]);
  });

  it("renders the full social row on the signed-out menu too", () => {
    mockSession = { session: null, user: null };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByLabelText("Join our Discord")).toBeTruthy();
    expect(screen.getByLabelText("Open the Selftend subreddit")).toBeTruthy();
    expect(screen.getByLabelText("Open the Selftend YouTube channel")).toBeTruthy();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  it("exposes the language and theme rows as radios in labelled radiogroups", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    // byRole skips plain Views (not accessibility elements), so assert the
    // containers' group semantics through their labels instead.
    expect(screen.getByLabelText("Switch language").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByLabelText("Switch theme").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Bulgarian" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dark" })).not.toBeChecked();
  });

  // The palette grid made this menu tall enough to run off a short or
  // landscape phone, and a popover does not scroll on its own - so the rows
  // below the fold (lower palettes, Settings, feedback, sign out) became
  // unreachable rather than merely awkward. Asserted as the property that
  // matters - bounded strictly below the viewport, and scrollable - rather
  // than against the exact fraction, so tuning the ratio does not fail this.
  it("keeps the menu body scrollable and bounded inside the viewport", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    const body = screen.getByTestId("user-menu-scroll");
    const { maxHeight } = StyleSheet.flatten(body.props.style) as { maxHeight?: number };
    const viewport = Dimensions.get("window").height;

    expect(typeof maxHeight).toBe("number");
    expect(maxHeight).toBeGreaterThan(0);
    expect(maxHeight).toBeLessThan(viewport);
    // Reachable by scrolling, not just clipped by the bound above.
    expect(body.props.scrollEnabled).not.toBe(false);
  });

  it("still renders the actions below the palette grid", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Sign Out")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  // #968: supabase-js's `signOut()` defaults to `scope: 'global'`, which revokes
  // every refresh token the user holds - pressing Sign Out on the laptop ended
  // the session on the phone. Nothing in the product ever asked for that. The
  // scope is now an explicit argument, and this pins the one this menu passes.
  it("signs out of this device only, leaving other devices signed in", async () => {
    mockCancelAllReminders.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith("local"));
    // And still after the reminder deregistration, which needs a live RLS context.
    expect(mockCancelAllReminders.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
  });

  // #1053: the menu closes first and unconditionally, so a rejected sign-out used
  // to leave the user still signed in with nothing on screen to say so - the
  // failure existed only as an unhandled rejection in the console. The toast is
  // the only surface that survives a dismissed menu.
  //
  // These two asserted the thrown message ("boom") until #1055 made the toast say
  // it in the user's language instead. What the menu owns is that a failure
  // reaches the user at all - the wording is `useSignOut`'s, and pinned there.
  it("reports a failed sign-out through the toast", async () => {
    mockCancelAllReminders.mockResolvedValue(undefined);
    mockSignOut.mockRejectedValue(new Error("boom"));

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(useToastStore.getState().visible).toMatchObject({ tone: "error" }));
  });

  // `cancelAllReminders` is awaited first, so a failure there means `signOut`
  // never runs at all - "sign-out did nothing" does not require the sign-out
  // call itself to be the thing that broke.
  it("reports a failure that stopped sign-out from being attempted", async () => {
    mockCancelAllReminders.mockRejectedValue(new Error("reminders offline"));

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(useToastStore.getState().visible).toMatchObject({ tone: "error" }));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

/**
 * The header used to read `profile?.avatarUrl ?? null` while settings fell back to the
 * OAuth photo, so a Google user with no upload saw a photo on one surface and an initial
 * on the other — and `Remove photo` changed the header while appearing to do nothing in
 * settings (#970). Both now go through `resolveAvatarUrl`.
 */
describe("UserMenu avatar (#970)", () => {
  it("shows the OAuth photo when the profile stores none", () => {
    mockSession = {
      session: { access_token: "token" },
      user: {
        id: "user-1",
        email: "user@example.com",
        user_metadata: { avatar_url: "https://lh3.googleusercontent.com/photo" },
      },
    };

    renderWithProviders(<UserMenu />);

    // The avatar is an <Image source={{ uri }}> inside the trigger; assert the URI reached
    // the tree rather than reaching for the element, which is nested in menu chrome.
    expect(JSON.stringify(screen.toJSON())).toContain("https://lh3.googleusercontent.com/photo");
  });
});
