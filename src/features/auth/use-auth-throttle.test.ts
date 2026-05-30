import { act, renderHook } from "@testing-library/react-native";

import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";

describe("useAuthThrottle", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it("throttles immediately on a rate-limit error", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("Email rate limit exceeded")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("throttles immediately on a 429 error", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("Request failed 429")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("throttles only after MAX_ATTEMPTS non-rate failures", () => {
    const { result } = renderHook(() => useAuthThrottle());
    // MAX_ATTEMPTS - 1 = 4 failures stay under the threshold
    for (let i = 0; i < 4; i++) act(() => result.current.recordFailure(new Error("bad password")));
    expect(result.current.isThrottled).toBe(false);
    act(() => result.current.recordFailure(new Error("bad password")));
    expect(result.current.isThrottled).toBe(true);
  });

  it("clears the throttle after the cooldown elapses", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("429")));
    // COOLDOWN_MS = 30_000 in use-auth-throttle.ts
    act(() => jest.advanceTimersByTime(30_000));
    expect(result.current.isThrottled).toBe(false);
  });

  it("recordSuccess clears throttle state", () => {
    const { result } = renderHook(() => useAuthThrottle());
    act(() => result.current.recordFailure(new Error("429")));
    act(() => result.current.recordSuccess());
    expect(result.current.isThrottled).toBe(false);
  });
});
