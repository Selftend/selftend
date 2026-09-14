import { scrollNodeToTop } from "@/src/lib/scroll-node-to-top";

/**
 * The web half of the patterns fold's landing position (#2350).
 *
 * ☠️ This suite runs under the `ios` jest project, where a `View` ref is a
 * native handle and `scrollIntoView` does not exist - which is exactly the
 * branch asserted below. The web branch is exercised with a stand-in node here
 * and for real in `create-thought-record.e2e.test.ts`, which measures where the
 * block actually lands in a browser.
 */
describe("scrollNodeToTop", () => {
  it("aligns the node's top with the scroll container, instantly", () => {
    const scrollIntoView = jest.fn();

    expect(scrollNodeToTop({ scrollIntoView })).toBe(true);
    // "start" is the acceptance criterion (the block at the TOP, not merely in
    // view) and "auto" is #716's no-animation ruling.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  });

  it("does nothing on a node that cannot scroll itself - native, and an unmounted ref", () => {
    expect(scrollNodeToTop(null)).toBe(false);
    expect(scrollNodeToTop(undefined)).toBe(false);
    // What a native ref looks like: a real object, no DOM method on it.
    expect(scrollNodeToTop({ measureInWindow: () => undefined })).toBe(false);
  });
});
