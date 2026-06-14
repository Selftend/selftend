import type { WidgetPayload } from "@/src/features/widgets/snapshot-types";

export function resolveForToday(payload: WidgetPayload, currentDateKey: string): WidgetPayload {
  if (payload.kind !== "stat") return payload;
  if (!payload.dateKey || payload.dateKey === currentDateKey) return payload;
  return {
    ...payload,
    badge: null,
    stats: payload.stats.map((s) => (s.dateScoped ? { ...s, value: "-" } : s)),
  };
}
