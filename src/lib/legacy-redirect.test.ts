import { withSearchParams } from "@/src/lib/legacy-redirect";

describe("withSearchParams", () => {
  it("returns the path unchanged when there is nothing to forward", () => {
    expect(withSearchParams("/tools/check-in", {})).toBe("/tools/check-in");
  });

  it("forwards the launcher widget's score", () => {
    expect(withSearchParams("/tools/check-in/new", { score: "4" })).toBe(
      "/tools/check-in/new?score=4",
    );
  });

  it("forwards several params in order", () => {
    expect(
      withSearchParams("/tools/check-in/new", {
        linkedStrategy: "behavioral-activation",
        completeActivityId: "activity-1",
      }),
    ).toBe(
      "/tools/check-in/new?linkedStrategy=behavioral-activation&completeActivityId=activity-1",
    );
  });

  it("omits the dynamic path segments it is told to", () => {
    expect(withSearchParams("/tools/check-in/log-1", { id: "log-1", from: "widget" }, ["id"])).toBe(
      "/tools/check-in/log-1?from=widget",
    );
  });

  it("drops an omitted param even when it is the only one", () => {
    expect(withSearchParams("/tools/check-in/log-1", { id: "log-1" }, ["id"])).toBe(
      "/tools/check-in/log-1",
    );
  });

  it("repeats a key that arrived as an array", () => {
    expect(withSearchParams("/tools/check-in", { tag: ["a", "b"] })).toBe(
      "/tools/check-in?tag=a&tag=b",
    );
  });

  it("skips undefined values rather than forwarding the string 'undefined'", () => {
    expect(withSearchParams("/tools/check-in", { score: undefined, note: "hi" })).toBe(
      "/tools/check-in?note=hi",
    );
  });

  // React Native's built-in URLSearchParams joins pairs WITHOUT encoding them,
  // which is why this is hand-rolled. A value carrying `&` would otherwise split
  // into two params and silently corrupt whatever followed.
  it("percent-encodes keys and values", () => {
    expect(withSearchParams("/tools/check-in", { "a b": "x&y=z" })).toBe(
      "/tools/check-in?a%20b=x%26y%3Dz",
    );
  });
});
