import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

// One driver, at the root. `useColorSchemeName` is the reader every component
// may call; `useColorSchemeDriver` owns the side effects (hydrate + the
// NativeWind push) and must be called exactly once, from app/_layout.tsx.
//
// Convention already failed at this once: the codebase drifted to thirteen
// scheme-reading sites, and a fresh theme choice could be clobbered by a
// hydrate landing from a second driver (#304, fixed by #343/#358/#359). A
// comment cannot stop the fourteenth, so this suite does - a second import
// turns CI red instead of turning a user's theme flaky.
//
// The runtime half of the guard lives in the driver itself: a module-scoped
// mount counter that warns under __DEV__ when two mount concurrently.

const ROOT = join(__dirname, "..");

/** Where the driver is defined - it necessarily names itself. */
const DEFINITION = "src/lib/color-scheme.ts";

/** The one file allowed to import it. */
const ROOT_LAYOUT = "app/_layout.tsx";

// Tests legitimately import the driver to exercise it, so they are excluded
// along with the defining module itself.
const scanned = (): string[] => sourceFiles(ROOT, { dirs: ["app", "src"], exclude: [DEFINITION] });

/**
 * A named import of `useColorSchemeDriver`. Bounded by `[^}]` so it cannot span
 * past the closing brace into a neighbouring statement. The module specifier is
 * not matched: it is a string literal, and these patterns only ever run against
 * stripped code, where string contents are already blanked.
 */
const NAMED_IMPORT = /import\s+(?:type\s+)?\{[^}]*\buseColorSchemeDriver\b[^}]*\}\s*from\b/;

/** A call of the driver, which catches a namespace import the pattern above would miss. */
const CALL_SITE = /\buseColorSchemeDriver\s*\(/;

/** File contents with prose removed - the only form the patterns above are applied to. */
function code(file: string): string {
  return stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8"));
}

describe("useColorSchemeDriver stays root-only", () => {
  const files = scanned();

  it("scans a plausible number of source files", () => {
    // Guards the suite itself: a broken walk would find nothing and pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it("is imported by app/_layout.tsx and nothing else", () => {
    const importers = files.filter((file) => NAMED_IMPORT.test(code(file)));

    expect(importers).toEqual([ROOT_LAYOUT]);
  });

  it("is called from app/_layout.tsx and nowhere else", () => {
    const callers = files.filter((file) => CALL_SITE.test(code(file)));

    expect(callers).toEqual([ROOT_LAYOUT]);
  });

  it("does not mistake prose for a caller", () => {
    // The false positive this guards against: a comment or string naming the
    // driver would fail CI and report a driver that does not exist.
    const prose = [
      "// never call useColorSchemeDriver() outside the root",
      "/* useColorSchemeDriver() belongs in app/_layout.tsx */",
      'const advice = "do not call useColorSchemeDriver() here";',
      "const hint = `useColorSchemeDriver() is root-only`;",
      'import { useColorSchemeName } from "@/src/lib/color-scheme";',
    ].join("\n");

    const stripped = stripCommentsAndStrings(prose);

    expect(CALL_SITE.test(stripped)).toBe(false);
    expect(NAMED_IMPORT.test(stripped)).toBe(false);
  });

  it("still sees real code next to prose", () => {
    const real = [
      "// useColorSchemeDriver() is called below",
      'import { useColorSchemeDriver } from "@/src/lib/color-scheme";',
      "useColorSchemeDriver();",
    ].join("\n");

    const stripped = stripCommentsAndStrings(real);

    expect(CALL_SITE.test(stripped)).toBe(true);
    expect(NAMED_IMPORT.test(stripped)).toBe(true);
  });

  it("blanks template text but keeps interpolated code", () => {
    // The same identifier twice: once as literal template text, once inside a
    // `${...}` interpolation. Only the second is code, so exactly one survives.
    const mixed = "const s = `useColorSchemeDriver() ${useColorSchemeDriver()}`;";

    const occurrences = stripCommentsAndStrings(mixed).match(/useColorSchemeDriver/g) ?? [];

    expect(occurrences).toHaveLength(1);
  });

  it("finds the root layout where it expects to", () => {
    // If the root layout is ever moved or renamed, the two assertions above
    // would go green on an empty list rather than pointing at the new file.
    expect(files).toContain(ROOT_LAYOUT);
  });
});
