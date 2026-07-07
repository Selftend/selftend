import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Platform } from "react-native";

import { UserMenu } from "./user-menu";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
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

afterEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  jest.clearAllMocks();
});

describe("UserMenu", () => {
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
});
