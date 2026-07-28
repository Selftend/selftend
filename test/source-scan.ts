import { readdirSync } from "node:fs";
import { join } from "node:path";

// Shared plumbing for the repo-wide static gates - the suites that read `app/`
// and `src/` from disk and fail CI when a pattern the codebase has already been
// burned by reappears (test/color-scheme-driver.test.ts, #360;
// test/accent-ink-call-sites.test.ts, #368).
//
// Both need to ignore prose. They disagree about strings: the driver gate looks
// for *code* (`useColorSchemeDriver()`), so a string naming it is noise; the
// accent-ink gate looks for *class names*, which live inside string literals, so
// blanking strings would erase everything it is meant to see. Hence one scanner
// with a switch rather than two half-right regexes.

const SOURCE_EXTENSIONS = [".ts", ".tsx"];

export interface SourceFileOptions {
  /** Directories to walk, relative to `root`. */
  dirs: string[];
  /** Skip `*.test.ts` / `*.test.tsx`. Defaults to true. */
  excludeTests?: boolean;
  /** Extra repo-relative paths to skip. */
  exclude?: string[];
}

/** Every source file under `dirs`, as repo-relative paths with forward slashes. */
export function sourceFiles(root: string, options: SourceFileOptions): string[] {
  const { dirs, excludeTests = true, exclude = [] } = options;
  const skip = new Set(exclude.map((path) => path.split(/[\\/]/).join("/")));

  const walk = (dir: string): string[] =>
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return walk(rel);
      if (!SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) return [];
      if (excludeTests && /\.test\.tsx?$/.test(entry.name)) return [];
      if (skip.has(rel)) return [];
      return [rel];
    });

  return dirs.flatMap(walk);
}

/**
 * Blanks comments, and optionally string literals, replacing characters with
 * spaces so offsets stay accurate for line reporting.
 *
 * Strings are always *tracked* even when they are kept, because a `//` inside
 * one (`"https://example.com"`) would otherwise start a comment and blank the
 * rest of the line - silently hiding whatever followed it.
 *
 * Template literals are scanned rather than skipped, so code inside a `${...}`
 * interpolation is always visible. The interpolation is tracked on a stack
 * rather than simply broken out of: without it the template's *closing*
 * backtick reads as an opening one, and everything up to the next backtick in
 * the file is swallowed as template body. That mis-parse hid nothing, but it
 * un-hid prose - a `//` comment inside the swallowed span stopped being
 * recognised as a comment, so a class name merely *named* in a comment
 * surfaced as a finding (`src/features/mood/mood-entry-editor-screen.tsx`
 * reported its own "not `text-be`" note as a `text-be` call site, #412).
 * Braces are counted so object literals and nested templates inside an
 * interpolation do not close it early.
 */
function scan(source: string, blankStrings: boolean): string {
  const out = source.split("");
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k += 1) if (out[k] !== "\n") out[k] = " ";
  };

  /** Open `${...}` interpolations, innermost last, each holding its brace depth. */
  const interpolations: number[] = [];

  /**
   * Consumes template body from `i` until the template closes or an
   * interpolation opens, returning the new index.
   */
  const consumeTemplateBody = (from: number): number => {
    let k = from;
    while (k < source.length) {
      if (source[k] === "\\") {
        if (blankStrings) blank(k, k + 2);
        k += 2;
      } else if (source.slice(k, k + 2) === "${") {
        if (blankStrings) blank(k, k + 2);
        interpolations.push(0);
        return k + 2; // Interpolated code is scanned normally.
      } else if (source[k] === "`") {
        if (blankStrings) out[k] = " ";
        return k + 1;
      } else {
        if (blankStrings) blank(k, k + 1);
        k += 1;
      }
    }
    return k;
  };

  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);

    if (two === "//") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
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
      const stop = Math.min(j + 1, source.length);
      if (blankStrings) blank(i, stop);
      i = stop;
    } else if (source[i] === "`") {
      if (blankStrings) out[i] = " ";
      i = consumeTemplateBody(i + 1);
    } else if (source[i] === "{" && interpolations.length > 0) {
      interpolations[interpolations.length - 1] += 1;
      i += 1;
    } else if (source[i] === "}" && interpolations.length > 0) {
      if (interpolations[interpolations.length - 1] === 0) {
        interpolations.pop();
        i = consumeTemplateBody(i + 1); // Back into the template this closed.
      } else {
        interpolations[interpolations.length - 1] -= 1;
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  return out.join("");
}

/** Prose removed, string literals kept - for finding class names. */
export const stripComments = (source: string): string => scan(source, false);

/** Prose and string literals removed - for finding code. */
export const stripCommentsAndStrings = (source: string): string => scan(source, true);
