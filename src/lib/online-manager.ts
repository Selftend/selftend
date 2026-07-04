import { useEffect, useState } from "react";
import { onlineManager } from "@tanstack/react-query";
import { Platform } from "react-native";
import * as Network from "expo-network";

// isConnected false OR an explicit isInternetReachable false (captive portal)
// means offline. Unknown/missing values count as online: a failed state read
// must never freeze the app into offline mode.
export function toOnlineState(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  if (state.isConnected === false) {
    return false;
  }

  return state.isInternetReachable !== false;
}

// Web: TanStack already listens to browser online/offline events. Native has
// no default signal - feed it from expo-network.
export function initOnlineManager(): void {
  if (Platform.OS === "web") {
    return;
  }

  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(toOnlineState(state)))
      .catch(() => setOnline(true));

    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(toOnlineState(state));
    });

    return () => subscription.remove();
  });
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setOnline), []);

  return online;
}
