import { fireEvent, screen } from "@testing-library/react-native";
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

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    session: { access_token: "token" },
    user: { id: "user-1", email: "user@example.com" },
  }),
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

afterEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  appEnv.discordUrl = originalDiscordUrl;
  mockPathname = "/";
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

    expect(mockPush).toHaveBeenCalledWith("/(app)/support");
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
