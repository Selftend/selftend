import { useQuery, type QueryClient } from "@tanstack/react-query";

import { groundingSlugs } from "@/src/constants/grounding";
import { fetchHomeToolStats } from "@/src/features/home/tool-stats-repository";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { deviceTimeZone } from "@/src/utils/date";

/**
 * ☠️ This root is reached from every write path in the app that can change a Home
 * tool card's figures - see `invalidateHomeToolStats` below.
 *
 * ADR-0001 keeps a stats query under the same query-key root as the list it
 * summarises, so the owning feature's save and delete invalidation reaches both.
 * That cannot apply here, for the reason it cannot apply to `record_days`:
 * `home_tool_stats` spans eight tools and seven tables, so it has no owning feature
 * and sits under its own root.
 */
export const homeToolStatsKeys = {
  all: ["home", "tool-stats"] as const,
  /**
   * The key carries everything the RPC reads besides the user: the viewer's zone
   * (rows that captured no offset are bucketed by it, so flying between zones
   * changes the answer) and the day Home is describing (the week and "today"
   * windows move with it at midnight). Extracted so that is testable without
   * rendering the hook.
   */
  forViewer: (userId: string | null, timeZone: string, dayKey: string) =>
    [...homeToolStatsKeys.all, userId ?? "anonymous", timeZone, dayKey] as const,
};

/**
 * Mark every frame's Home stats stale.
 *
 * ☠️ **Called from each write path of the seven tables the RPC reads, and it has to
 * stay that way.** With the client's 60s default `staleTime`, a person who logs a
 * check-in and comes back to Home would see the card's old figure until the entry
 * went stale - and Home is mounted behind every tool, so a refetch-on-mount would
 * not cover it either.
 *
 * The seven tables are the ones `home_tool_stats` reads, listed in
 * `20260913000000_home_tool_stats.sql`: check-ins, journal, gratitude, mindfulness
 * (breathing AND grounding), meditation, sleep, and habits with their ticks.
 *
 * ☠️ **The rule is deliberately coarse, exactly as `invalidateRecordDays`' is: ANY
 * mutation writing one of those tables invalidates, whether or not that particular
 * edit could move a figure.** Deciding per mutation is the judgement that rots.
 * Over-invalidating costs one refetch of one small query; a stale card costs a
 * wrong number on the first screen. `test/home-tool-stats-invalidation.test.ts`
 * enforces it per hook, deriving the tables from the migration rather than from a
 * list here.
 *
 * A function rather than a key literal, so a new tool has one thing to copy. The
 * deletes that run through `useDeleteMutation` are the exception: that helper takes
 * keys rather than a client, so they pass `homeToolStatsKeys.all` itself. Both reach
 * the same root, which is what the guard test pins.
 */
export function invalidateHomeToolStats(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: homeToolStatsKeys.all });
}

/**
 * The one query behind every tool card's stat line (#2212).
 *
 * Eight cards mount this hook; they are eight observers of ONE cache entry, so Home
 * issues one request for its stats rather than the fifteen the per-tool hooks cost.
 * `userId` only gates and scopes the cache, as it does for every aggregate hook: the
 * RPC reads `auth.uid()` itself.
 */
export function useHomeToolStats(userId: string | null) {
  const timeZone = deviceTimeZone();
  const { selectedDate } = useSelectedDate();
  return useQuery({
    queryKey: homeToolStatsKeys.forViewer(userId, timeZone, selectedDate),
    queryFn: () =>
      fetchHomeToolStats({ timeZone, dayKey: selectedDate, groundingNames: groundingSlugs }),
    enabled: Boolean(userId),
  });
}
