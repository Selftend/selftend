import { useQuery } from "@tanstack/react-query";

import { requireSupabase } from "@/src/lib/supabase";
import { localDateKey } from "@/src/utils/date";

export interface ProgramTaskStatus {
  taskKey: string;
  done: boolean;
}

interface ProgramTaskStatusRow {
  task_key: string;
  done: boolean;
}

/**
 * The viewer's current day, in the two forms the RPC needs.
 *
 * `key` buckets the legs whose table captured a civil day at logging time; the
 * `start`/`end` instants still bucket the legs that have no captured offset to
 * read, and double as the fallback for rows where the offset was never recorded
 * (#414, #330).
 */
export function currentLocalDayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString(), key: localDateKey(now) };
}

export async function getProgramWidgetTaskStatus(
  module: "cbt" | "act",
  dayStart: string,
  dayEnd: string,
  dayKey: string,
): Promise<ProgramTaskStatus[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("program_widget_task_status", {
    p_module: module,
    p_day_start: dayStart,
    p_day_end: dayEnd,
    p_day_key: dayKey,
  });
  if (error) throw error;
  return ((data ?? []) as ProgramTaskStatusRow[]).map((row) => ({
    taskKey: row.task_key,
    done: row.done,
  }));
}

/**
 * The cache key, carrying EVERY input the RPC reads - the day key and both
 * bounds, not the day key alone.
 *
 * They move independently. Fly Tokyo to London on the same calendar date and
 * `key` is unchanged while `start` and `end` shift by nine hours; the RPC still
 * uses those bounds for every task whose tool has no captured offset, so a key
 * of `key` alone serves Tokyo's answer for London's day. Extracted so that
 * invariant is testable without rendering the hook.
 */
export function programWidgetStatusKey(
  userId: string,
  module: "cbt" | "act",
  dayRange: { key: string; start: string; end: string },
) {
  return ["program-widget-status", userId, module, dayRange.key, dayRange.start, dayRange.end];
}

export function useProgramWidgetTaskStatus({
  userId,
  module,
  enabled,
}: {
  userId: string;
  module: "cbt" | "act";
  enabled: boolean;
}) {
  const dayRange = currentLocalDayRange();
  return useQuery({
    queryKey: programWidgetStatusKey(userId, module, dayRange),
    queryFn: () => getProgramWidgetTaskStatus(module, dayRange.start, dayRange.end, dayRange.key),
    enabled,
  });
}
