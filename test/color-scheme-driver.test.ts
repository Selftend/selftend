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

/**
 * Every root-only driver, and where each is defined - a module necessarily
 * names its own driver, so it is excluded from its own scan.
 *
 * The style axis (#582) joins the appearance axis here rather than getting a
 * suite of its own: it is the same hazard, and a second axis is exactly where a
 * guard gets forgotten.
 */
const DRIVERS = [
  { driver: "useColorSchemeDriver", definition: "src/lib/color-scheme.ts" },
  { driver: "useStyleDriver", definition: "src/lib/style.ts" },
] as const;

/** The one file allowed to import them. */
const ROOT_LAYOUT = "app/_layout.tsx";

// Tests legitimately import a driver to exercise it, so they are excluded along
// with the defining module itself.
const scanned = (definition: string): string[] =>
  sourceFiles(ROOT, { dirs: ["app", "src"], exclude: [definition] });

/**
 * A named import of the driver. Bounded by `[^}]` so it cannot span past the
 * closing brace into a neighbouring statement. The module specifier is not
 * matched: it is a string literal, and these patterns only ever run against
 * stripped code, where string contents are already blanked.
 */
const namedImport = (driver: string) =>
  new RegExp(String.raw`import\s+(?:type\s+)?\{[^}]*\b${driver}\b[^}]*\}\s*from\b`);

/** A call of the driver, which catches a namespace import the pattern above would miss. */
const callSite = (driver: string) => new RegExp(String.raw`\b${driver}\s*\(`);

// The appearance driver's own patterns, used by the self-checks at the bottom
// that prove the stripper tells prose from code.
const NAMED_IMPORT = namedImport("useColorSchemeDriver");
const CALL_SITE = callSite("useColorSchemeDriver");

/** File contents with prose removed - the only form the patterns above are applied to. */
function code(file: string): string {
  return stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8"));
}

describe.each(DRIVERS)("$driver stays root-only", ({ driver, definition }) => {
  const files = scanned(definition);
  const namedImportOf = namedImport(driver);
  const callSiteOf = callSite(driver);

  it("scans a plausible number of source files", () => {
    // Guards the suite itself: a broken walk would find nothing and pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it("is imported by app/_layout.tsx and nothing else", () => {
    const importers = files.filter((file) => namedImportOf.test(code(file)));

    expect(importers).toEqual([ROOT_LAYOUT]);
  });

  it("is called from app/_layout.tsx and nowhere else", () => {
    const callers = files.filter((file) => callSiteOf.test(code(file)));

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
