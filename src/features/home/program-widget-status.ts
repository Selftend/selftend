import { useQuery } from "@tanstack/react-query";

import { requireSupabase } from "@/src/lib/supabase";

export interface ProgramTaskStatus {
  taskKey: string;
  done: boolean;
}

interface ProgramTaskStatusRow {
  task_key: string;
  done: boolean;
}

export function currentLocalDayRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getProgramWidgetTaskStatus(
  module: "cbt" | "act",
  dayStart: string,
  dayEnd: string,
): Promise<ProgramTaskStatus[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("program_widget_task_status", {
    p_module: module,
    p_day_start: dayStart,
    p_day_end: dayEnd,
  });
  if (error) throw error;
  return ((data ?? []) as ProgramTaskStatusRow[]).map((row) => ({
    taskKey: row.task_key,
    done: row.done,
  }));
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
    queryKey: ["program-widget-status", userId, module, dayRange.start],
    queryFn: () => getProgramWidgetTaskStatus(module, dayRange.start, dayRange.end),
    enabled,
  });
}
