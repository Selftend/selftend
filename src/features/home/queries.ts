import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteWidgetPreference,
  insertWidgetPreferences,
  listWidgetPreferences,
  restoreWidgetPreference,
  updateWidgetPositions,
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
    mutationFn: async (widgetId: string) => {
      const current = await listWidgetPreferences(userId!);
      const nextPosition = current.length > 0 ? Math.max(...current.map((w) => w.position)) + 1 : 0;
      await insertWidgetPreferences(userId!, [widgetId], nextPosition);
    },
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
    mutationFn: (orderedWidgetIds: string[]) => updateWidgetPositions(userId!, orderedWidgetIds),
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: widgetKeys.list(userId) });
    },
  });
}
