import fs from "fs";
import path from "path";

import { isSeparatorRow, tableCells } from "@/test/markdown-doc";
import { stripComments } from "@/test/source-scan";

/**
 * `store/README.md`'s "What checks it" column names every test that reads the
 * file on its row, and nothing that does not (#2218).
 *
 * The row for `play-listing.md` said **"Nothing. Diff and review only"** for
 * weeks after #1760 had put the file's verbatim block through every ban rule in
 * `positioning-copy.test.ts` on every PR. The next contributor mirroring an
 * owner's Console edit hits a red `verify` on a file two committed documents
 * told them no gate reads — and the two remedies that present themselves are
 * both bad: mute the corpus, or leave the mirror un-updated and let it rot.
 *
 * ⚠️ Both directions are asserted. A reader the README omits is the #2218
 * defect; a test the README names that does not read the file is the same
 * defect pointing the other way, a claim of coverage nothing backs.
 *
 * ☠️ **What counts as "reads" is decided by the code, not by the README.** A
 * test reads a store file if its source (comments stripped, so a docblock that
 * merely cites the file does not count) names the file, or imports
 * `@/test/store-listing-text`, the shared extractor that reads
 * `apple-info.json` and `play-listing.md` for whoever imports it.
 */
const ROOT = path.resolve(__dirname, "..");
const README = fs.readFileSync(path.join(ROOT, "store", "README.md"), "utf8");
const TEST_DIR = path.join(ROOT, "test");

/** The two files `test/store-listing-text.ts` reads for its importers. */
const VIA_STORE_LISTING_TEXT = new Set(["apple-info.json", "play-listing.md"]);

/** The store files each top-level test suite reads, by basename. */
function storeFilesReadBy(testFile: string): Set<string> {
  const source = stripComments(fs.readFileSync(path.join(TEST_DIR, testFile), "utf8"));
  const read = new Set<string>();

  for (const basename of fs.readdirSync(path.join(ROOT, "store"))) {
    if (basename === "README.md") continue;
    if (source.includes(basename)) read.add(basename);
  }
  if (source.includes("@/test/store-listing-text")) {
    for (const basename of VIA_STORE_LISTING_TEXT) read.add(basename);
  }
  return read;
}

// This suite names the store files in order to check the README, and reads
// none of them — so it is the one file excluded from the reader scan.
const SUITES = fs
  .readdirSync(TEST_DIR)
  .filter((file) => file.endsWith(".test.ts") && file !== path.basename(__filename));

/** basename → the suites that read it, from the code. */
const READERS = new Map<string, Set<string>>();
for (const suite of SUITES) {
  for (const basename of storeFilesReadBy(suite)) {
    if (!READERS.has(basename)) READERS.set(basename, new Set());
    READERS.get(basename)?.add(`test/${suite}`);
  }
}

/** basename → the suites the README's "What checks it" cell names. */
const NAMED = new Map<string, Set<string>>();
for (const line of README.split("\n")) {
  const cells = tableCells(line);
  if (!cells || isSeparatorRow(cells) || cells.length < 3) continue;
  const file = /^`([^`]+)`$/.exec(cells[0])?.[1];
  if (!file) continue;
  NAMED.set(file, new Set(cells[2].match(/test\/[\w.-]+\.test\.ts/g) ?? []));
}

describe("store/README.md's 'What checks it' column (#2218)", () => {
  it("has a row for every file in store/, so the table cannot fall behind the directory", () => {
    const files = fs.readdirSync(path.join(ROOT, "store")).filter((f) => f !== "README.md");
    expect([...NAMED.keys()].sort()).toEqual(files.sort());
  });

  it("the copy gates really do read the store files, so the assertion below is not vacuous", () => {
    expect(READERS.get("play-listing.md")).toContain("test/positioning-copy.test.ts");
    expect(READERS.get("play-listing.md")).toContain("test/restraint-copy.test.ts");
    expect(READERS.get("apple-info.json")).toContain("test/store-info-invariants.test.ts");
  });

  it.each([...NAMED.keys()])("names exactly the suites that read %s", (file) => {
    const named = [...(NAMED.get(file) ?? [])].sort();
    const readers = [...(READERS.get(file) ?? [])].sort();

    expect({ file, named }).toEqual({ file, named: readers });
  });
});
