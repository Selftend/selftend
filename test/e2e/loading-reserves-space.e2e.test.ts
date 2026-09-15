/**
 * ADR-0009's guard: the check-in editor holds the emotion grid's space, so nothing below it
 * moves when the rows land (#2345, ruled on #2341).
 *
 * The defect this fails on is an **input-integrity** one rather than a cosmetic one. A bare
 * ~20px `ActivityIndicator` stood in for the chip run, with the Note field as its immediate
 * next sibling — so the whole lower half of the form jumped when the preferences query
 * settled, up to four sequential round trips into a first-ever user's first check-in. In the
 * user test that found it (#2327) a tap meant for Note landed on `sad`, index 11 of 22. The
 * app took an action the person did not choose.
 *
 * Run against the unfixed code this reported **y=609 → y=901**, a 292px jump. That number is
 * recorded because it is the only measured one in the whole chain: every pixel figure in the
 * tickets was derived from class strings, and the closest of them guessed ~250px.
 *
 * ☠️ **THIS HAS TO BE AN E2E.** NativeWind resolves no width or height into `props.style`
 * under jest, so a reserved-height assertion in the unit suite is *vacuously green* — it
 * passes without measuring anything (the reasoning is written out at `item-card.tsx`). The
 * unit suite guards the relation the height rests on; only a real engine can weigh the
 * height itself.
 *
 * Four properties of this spec are load-bearing, and each is here for a reason the next
 * person will otherwise undo:
 *
 * - ☠️ **It asserts on the element BELOW the region, never on the region's height.** That is
 *   the definition of a layout shift rather than a proxy for it; the spinner it replaces
 *   carries no `testID` and the Note field already has an accessible name, so this needs no
 *   new hook; and it therefore **survives the loading signal being replaced**, which
 *   ADR-0009 expressly permits. Five assertions elsewhere already pin `ActivityIndicator` by
 *   component type — this deliberately does not become a sixth.
 *
 * - ☠️ **Exact equality, not a tolerance.** With the route stalled both measurements are
 *   deterministic and nothing above the region changes between them. **If this ever flakes,
 *   find the cause — widening the tolerance is a regression of the ruling, not a fix**, and
 *   it is what somebody under time pressure will reach for first.
 *
 * - ☠️ **The request is stalled, never raced.** Racing a local database against the natural
 *   settle produces a spec that is green on a fast runner and red under load: one that fails
 *   intermittently on *correct* code, which is worse than no guard because it trains people
 *   to re-run.
 *
 * - ☠️ **The rows are seeded, which is what makes the assertion legal at all.** ADR-0009 ties
 *   reservation to the PENDING state: a query that settles with nothing is *allowed* to
 *   collapse its reservation, so a blanket "this surface never shifts" metric would fail on
 *   permitted behaviour. The fixture resolves that by choosing the path — seed the rows and
 *   arrival is guaranteed, so the permitted shift-on-failure cannot occur here and any
 *   movement is forbidden by definition.
 *
 * The seed is `DEFAULT_EMOTIONS` itself rather than a hand-written list: the reservation is
 * built from that same constant, so importing it is what keeps the fixture honest if the
 * default set ever changes. A user who has pruned or extended their list still sees a
 * smaller settle — ADR-0009's trade, stated in the ADR and out of this spec's scope.
 */

import { expect, test } from "./fixtures";

import { createServiceClient } from "./helpers";
import { DEFAULT_EMOTIONS } from "../../src/constants/emotions";

async function seedDefaultEmotions(userId: string) {
  const admin = createServiceClient();
  await admin.from("emotion_preferences").delete().eq("user_id", userId);

  const { error } = await admin.from("emotion_preferences").insert(
    DEFAULT_EMOTIONS.map((emotion, position) => ({
      user_id: userId,
      emotion_id: emotion.id,
      position,
      is_custom: false,
    })),
  );
  if (error) throw new Error(error.message);

  // `listOrSeedEmotions` only seeds an EMPTY list, so this flag is belt-and-braces - but it
  // is what stops a later empty read from inserting 22 rows underneath the measurements.
  const { error: flagError } = await admin
    .from("user_preferences")
    .upsert({ user_id: userId, emotions_seeded: true }, { onConflict: "user_id" });
  if (flagError) throw new Error(flagError.message);
}

