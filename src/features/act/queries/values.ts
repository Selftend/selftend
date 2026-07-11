import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getValueEntryByDomain,
  listValueEntries,
  upsertValueEntry,
} from "@/src/features/act/repository";
import type { ACTLifeDomain, ValueEntryInput } from "@/src/features/act/types";
import { actKeys } from "./keys";

export function useValueEntries(userId: string | null) {
  return useQuery({
    queryKey: actKeys.valuesList(userId),
    queryFn: () => listValueEntries(userId!),
    enabled: Boolean(userId),
  });
}

export function useValueEntryByDomain(userId: string | null, domain: ACTLifeDomain | null) {
  return useQuery({
    queryKey: actKeys.valueDomain(userId, domain),
    queryFn: () => getValueEntryByDomain(userId!, domain!),
    enabled: Boolean(userId) && Boolean(domain),
  });
}

export function useUpsertValueEntry(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ValueEntryInput) => upsertValueEntry(userId!, input),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (data) => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: actKeys.valuesList(userId) });
      await queryClient.invalidateQueries({
        queryKey: actKeys.valueDomain(userId, data.lifeDomain),
      });
    },
  });
}
