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
