import { useMemo } from "react";

import { useAddWidget, useRemoveWidget, useWidgetPreferences } from "@/src/features/home/queries";

export function useWidgetToggle(userId: string | null) {
  const { data: preferences } = useWidgetPreferences(userId);
  const addMutation = useAddWidget(userId);
  const removeMutation = useRemoveWidget(userId);

  const addedIds = useMemo(
    () => new Set((preferences ?? []).map((p) => p.widgetId)),
    [preferences],
  );

  return useMemo(
    () => ({
      isAdded: (id: string) => addedIds.has(id),
      add: (id: string) => {
        if (!addedIds.has(id)) addMutation.mutate(id);
      },
      remove: (id: string) => {
        if (addedIds.has(id)) removeMutation.mutate(id);
      },
      toggle: (id: string) =>
        addedIds.has(id) ? removeMutation.mutate(id) : addMutation.mutate(id),
    }),
    [addedIds, addMutation, removeMutation],
  );
}
