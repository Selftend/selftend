import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "@/test/source-scan";

// This repo runs Tailwind 3.4 (see tailwind.config.js / package.json), but the
// upstream shadcn/ui and react-native-reusables snippets this codebase pastes
// components from have moved to Tailwind 4. A Tailwind-4-only class name
// matches no Tailwind-3 utility, and Tailwind ignores unknown class names by
// design - so the class compiles to NOTHING: no build error, no lint warning,
// no test failure (className is asserted as a string, and a dead string still
// equals itself). #1327 found exactly two such classes in
// src/components/react-native-reusables/popover.tsx (outline-hidden and the
// `-(--var)` custom-property shorthand), both fixed alongside this gate.
//
// This suite is the standing gate the ticket asked for: it scans app/ and src/
// (mirroring the other static gates - test/accent-ink-call-sites.test.ts,
// test/color-scheme-driver.test.ts) for the two TW4 shapes that bit here, so
// the next paste from an upstream TW4 doc fails the build instead of shipping
// inert.
//
// Verified against the real build, not asserted from memory: building this
// repo's tailwind.config.js with tailwindcss@3.4.19 and reading the emitted
// CSS confirmed every DENY_LIST entry below (and the `-(--var)` shape) emits
// no CSS, and confirmed the TW3 replacements the fix used
// (`outline-none`, `origin-[var(--radix-popover-content-transform-origin)]`)
// do.

const ROOT = join(__dirname, "..");

/**
 * Tailwind 4's shorthand for an arbitrary CSS custom property -
 * `<prefix>-(--my-var)`, sugar for `<prefix>-[var(--my-var)]`. Tailwind 3 has
 * no such shorthand, so any class shaped like this is dead. Requires a
 * preceding utility-prefix character so a plain parenthesized expression in
 * unrelated code is not mistaken for the shorthand.
 *
 * No `g` flag: only ever used with `.test()`/`.toMatch()`, one string at a
 * time, and a global regex's `lastIndex` persists on the object between
 * calls - a later assertion would silently start its search mid-string
 * depending on what ran before it.
 */
const TW4_VAR_SHORTHAND = /[\w]-\(--[\w-]+\)/;

/**
 * A short, deliberately small deny-list of TW4-only or TW4-renamed utility
 * names that have no TW3 meaning - so an occurrence is either dead (the
 * pasted-from-TW4-docs case #1327 exists to catch) or, on the rare chance it
 * is meant as a literal string unrelated to styling, worth a second look
 * either way. Each entry was proven dead against this repo's real
 * tailwind.config.js before being added here (see the file header).
 *
 * Grow this list, rather than the regex shape, the next time a paste from an
 * upstream TW4 doc turns up a new dead spelling - the same way #1327 grew it
 * from two names to these.
 */
const DENY_LIST = [
  "outline-hidden", // TW4 rename of TW3's outline-none.
  "shadow-xs", // TW4 shifted the shadow size scale; TW3 has no `-xs` step.
  "rounded-xs", // Same shift, for border-radius.
  "blur-xs", // Same shift, for blur.
  "inset-shadow", // TW4-only utility family; absent from TW3 entirely.
  "inset-ring", // TW4-only utility family; absent from TW3 entirely.
  "text-shadow", // TW4-only utility family; absent from TW3 entirely.
  "field-sizing-content", // TW4-only utility; TW3 needs the arbitrary-property
  // form `[field-sizing:content]` instead (see textarea.tsx).
];

/**
 * Matches a deny-listed utility, optionally followed by a Tailwind size/shade
 * suffix (`-sm`, `-2`) or an opacity modifier (`/50`), so `shadow-xs` also
 * catches a hypothetical `shadow-xs/50`. Bounded on both sides so `shadow-xs`
 * does not match inside a longer, unrelated token, and so a variant prefix
 * (`dark:shadow-xs`) still matches - the character before is `:`, not a word
 * character, so the boundary is satisfied without special-casing variants.
 */
const DENY_PATTERN = new RegExp(
  String.raw`(?<![\w-])(?:${DENY_LIST.join("|")})(?:-[\w]+)?(?:/\d+)?(?![\w-])`,
);

interface Finding {
  file: string;
  line: number;
  snippet: string;
}

/** Collapses whitespace for a stable, readable failure message. */
const normalize = (line: string): string => line.trim().replace(/\s+/g, " ");

function findingsFor(pattern: RegExp, files: readonly string[]): Finding[] {
  return files.flatMap((file) => {
    const stripped = stripComments(readFileSync(join(ROOT, file), "utf8"));
    return stripped.split("\n").flatMap((line, index) =>
      pattern.test(line) ? [{ file, line: index + 1, snippet: normalize(line) }] : [],
    );
  });
}

describe("no Tailwind-4-only class ships dead under this repo's Tailwind 3 (#1327)", () => {
  const files = sourceFiles(ROOT, { dirs: ["app", "src"] });

  it("scans a plausible number of source files", () => {
    // Guards the suite itself: a broken walk would find nothing and pass
    // vacuously, the same guard test/color-scheme-driver.test.ts uses.
    expect(files.length).toBeGreaterThan(100);
  });

  it("never reaches for the TW4 custom-property shorthand", () => {
    // `-(--var)` has no meaning in Tailwind 3 and compiles to nothing. The
    // TW3 spelling is the arbitrary-value form: `-[var(--var)]`.
    expect(findingsFor(TW4_VAR_SHORTHAND, files)).toEqual([]);
  });

  it("never reaches for a denied TW4-only or TW4-renamed utility", () => {
    expect(findingsFor(DENY_PATTERN, files)).toEqual([]);
  });

  it("still finds the shorthand where the pattern is deliberately present", () => {
    // Positive control: proves the regex itself still matches the exact shape
    // that shipped dead, rather than the suite passing because the pattern
    // silently stopped matching anything.
    const probe = 'const cls = "origin-(--radix-popover-content-transform-origin)";';
    expect(stripComments(probe)).toMatch(TW4_VAR_SHORTHAND);
  });

  it("still finds a denied utility where the pattern is deliberately present", () => {
    expect(stripComments('const cls = "outline-hidden";')).toMatch(DENY_PATTERN);
  });

  it("does not flag the TW3 replacements the fix uses", () => {
    // outline-none and the bracketed arbitrary-value form both emit real CSS
    // under this repo's tailwind.config.js (verified by building it) - this
    // pins that the gate does not also reject the fix itself.
    const fixed =
      'const cls = "outline-none origin-[var(--radix-popover-content-transform-origin)]";';
    const stripped = stripComments(fixed);

    expect(stripped).not.toMatch(TW4_VAR_SHORTHAND);
    expect(stripped).not.toMatch(DENY_PATTERN);
  });

  it("does not flag field-sizing-content written as an arbitrary property", () => {
    // textarea.tsx uses the TW3-legal spelling, `[field-sizing:content]` - a
    // colon, not a hyphen, before `content`. The deny pattern must not treat
    // that as the dead utility name.
    const stripped = stripComments('const cls = "[field-sizing:content]";');

    expect(stripped).not.toMatch(DENY_PATTERN);
  });
});
