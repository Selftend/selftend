import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import {
  ensureReminderChannel,
  getReminderChannelStatus,
  peekReminderChannelStatus,
} from "@/src/lib/notifications";

jest.mock("@/src/lib/notifications", () => ({
  ensureReminderChannel: jest.fn(),
  getReminderChannelStatus: jest.fn(),
  peekReminderChannelStatus: jest.fn(),
}));

const mockEnsure = jest.mocked(ensureReminderChannel);
const mockGetStatus = jest.mocked(getReminderChannelStatus);
const mockPeek = jest.mocked(peekReminderChannelStatus);

// jest-expo's AppState mock returns undefined from addEventListener; every consumer of it
// in this repo stubs a subscription (see use-notification-sync.test.ts).
const appStateListeners: ((state: string) => void)[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners.length = 0;
  mockPeek.mockReturnValue("prompt-needed");
  mockGetStatus.mockResolvedValue("granted");
  mockEnsure.mockResolvedValue({ enabled: true });
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _event: string,
    handler: (state: string) => void,
  ) => {
    appStateListeners.push(handler);
    return { remove: jest.fn() };
  }) as unknown as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useReminderChannel", () => {
  it("starts from the synchronously-knowable status, then settles on the real one", async () => {
    const { result } = renderHook(() => useReminderChannel("user-1"));

    // First render is the peek: native cannot read permission without an await, and
    // guessing `granted` would shape an enable as instant and then prompt.
    expect(result.current.status).toBe("prompt-needed");
    await waitFor(() => expect(result.current.status).toBe("granted"));
  });

  it("re-reads on foreground, because permission changes outside the app", async () => {
    const { result } = renderHook(() => useReminderChannel("user-1"));
    await waitFor(() => expect(result.current.status).toBe("granted"));

    mockGetStatus.mockResolvedValue("blocked");
    await act(async () => {
      appStateListeners.forEach((listener) => listener("active"));
    });

    expect(result.current.status).toBe("blocked");
  });

  it("ensure() registers the channel and refreshes the status from the outcome", async () => {
    mockGetStatus.mockResolvedValue("prompt-needed");
    const { result } = renderHook(() => useReminderChannel("user-1"));
    await waitFor(() => expect(result.current.status).toBe("prompt-needed"));

    mockGetStatus.mockResolvedValue("granted");
    await act(async () => {
      await expect(result.current.ensure()).resolves.toEqual({ enabled: true });
    });

    expect(mockEnsure).toHaveBeenCalledWith("user-1");
    // A granted prompt makes every LATER row Path A, so the status has to move with it.
    expect(result.current.status).toBe("granted");
  });

  it("refreshes the status after a declined request too", async () => {
    mockGetStatus.mockResolvedValue("prompt-needed");
    mockEnsure.mockResolvedValue({ enabled: false, reason: "permission-denied" });
    const { result } = renderHook(() => useReminderChannel("user-1"));
    await waitFor(() => expect(result.current.status).toBe("prompt-needed"));

    mockGetStatus.mockResolvedValue("blocked");
    await act(async () => {
      await result.current.ensure();
    });

    // A decline has to reach the page-level notice, not just the row that asked.
    expect(result.current.status).toBe("blocked");
  });
});
