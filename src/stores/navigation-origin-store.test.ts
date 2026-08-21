import fs from "node:fs";
import path from "node:path";

import {
  clearOrigin,
  peekOrigin,
  recordOrigin,
  useNavigationOriginStore,
} from "@/src/stores/navigation-origin-store";
import { stripComments } from "@/test/source-scan";

describe("navigation origin store", () => {
  beforeEach(() => {
    useNavigationOriginStore.setState({ pending: null });
  });

  it("hands the recorded Origin to the screen it was recorded for", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(peekOrigin("/notifications")).toBe("/modules/cbt");
  });

  it("reads null when nothing was recorded", () => {
    expect(peekOrigin("/notifications")).toBeNull();
  });

  it("offers nothing to a screen the Origin was not recorded for", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(peekOrigin("/settings")).toBeNull();
  });

  /**
   * The read is pure, and that is load-bearing rather than incidental. The
   * Escape peeks during render so it has its destination on the first paint; a
   * read that also cleared would be a side effect in render, and a render React
   * discards and retries would lose the Origin for good.
   */
  it("does not clear on read, however many times it is read", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    expect(peekOrigin("/notifications")).toBe("/modules/cbt");
    expect(peekOrigin("/notifications")).toBe("/modules/cbt");
    expect(useNavigationOriginStore.getState().pending).not.toBeNull();
  });

  /**
   * Clearing is what keeps the handoff to one arrival. Without it a plain
   * `forPathname` guard would still match when the user reaches the same screen
   * from the sidebar an hour later, and hand over a long-dead Origin (O4).
   */
  it("serves nothing after the clear, so the same Origin is never served twice", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });
    clearOrigin("/notifications");

    expect(peekOrigin("/notifications")).toBeNull();
    expect(useNavigationOriginStore.getState().pending).toBeNull();
  });

  /**
   * A clear from some other screen must not swallow the entry. The recording
   * call site pushes in the same handler, so the target is the next screen to
   * mount - but if any other chrome mounts in between, dropping the entry would
   * strand the arrival it was actually meant for.
   */
  it("leaves an undelivered Origin in place when another screen clears first", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });

    clearOrigin("/settings");

    expect(peekOrigin("/notifications")).toBe("/modules/cbt");
  });

  it("replaces a stale recording rather than queueing behind it", () => {
    recordOrigin({ origin: "/modules/cbt", forPathname: "/notifications" });
    recordOrigin({ origin: "/modules/act", forPathname: "/notifications" });

    expect(peekOrigin("/notifications")).toBe("/modules/act");
  });

  it("starts empty, so a cold arrival carries no Origin", () => {
    // What a web reload is (O7): a fresh module, nothing rehydrated. The Escape
    // falls back to Up, which is correct rather than merely tolerated - a reload
    // *is* a cold arrival.
    expect(useNavigationOriginStore.getInitialState().pending).toBeNull();
  });
});

/**
 * O2: the Origin exists precisely so that "which therapy module you were in"
 * never reaches the address bar or any storage the platform keeps.
 *
 * ⚠️ Asserting that a recorded value reads back out again does NOT show this -
 * that assertion passes unchanged if the store is wrapped in zustand's `persist`
 * with an AsyncStorage backend, which is exactly the thing forbidden here. So
 * the guard is on the module's own source: nothing in it may reach for a
 * persistence mechanism.
 *
 * The URL half of the same clause is pinned in `escape-origin.test.tsx`, which
 * asserts the helper pushes the caller's href unchanged - no Origin param added.
 *
 * ⚠️ Comments are stripped first. The store's own docblock names every mechanism
 * below in the course of explaining why it uses none of them, so a raw-text scan
 * fails on the prose that documents the rule.
 */
describe("the Origin is never persisted", () => {
  const source = stripComments(
    fs.readFileSync(path.join(__dirname, "navigation-origin-store.ts"), "utf8"),
  );

  it.each(["persist", "AsyncStorage", "SecureStore", "localStorage", "sessionStorage"])(
    "does not reach for %s",
    (mechanism) => {
      expect(source).not.toContain(mechanism);
    },
  );

  it("still defines the store, so the check above has a subject", () => {
    // The anti-vacuity floor: if this file were renamed or emptied, every
    // assertion above would pass by describing nothing.
    expect(source).toContain("create<NavigationOriginState>");
  });
});
