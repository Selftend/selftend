import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import i18n from "@/src/i18n";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useToastStore } from "@/src/stores/toast-store";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      suppressGlobalErrorToast?: boolean;
    };
  }
}

// Keys identify feature + entity ids (pseudonymous), never entry content, so
// they are safe to attach as error context.
export function reportQueryError(error: unknown, queryKey: readonly unknown[]): void {
  if (isReportableError(error)) {
    captureError(error, { queryKey: JSON.stringify(queryKey) });
  }
}

export function reportMutationError(error: unknown, mutationKey: unknown): void {
  if (isReportableError(error)) {
    captureError(error, { mutationKey: JSON.stringify(mutationKey ?? null) });
  }
}

// Last line of defense: a mutation whose screen shows no error UI of its own
// must still tell the user the save failed. Screens with their own error
// handling set meta.suppressGlobalErrorToast to avoid double-toasting.
function showSaveFailedToast(): void {
  useToastStore.getState().showToast({
    title: i18n.t("errors:saveFailed.title"),
    description: i18n.t("errors:saveFailed.description"),
    tone: "error",
  });
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => reportQueryError(error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        reportMutationError(error, mutation.options.mutationKey);

        if (!mutation.meta?.suppressGlobalErrorToast) {
          showSaveFailedToast();
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
      mutations: {
        // Fail fast when offline: the default "online" mode silently pauses
        // the mutation and the user sees a spinner that never resolves.
        networkMode: "always",
      },
    },
  });
}
