import { actKeys } from "@/src/features/act/queries/keys";

describe("actKeys", () => {
  it("namespaces by user id", () => {
    expect(actKeys.defusionList("u1")).toEqual(["act", "defusion", "list", "u1"]);
  });

  it("falls back to 'anonymous' for a null user", () => {
    expect(actKeys.defusionList(null)).toEqual(["act", "defusion", "list", "anonymous"]);
    expect(actKeys.defusionDetail(null, null)).toEqual([
      "act",
      "defusion",
      "detail",
      "anonymous",
      "anonymous",
    ]);
  });

  /**
   * Every count key sits UNDER its list prefix, so the list invalidation each mutation
   * already runs refreshes the count with it. A count on a sibling prefix would go stale
   * the moment a user added a row and nothing would fail (#1378).
   */
  it("nests the count keys under the list prefix their mutations invalidate", () => {
    const isPrefixOf = (prefix: readonly unknown[], key: readonly unknown[]) =>
      prefix.every((part, i) => key[i] === part);

    expect(isPrefixOf(actKeys.choicePointList("u1"), actKeys.choicePointCount("u1"))).toBe(true);
    expect(isPrefixOf(actKeys.defusionList("u1"), actKeys.defusionCount("u1"))).toBe(true);
    expect(
      isPrefixOf(actKeys.committedActionListPrefix("u1"), actKeys.committedActionCount("u1")),
    ).toBe(true);
  });

  it("keeps the lifetime committed-action count apart from a single status's", () => {
    expect(actKeys.committedActionCount("u1")).not.toEqual(
      actKeys.committedActionCount("u1", "active"),
    );
  });

  it("includes the status filter for committed-action lists", () => {
    expect(actKeys.committedActionList("u1", "active")).toEqual([
      "act",
      "committedAction",
      "list",
      "u1",
      "active",
    ]);
    expect(actKeys.committedActionList("u1")).toEqual([
      "act",
      "committedAction",
      "list",
      "u1",
      undefined,
    ]);
  });
});
