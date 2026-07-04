import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { captureError, isReportableError } from "@/src/lib/sentry";

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

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => reportQueryError(error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        reportMutationError(error, mutation.options.mutationKey),
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  });
}
