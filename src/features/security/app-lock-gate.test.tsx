import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AppState, Text } from "react-native";

import { AppLockGate } from "@/src/features/security/app-lock-gate";
import { authenticate } from "@/src/features/security/biometric";
import { useAppLockStore } from "@/src/features/security/app-lock-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/features/security/biometric", () => ({
  authenticate: jest.fn(),
}));

const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

function Protected() {
  return <Text>Protected content</Text>;
}

describe("AppLockGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppLockStore.setState({ enabled: false, hydrated: true });
    mockAuthenticate.mockResolvedValue(true);
  });

  it("renders children directly when the lock is disabled (default path)", () => {
    renderWithProviders(
      <AppLockGate>
        <Protected />
      </AppLockGate>,
    );

    expect(screen.getByText("Protected content")).toBeTruthy();
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it("renders nothing until the store has hydrated, then reveals children", () => {
    // Pre-hydration the persisted `enabled` flag is unknown; rendering children here
    // would briefly leak content before LockedGate could mount. The gate must wait.
    useAppLockStore.setState({ enabled: false, hydrated: false });

    renderWithProviders(
      <AppLockGate>
        <Protected />
      </AppLockGate>,
    );

    expect(screen.queryByText("Protected content")).toBeNull();

    // Once hydration completes with the lock disabled, children appear.
    act(() => useAppLockStore.setState({ enabled: false, hydrated: true }));
    expect(screen.getByText("Protected content")).toBeTruthy();
  });

  it("shows the lock screen and auto-prompts when enabled, then reveals children on success", async () => {
    useAppLockStore.setState({ enabled: true, hydrated: true });

    renderWithProviders(
      <AppLockGate>
        <Protected />
      </AppLockGate>,
    );

    // Auto-prompt fires on mount.
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));

    // After a successful prompt the protected content appears.
    await waitFor(() => expect(screen.getByText("Protected content")).toBeTruthy());
  });

  it("keeps the lock screen visible when authentication fails", async () => {
    useAppLockStore.setState({ enabled: true, hydrated: true });
    mockAuthenticate.mockResolvedValue(false);

    renderWithProviders(
      <AppLockGate>
        <Protected />
      </AppLockGate>,
    );

    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Protected content")).toBeNull();

    // The Unlock button can retry once the in-flight auto-prompt has settled.
    // Retry the press inside waitFor so it isn't swallowed by the concurrency guard.
    await waitFor(() => {
      fireEvent.press(screen.getByText("Unlock"));
      expect(mockAuthenticate).toHaveBeenCalledTimes(2);
    });
  });

  it("covers unlocked content while backgrounded (privacy snapshot), keeping it mounted", async () => {
    useAppLockStore.setState({ enabled: true, hydrated: true });

    let appStateHandler: ((state: string) => void) | undefined;
    const addEventListenerSpy = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, handler) => {
        appStateHandler = handler as (state: string) => void;
        return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
      });

    renderWithProviders(
      <AppLockGate>
        <Protected />
      </AppLockGate>,
    );

    // Unlock first.
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("Protected content")).toBeTruthy());
    expect(screen.queryByTestId("app-lock-privacy-cover")).toBeNull();

    // Leaving the foreground drops the cover over (still-mounted) content. The cover is
    // hidden from accessibility, so include hidden elements when querying for it.
    act(() => appStateHandler?.("background"));
    expect(
      screen.getByTestId("app-lock-privacy-cover", { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(screen.getByText("Protected content")).toBeTruthy(); // mounted -> state preserved

    // Returning to the foreground (within the timeout) removes the cover.
    act(() => appStateHandler?.("active"));
    expect(
      screen.queryByTestId("app-lock-privacy-cover", { includeHiddenElements: true }),
    ).toBeNull();

    addEventListenerSpy.mockRestore();
  });

  it("re-locks when returning to the foreground after the timeout", async () => {
    jest.useFakeTimers();
    try {
      useAppLockStore.setState({ enabled: true, hydrated: true });

      let appStateHandler: ((state: string) => void) | undefined;
      const addEventListenerSpy = jest
        .spyOn(AppState, "addEventListener")
        .mockImplementation((_event, handler) => {
          appStateHandler = handler as (state: string) => void;
          return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
        });

      renderWithProviders(
        <AppLockGate>
          <Protected />
        </AppLockGate>,
      );

      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText("Protected content")).toBeTruthy();

      // Background, advance past the timeout, then foreground again.
      act(() => appStateHandler?.("background"));
      act(() => jest.advanceTimersByTime(31_000));
      act(() => appStateHandler?.("active"));

      expect(screen.queryByText("Protected content")).toBeNull();

      addEventListenerSpy.mockRestore();
    } finally {
      jest.useRealTimers();
    }
  });
});
