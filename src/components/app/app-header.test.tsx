import { fireEvent, screen } from "@testing-library/react-native";

import { AppHeader } from "./app-header";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    // Mirror Link asChild: forward the href onto the wrapped pressable so
    // tests can assert real link targets instead of spying on router.push.
    Link: ({
      href,
      asChild: _asChild,
      children,
    }: {
      href: string;
      asChild?: boolean;
      children: React.ReactElement;
    }) => React.cloneElement(React.Children.only(children), { href }),
  };
});

// The header is under test, not the account menu — stub the menu's heavy deps away.
jest.mock("@/src/components/app/user-menu", () => ({
  UserMenu: () => null,
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ session: null }),
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

jest.mock("@/src/lib/env", () => ({
  appEnv: {
    discordUrl: "https://discord.gg/pdaAr9FhcQ",
    githubRepoUrl: "https://github.com/Selftend/selftend",
  },
}));

const mockUseWindowDimensions = jest.fn();

// Partial mock via Proxy (mirrors wizard-screen.test.tsx): spreading
// `{...actual}` would eagerly evaluate every lazy getter React Native's module
// defines and can blow up in the test environment, so only intercept the one
// export this suite needs to control.
jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === "useWindowDimensions") {
        return mockUseWindowDimensions;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

// Either side of the sidebar-vs-hamburger switch (DESKTOP_BREAKPOINT = 768).
const MOBILE_DIMENSIONS = { width: 390, height: 844, scale: 3, fontScale: 1 };
const DESKTOP_DIMENSIONS = { width: 1024, height: 768, scale: 1, fontScale: 1 };

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";
  jest.clearAllMocks();
  mockUseWindowDimensions.mockReturnValue(DESKTOP_DIMENSIONS);
});

describe("AppHeader home link", () => {
  it("renders the logo as a real link to the signed-out home", () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/");
  });

  it("keeps the hit area on the logo + name, not the whole header strip", () => {
    renderWithProviders(<AppHeader />);

    // The flex-1 spacer must live on a plain wrapper View: a flex-1 pressable
    // stretched the clickable area across the entire header.
    const link = screen.getByRole("link", { name: "Go to home" });
    expect(link.props.className).not.toContain("flex-1");
    expect(link.props.className).toContain("shrink");
  });
});

describe("AppHeader community links (#92)", () => {
  it("shows Discord and GitHub icon links on desktop, opening the right URLs", () => {
    renderWithProviders(<AppHeader />);

    fireEvent.press(screen.getByLabelText("Join our Discord"));
    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");

    fireEvent.press(screen.getByLabelText("View the source code on GitHub"));
    expect(mockOpen).toHaveBeenCalledWith("https://github.com/Selftend/selftend");
  });

  it("shows neither icon in the mobile header (Discord lives in the account menu)", () => {
    mockUseWindowDimensions.mockReturnValue(MOBILE_DIMENSIONS);

    renderWithProviders(<AppHeader />);

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
    expect(screen.queryByLabelText("View the source code on GitHub")).toBeNull();
  });

  it("hides the Discord icon when no Discord URL is configured, keeping GitHub", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<AppHeader />);

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });
});
