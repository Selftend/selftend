import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "@/test/source-scan";

/**
 * The structured-data block is on the landing page and nowhere else
 * (docs/indexability.md § 5, #2296).
 *
 * The ruling on #2291 puts one `application/ld+json` block in the landing
 * screen's own `<Head>` - never the root layout, never another route - so
 * `index.html` is the one exported file that carries it and `/faq`, `/crisis`,
 * the five policy files and `404.html` carry none. `landing-head.test.tsx`
 * pins what the block says; this gate pins where it can be said at all. A
 * second surface emitting the type, or the landing head's block moving into
 * `SiteHead`, fails here before an export is ever read.
 */
const ROOT = join(__dirname, "..");

/** The media type as a string literal, or through the constant that carries it. */
const NAMES_THE_TYPE = /application\/ld\+json|STRUCTURED_DATA_TYPE/;

describe("the structured-data surface (#2296)", () => {
  it("is named by the landing head and the constant's own module only", () => {
    const files = sourceFiles(ROOT, { dirs: ["app", "src"] }).filter((file) =>
      NAMES_THE_TYPE.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );

    expect(files.sort()).toEqual([
      "src/components/app/landing/landing-head.tsx",
      "src/lib/structured-data.ts",
    ]);
  });
});
