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

  // ☠️ The values row's number comes from `bullsEyeLatest`, and the save mutation
  // invalidates `bullsEyeList` only. That is enough ONLY while the latest key is a
  // descendant of the list key - `invalidateQueries` matches by prefix. Move it to a
  // sibling and the row keeps showing the pre-save number after a save, with nothing
  // failing anywhere.
  it("nests the latest-per-domain bulls-eye key under the list key it is invalidated by", () => {
    const list = actKeys.bullsEyeList("u1");
    const latest = actKeys.bullsEyeLatest("u1");

    expect(latest.slice(0, list.length)).toEqual([...list]);
    expect(latest.length).toBeGreaterThan(list.length);
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

  /**
   * ☠️ Every archive key sits UNDER the list prefix its tool's mutations already
   * invalidate (#1517). ACT's save and delete mutations invalidate the list prefix and
   * nothing else — move an archive key to a sibling root and a user who writes an entry
   * watches the archive they are looking at not gain it, with nothing failing anywhere.
   * That is the same failure `bullsEyeLatest` is pinned against above, on a surface
   * whose entire job is being the complete record.
   */
  it("nests every archive-page key under the list prefix its mutations invalidate", () => {
    const isPrefixOf = (prefix: readonly unknown[], key: readonly unknown[]) =>
      prefix.every((part, i) => key[i] === part) && key.length > prefix.length;

    const pairs = [
      [actKeys.defusionList("u1"), actKeys.defusionHistoryPages("u1")],
      [actKeys.expansionList("u1"), actKeys.expansionHistoryPages("u1")],
      [actKeys.connectionList("u1"), actKeys.connectionHistoryPages("u1")],
      [actKeys.observingList("u1"), actKeys.observingHistoryPages("u1")],
      [actKeys.choicePointList("u1"), actKeys.choicePointHistoryPages("u1")],
      [actKeys.urgeSurfList("u1"), actKeys.urgeSurfHistoryPages("u1")],
      [actKeys.bullsEyeList("u1"), actKeys.bullsEyeHistoryPages("u1")],
      [actKeys.committedActionListPrefix("u1"), actKeys.committedActionArchivePages("u1")],
    ] as const;

    for (const [list, archive] of pairs) {
      expect(isPrefixOf(list, archive)).toBe(true);
    }
  });

  /**
   * ☠️ An archive is a `useInfiniteQuery`: its cache entry is a `{ pages, pageParams }`
   * envelope, while the list hooks cache a bare array. Collapse the two keys onto one
   * entry and whichever mounts second reads the other's shape — the limit-key collision
   * (#1516) in a worse costume, because there the two callers at least agreed on the type.
   */
  it("keeps each archive key distinct from the list key it hangs under", () => {
    expect(actKeys.defusionHistoryPages("u1")).not.toEqual(actKeys.defusionList("u1"));
    expect(actKeys.committedActionArchivePages("u1")).not.toEqual(
      actKeys.committedActionList("u1", "active"),
    );
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
