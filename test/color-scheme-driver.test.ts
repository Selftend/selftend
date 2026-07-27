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
 * Blanks out comments and string literals, so prose that merely *names* the
 * driver is never mistaken for code that uses it. Without this, a line like
 * `// never call useColorSchemeDriver()` would fail CI and report a driver that
 * does not exist - a guard that cries wolf is a guard people delete.
 *
 * Template literals are scanned rather than skipped, so a real call inside a
 * `${...}` interpolation is still seen. Characters are replaced with spaces so
 * that offsets, and therefore any future line reporting, stay accurate.
 */
export function stripCommentsAndStrings(source: string): string {
  const out = source.split("");
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k += 1) if (out[k] !== "\n") out[k] = " ";
  };

  let i = 0;
  // Stack of open template literals, so `${}` interpolations stay scanned.
  const templates: number[] = [];

  while (i < source.length) {
    const two = source.slice(i, i + 2);

    if (two === "//") {
      const end = source.indexOf("\n", i);
      blank(i, end === -1 ? source.length : end);
      i = end === -1 ? source.length : end;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      let j = i + 1;
      while (j < source.length && source[j] !== quote) {
        if (source[j] === "\\") j += 1;
        if (source[j] === "\n") break;
        j += 1;
      }
      blank(i, Math.min(j + 1, source.length));
      i = j + 1;
    } else if (source[i] === "`") {
      templates.push(i);
      out[i] = " ";
      i += 1;
      // Blank the literal text but keep scanning; `${` re-enters normal code.
      while (i < source.length) {
        if (source[i] === "\\") {
          blank(i, i + 2);
          i += 2;
        } else if (source.slice(i, i + 2) === "${") {
          blank(i, i + 2);
          i += 2;
          break;
        } else if (source[i] === "`") {
          templates.pop();
          out[i] = " ";
          i += 1;
          break;
        } else {
          blank(i, i + 1);
          i += 1;
        }
      }
    } else {
      i += 1;
    }
  }

  return out.join("");
}

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
  const files = SCANNED_DIRS.flatMap(sourceFiles);

  it("scans a plausible number of source files", () => {
    // Guards the suite itself: a broken walk would find nothing and pass vacuously.
    expect(files.length).toBeGreaterThan(100);
  });

  it("is imported by app/_layout.tsx and nothing else", () => {
    const importers = files.filter((file) => NAMED_IMPORT.test(code(file)));

    expect(importers.map((f) => f.split(sep).join("/"))).toEqual([
      ROOT_LAYOUT.split(sep).join("/"),
    ]);
  });

  it("is called from app/_layout.tsx and nowhere else", () => {
    const callers = files.filter((file) => CALL_SITE.test(code(file)));

    expect(callers.map((f) => f.split(sep).join("/"))).toEqual([ROOT_LAYOUT.split(sep).join("/")]);
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
    expect(files).toContain(relative(ROOT, join(ROOT, ROOT_LAYOUT)));
  });
});
