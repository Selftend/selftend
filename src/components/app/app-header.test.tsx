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

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";
  jest.clearAllMocks();
});

describe("AppHeader home link", () => {
  it("renders the logo as a real link to the signed-out home", () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByRole("link", { name: "Go to home" }).props.href).toBe("/");
  });
});

describe("AppHeader Discord icon", () => {
  it("opens the Discord invite from the toolbar", () => {
    renderWithProviders(<AppHeader />);

    fireEvent.press(screen.getByLabelText("Join our Discord"));

    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");
  });

  it("hides the icon when no Discord URL is configured", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<AppHeader />);

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
  });
});
