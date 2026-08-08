import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  countMoodLogs,
  deleteMoodLog,
  getFirstMoodDayKey,
  getMoodLog,
  listMoodLogs,
  listMoodLogsInDayRange,
  listMoodLogsPage,
  listMoodScorePoints,
  saveMoodLog,
} from "@/src/features/mood/repository";
import type { MoodInput } from "@/src/features/mood/types";
import { addDaysToKey } from "@/src/utils/date";
import { useDeleteMutation } from "@/src/lib/use-delete-mutation";
import { requestReminderPrompt } from "@/src/stores/reminder-prompt-store";

const moodKeys = {
  all: ["mood"] as const,
  list: (userId: string, limit: number) => ["mood", "list", userId, limit] as const,
  history: (userId: string) => ["mood", "history", userId] as const,
  historyPages: (userId: string) => ["mood", "historyPages", userId] as const,
  detail: (userId: string, id: string) => ["mood", "detail", userId, id] as const,
  count: (userId: string) => ["mood", "count", userId] as const,
  scorePoints: (userId: string, fromIso: string, toIso?: string) =>
    ["mood", "scorePoints", userId, fromIso, toIso ?? ""] as const,
  week: (userId: string, weekStartKey: string) => ["mood", "week", userId, weekStartKey] as const,
  firstLogDate: (userId: string) => ["mood", "firstLogDate", userId] as const,
};

export function useMoodLogs(userId: string | null, limit = 30) {
  return useQuery({
    queryKey: userId ? moodKeys.list(userId, limit) : ["mood", "list", "anonymous", limit],
    queryFn: () => listMoodLogs(userId!, limit),
    enabled: Boolean(userId),
  });
}

// Canonical recent-history window. The CBT and progress/tracker screens previously kept
// two SEPARATE large queries (180 and 200 rows) over the same table, so cold navigation
// fetched both and a single mood save refetched both (#60). Consolidate them into one cache
// entry sized to the largest window and let each screen narrow with `select` - slicing the
// newest N is identical to fetching N (both are logged_at desc, limit N). The small 30-row
// widget/tool/editor queries already share a single key and stay on useMoodLogs.
const MOOD_HISTORY_WINDOW = 200;
export function useMoodHistory(userId: string | null, take: number = MOOD_HISTORY_WINDOW) {
  return useQuery({
    queryKey: userId ? moodKeys.history(userId) : ["mood", "history", "anonymous"],
    queryFn: () => listMoodLogs(userId!, MOOD_HISTORY_WINDOW),
    select: (logs) => (take >= MOOD_HISTORY_WINDOW ? logs : logs.slice(0, take)),
    enabled: Boolean(userId),
  });
}

/**
 * Page size for the all-history screen. Large enough that a first page fills
 * several screens of ~72px rows, small enough that the first paint doesn't pay
 * to decrypt a year of entries — every returned row decrypts all five encrypted
 * columns whatever the projection, because `app.decrypt_text` is VOLATILE (#693).
 */
export const MOOD_HISTORY_PAGE_SIZE = 50;

/**
 * The unbounded history, one page at a time — the app's first paged query (#696).
 *
 * Every other history in the product is a single capped fetch with a silent
 * ceiling (mood 200, habits 365, meditation 100). A screen called *all history*
 * that stops at 200 is a lie, so this one keeps asking instead.
 *
 * The key sits under the `mood` root like every other, so a save or delete still
 * invalidates it with the rest — TanStack refetches the loaded pages, which is
 * also what keeps offset paging honest after a row is inserted or removed.
 */
export function useMoodHistoryPages(userId: string | null) {
  return useInfiniteQuery({
    queryKey: userId ? moodKeys.historyPages(userId) : ["mood", "historyPages", "anonymous"],
    queryFn: ({ pageParam }) => listMoodLogsPage(userId!, MOOD_HISTORY_PAGE_SIZE, pageParam),
    initialPageParam: 0,
    // A short page is the end of the data. A full one may or may not be, so ask
    // again: one empty round trip at the exact boundary beats stopping early.
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < MOOD_HISTORY_PAGE_SIZE ? undefined : lastPageParam + MOOD_HISTORY_PAGE_SIZE,
    enabled: Boolean(userId),
  });
}

// Trend-window query: only timestamp/offset/score come over the wire and there is
// no row limit, so the 200-row history cache is not the trend's ceiling. Lives
// under the "mood" root key, so every save invalidates it with the rest.
export function useMoodScorePoints(userId: string | null, fromIso: string, toIso?: string) {
  return useQuery({
    queryKey: userId
      ? moodKeys.scorePoints(userId, fromIso, toIso)
      : ["mood", "scorePoints", "anonymous", fromIso, toIso ?? ""],
    queryFn: () => listMoodScorePoints(userId!, fromIso, toIso),
    enabled: Boolean(userId),
  });
}

/**
 * The displayed week's check-ins, plus the week before it (#736, decided on #697).
 *
 * Fourteen days rather than seven, because the week-over-week delta has to be
 * correct at **every** offset, not only the current week — one fetch feeds the
 * strip, the average, the delta, "felt most often" and the day panel's rows.
 * There is deliberately no per-day fetch: the panel is a filter over a week the
 * screen already holds.
 *
 * Keyed per week so paging is cached — walking back and forward re-reads nothing
 * — and rooted under `mood` like every other key, so a save or delete still
 * invalidates it with the rest. Cost is 14–40 rows a week, small enough that
 * #693's decrypt-everything projection cost barely registers.
 */
export function useMoodWeek(userId: string | null, weekStartKey: string, previousStartKey: string) {
  return useQuery({
    queryKey: userId
      ? moodKeys.week(userId, weekStartKey)
      : ["mood", "week", "anonymous", weekStartKey],
    queryFn: () => listMoodLogsInDayRange(userId!, previousStartKey, addDaysToKey(weekStartKey, 6)),
    enabled: Boolean(userId),
  });
}

/** Earliest logged civil day — the lower clamp for the custom trend range picker. */
export function useFirstMoodDayKey(userId: string | null) {
  return useQuery({
    queryKey: userId ? moodKeys.firstLogDate(userId) : ["mood", "firstLogDate", "anonymous"],
    queryFn: () => getFirstMoodDayKey(userId!),
    enabled: Boolean(userId),
  });
}

export function useMoodLog(userId: string | null, id: string | null) {
  return useQuery({
    queryKey:
      userId && id ? moodKeys.detail(userId, id) : ["mood", "detail", "anonymous", id ?? ""],
    queryFn: () => getMoodLog(userId!, id!),
    enabled: Boolean(userId && id),
  });
}

export function useMoodLogCount(userId: string | null) {
  return useQuery({
    queryKey: userId ? moodKeys.count(userId) : ["mood", "count", "anonymous"],
    queryFn: () => countMoodLogs(userId!),
    enabled: Boolean(userId),
  });
}

export function useDeleteMoodLog(userId: string | null) {
  return useDeleteMutation(userId, deleteMoodLog, moodKeys.all);
}

export function useSaveMoodLog(userId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, moodLogId }: { input: MoodInput; moodLogId?: string }) =>
      saveMoodLog(userId!, input, moodLogId),
    meta: { suppressGlobalErrorToast: true }, // screen shows its own save-error toast
    onSuccess: async (_data, { moodLogId }) => {
      if (!moodLogId) requestReminderPrompt("mood");
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: moodKeys.all });
    },
  });
}
