import fs from "fs";
import path from "path";

/**
 * The text that is actually ON a store listing, pulled out of the three files
 * that carry it — `store/apple-info.json`'s fields, the blockquote under
 * `store/play-listing.md`'s "Verbatim, as saved" heading, and the blockquote
 * under `store/apple-release-notes.md`'s "Verbatim, as submitted" heading.
 *
 * ⚠️ **The third one is not a mirror, and that is deliberate** (#2604). App
 * Store "What's New" is fixed at submission and cannot be edited afterwards,
 * and `eas metadata:pull` does not carry it, so there is no live value to
 * compare against — the text is decided ahead of the submission and gated here
 * so a ban rule sees it *before* it is typed, which is the only chance there
 * is. It takes `play-listing.md`'s posture: read by every copy gate, checked
 * against no console.
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
export const APPLE_RELEASE_NOTES_SURFACE = "store/apple-release-notes.md";

/** Where `store/play-listing.md` starts quoting the listing rather than describing it. */
export const PLAY_VERBATIM_HEADING = "## Verbatim, as saved";

/**
 * Where `store/apple-release-notes.md` starts quoting the field rather than
 * explaining it. Deliberately a different wording from the Play heading —
 * *submitted*, not *saved* — because the Apple text is decided ahead of the
 * submission and mirrors no live value, while the Play block mirrors one.
 */
export const APPLE_RELEASE_NOTES_HEADING = "## Verbatim, as submitted";

/** One scannable piece of listing copy: a store field, or the whole Play block. */
export interface StoreListingEntry {
  surface: string;
  id: string;
  text: string;
}

/**
 * The blockquote under a heading, as a single string.
 *
 * ☠️ **It takes every `>` line from the heading to the END OF FILE**, which is
 * how the Play block has always been read and is now how the Apple one is too.
 * Both files say so in their own text, because the consequence is not obvious:
 * a blockquote added anywhere *below* the heading — quoting a defect, say — is
 * silently read as listing copy, and can turn a ban rule red on the very
 * string it was reporting. Quote anything else in a fence.
 */
function blockquoteUnder(markdown: string, heading: string, surface: string): string {
  const at = markdown.indexOf(heading);
  if (at === -1) {
    throw new Error(`${surface} has no "${heading}" section`);
  }
  const quoted = markdown
    .slice(at)
    .split("\n")
    .filter((line) => line.startsWith(">"))
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n")
    .trim();
  if (quoted === "") {
    throw new Error(`${surface}'s "${heading}" block quotes nothing`);
  }
  return quoted;
}

export function storeListingText(
  appleInfoJson: string,
  playListingMd: string,
  appleReleaseNotesMd: string,
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

  entries.push({
    surface: PLAY_VERBATIM_SURFACE,
    id: "verbatim",
    text: blockquoteUnder(playListingMd, PLAY_VERBATIM_HEADING, PLAY_VERBATIM_SURFACE),
  });

  entries.push({
    surface: APPLE_RELEASE_NOTES_SURFACE,
    id: "verbatim",
    text: blockquoteUnder(
      appleReleaseNotesMd,
      APPLE_RELEASE_NOTES_HEADING,
      APPLE_RELEASE_NOTES_SURFACE,
    ),
  });

  return entries;
}

const ROOT = path.resolve(__dirname, "..");

/** The committed listing text, read once per suite. */
export const STORE_LISTING_TEXT: StoreListingEntry[] = storeListingText(
  fs.readFileSync(path.join(ROOT, APPLE_INFO_SURFACE), "utf8"),
  fs.readFileSync(path.join(ROOT, PLAY_VERBATIM_SURFACE), "utf8"),
  fs.readFileSync(path.join(ROOT, APPLE_RELEASE_NOTES_SURFACE), "utf8"),
);
