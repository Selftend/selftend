import {
  consumeOrigin,
  recordOrigin,
  useNavigationOriginStore,
} from "@/src/stores/navigation-origin-store";

describe("navigation origin store", () => {
  beforeEach(() => {
    useNavigationOriginStore.setState({ pending: null });
  });

  it("hands the recorded Origin to the screen it was recorded for", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(consumeOrigin("/notifications")).toBe("/modules/cbt");
  });

  /**
   * The clearing read is the whole mechanism, not an optimisation. A plain
   * `forPathname` guard is not enough: it would still match when the user
   * reaches the same screen from the sidebar later, and hand over a long-dead
   * Origin (#1261, O4).
   */
  it("clears on read, so the same Origin is never served twice", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(consumeOrigin("/notifications")).toBe("/modules/cbt");
    expect(consumeOrigin("/notifications")).toBeNull();
  });

  it("reads null when nothing was recorded", () => {
    expect(consumeOrigin("/notifications")).toBeNull();
  });

  it("offers nothing to a screen the Origin was not recorded for", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(consumeOrigin("/settings")).toBeNull();
  });

  /**
   * A mismatched read must not clear. The recording call site pushes in the same
   * handler, so the target is the next screen to mount - but if some other
   * chrome mounts in between, swallowing the entry would strand the arrival that
   * the Origin was actually meant for.
   */
  it("leaves an undelivered Origin in place when another screen reads first", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(consumeOrigin("/settings")).toBeNull();
    expect(consumeOrigin("/notifications")).toBe("/modules/cbt");
  });

  it("replaces a stale recording rather than queueing behind it", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });
    recordOrigin({ origin: "/modules/act", forPathname: "/notifications" });

    expect(consumeOrigin("/notifications")).toBe("/modules/act");
  });

  /**
   * O2: the Origin exists precisely so that "which therapy module you were in"
   * never reaches the address bar or any persisted store. Nothing here writes to
   * one, and this asserts the store keeps its value in the module only.
   */
  it("keeps the Origin in memory alone", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/cbt",
      forPathname: "/notifications",
    });
  });
});
