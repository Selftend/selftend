import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addWidgetPreference,
  deleteWidgetPreference,
  listWidgetPreferences,
  restoreWidgetPreference,
  setWidgetOrder,
} from "@/src/features/home/widget-repository";

const widgetKeys = {
  all: ["widgets"] as const,
  list: (userId: string) => ["widgets", "list", userId] as const,
};

export function useWidgetPreferences(userId: string | null) {
  return useQuery({
    queryKey: userId ? widgetKeys.list(userId) : ["widgets", "list", "anonymous"],
    queryFn: () => listWidgetPreferences(userId!),
    enabled: Boolean(userId),
  });
}

export function useAddWidget(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    // The position is the server's to compute: reading the list here and writing
    // `max(position) + 1` back let two adds land on the same position (#974).
    mutationFn: (widgetId: string) => addWidgetPreference(widgetId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: widgetKeys.list(userId) });
    },
  });
}

export function useRemoveWidget(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (widgetId: string) => deleteWidgetPreference(userId!, widgetId),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: widgetKeys.list(userId) });
    },
  });
}

export function useRestoreWidget(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ widgetId, position }: { widgetId: string; position: number }) =>
      restoreWidgetPreference(userId!, widgetId, position),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: widgetKeys.list(userId) });
    },
  });
}

export function useReorderWidgets(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedWidgetIds: string[]) => setWidgetOrder(orderedWidgetIds),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: widgetKeys.list(userId) });
    },
  });
}
