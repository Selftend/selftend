import { isDatedRoute } from "@/src/features/navigation/dated-routes";

describe("isDatedRoute", () => {
  it.each([
    "/",
    "/modules/cbt",
    "/tools/mood-tracker",
    "/tools/mood-tracker/new",
    "/tools/sleep",
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
  ])("is dated: %s", (p) => expect(isDatedRoute(p)).toBe(true));

  it.each([
    "/(tabs)/settings",
    "/modules/cbt/goals",
    "/modules/cbt/values",
    "/modules/cbt/beliefs",
    "/modules/cbt/recovery",
    "/tools/breathing",
    "/tools/meditation",
    "/tools/habits/history", // full chronological log, not a single-day view
    "/tools/mood-tracker/abc-123", // per-entry detail
    "/tools/mood-tracker/abc-123/edit", // per-entry edit
    "/modules/cbt/history/abc-123", // record detail
    "/legal",
    "/support",
  ])("is NOT dated: %s", (p) => expect(isDatedRoute(p)).toBe(false));
});
