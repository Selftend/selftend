import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

/**
 * #2360: the manage-emotions panel has exactly ONE door, and that door is gated.
 *
 * The panel hugs its content on web by design (`VIEW_SIZING`, 2E/#905), so a panel opened
 * while `emotion_preferences` is still in flight grows from a short card to a viewport-capped
 * one when the rows land — recentring the desktop card, growing the mobile drawer upward, and
 * carrying its own header and "Add emotion" button with it. ADR-0009 edge 5 put the panel's
 * own column in order (#2348), but edge 5 assumes a column of definite height, which this
 * panel does not have; every cure at panel scale is either a reversal of 2E or the guessed
 * fixed height edge 5 rejects by name.
 *
 * So the cure is at the door: the check-in editor reads the SAME query key through the same
 * hook as the panel, so it knows at the moment of the tap whether the panel would open onto a
 * pending read, and it shuts the link for that window. **That argument holds only while there
 * is one door.** A second opener elsewhere would not be gated, and the settle would be back
 * with nothing failing — which is precisely the kind of invariant that survives as a code
 * comment for about one refactor.
 *
 * ☠️ The gate assertion is as load-bearing as the count. A suite that only counted doors
 * would go green the moment somebody deleted `disabled={emotionsLoading}` from the one door
 * it had just finished approving of.
 *
 * ⚠️ This is a source-scanning suite, so `jest --findRelatedTests` cannot see it: editing
 * `mood-entry-editor-screen.tsx` will NOT run this file in the pre-commit hook. It runs in the
 * full suite, which is where it will catch the regression.
 */

const ROOT = join(__dirname, "..");

/** The panel's only legitimate opener. */
const THE_DOOR = "src/features/mood/mood-entry-editor-screen.tsx";

/**
 * JSX use of `<ManageEmotionsModal`, never the declaration or an import. Comments are
 * stripped first: this file's own prose names the component, and so does the panel's source.
 */
const RENDERS_THE_PANEL = /<ManageEmotionsModal[\s/>]/;

describe("the manage-emotions panel has one door, and it is gated (#2360)", () => {
  const renderers = sourceFiles(ROOT, { dirs: ["src", "app"] }).filter((file) =>
    RENDERS_THE_PANEL.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
  );

  it("is opened from exactly one place in src/ and app/", () => {
    // ⚠️ Both trees, deliberately. The router tree under `app/` is invisible to the `src/`-only
    // grep that is the natural way to check this by hand, and a door added there is exactly
    // the one that would be missed.
    expect(renderers).toEqual([THE_DOOR]);
  });

  it("shuts that door while the emotion read it shares with the panel is pending", () => {
    const source = stripComments(readFileSync(join(ROOT, THE_DOOR), "utf8"));

    // The gate itself...
    expect(source).toMatch(/disabled=\{emotionsLoading\}/);

    // ...and the two facts that make it the RIGHT gate: the flag is the pending state of the
    // shared read, and it is the panel's own hook rather than a second query that could settle
    // at a different time. Without these the gate could be wired to any stale boolean.
    expect(source).toMatch(/isLoading:\s*emotionsLoading\s*\}\s*=\s*useEmotionDisplay\(\)/);
  });
});
