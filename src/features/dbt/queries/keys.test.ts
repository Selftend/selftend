import { dbtKeys } from "./keys";

/**
 * Every count and archive key nests UNDER its tool's list prefix, so the one
 * invalidation a save or delete performs reaches the list, the pages and the
 * module home's two stats (ACT's rule, kept here for the same reason).
 */
describe("dbtKeys", () => {
  const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
    prefix.every((part, index) => key[index] === part);

  it.each([
    ["sessionCount", dbtKeys.sessionCount("u"), dbtKeys.sessionList("u")],
    ["wiseMindCount", dbtKeys.wiseMindCount("u"), dbtKeys.wiseMindList("u")],
    ["wiseMindHistoryPages", dbtKeys.wiseMindHistoryPages("u"), dbtKeys.wiseMindList("u")],
    ["judgementCount", dbtKeys.judgementCount("u"), dbtKeys.judgementList("u")],
    ["judgementHistoryPages", dbtKeys.judgementHistoryPages("u"), dbtKeys.judgementList("u")],
    ["emotionRecordCount", dbtKeys.emotionRecordCount("u"), dbtKeys.emotionRecordList("u")],
    [
      "emotionRecordHistoryPages",
      dbtKeys.emotionRecordHistoryPages("u"),
      dbtKeys.emotionRecordList("u"),
    ],
    ["oppositeActionCount", dbtKeys.oppositeActionCount("u"), dbtKeys.oppositeActionList("u")],
    [
      "oppositeActionHistoryPages",
      dbtKeys.oppositeActionHistoryPages("u"),
      dbtKeys.oppositeActionList("u"),
    ],
    ["scriptCount", dbtKeys.scriptCount("u"), dbtKeys.scriptList("u")],
    ["scriptHistoryPages", dbtKeys.scriptHistoryPages("u"), dbtKeys.scriptList("u")],
  ])("%s nests under its list prefix", (_name, key, prefix) => {
    expect(startsWith(key, prefix)).toBe(true);
    expect(key.length).toBeGreaterThan(prefix.length);
  });

  it("scopes every key to the user, with a stable stand-in for a signed-out reader", () => {
    expect(dbtKeys.copingPlan(null)).toEqual(["dbt", "copingPlan", "anonymous"]);
    expect(dbtKeys.scriptDetail("u", null)).toEqual(["dbt", "scripts", "detail", "u", "anonymous"]);
  });

  it("keeps the detail keys OUTSIDE the list prefix, so a list refresh does not refetch every open detail", () => {
    expect(startsWith(dbtKeys.scriptDetail("u", "id"), dbtKeys.scriptList("u"))).toBe(false);
  });
});
