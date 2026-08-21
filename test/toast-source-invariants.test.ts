// test/toast-source-invariants.test.ts
//
// A source-level merge gate on `app-toast.tsx` (#1337).
//
// TOAST-ONLY, deliberately. The toast is the app's only full-width floating
// layer that lands on arbitrary content, so it is the only surface where
// swallowing a tap is unrecoverable: there is nothing underneath to try again
// with. Generalising this to every overlay would gate a dozen components on a
// risk only this one carries.
//
// These are POLICY assertions in `store-advisory-invariants.test.ts`'s frame -
// not a second copy of the component. Each one guards a regression that a green
// jest run and a green e2e run would BOTH still let through, because each is a
// property of how the code is written rather than of what one render produces:
//
//   1. `pointerEvents="box-none"` must be a PROP. In style it is invalid CSS,
//      silently ignored, and the overlay goes back to eating taps aimed at the
//      header beneath it. A render test sees a View either way.
//   2. NO `onPress` on the card body. The X is the only dismissal now; a press
//      handler back on the body would re-swallow every tap landing on the card.
//   3. The X's `focusable` must not be BOUND to a state variable. On RNW
//      `focusable` IS `tabIndex` (#1049), and binding it to a pending flag drops
//      focus mid-action - a sequence no single render can expose.
//   4. The native fade is 200ms. `test/setup.js` swaps reanimated for
//      `react-native-reanimated/mock`, whose builder discards `duration()`'s
//      argument and answers `getDuration()` with a hardcoded 300 - so the real
//      value is unobservable from jest, and this is the only place it can be
//      pinned at all.
import * as fs from "node:fs";
import * as path from "node:path";

const SOURCE_PATH = path.resolve(__dirname, "..", "src", "components", "app", "app-toast.tsx");
const source = fs.readFileSync(SOURCE_PATH, "utf8");

/** The source with every comment stripped, so prose about a trap never satisfies a gate. */
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("app-toast.tsx keeps the properties no render test can see", () => {
  // Guard the guard: if the file moves or is renamed, every assertion below
  // would pass against an empty string.
  it("is reading the component it claims to", () => {
    expect(code).toContain("export function AppToast");
  });

  it("declares pointerEvents as a prop, never through style", () => {
    expect(code).toContain('pointerEvents="box-none"');
    // `pointerEvents:` would be the style-object form - the invalid-CSS one.
    expect(code).not.toMatch(/pointerEvents\s*:/);
  });

  it("puts no press handler on the card body", () => {
    // Stated as a count rather than by slicing the Card open: the X's Pressable
    // lives INSIDE the Card, so "the Card subtree contains no onPress" is not a
    // property this component can have. One handler in the whole file, on the
    // one Pressable, is the same guarantee and survives re-nesting.
    //
    // The negative lookahead matters: a bare /onPress/ also counts `onPressIn`
    // and `onPressOut`, so adding a press-in highlight would trip a gate that
    // has nothing to say about press-in highlights.
    expect(code.match(/onPress(?![A-Za-z])/g) ?? []).toHaveLength(1);

    const openingTag = /<Card\b[\s\S]*?\n\s*>/.exec(code)?.[0] ?? "";
    expect(openingTag).toContain('testID="app-toast"');
    expect(openingTag).not.toContain("onPress");

    // And the one handler is the dismiss button's.
    const dismissButton = code.slice(code.indexOf("<Pressable"), code.indexOf("</Pressable>"));
    expect(dismissButton).toContain("onPress={dismissToast}");
  });

  // Deliberately NOT gated here: "the card is labelled but NOT `accessible`".
  // That one IS visible to a render test - `app-toast.test.tsx` reads it off the
  // rendered card's props - and this file's charter is the properties no render
  // can see. A second copy would blunt the charter rather than add cover.

  it("leaves the dismiss button's focusability alone", () => {
    // Any `focusable` at all is the smell: the trap is binding it to state, and
    // the component has no legitimate reason to set it, since Pressable already
    // derives `true` from the press handler.
    expect(code).not.toContain("focusable");
  });

  it("pins the fade at 200ms on both platforms", () => {
    // The 200 is stated in four places and does NOT reduce to one constant:
    // reanimated wants a call argument, Tailwind wants the LITERAL class
    // `duration-200` (a `duration-${ms}` template compiles to nothing - this
    // repo has shipped classes that silently emitted no CSS), and the e2e reads
    // CSS's "0.2s". Pinning both halves here is what keeps them equal.
    expect(code).toContain("FadeIn.duration(200)");
    expect(code).toContain("duration-200");
  });

  // ☠️ RN bakes `Platform.select` per platform - the iOS build's is literally
  // `'ios' in spec ? ... : spec.default`, so it never consults `Platform.OS`.
  // Under jest it would return undefined whatever the test sets, making the
  // web fade branch unobservable and its test vacuously green.
  it("branches the web fade on Platform.OS, not Platform.select", () => {
    expect(code).toContain('Platform.OS === "web"');
    expect(code).not.toContain("Platform.select");
  });
});
