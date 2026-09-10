import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every H1 on a screen that has no exported file - the `(auth)` screens and
 * `+not-found` - carries a `DocumentTitle` beside it (#2294,
 * docs/indexability.md § 4.5): the document title follows the H1 through the
 * template, INCLUDING the state-dependent ones (the callback's four states,
 * the expired reset link, sign-up's conversion variant), because the title is
 * rendered next to the heading it names rather than once per screen.
 *
 * A source tripwire, deliberately: the behaviour is pinned per component in
 * `document-title.test.tsx` and the form suites; this is what stops a NEW
 * heading state landing without its title. It counts H1s and titles per
 * file and demands they match, and that each title sits within three lines
 * above its heading - close enough that a reviewer sees them as one thing.
 */

const ROOT = join(__dirname, "..");

const SCREENS = [
  "src/components/app/sign-in-form.tsx",
  "src/components/app/sign-up-form.tsx",
  "src/components/app/forgot-password-form.tsx",
  "src/components/app/reset-password-form.tsx",
  "src/components/app/verify-email-form.tsx",
  "src/components/app/auth-callback-screen.tsx",
  "src/components/app/not-found-screen.tsx",
];

const H1 = /<CardTitle aria-level=\{1\}>|<Text variant="h1">/;
const TITLE = /<DocumentTitle\b/;

describe("every auth and not-found H1 carries its document title (#2294)", () => {
  it.each(SCREENS)("%s", (relative) => {
    const lines = readFileSync(join(ROOT, relative), "utf8").split("\n");
    const headings = lines.map((line, i) => (H1.test(line) ? i : -1)).filter((i) => i >= 0);
    const titles = lines.map((line, i) => (TITLE.test(line) ? i : -1)).filter((i) => i >= 0);

    // Positive control: a screen that lost its H1 pattern would pass vacuously.
    expect(headings.length).toBeGreaterThan(0);
    expect({ headings: headings.length, titles: titles.length }).toEqual({
      headings: headings.length,
      titles: headings.length,
    });
    for (const heading of headings) {
      const paired = titles.some((title) => title < heading && heading - title <= 3);
      expect({ line: heading + 1, paired }).toEqual({ line: heading + 1, paired: true });
    }
  });

  // The callback's four states and the reset link's two, by count - the
  // number the spec names, so a state added or removed changes this file too.
  it("covers the state-dependent headings the spec names", () => {
    const count = (relative: string) =>
      readFileSync(join(ROOT, relative), "utf8")
        .split("\n")
        .filter((line) => TITLE.test(line)).length;

    expect(count("src/components/app/auth-callback-screen.tsx")).toBe(4);
    expect(count("src/components/app/reset-password-form.tsx")).toBe(2);
    expect(count("src/components/app/sign-up-form.tsx")).toBe(1);
  });
});
