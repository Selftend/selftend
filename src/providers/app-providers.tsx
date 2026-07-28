import { useEffect, type PropsWithChildren } from "react";
import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { AppState, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";

import { validateRequiredEnv } from "@/src/lib/env";
import { registerWebPushServiceWorker } from "@/src/lib/notifications";
import {
  createAppQueryClient,
  createQueryPersister,
  QUERY_CACHE_MAX_AGE_MS,
} from "@/src/lib/query-client";
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
      maxAge: QUERY_CACHE_MAX_AGE_MS,
      // Bump whenever the SHAPE of a persisted query's data changes. The app
      // version alone is not enough: an OTA update, or any build that ships a
      // shape change without a version bump, restores up to QUERY_CACHE_MAX_AGE_MS
      // of entries written by the previous code. #250 added `dayKey` to gratitude,
      // sleep and journal entries, and every new day-scoped equality/range check
      // silently excludes a restored entry that lacks it - so cached entries and
      // sleep stats would vanish while offline until a refetch succeeded.
      // Discarding a stale-shaped cache costs one refetch; keeping it loses data
      // from the user's view.
      //
      // shape3: #330 does the same to meditation sessions. A restored session
      // written before this build has no `dayKey`, and the widget and routine
      // completion checks compare it directly - `undefined === "2026-07-15"` is
      // false, so a sit the user finished reads as not done while offline or
      // until a refetch lands.
      // shape4: and again for breathing and grounding, which share
      // mindfulness_sessions and so gained `dayKey` together. Each shipped shape
      // change takes its own bump - shape3 went out with the meditation change,
      // so reusing it here would leave anyone who updated between the two with a
      // cache the new equality checks cannot read.
      buster: `${Constants.expoConfig?.version ?? "0"}-shape4`,
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
