import { useEffect, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { validateRequiredEnv } from "@/src/lib/env";
import { registerWebPushServiceWorker } from "@/src/lib/notifications";
import { I18nProvider } from "@/src/providers/i18n-provider";
import { SessionProvider } from "@/src/providers/session-provider";
import { useEmotionsStore } from "@/src/stores/emotions-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  const hydrateEmotions = useEmotionsStore((s) => s.hydrate);

  useEffect(() => {
    validateRequiredEnv();
    void registerWebPushServiceWorker();
    void hydrateEmotions();
  }, [hydrateEmotions]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SessionProvider>{children}</SessionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