async function clearEmotions(userId: string) {
  const admin = createServiceClient();
  await admin.from("emotion_preferences").delete().eq("user_id", userId);
}

test.describe("a loading surface reserves the space it will occupy (ADR-0009)", () => {
  // The same narrow-phone pin `module-mark-column.e2e.test.ts` uses, not a second one.
  // The shift happens at every width; the pin is here because `boundingBox()` is meaningless
  // without a fixed viewport, and one pinned size for the suite beats two.
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ user }) => {
    await seedDefaultEmotions(user.id);
  });

  test.afterEach(async ({ user }) => {
    await clearEmotions(user.id);
  });

  test("the Note field does not move when the emotion grid arrives", async ({ page }) => {
    let release: () => void = () => {};
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });

    // `emotion_preferences` is the table `useEmotionPreferences` reads through, and the one
    // `useEmotionDisplay` gates the grid on. Held open, not failed: the point is the PENDING
    // state, and an aborted read would settle into the collapse the ADR permits.
    await page.route("**/rest/v1/emotion_preferences*", async (route) => {
      await stalled;
      await route.continue();
    });

    await page.goto("/tools/check-in/new");

    const notes = page.getByLabel("Note", { exact: true });
    await expect(notes).toBeVisible({ timeout: 15_000 });

    // ⚠️ The web build does not gate first paint on fonts (`app/_layout.tsx` treats web as
    // ready immediately), and the chip run's height is a WRAP - so a face swapping in
    // mid-measurement would move the Note field for a reason that has nothing to do with
    // this rule. Settling the fonts once, before either reading, removes that entirely.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const pending = await notes.boundingBox();
    expect(pending).not.toBeNull();

    release();

    // The grid is really here, not merely un-stalled: the first chip of the seeded set.
    await expect(page.getByRole("checkbox", { name: "Happy", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const settled = await notes.boundingBox();
    expect(settled).not.toBeNull();

    // The whole rule, in one line. Exact - see the header.
    expect(settled!.y).toBe(pending!.y);
  });

  /**
   * Edge 5's other half (#2360). The manage-emotions panel hugs its content on web by design
   * (2E/#905), so edge 5's "put the content last" — which fixed the column in #2348 — leaves
   * the PANEL free to grow when the rows land, carrying its own header and "Add emotion"
   * button upward. The ruled cure is at the door: the editor and the panel read the same
   * query key, so this screen already knows whether the panel would open onto a pending read.
   *
   * ☠️ **This has to be an e2e for a different reason than the spec above.** The unit suite
   * pins `accessibilityState.disabled`, which is an intention; what actually shuts the door on
   * web is react-native-web turning that into `aria-disabled` AND `tabIndex=-1`
   * (`Pressable/index.js`), and jest renders neither. A keyboard user reaching a door that is
   * visibly muted but still takes Tab and Enter is the same defect wearing different clothes.
   *
   * ☠️ **The click is forced.** Playwright's own actionability would refuse to click a
   * disabled control, and a spec that passes because the harness declined to press the button
   * proves nothing about the app. Forcing it past that check is what makes the absence below
   * evidence that REACT NATIVE dropped the press, rather than evidence that Playwright did.
   */
  test("the Manage door stays shut while the same read is in flight", async ({ page }) => {
    let release: () => void = () => {};
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/rest/v1/emotion_preferences*", async (route) => {
      await stalled;
      await route.continue();
    });

    await page.goto("/tools/check-in/new");

    const door = page.getByRole("button", { name: "Manage emotions", exact: true });
    await expect(door).toBeVisible({ timeout: 15_000 });

    // Announced shut, and out of the tab order — the two halves, named separately so a
    // change that keeps one and drops the other cannot pass.
    await expect(door).toBeDisabled();
    await expect(door).toHaveAttribute("tabindex", "-1");

    await door.click({ force: true });
    await expect(page.getByText("Add emotion")).toHaveCount(0);

    release();

    // The door is a gate, not a wall: the same locator opens the panel once the rows land.
    await expect(door).toBeEnabled({ timeout: 15_000 });
    await expect(door).toHaveAttribute("tabindex", "0");

    await door.click();
    await expect(page.getByText("Add emotion")).toBeVisible({ timeout: 15_000 });
  });
});
