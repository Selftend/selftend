import { fireEvent, screen } from "@testing-library/react-native";

import { AppHeader } from "./app-header";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

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
    discordUrl: "https://discord.gg/R96NRx6AH3",
    githubRepoUrl: "https://github.com/Selftend/selftend",
  },
}));

const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;

beforeEach(() => {
  appEnv.discordUrl = "https://discord.gg/R96NRx6AH3";
  jest.clearAllMocks();
});

describe("AppHeader Discord icon", () => {
  it("opens the Discord invite from the toolbar", () => {
    renderWithProviders(<AppHeader />);

    fireEvent.press(screen.getByLabelText("Join our Discord"));

    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/R96NRx6AH3");
  });

  it("hides the icon when no Discord URL is configured", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<AppHeader />);

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
  });
});
