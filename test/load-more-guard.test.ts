import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

/**
 * Every keyset-paged list feeds `onEndReached` through `useLoadMore` (#2255).
 *
 * The guard used to be hand-written on nineteen screens as
 * `hasNextPage && !isFetchingNextPage`, which is one condition short: a page that keeps
 * failing re-fires `onEndReached` through the footer's own height change and retries in
 * a loop. Fixing nineteen copies once is easy; keeping a twentieth from being written by
 * hand is what this gate is for. Two assertions:
 *
 * - the raw guard shape appears in no source file but the helper itself (and DOES appear
 *   there, so the regex is known to match the shape it polices);
 * - every file that passes `onEndReached` imports the helper.
 */

const ROOT = join(__dirname, "..");
const HELPER = "src/lib/use-load-more.ts";

/** `hasNextPage && !isFetchingNextPage`, in either order. */
const RAW_GUARD =
  /hasNextPage\s*&&\s*!\s*isFetchingNextPage|!\s*isFetchingNextPage\s*&&\s*hasNextPage/;

const PASSES_ON_END_REACHED = /\bonEndReached\s*=/;
const IMPORTS_HELPER =
  /import\s*\{[^}]*\buseLoadMore\b[^}]*\}\s*from\s*"@\/src\/lib\/use-load-more"/;

const files = sourceFiles(ROOT, { dirs: ["src", "app"] });
const code = new Map(
  files.map((file) => [file, stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8"))]),
);

describe("the load-more guard", () => {
  it("lives in the helper, where the regex can see it", () => {
    expect(code.get(HELPER)).toMatch(RAW_GUARD);
  });

  it("is hand-written on no screen", () => {
    const offenders = files.filter((file) => file !== HELPER && RAW_GUARD.test(code.get(file)!));
    expect(offenders).toEqual([]);
  });

  it("is what every onEndReached goes through", () => {
    const pagers = files.filter((file) => PASSES_ON_END_REACHED.test(code.get(file)!));
    // A sanity floor: the nineteen paged screens at the time of writing. If this drops,
    // the scan is looking at the wrong tree, not at a leaner app.
    expect(pagers.length).toBeGreaterThanOrEqual(19);

    const unguarded = pagers.filter(
      (file) => !IMPORTS_HELPER.test(readFileSync(join(ROOT, file), "utf8")),
    );
    expect(unguarded).toEqual([]);
  });
});
