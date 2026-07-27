import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

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
const SCANNED_DIRS = ["app", "src"];
const SOURCE_EXTENSIONS = [".ts", ".tsx"];

/** Where the driver is defined - it necessarily names itself. */
const DEFINITION = join("src", "lib", "color-scheme.ts");

/** The one file allowed to import it. */
const ROOT_LAYOUT = join("app", "_layout.tsx");

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(rel);
    if (!SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) return [];
    // Tests legitimately import the driver to exercise it.
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    if (rel === DEFINITION) return [];
    return [rel];
  });
}

/**
 * A named import of `useColorSchemeDriver`. Bounded by `[^}]` so it cannot span
 * past the closing brace into a neighbouring statement, and matched against the
 * import syntax rather than the bare identifier so that a comment *mentioning*
 * the driver (as src/components/app/protected-layout.tsx does) is not a hit.
 */
const NAMED_IMPORT = /import\s+(?:type\s+)?\{[^}]*\buseColorSchemeDriver\b[^}]*\}\s*from\s*["']/;

/** A call of the driver, which catches a namespace import the pattern above would miss. */
const CALL_SITE = /\buseColorSchemeDriver\s*\(/;

describe("useColorSchemeDriver stays root-only", () => {
  const files = SCANNED_DIRS.flatMap(sourceFiles);

  it("scans a plausible number of source files", () => {
    // Guards the suite itself: a broken walk would find nothing and pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it("is imported by app/_layout.tsx and nothing else", () => {
    const importers = files.filter((file) =>
      NAMED_IMPORT.test(readFileSync(join(ROOT, file), "utf8")),
    );

    expect(importers.map((f) => f.split(sep).join("/"))).toEqual([
      ROOT_LAYOUT.split(sep).join("/"),
    ]);
  });

  it("is called from app/_layout.tsx and nowhere else", () => {
    const callers = files.filter((file) => CALL_SITE.test(readFileSync(join(ROOT, file), "utf8")));

    expect(callers.map((f) => f.split(sep).join("/"))).toEqual([ROOT_LAYOUT.split(sep).join("/")]);
  });

  it("finds the root layout where it expects to", () => {
    // If the root layout is ever moved or renamed, the two assertions above
    // would go green on an empty list rather than pointing at the new file.
    expect(files).toContain(relative(ROOT, join(ROOT, ROOT_LAYOUT)));
  });
});
