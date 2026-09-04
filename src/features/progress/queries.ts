import { useQuery } from "@tanstack/react-query";

import { listRecordDays, viewerOffsetMinutes } from "@/src/features/progress/repository";

/**
 * The cache key carries the fallback offset as well as the user id, because the
 * RPC reads both.
 *
 * They move independently: the legacy tail (rows written before
 * 20260726_occurrence_offset_nullable, which captured no offset) is bucketed by
 * the frame passed in, so flying between zones changes the answer for those rows
 * while the user id does not move. Keying on the id alone would serve the
 * departure city's days after arrival. Extracted so that is testable without
 * rendering the hook.
 */
export function recordDaysKey(userId: string | null, offsetMinutes: number) {
  return ["progress", "record-days", userId ?? "anonymous", offsetMinutes] as const;
}

export function useRecordDays(userId: string | null, offsetMinutes = viewerOffsetMinutes()) {
  return useQuery({
    queryKey: recordDaysKey(userId, offsetMinutes),
    queryFn: () => listRecordDays(offsetMinutes),
    enabled: Boolean(userId),
  });
}
