import { requireSupabase } from "@/src/lib/supabase";

/**
 * The viewer's frame, as the RPC wants it: minutes east of UTC, the same sign
 * convention `occurrenceTimeFromDate` captures with an occurrence.
 *
 * The server never resolves a day of its own — this is the client-passed frame
 * (the `program_widget_task_status` pattern), used only where a row captured no
 * offset and therefore names no day of its own.
 */
export function viewerOffsetMinutes(now = new Date()): number {
  return -now.getTimezoneOffset();
}

/**
 * Every civil day the viewer has any record on, across the whole product,
 * ascending, over all time (#1904).
 *
 * Deliberately an RPC rather than a fan-out over the per-tool list hooks: those
 * cap at 250 rows each, so over an all-time window the oldest days fall off the
 * cap and would render as absence on the one screen whose job is to state the
 * record truthfully. The function reads the record; it computes nothing about it.
 */
export async function listRecordDays(fallbackOffsetMinutes: number): Promise<string[]> {
  const client = requireSupabase();
  const { data, error } = await client.rpc("record_days", {
    p_fallback_offset_minutes: fallbackOffsetMinutes,
  });

  if (error) throw error;
  // PostgREST serialises a `setof text` as a flat JSON array of strings.
  return (data ?? []) as string[];
}
