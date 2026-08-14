import { fireEvent, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Dimensions, Platform, StyleSheet } from "react-native";

import { UserMenu } from "./user-menu";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => mockPathname,
}));

// The native overlay warns when react-test-renderer is not attached to a real iOS
// window. The popover behavior itself remains exercised through rn-primitives.
jest.mock("react-native-screens", () => ({
  ...jest.requireActual("react-native-screens"),
  FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
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
  jest.clearAllMocks();
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
});
