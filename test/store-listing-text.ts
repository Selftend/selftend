import fs from "fs";
import path from "path";

/**
 * The text that is actually ON a store listing, pulled out of the two files
 * that mirror them — `store/apple-info.json`'s fields and the blockquote under
 * `store/play-listing.md`'s "Verbatim, as saved" heading.
 *
 * Lived inside `positioning-copy.test.ts` from #1760 until #2216, when the
 * restraint guard needed the same corpus: the Play listing's closing line was
 * the exact sentence shape `restraint-copy` bans, on the one surface it could
 * not see. One extractor, so the two guards cannot disagree about what "the
 * listing text" is.
 *
 * ☠️ **THROWS rather than returning an empty list.** Both halves are extracted
 * by structure — JSON fields, and the blockquote under a heading — and both can
 * silently yield nothing when the file is reorganised. A corpus that quietly
 * empties leaves every rule vacuously green while looking covered, which is the
 * #1908 / #2019 failure mode `positioning-copy` has already paid for twice.
 *
 * ⚠️ `storeListingText` takes the file contents rather than reading them, so
 * the extraction can be exercised on synthetic input. Nothing else here is
 * testable without it.
 */

export const APPLE_INFO_SURFACE = "store/apple-info.json";
export const PLAY_VERBATIM_SURFACE = "store/play-listing.md";

/** Where `store/play-listing.md` starts quoting the listing rather than describing it. */
export const PLAY_VERBATIM_HEADING = "## Verbatim, as saved";

/** One scannable piece of listing copy: a store field, or the whole Play block. */
export interface StoreListingEntry {
  surface: string;
  id: string;
  text: string;
}

export function storeListingText(
  appleInfoJson: string,
  playListingMd: string,
): StoreListingEntry[] {
  const entries: StoreListingEntry[] = [];

  const apple = JSON.parse(appleInfoJson) as Record<string, unknown>;
  for (const [field, value] of Object.entries(apple)) {
    if (typeof value === "string") {
      entries.push({ surface: APPLE_INFO_SURFACE, id: field, text: value });
    } else if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      entries.push({
        surface: APPLE_INFO_SURFACE,
        id: field,
        text: (value as string[]).join(", "),
      });
    }
  }
  if (entries.length === 0) {
    throw new Error(`${APPLE_INFO_SURFACE} yielded no listing fields`);
  }

  const at = playListingMd.indexOf(PLAY_VERBATIM_HEADING);
  if (at === -1) {
    throw new Error(`${PLAY_VERBATIM_SURFACE} has no "${PLAY_VERBATIM_HEADING}" section`);
  }
  const verbatim = playListingMd
    .slice(at)
    .split("\n")
    .filter((line) => line.startsWith(">"))
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  if (verbatim === "") {
    throw new Error(`${PLAY_VERBATIM_SURFACE}'s "${PLAY_VERBATIM_HEADING}" block quotes nothing`);
  }
  entries.push({ surface: PLAY_VERBATIM_SURFACE, id: "verbatim", text: verbatim });

  return entries;
}

const ROOT = path.resolve(__dirname, "..");

/** The committed listing text, read once per suite. */
export const STORE_LISTING_TEXT: StoreListingEntry[] = storeListingText(
  fs.readFileSync(path.join(ROOT, APPLE_INFO_SURFACE), "utf8"),
  fs.readFileSync(path.join(ROOT, PLAY_VERBATIM_SURFACE), "utf8"),
);
