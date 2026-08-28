import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { HELP_KEYS } from "@/src/features/help/help-content";
import bgHelp from "@/src/i18n/locales/bg/help.json";
import enHelp from "@/src/i18n/locales/en/help.json";
import { sourceFiles, stripComments } from "@/test/source-scan";

/**
 * Every help key is reachable, and nothing outlives its key (#1546, from map #1512).
 *
 * Six of nineteen `HELP_KEYS` had no call site anywhere - four sheets of written
 * content each, in two locales, that no user could ever open. Nothing failed.
 * `test/i18n-key-coverage.test.ts` could not have caught them: it is one-directional
 * *and* blind to template-literal keys, and a help entry is built as `${key}.title`,
 * so the whole `help` namespace is outside its reach in both directions.
 *
 * A source scan rather than ESLint, because a lint rule sees one file at a time and
 * this has to assert a *population*. Separate from `src/features/help/help-content.test.ts`,
 * which imports modules and reads i18n; this one reads the repo from disk, joining
 * `escape-coverage`, `nav-singular` and `accent-ink-call-sites` as a source-scan gate.
 *
 * ☠️ No import-graph walk, unlike `escape-coverage`. That suite follows re-export hops
 * because a route reaches its chrome through another file; a door is an attribute in the
 * file that renders it. A flat scan over `src` + `app` sees every one. (The residual: a
 * `.web.tsx` fork's door would credit native too. No fork exists on the help path.)
 *
 * **Direction: forward only.** The reverse - a literal naming a key absent from
 * `HELP_KEYS` - is already a compile error, because the prop is typed `HelpKey` at
 * `help-button.tsx`, `help-sheet.tsx`, `help-sections.tsx` and `program-card.tsx`.
 * Asserting it here would duplicate `tsc`, so it is deliberately absent; do not add it.
 *
 * **No exception, suppression or allow list.** The three tickets before this one left 18
 * keys, 18 doors and zero orphans, so there is nothing to suppress - and a list seeded at
 * birth with the six orphans would have emptied within the same batch while permanently
 * installing the discretionary mechanism these gates exist to refuse.
 */

const REPO = join(__dirname, "..");

/**
 * A door is `helpKey="literal"` as a JSX attribute, **on any tag**.
 *
 * ☠️ Tag-agnostic is a correctness requirement, not a simplification: `program` and
 * `actProgram` carry their literal on `ProgramCard` (`cbt-program-card.tsx`,
 * `act-program-card.tsx`), one hop above `HelpButton`, so a scan restricted to the help
 * components would fail two healthy keys. The `="` spelling is what excludes the
 * `helpKey:` object-property form by a single character - which matters, because
 * `cbt-home-config.ts` once spelled `helpKey: "distortions"`, the orphan itself, eleven
 * entries deep, where a looser scan would have credited it and passed vacuously on the
 * headline case.
 *
 * Dynamic props (`helpKey={helpKey}`) are not doors, so the help components' own
 * pass-throughs contribute nothing and need no exemption - a hard-coded key inside one
 * would be a bug worth surfacing, not a case worth exempting.
 */
const DOOR = /\bhelpKey\s*=\s*"([A-Za-z]+)"/g;

/** `helpKey` as an object property with a literal value - the #1198 / #1544 shape. */
const OBJECT_PROPERTY = /\bhelpKey\s*:\s*"/;

/**
 * Comments blanked, string literals KEPT - the key lives inside the literal. Blanking
 * prose is what stops `shared-tools-row.tsx`'s #1198 epitaph, which names `helpKey` in
 * a sentence, from reading as a call site.
 *
 * `sourceFiles` skips `*.test.ts(x)` by default, which is why the `helpKey="beliefs"` and
 * `helpKey="worry"` literals in the help components' own tests cost nothing to exclude.
 */
const scannedSources = (): { file: string; source: string }[] =>
  sourceFiles(REPO, { dirs: ["src", "app"] }).map((file) => ({
    file,
    source: stripComments(readFileSync(join(REPO, file), "utf8")),
  }));

const doorLiterals = scannedSources().flatMap(({ file, source }) =>
  [...source.matchAll(DOOR)].map((match) => ({ file, key: match[1] })),
);

describe("every help key has a door", () => {
  /**
   * Anti-vacuity is mostly structural here: the population is `HELP_KEYS`, an imported
   * typed array rather than a directory walk, so it cannot shrink silently - a broken
   * regex yields zero doors and fails loudly naming all 18 keys. This floor catches the
   * other half, a regex that matches *something* but not the right thing. It is well
   * under the real count on purpose: a nineteenth key must be free to add, and only
   * forgetting its door should cost anything, so no key count is pinned anywhere here.
   */
  it("finds door literals at all, so the assertion below cannot pass vacuously", () => {
    expect(doorLiterals.length).toBeGreaterThan(10);
  });

  it("names each of them at a call site", () => {
    const doors = new Set(doorLiterals.map(({ key }) => key));

    const orphans = HELP_KEYS.filter((key) => !doors.has(key)).map(
      (key) =>
        `${key}: no helpKey="${key}" in src/ or app/, so its sheet cannot be opened. ` +
        `Either give it a door - usually right={<HelpButton helpKey="${key}" />} in the ` +
        `screen's ScreenHeader - or delete it in all five places: the HELP_KEYS entry, ` +
        `the ${key} block in en/help.json AND bg/help.json, the HELP_IMAGES entry, and ` +
        `the PNG in assets/images/help/.`,
    );

    expect(orphans).toEqual([]);
  });
});

