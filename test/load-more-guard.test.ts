import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

/**
 * Every keyset-paged list feeds `onEndReached` through `useLoadMore` (#2255), and every
 * screen that does also renders the `LoadMoreFooter` that can undo a latched failure.
 *
 * The guard used to be hand-written on nineteen screens as
 * `hasNextPage && !isFetchingNextPage`, which is one condition short: a page that keeps
 * failing re-fires `onEndReached` through the footer's own height change and retries in
 * a loop. Fixing nineteen copies once is easy; keeping a twentieth from being written by
 * hand is what this gate is for.
 *
 * ☠️ The third conjunct `!isFetchNextPageError` is a LATCH, not a pause. TanStack keeps
 * `isFetchNextPageError` true until a fetch succeeds or a plain `refetch` clears
 * `fetchMeta`, and `onEndReached` is the only forward-fetch trigger a list screen has —
 * so once it is set, the helper never asks for another page. The only control that clears
 * it is `LoadMoreFooter`'s Retry, which calls `fetchNextPage` directly. A screen that
 * adopts the helper without the footer therefore turns one transient page failure into a
 * permanent, silent cap on the archive, indistinguishable from its end: the exact "cap
 * wearing the face of the end" #2187 exists to remove. The helper shipped on nineteen
 * screens while only six had the footer, which is what the third assertion below now
 * makes impossible.
 */

const ROOT = join(__dirname, "..");
const HELPER = "src/lib/use-load-more.ts";
const FOOTER = "src/components/app/load-more-footer.tsx";

/** `hasNextPage && !isFetchingNextPage`, in either order. */
const RAW_GUARD =
  /hasNextPage\s*&&\s*!\s*isFetchingNextPage|!\s*isFetchingNextPage\s*&&\s*hasNextPage/;

const PASSES_ON_END_REACHED = /\bonEndReached\s*=/;
const IMPORTS_HELPER =
  /import\s*\{[^}]*\buseLoadMore\b[^}]*\}\s*from\s*"@\/src\/lib\/use-load-more"/;
/** The footer is rendered, not merely imported — an unused import would not clear a latch. */
const RENDERS_FOOTER = /<LoadMoreFooter\b/;

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

  it("never latches a screen that has no Retry to unlatch it", () => {
    const adopters = files.filter(
      (file) => file !== HELPER && IMPORTS_HELPER.test(readFileSync(join(ROOT, file), "utf8")),
    );
    // The same sanity floor: nineteen paged screens adopt the helper.
    expect(adopters.length).toBeGreaterThanOrEqual(19);

    const withoutRetry = adopters.filter((file) => !RENDERS_FOOTER.test(code.get(file)!));
    expect(withoutRetry).toEqual([]);
  });

  it("knows what rendering the footer looks like", () => {
    // A positive control on the regex itself: a `RENDERS_FOOTER` that matched nothing —
    // or that a bare import satisfied — would let the assertion above pass over an app
    // with no Retry anywhere.
    expect(RENDERS_FOOTER.test("<LoadMoreFooter failed={isFetchNextPageError} />")).toBe(true);
    expect(
      RENDERS_FOOTER.test(
        'import { LoadMoreFooter } from "@/src/components/app/load-more-footer";',
      ),
    ).toBe(false);
    // And the component the gate names still exists under that name.
    expect(code.get(FOOTER)).toMatch(/export function LoadMoreFooter\b/);
  });
});
