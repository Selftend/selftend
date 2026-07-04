import { useEffect, type PropsWithChildren } from "react";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { validateRequiredEnv } from "@/src/lib/env";
import { registerWebPushServiceWorker } from "@/src/lib/notifications";
import { createAppQueryClient, createQueryPersister } from "@/src/lib/query-client";
import { initOnlineManager } from "@/src/lib/online-manager";
import { I18nProvider } from "@/src/providers/i18n-provider";
import { SessionProvider } from "@/src/providers/session-provider";

// React Query doesn't know about AppState on native - teach it to treat
// foreground transitions as focus events so stale queries are refetched.
if (Platform.OS !== "web") {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener("change", (state) => {
      handleFocus(state === "active");
    });
    return () => subscription.remove();
  });
}

// Same idea as the focusManager block above: teach React Query about native
// connectivity so mutations/queries know when the device is offline.
initOnlineManager();

const queryClient = createAppQueryClient();
const persister = createQueryPersister();
const persistOptions = persister
  ? {
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      buster: Constants.expoConfig?.version ?? "0",
      dehydrateOptions: {
        shouldDehydrateQuery: (query: { state: { status: string } }) =>
          query.state.status === "success",
      },
    }
  : null;

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    validateRequiredEnv();
    void registerWebPushServiceWorker();
  }, []);

  const inner = (
    <I18nProvider>
      <SessionProvider>{children}</SessionProvider>
    </I18nProvider>
  );

  return (
    <SafeAreaProvider>
      {persistOptions ? (
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          {inner}
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>{inner}</QueryClientProvider>
      )}
    </SafeAreaProvider>
  );
}
