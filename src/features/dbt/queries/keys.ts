export const u = (userId: string | null) => userId ?? "anonymous";

/**
 * Rows per page for every DBT history read. DBT rows are captured-day (unlike
 * ACT's), but the lists are flat and newest-first in the first slice, so they
 * take the flat family's 20 (see `ACT_HISTORY_PAGE_SIZE` for the split).
 */
export const DBT_HISTORY_PAGE_SIZE = 20;

/**
 * Every count, latest and archive key nests UNDER its tool's list prefix, so one
 * `invalidateQueries` on the prefix reaches the list, the pages, the count and
 * the home's two stats without a second call (ACT's rule, `actKeys`).
 */
export const dbtKeys = {
  all: ["dbt"] as const,
  copingPlan: (userId: string | null) => ["dbt", "copingPlan", u(userId)] as const,
  sessionList: (userId: string | null) => ["dbt", "sessions", "list", u(userId)] as const,
  sessionCount: (userId: string | null) => ["dbt", "sessions", "list", u(userId), "count"] as const,
  wiseMindList: (userId: string | null) => ["dbt", "wiseMind", "list", u(userId)] as const,
  wiseMindHistoryPages: (userId: string | null) =>
    ["dbt", "wiseMind", "list", u(userId), "historyPages"] as const,
  wiseMindCount: (userId: string | null) =>
    ["dbt", "wiseMind", "list", u(userId), "count"] as const,
  wiseMindDetail: (userId: string | null, id: string | null) =>
    ["dbt", "wiseMind", "detail", u(userId), u(id)] as const,
  judgementList: (userId: string | null) => ["dbt", "judgements", "list", u(userId)] as const,
  judgementHistoryPages: (userId: string | null) =>
    ["dbt", "judgements", "list", u(userId), "historyPages"] as const,
  judgementCount: (userId: string | null) =>
    ["dbt", "judgements", "list", u(userId), "count"] as const,
  judgementDetail: (userId: string | null, id: string | null) =>
    ["dbt", "judgements", "detail", u(userId), u(id)] as const,
  emotionRecordList: (userId: string | null) => ["dbt", "emotions", "list", u(userId)] as const,
  emotionRecordHistoryPages: (userId: string | null) =>
    ["dbt", "emotions", "list", u(userId), "historyPages"] as const,
  emotionRecordCount: (userId: string | null) =>
    ["dbt", "emotions", "list", u(userId), "count"] as const,
  emotionRecordDetail: (userId: string | null, id: string | null) =>
    ["dbt", "emotions", "detail", u(userId), u(id)] as const,
  oppositeActionList: (userId: string | null) =>
    ["dbt", "oppositeAction", "list", u(userId)] as const,
  oppositeActionHistoryPages: (userId: string | null) =>
    ["dbt", "oppositeAction", "list", u(userId), "historyPages"] as const,
  oppositeActionCount: (userId: string | null) =>
    ["dbt", "oppositeAction", "list", u(userId), "count"] as const,
  oppositeActionDetail: (userId: string | null, id: string | null) =>
    ["dbt", "oppositeAction", "detail", u(userId), u(id)] as const,
  scriptList: (userId: string | null) => ["dbt", "scripts", "list", u(userId)] as const,
  scriptHistoryPages: (userId: string | null) =>
    ["dbt", "scripts", "list", u(userId), "historyPages"] as const,
  scriptCount: (userId: string | null) => ["dbt", "scripts", "list", u(userId), "count"] as const,
  scriptDetail: (userId: string | null, id: string | null) =>
    ["dbt", "scripts", "detail", u(userId), u(id)] as const,
};
