import { onlineManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";

import { toOnlineState, useIsOnline } from "@/src/lib/online-manager";

describe("toOnlineState", () => {
  it("is online when connected and reachability is unknown", () => {
    expect(toOnlineState({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it("is online when connected and reachable", () => {
    expect(toOnlineState({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it("is offline when disconnected", () => {
    expect(toOnlineState({ isConnected: false, isInternetReachable: false })).toBe(false);
  });

  it("is offline when connected but internet is explicitly unreachable (captive portal)", () => {
    expect(toOnlineState({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("treats a missing state as online (never strand the app offline on a read failure)", () => {
    expect(toOnlineState({})).toBe(true);
  });
});

describe("useIsOnline", () => {
  afterEach(() => {
    act(() => onlineManager.setOnline(true));
  });

  it("tracks onlineManager state", () => {
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe(false);

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe(true);
  });
});
