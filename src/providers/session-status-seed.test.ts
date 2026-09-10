import { seedSessionStatus } from "@/src/providers/session-status-seed";

describe("seedSessionStatus (#2293)", () => {
  it("waits for the stored session in a browser with a client", () => {
    expect(seedSessionStatus({ hasClient: true, hasWindow: true })).toBe("loading");
  });

  // The static export: Node has no window and can have no session, and a
  // "loading" seed there would write the spinner into dist/index.html.
  it("starts ready at export, where there is no window", () => {
    expect(seedSessionStatus({ hasClient: true, hasWindow: false })).toBe("ready");
  });

  it("starts ready without a client, wherever it runs", () => {
    expect(seedSessionStatus({ hasClient: false, hasWindow: true })).toBe("ready");
    expect(seedSessionStatus({ hasClient: false, hasWindow: false })).toBe("ready");
  });
});