/**
 * ☠️ The class nothing else guards: a `help.json` block that outlives its key.
 *
 * Remove a key from `HELP_KEYS` and leave the JSON, and en/bg parity still holds, every
 * remaining key still resolves, and `i18n-key-coverage` is blind by construction - so
 * every test in the repo passes while eight dead strings live on Weblate forever.
 *
 * `ui` (the sheet's chrome: `whatLabel`, `howLabel`, `whyLabel`, `helpPrefix`) is exempted
 * **by shape, never by a hand list**, in the spirit of `escape-coverage`'s `isRedirectStub`:
 * a block is an entry iff it carries all four of `title`/`what`/`how`/`why`, and chrome iff
 * it carries none. A block carrying *some* of them is a half-deleted entry, and is reported
 * rather than quietly reclassified as chrome.
 *
 * Run over both locales even though `help-content.test.ts` asserts they hold equal keys:
 * that parity is a different suite's invariant, and this clause should not silently depend
 * on it.
 */
describe.each([
  ["en", enHelp],
  ["bg", bgHelp],
])("src/i18n/locales/%s/help.json holds exactly the live help entries", (locale, bundle) => {
  const ENTRY_FIELDS = ["title", "what", "how", "why"];

  const blocks = Object.entries(bundle as Record<string, unknown>)
    .filter((entry): entry is [string, Record<string, unknown>] => typeof entry[1] === "object")
    .map(([name, block]) => ({
      name,
      present: ENTRY_FIELDS.filter((field) => field in block),
    }));

  it(`reads the ${locale} bundle at all, so the assertions below cannot pass vacuously`, () => {
    expect(blocks.length).toBeGreaterThan(10);
  });

  it("leaves no block half-deleted", () => {
    const partial = blocks
      .filter(({ present }) => present.length > 0 && present.length < ENTRY_FIELDS.length)
      .map(
        ({ name, present }) =>
          `${name}: has ${present.join("/")} but not all of ${ENTRY_FIELDS.join("/")}. ` +
          `A help entry carries all four; finish the deletion or restore the missing fields.`,
      );

    expect(partial).toEqual([]);
  });

  it("holds one entry block per help key, and no others", () => {
    const entries = blocks
      .filter(({ present }) => present.length === ENTRY_FIELDS.length)
      .map(({ name }) => name)
      .sort();

    // Both directions in one assertion, so jest's diff names the surplus (a block whose
    // key is gone - its strings are dead and still translatable on Weblate) and the
    // missing (a key with no copy) at once.
    expect(entries).toEqual([...HELP_KEYS].sort());
  });
});

/**
 * ☠️ `tsc` forces a stale `HELP_IMAGES` entry out - the type is
 * `Partial<Record<HelpKey, …>>`, so an entry naming a deleted key is an excess property
 * (TS2353) - but it never touches the file on disk. Removing the `require()` is what
 * shrinks the bundle; the PNG survives in git until somebody deletes it deliberately.
 * The six orphan keys' images were 2.06 MiB, 32 % of the directory.
 *
 * The two inverses are deliberately NOT asserted: an entry with no key is the compile
 * error above, and a key with no image is legal (images are optional, `help-sheet.tsx`
 * renders one conditionally), so asserting it would silently mandate an image for every
 * future key.
 */
describe("every help illustration is referenced", () => {
  const IMAGE_DIR = "assets/images/help";

  const pngs = readdirSync(join(REPO, IMAGE_DIR)).filter((file) => file.endsWith(".png"));
  // A filename appears in exactly one place in the repo, so a substring match against
  // `help-images.ts`'s own source is the whole test.
  const registry = readFileSync(join(REPO, "src/features/help/help-images.ts"), "utf8");

  it("finds the illustrations at all, so the assertion below cannot pass vacuously", () => {
    expect(pngs.length).toBeGreaterThan(10);
  });

  it("names each of them in help-images.ts", () => {
    const unreferenced = pngs
      .filter((png) => !registry.includes(png))
      .map(
        (png) =>
          `${IMAGE_DIR}/${png}: no require() in src/features/help/help-images.ts. ` +
          `It ships in the bundle reachable by nothing - delete the file, or add the ` +
          `HELP_IMAGES entry that was meant to use it.`,
      );

    expect(unreferenced).toEqual([]);
  });
});

/**
 * A help key is only ever named at a door.
 *
 * The repo has been burned by the config-declared variant twice: #1198 deleted
 * `SharedTool.helpKey`, and `PILLAR_STRATEGIES.helpKey` (#1544) sat unread across eleven
 * entries for months, a partial-restore artefact of a redesign that removed the button but
 * kept the data. Both looked like reachability from a grep and were nothing of the kind.
 */
describe("no help key is declared as data", () => {
  it("keeps helpKey out of object literals in src/ and app/", () => {
    const declarations = scannedSources()
      .filter(({ source }) => OBJECT_PROPERTY.test(source))
      .map(
        ({ file }) =>
          `${file}: declares helpKey as an object property. A help key belongs at a JSX ` +
          `door (helpKey="…"), never in config - data nothing renders reads as ` +
          `reachability to every grep and to no user.`,
      );

    expect(declarations).toEqual([]);
  });
});
