import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { router } from "expo-router";

import { CreateAccountCard } from "./create-account-card";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/settings",
}));

let mockUser: { id: string; is_anonymous?: boolean } | null = null;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockUser }),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

const TITLE = "Create an account to protect your data";

describe("CreateAccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: "guest-1", is_anonymous: true };
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  });

  it("invites a guest, on native in terms of the device", () => {
    renderWithProviders(<CreateAccountCard />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(/keeps your data if this device is lost/)).toBeTruthy();
  });

  // Stronger wording on web because the risk is real there: the guest session
  // lives in browser storage, which the browser itself can clear.
  it("names the browser-storage fragility on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<CreateAccountCard />);

    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(/browsers can clear it/)).toBeTruthy();
  });

  it("links to the conversion form", () => {
    renderWithProviders(<CreateAccountCard />);

    fireEvent.press(screen.getByText("Create account"));

    expect(mockPush).toHaveBeenCalledWith("/sign-up");
  });

  it("renders nothing for a registered user", () => {
    mockUser = { id: "user-1", is_anonymous: false };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });

  // Older tokens predate the claim entirely - absence means registered.
  it("renders nothing when the claim is absent", () => {
    mockUser = { id: "user-1" };

    renderWithProviders(<CreateAccountCard />);

    expect(screen.queryByText(TITLE)).toBeNull();
  });
});
