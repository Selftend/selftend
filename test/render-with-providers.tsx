import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react-native";
import type { PropsWithChildren, ReactElement } from "react";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { I18nContext } from "@/src/providers/i18n-provider";

// A synchronous, already-hydrated context value for tests.
// Using I18nContext.Provider directly (instead of <I18nProvider>) avoids the
// AsyncStorage.getItem() round-trip that fires setHydrated(true) outside act()
// and produces act() noise in every test that renders icons or translated text.
const TEST_I18N_VALUE = {
  language: "en" as const,
  setLanguage: async () => {},
  hydrated: true,
};

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient(), ...options }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <QueryClientProvider client={queryClient}>
          {/* Mirror the app root so Portal-rendered content (popovers, the button-tour spotlight)
              mounts in tests just like it does under the real <PortalHost /> in app/_layout.
              I18nContext.Provider is used directly (not <I18nProvider>) so no AsyncStorage
              hydration happens in tests — eliminating act() noise from setHydrated(). */}
          <I18nContext.Provider value={TEST_I18N_VALUE}>{children}</I18nContext.Provider>
          <PortalHost />
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
}
