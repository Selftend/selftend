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
