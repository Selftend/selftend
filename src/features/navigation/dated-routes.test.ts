import { isDatedRoute } from "@/src/features/navigation/dated-routes";

describe("isDatedRoute", () => {
  it.each([
    "/",
    "/modules/act",
    "/modules/cbt",
    "/tools/mood-tracker",
    "/tools/mood-tracker/new",
    "/tools/sleep/new",
    "/tools/gratitude-log",
    "/tools/gratitude-log/new",
    "/tools/gratitude-log/entries",
    "/tools/journal",
    "/tools/journal/new",
    "/tools/habits",
    "/tools/habits/abc-123/log",
    "/modules/cbt/self-care",
    "/modules/cbt/new",
    "/modules/cbt/history",
    "/modules/cbt/anger",
    "/modules/cbt/anger/new",
    "/modules/cbt/worry",
    "/modules/cbt/worry/new",
    "/modules/act/defusion",
    "/modules/act/expansion",
    "/modules/act/connection",
    "/modules/act/observing-self",
    "/modules/act/choice-point",
  ])("is dated: %s", (p) => expect(isDatedRoute(p)).toBe(true));

  it.each([
    "/settings",
    "/modules/cbt/goals",
    "/modules/cbt/values",
    "/modules/cbt/beliefs",
    "/modules/cbt/recovery",
    "/modules/act/committed-action", // long-lived commitments structure
    "/modules/act/values", // long-lived values structure
    "/tools/breathing",
    "/tools/meditation",
    "/tools/sleep", // date-agnostic landing - shows all entries, not a single-day view
    "/tools/habits/history", // full chronological log, not a single-day view
    "/tools/mood-tracker/abc-123", // per-entry detail
    "/tools/mood-tracker/abc-123/edit", // per-entry edit
    "/modules/cbt/history/abc-123", // record detail
    "/legal",
    "/support",
  ])("is NOT dated: %s", (p) => expect(isDatedRoute(p)).toBe(false));
});
