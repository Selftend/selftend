/**
 * ☠️ **A banned word must not become a published pixel** (#2732, ruled on #2666,
 * map #2652).
 *
 * *"A long call with **mom**"* is live on the App Store — American spelling, in
 * `iphone-07-gratitude.png` and `ipad-07-gratitude.png` — **because nothing in
 * this repository could see it**. The words existed only as rows in a production
 * account and then as pixels, and [#2041](https://github.com/Selftend/selftend/issues/2041)
 * established the remedy for that is new captures, never a copy edit.
 *
 * Two files are the paths by which text becomes a published image, and until now
 * **neither was in any corpus**:
 *
 * - `scripts/seed-demo-data.mjs` — the dataset the captures photograph. Outside
 *   every corpus: `corpusFor` resolves to i18n values, the manifest, `README.md`,
 *   `CONTEXT.md`, `docs/product-principles.md`, `AGENTS.md`, tracked
 *   `docs/**\/*.md` and `STORE_LISTING_TEXT`. Repo-root `scripts/` is in none of
 *   them, and `test/source-scan.ts` walks only `app/` and `src/`.
 * - `docs/campaign/capture/shoot.js` — ⚠️ it **types content live into forms
 *   during capture**, so it publishes text that never existed in a database at
 *   all. Outside too, because `proseDocIds` filters to `.md`.
 *
 * ⭐ **This is the second line, not the first.** What stops the *production*
 * account's rows reaching a screenshot is #2730 — the captures stop
 * photographing an untracked account. No test can reach a database.
 *
 * ☠️ **DELIBERATELY NARROW: bans only, and NOT the full `HOUSE_STYLE_SPELLING`
 * set.** The table is genuinely American-spelled
 * (`20260908000000_favorites.sql`), so the seed legitimately contains
 * `from("favorites")`, `DEMO_FAVORITES` and `wipe("favorites")` — and that set's
 * first rule is `/\bfavorit(e|es|ed|ing)?\b/i`. Running it here would go **red on
 * correct code on day one**, and a guard red for a wrong reason gets narrowed,
 * carved out or muted. `color` is excluded for the same reason it is already
 * `scope: "i18n"` in the main suite: `theme_color`, `background_color`.
 *
 * That narrowing is this repo's established move, not a compromise —
 * `registry.test.ts` narrowed bare `release`/`update`/`survey` to compound forms
 * because *"progressive muscle RELEASE is a standard relaxation exercise"*.
 *
 * ⛔ **Bans only, never restatements.** `test/store-info-invariants.test.ts` says
 * why: *"asserting the subtitle's exact text would be a restatement that fails
 * the moment the listing legitimately changes."*
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

/** The two paths by which repository text becomes a published image. */
export const CAPTURE_CONTENT_FILES = [
  "scripts/seed-demo-data.mjs",
  "docs/campaign/capture/shoot.js",
] as const;

type Ban = {
  name: string;
  pattern: RegExp;
  /** The string this rule must match, so no rule is left unproven. */
  probe: string;
};

/**
 * ⚠️ **Every entry here must be impossible to write as code.** Anything that
 * could plausibly appear as an identifier, a table name, a CSS property or an
 * npm package belongs in the i18n-scoped suite, not here.
 */
export const CAPTURE_BANS: Ban[] = [
  {
    // The word that reached the App Store. American, and it cannot be an identifier.
    name: "en: mom (American)",
    pattern: /\bmom(s|my|mies)?\b/i,
    probe: "A long call with mom",
  },
  {
    // docs/positioning.md § Words never to use, row 1 - the one the table calls
    // unsafe rather than merely off-frame: "guided" implies a practitioner
    // Selftend does not employ. Same widened pattern as the main suite, which
    // allows one word between (#1872 found the frame's own "CBT" sitting there).
    name: "en: guided self-help",
    pattern: /\bguided\s+(?:[\w-]+\s+){0,1}self[-\s]help/i,
    probe: "Calm, guided self-help tools",
  },
];

function read(file: string): string {
  return readFileSync(resolve(ROOT, file), "utf8");
}

export function findBanned(source: string, bans: Ban[] = CAPTURE_BANS): string[] {
  return bans.filter((ban) => ban.pattern.test(source)).map((ban) => ban.name);
}

describe("the capture content files carry no banned word", () => {
  it.each(CAPTURE_CONTENT_FILES)("%s is readable and non-empty", (file) => {
    // Non-vacuous: if a file is moved or renamed, the scan below would pass over
    // nothing while appearing to protect it.
    expect(read(file).length).toBeGreaterThan(1000);
  });

  it.each(CAPTURE_CONTENT_FILES)("%s carries no banned word", (file) => {
    expect({ file, banned: findBanned(read(file)) }).toEqual({ file, banned: [] });
  });

  it("✅ seeds green with nothing grandfathered", () => {
    // docs/positioning.md:419 requires a ban be seeded with ZERO existing
    // violations, so the rule cannot be used to paper over published copy.
    const all = CAPTURE_CONTENT_FILES.flatMap((file) => findBanned(read(file)));
    expect(all).toEqual([]);
  });
});

/**
 * ☠️ **The positive controls.** Everything above reads two real files and is
 * green, so it would pass identically if every pattern were broken. Each rule
 * carries its own probe — the `registry.test.ts:216` convention, where six stems
 * were matched by no probe at all and *"a typo in any one would have passed
 * forever while the docblock cited the very convention it was breaking."*
 */
describe("the capture ban list, proved against fixtures", () => {
  it.each(CAPTURE_BANS)("the $name rule matches its own probe", ({ pattern, probe }) => {
    expect(pattern.test(probe)).toBe(true);
  });

  it("☠️ catches the exact string that reached the App Store", () => {
    expect(findBanned("await insert('gratitude', { text: 'A long call with mom' })")).toEqual([
      "en: mom (American)",
    ]);
  });

  it("catches the banned compound with a word wedged inside it", () => {
    // #1872: the frame's own "CBT" sat between "guided" and "self-help".
    expect(findBanned("a guided CBT self-help flow")).toEqual(["en: guided self-help"]);
  });

  it("⭐ does NOT fire on the British spelling the seed actually uses", () => {
    // The seed is "Mum"/"mum" throughout. If this ever went red the rule would
    // be banning correct content, which is how a guard gets deleted.
    expect(findBanned("Mum's voice on the phone. Good call with mum.")).toEqual([]);
  });

  it("☠️ does NOT fire on the `favorites` table, which is genuinely spelled that way", () => {
    // The single most important exclusion: 20260908000000_favorites.sql. If a
    // future edit adds the full HOUSE_STYLE_SPELLING set here, this goes red and
    // says why.
    expect(findBanned('await wipe("favorites"); const DEMO_FAVORITES = [];')).toEqual([]);
  });

  it("does NOT fire on CSS colour identifiers", () => {
    expect(findBanned('{ "theme_color": "#fff", "background_color": "#000" }')).toEqual([]);
  });

  it("does not treat `momentum` or `moment` as the banned word", () => {
    // A bare /mom/ would. The \b anchors are load-bearing.
    expect(findBanned("a moment of momentum, momentarily")).toEqual([]);
  });
});
