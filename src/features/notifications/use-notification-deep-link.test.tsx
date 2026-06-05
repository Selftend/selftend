import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import { router } from "expo-router";

import { useNotificationDeepLink } from "@/src/features/notifications/use-notification-deep-link";
import { addReminderResponseListener, getInitialReminderUrl } from "@/src/lib/notifications";

jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));

jest.mock("@/src/lib/notifications", () => ({
  getInitialReminderUrl: jest.fn().mockResolvedValue(null),
  addReminderResponseListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const mockNavigate = jest.mocked(router.navigate);
const mockGetInitial = jest.mocked(getInitialReminderUrl);
const mockAddListener = jest.mocked(addReminderResponseListener);

function setPlatformOS(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
}

describe("useNotificationDeepLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOS("android");
    mockGetInitial.mockResolvedValue(null);
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  afterAll(() => setPlatformOS("ios"));

  it("navigates to the route the app was cold-launched into by a reminder tap", async () => {
    mockGetInitial.mockResolvedValue("/tools/sleep");

    renderHook(() => useNotificationDeepLink());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/tools/sleep");
    });
  });

  it("navigates when a reminder is tapped while the app is running", () => {
    let captured: ((url: string) => void) | undefined;
    mockAddListener.mockImplementation((onUrl) => {
      captured = onUrl;
      return { remove: jest.fn() };
    });

    renderHook(() => useNotificationDeepLink());

    act(() => captured?.("/tools/habits"));

    expect(mockNavigate).toHaveBeenCalledWith("/tools/habits");
  });

  it("is a no-op on web (the service worker routes web taps)", async () => {
    setPlatformOS("web");

    renderHook(() => useNotificationDeepLink());
    await act(async () => {});

    expect(mockGetInitial).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
