import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listPlanItems } from "@/src/features/plan/repository";
import { resolveInitialWidgetIds } from "@/src/features/home/seeding";
import {
  deleteWidgetPreference,
  getWidgetsSeeded,
  insertWidgetPreferences,
  listWidgetPreferences,
  markWidgetsSeeded,
  updateWidgetPositions,
} from "@/src/features/home/widget-repository";
import type { WidgetPreference } from "@/src/features/home/types";

const widgetKeys = {
  all: ["widgets"] as const,
  list: (userId: string) => ["widgets", "list", userId] as const,
};

async function listOrSeed(userId: string): Promise<WidgetPreference[]> {
  const existing = await listWidgetPreferences(userId);
  if (existing.length > 0) return existing;

  // Seed defaults only once per user. If seeding already ran, an empty Home stays empty.
  if (await getWidgetsSeeded(userId)) return [];

  const planItems = await listPlanItems(userId);
  const initial = resolveInitialWidgetIds(
    planItems.map((item) => ({ toolId: item.toolId, order: item.order })),
  );
  await insertWidgetPreferences(userId, initial, 0);
  await markWidgetsSeeded(userId);
  return listWidgetPreferences(userId);
}

export function useWidgetPreferences(userId: string | null) {
  return useQuery({
    queryKey: userId ? widgetKeys.list(userId) : ["widgets", "list", "anonymous"],
    queryFn: () => listOrSeed(userId!),
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
