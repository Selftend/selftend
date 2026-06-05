import type { Snapshot } from "@/src/features/widgets/snapshot-types";

export function changedWidgetIds(prev: Snapshot | null, next: Snapshot): string[] {
  const ids: string[] = [];
  for (const id of Object.keys(next.widgets)) {
    const before = prev?.widgets[id];
    if (!before || JSON.stringify(before) !== JSON.stringify(next.widgets[id])) ids.push(id);
  }
  return ids;
}
