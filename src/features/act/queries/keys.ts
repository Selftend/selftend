import type { ActionStatus } from "@/src/features/act/types";

export const u = (userId: string | null) => userId ?? "anonymous";

/**
 * Rows per page for every ACT archive read (#1517).
 *
 * ☠️ 20, not 50, and the difference is not cosmetic. The repo splits its page sizes by
 * history idiom: the **flat, newest-first** family pages at 20 (`BREATHING_`,
 * `GRATITUDE_`, `GROUNDING_`, `MEDITATION_HISTORY_PAGE_SIZE`) and the **day-sectioned**
 * family at 50 (`HABITS_`, `MOOD_`, `SLEEP_`), because a day section wants whole days in
 * one page. #1513 binds ACT to the flat family — ACT's nine tables carry no captured
 * occurrence offset, so a day heading here would name a day from a second frame and
 * reopen offset work across all nine. Taking 50 would quietly import the sectioned
 * family's sizing along with, sooner or later, its shape.
 */
export const ACT_HISTORY_PAGE_SIZE = 20;

/**
 * Home's one-row recency and count reads (#990) all hang off their tool's list key
 * rather than a sibling root, so the existing save/delete invalidations - which target
 * the list prefix - reach them without a single new invalidate call.
 *
 * ☠️ The `*HistoryPages` keys added by #1517 follow the same rule for the same reason,
 * and they are deliberately NOT the list hooks' own keys. An archive is a
 * `useInfiniteQuery` whose cached value is a `{ pages, pageParams }` envelope; the list
 * hooks cache a bare array. Sharing one entry between them hands whichever hook mounts
 * second the other's shape. Nesting under the list prefix keeps every existing
 * `invalidateQueries` reaching the archive, so a new entry still lands on page one
 * without a single new invalidate call.
 */
export const actKeys = {
  all: ["act"] as const,
  programState: (userId: string | null) => ["act", "programState", u(userId)] as const,
  defusionList: (userId: string | null) => ["act", "defusion", "list", u(userId)] as const,
  defusionHistoryPages: (userId: string | null) =>
    ["act", "defusion", "list", u(userId), "historyPages"] as const,
  defusionLatest: (userId: string | null) =>
    ["act", "defusion", "list", u(userId), "latest"] as const,
  defusionCount: (userId: string | null) =>
    ["act", "defusion", "list", u(userId), "count"] as const,
  defusionDetail: (userId: string | null, logId: string | null) =>
    ["act", "defusion", "detail", u(userId), u(logId)] as const,
  expansionList: (userId: string | null) => ["act", "expansion", "list", u(userId)] as const,
  expansionHistoryPages: (userId: string | null) =>
    ["act", "expansion", "list", u(userId), "historyPages"] as const,
  expansionLatest: (userId: string | null) =>
    ["act", "expansion", "list", u(userId), "latest"] as const,
  expansionDetail: (userId: string | null, logId: string | null) =>
    ["act", "expansion", "detail", u(userId), u(logId)] as const,
  urgeSurfList: (userId: string | null) => ["act", "urgeSurf", "list", u(userId)] as const,
  urgeSurfHistoryPages: (userId: string | null) =>
    ["act", "urgeSurf", "list", u(userId), "historyPages"] as const,
  urgeSurfDetail: (userId: string | null, logId: string | null) =>
    ["act", "urgeSurf", "detail", u(userId), u(logId)] as const,
  connectionList: (userId: string | null) => ["act", "connection", "list", u(userId)] as const,
  connectionHistoryPages: (userId: string | null) =>
    ["act", "connection", "list", u(userId), "historyPages"] as const,
  connectionLatest: (userId: string | null, technique: string) =>
    ["act", "connection", "list", u(userId), "latest", technique] as const,
  connectionDetail: (userId: string | null, logId: string | null) =>
    ["act", "connection", "detail", u(userId), u(logId)] as const,
  observingList: (userId: string | null) => ["act", "observing", "list", u(userId)] as const,
  observingHistoryPages: (userId: string | null) =>
    ["act", "observing", "list", u(userId), "historyPages"] as const,
  observingLatest: (userId: string | null) =>
    ["act", "observing", "list", u(userId), "latest"] as const,
  observingDetail: (userId: string | null, sessionId: string | null) =>
    ["act", "observing", "detail", u(userId), u(sessionId)] as const,
  valuesList: (userId: string | null) => ["act", "values", "list", u(userId)] as const,
  valueDomain: (userId: string | null, domain: string | null) =>
    ["act", "values", "domain", u(userId), u(domain)] as const,
  bullsEyeList: (userId: string | null) => ["act", "bullsEye", "list", u(userId)] as const,
  bullsEyeHistoryPages: (userId: string | null) =>
    ["act", "bullsEye", "list", u(userId), "historyPages"] as const,
  // Nested UNDER the list prefix on purpose (see the note above): the save mutation's
  // one non-exact invalidate then refreshes the values row's number as well as the
  // history, and a rating saved on the values screen moves the row above it without a
  // reload. On a sibling prefix it would go stale on the next write with nothing failing.
  bullsEyeLatest: (userId: string | null) =>
    ["act", "bullsEye", "list", u(userId), "latest"] as const,
  committedActionList: (userId: string | null, status?: ActionStatus) =>
    ["act", "committedAction", "list", u(userId), status] as const,
  // Prefix matcher used by mutations to invalidate every status filter at once.
  committedActionListPrefix: (userId: string | null) =>
    ["act", "committedAction", "list", u(userId)] as const,
  // The finished half only (completed + abandoned). The active section stays on the
  // unbounded `committedActionList(userId, "active")` read — #1517 split the screen's
  // fetch by status rather than flattening its three sections into one keyset page.
  committedActionArchivePages: (userId: string | null) =>
    ["act", "committedAction", "list", u(userId), "archivePages"] as const,
  // `status` may be undefined - that is ACT home's lifetime count, and it is a distinct
  // cache entry from any single status's, not a wider read of the same one (#1378).
  committedActionCount: (userId: string | null, status?: ActionStatus) =>
    ["act", "committedAction", "list", u(userId), status, "count"] as const,
  committedActionDetail: (userId: string | null, actionId: string | null) =>
    ["act", "committedAction", "detail", u(userId), u(actionId)] as const,
  actionStepList: (userId: string | null, actionId: string | null) =>
    ["act", "actionStep", "list", u(userId), u(actionId)] as const,
  actionStepAll: (userId: string | null) => ["act", "actionStep", "all", u(userId)] as const,
  choicePointList: (userId: string | null) => ["act", "choicePoint", "list", u(userId)] as const,
  choicePointHistoryPages: (userId: string | null) =>
    ["act", "choicePoint", "list", u(userId), "historyPages"] as const,
  // Under the list prefix, like `choicePointLatest`, so every choice-point mutation's
  // existing list invalidation refreshes the count too.
  choicePointCount: (userId: string | null) =>
    ["act", "choicePoint", "list", u(userId), "count"] as const,
  choicePointLatest: (userId: string | null) =>
    ["act", "choicePoint", "list", u(userId), "latest"] as const,
  choicePointDetail: (userId: string | null, id: string | null) =>
    ["act", "choicePoint", "detail", u(userId), u(id)] as const,
};
