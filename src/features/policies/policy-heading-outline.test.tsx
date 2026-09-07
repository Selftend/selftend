import { screen } from "@testing-library/react-native";

import PrivacyScreen from "../../../app/privacy";
import SecurityScreen from "../../../app/security";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/security";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/security";
});

/**
 * A policy page's heading outline runs h1 → h2, with no level skipped (#2133).
 *
 * `/security` is the seventh policy page and the only one that does not render
 * through `InfoScreen`: it duplicates the same `Card` / `CardHeader` /
 * `CardTitle` / `CardDescription` structure inline. The copies diverged in the
 * one place a reader notices — `info-screen.tsx` passes `aria-level={2}` on the
 * section title and `security.tsx` did not, so it fell back to `CardTitle`'s
 * default of 3 and the page shipped **h1 → h3**. A skipped level is a WCAG 1.3.1
 * / 2.4.6 problem for anyone navigating by heading, and it put `/security` out
 * of step with the six pages it links to and sits beside.
 *
 * ☠️ Nothing could have caught this. No test rendered `SecurityScreen` for its
 * STRUCTURE (`policy-origin.test.tsx` renders it, but asserts escape-origin),
 * and `info-screen.test.tsx`'s docblock claimed its one assertion covered
 * `/security` — which was never true, because `/security` does not use that
 * component. Two silent copies plus a false coverage claim is why this shipped.
 *
 * ☠️ Levels are compared through `Number(...)`. `text.tsx`'s `ARIA_LEVEL` map
 * yields **strings** (`"1"`), while `CardTitle` and `Section` pass **numbers**
 * (`2`), so a bare `toBe(1)` fails on the page title for the wrong reason and a
 * bare `toBe("2")` fails on the section titles. Same precedent as
 * `act-home-screen.test.tsx` and `cbt-home-screen.test.tsx`.
 *
 * The `/privacy` case is not padding: it is the control. It renders through
 * `InfoScreen`, so asserting the same outline on both is what stops the two
 * structures drifting apart again — a fix to one that is not made to the other
 * turns this file red.
 */
/**
 * ☠️☠️ **`getAllByRole("heading")` CANNOT SEE A `View role="heading"`, and this
 * helper is therefore not safe to point at an arbitrary page.**
 *
 * RNTL's role queries filter on `isAccessibilityElement`
 * (`helpers/accessibility.js`), which returns the `accessible` prop when it is
 * set and otherwise only `isHostText || isHostTextInput || isHostSwitch` — plus
 * an `Image` carrying `alt`. A plain host `View` is none of those, so it is
 * filtered out however loudly it declares `role="heading"`. Every heading on
 * `/security` and `/privacy` is `Text`-based (`ScreenHeader` → `Text
 * variant="h1"`, `CardTitle` → `Text`), which is the only reason the two cases
 * below are honest.
 *
 * ⚠️ **Do not extend this file to `/faq` without reading this first** (found on
 * #2143, confirmed against `Disclosure`). The accordion pattern needs a heading
 * *containing* a button, so `Disclosure`'s heading is a `View role="heading"` —
 * invisible here. `/faq` also carries plenty of `Text` headings (the h1, four
 * group eyebrows, the parents letter), so it would clear the anti-vacuity floors
 * below **while the entire level-3 run of question headings was silently
 * absent**, and assert a clean outline over a tree missing the very thing the
 * page is made of. That is a false green, not a gap.
 *
 * For a page with non-`Text` headings, assert through
 * `UNSAFE_getAllByProps({ role: "heading" })`, which walks the real tree, or
 * measure in a browser.
 */
const levelsOf = (): number[] =>
  screen.getAllByRole("heading").map((node) => Number(node.props["aria-level"]));

describe("a policy page's heading outline never skips a level (#2133)", () => {
  it("gives /security one h1 and an h2 per section card", () => {
    renderWithProviders(<SecurityScreen />);

    const levels = levelsOf();

    // Anti-vacuity: `every` on an empty array is true, and a query that silently
    // matched nothing would make the assertions below meaningless. The page has
    // a title plus seven section cards, so eight headings is the floor.
    expect(levels.length).toBeGreaterThanOrEqual(8);
    expect(levels[0]).toBe(1);
    expect(levels.slice(1)).toEqual(levels.slice(1).map(() => 2));
  });

  it("gives /privacy the same outline, through InfoScreen", () => {
    mockPathname = "/privacy";
    renderWithProviders(<PrivacyScreen />);

    const levels = levelsOf();

    expect(levels.length).toBeGreaterThanOrEqual(2);
    expect(levels[0]).toBe(1);
    expect(levels.slice(1)).toEqual(levels.slice(1).map(() => 2));
  });

  it("never skips from the page title to a level below 2", () => {
    renderWithProviders(<SecurityScreen />);

    // The defect stated directly: no heading on the page may sit deeper than one
    // level below the one above it. Written as a walk rather than a spot check so
    // a future h4 under an h2 fails here too.
    const levels = levelsOf();
    const skips = levels
      .map((level, index) => ({ level, previous: levels[index - 1] ?? level }))
      .filter(({ level, previous }) => level > previous + 1);

    expect(skips).toEqual([]);
  });
});
