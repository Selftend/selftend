import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { HELP_KEYS } from "@/src/features/help/help-content";
import enHelp from "@/src/i18n/locales/en/help.json";
import bgHelp from "@/src/i18n/locales/bg/help.json";
import { sourceFiles, stripComments } from "@/test/source-scan";

/**
 * Every help key is reachable, and nothing outlives its key (#1546, map #1512).
 *
 * A help entry is only worth its strings if a user can open it. Six of nineteen
 * keys could not be: `distortions` plus all five ACT processes had no call site
 * anywhere, so four strings each sat in `help.json` — in both locales, on
 * Weblate — describing a sheet the app had no way to show. They had been built
 * and then removed by successive PillarCard redesigns, and nothing noticed for
 * months, because nothing was watching.
 *
 * ☠️ `test/i18n-key-coverage.test.ts` could never have caught them. It is
 * one-directional (a key used in code must resolve; a key nobody uses is fine)
 * *and* blind to template-literal keys — and help strings are addressed as
 * `` `${key}.title` ``, so the entire `help` namespace is outside its reach in
 * both directions. This is new ground, not an extension of that gate.
 *
 * Four clauses, each closing a hole the batch actually fell into:
 *
 * 1. every key has a door;
 * 2. every `help.json` entry block still has a key — the class that is
 *    otherwise *completely* unguarded (see clause 2's own note);
 * 3. every help PNG is still referenced;
 * 4. a help key is only ever named at a door.
 *
 * **Direction: forward only, deliberately.** The reverse — a literal naming a
 * key that is not in `HELP_KEYS` — is already a compile error, because every
 * consumer types the prop as `HelpKey` (`help-button.tsx`, `help-sheet.tsx`,
 * `help-sections.tsx`, `program-card.tsx`). Asserting it here would duplicate
 * `tsc` and rot. Do not add it back.
 *
 * **No exception mechanism, on purpose.** There are 18 keys, 18 doors and zero
 * orphans, so there is nothing to suppress and nothing that would ever expire.
 * A line-keyed suppression list was considered and rejected: it would have been
 * born holding the six orphans and emptied within the same batch, while
 * permanently installing the discretionary escape hatch that this family of
 * gates exists to refuse.
 *
 * Mechanism is a source scan rather than ESLint (which sees one file at a time
 * and so cannot assert anything about a *population*), and it lives here rather
 * than in `src/features/help/help-content.test.ts` — that suite imports modules
 * and resolves i18n, this one reads the repo from disk.
 */

const REPO = join(__dirname, "..");

/** The four strings every help entry carries; the shape clause 2 derives from. */
const ENTRY_FIELDS = ["title", "what", "how", "why"] as const;

/**
 * A door: a `helpKey` JSX attribute with a *literal* value, on any tag.
 *
 * ☠️ Tag-agnostic is a correctness requirement, not a shortcut. `program` and
 * `actProgram` carry their literal on `ProgramCard` (`cbt-program-card.tsx`,
 * `act-program-card.tsx`), one hop above the `HelpButton` that renders it — so
 * a scan restricted to `HelpButton` / `HelpSheet` / `HelpSections` would fail
 * two perfectly healthy keys.
 *
 * The `="` spelling is also exactly what excludes the object-property form
 * (`helpKey: "distortions"`) — by a single character. That matters: the
 * headline orphan of map #1512 was spelled that way, eleven entries deep in
 * `cbt-home-config.ts`, and a looser regex would have credited it and passed
 * vacuously on the very key the map existed to find. Clause 4 bans that form
 * outright so the distinction can never quietly stop holding.
 */
const DOOR = /\bhelpKey\s*=\s*"([A-Za-z]+)"/g;

/** The object-property form clause 4 bans. Not a door; the repo's twice-burned shape. */
const KEY_AS_PROPERTY = /\bhelpKey\s*:\s*"/;

/**
 * `src` + `app`, prose blanked, string literals KEPT — the key lives inside the
 * literal, so blanking strings would erase the very thing being looked for.
 *
 * ☠️ No import-graph walk, unlike `escape-coverage`. That suite follows
 * re-export hops because a route reaches its chrome *through another file*; a
 * door is an attribute in the file that renders it, so a flat scan sees every
 * one and the re-export trap simply does not apply here.
 *
 * `sourceFiles` skips `*.test.ts(x)` by default, which is what keeps the
 * `helpKey="beliefs"` / `helpKey="worry"` fixtures in the help component tests
 * from counting as doors — no exclusion list needed.
 *
 * Comments are blanked so an epitaph describing a *removed* field can never be
 * credited as a live one. Two such notes already exist (`shared-tools-row.tsx`
 * and `cbt-home-config.ts`, both recording deletions of this exact field).
 */
const sources = sourceFiles(REPO, { dirs: ["src", "app"] }).map((file) => ({
  file,
  code: stripComments(readFileSync(join(REPO, file), "utf8")),
}));

/** Every `helpKey="…"` literal found, as [key, file]. */
const literals = sources.flatMap(({ file, code }) =>
  [...code.matchAll(DOOR)].map((match) => ({ key: match[1], file })),
);

const doors = new Set(literals.map(({ key }) => key));

describe("help keys have doors", () => {
  /**
   * Anti-vacuity is mostly structural here, unlike `escape-coverage`: the
   * population being asserted about is `HELP_KEYS`, an imported typed array
   * rather than a directory walk, so it cannot silently shrink — a broken regex
   * yields zero doors and fails loudly, naming every key.
   *
   * This one pin covers the remaining case: a regex that still matches
   * *something*, just not the right thing. Deliberately far below the current
   * count, because it only has to catch a scan that has stopped working — NOT
   * to police how many keys exist. Pinning the key count would make adding a
   * nineteenth key fail here for no reason; only forgetting its door should.
   */
  it("finds help-key literals at all, so the assertions below cannot pass vacuously", () => {
    expect(literals.length).toBeGreaterThan(10);
  });

  it("gives every help key a door", () => {
    const missing = HELP_KEYS.filter((key) => !doors.has(key)).map(
      (key) =>
        `${key}: no \`helpKey="${key}"\` in src/ or app/. Either give it a door — usually ` +
        `\`right={<HelpButton helpKey="${key}" />}\` on the screen's ScreenHeader — or remove ` +
        `it in all FIVE places: HELP_KEYS (help-content.ts), the "${key}" block in ` +
        `en/help.json AND bg/help.json, the HELP_IMAGES entry, and the PNG in ` +
        `assets/images/help/.`,
    );

    expect(missing).toEqual([]);
  });

  /**
   * ☠️ The repo has been burned by this shape twice — `SharedTool.helpKey`
   * (#1198) and `PILLAR_STRATEGIES.helpKey`, the latter a partial-restore
   * artefact that outlived its button by four commits. Both declared a help key
   * in a config object that nothing read, which reads exactly like a door
   * without being one.
   *
   * Banning the form is what lets `DOOR` stay a one-line regex: with no
   * `helpKey: "…"` anywhere, `="` versus `:` cannot degrade into a subtle
   * miscount.
   */
  it("names a help key only at a door, never as an object property", () => {
    const offenders = sources
      .filter(({ code }) => KEY_AS_PROPERTY.test(code))
      .map(
        ({ file }) =>
          `${file}: declares a help key as an object property (\`helpKey: "…"\`). A help key ` +
          `belongs on a rendered component as \`helpKey="…"\`; in a config object it is data ` +
          `nothing reads — the exact shape deleted in #1198 and again in #1544.`,
      );

    expect(offenders).toEqual([]);
  });
});

/**
 * ☠️ THE UNGUARDED CLASS. Remove a key from `HELP_KEYS` and leave its block in
 * `help.json`, and every existing test still passes: en/bg parity holds (both
 * files kept the block), every remaining key resolves, and
 * `i18n-key-coverage.test.ts` is blind to the namespace by construction. The
 * dead strings simply live on Weblate forever, offered to translators for a
 * sheet that no longer exists. Deleting the `distortions` entry (#1545) is
 * precisely the change that would have exercised this.
 *
 * `ui` — the sheet's own chrome (`whatLabel`, `howLabel`, `whyLabel`,
 * `helpPrefix`) — is exempted BY SHAPE, never by a hand-written list: a block
 * is an entry if and only if it carries all four of title/what/how/why. A named
 * exemption would be satisfied forever by whatever it was written against; a
 * derived one keeps working when a second chrome block appears.
 *
 * Both locales are checked even though `help-content.test.ts` already forces
 * their top-level keys equal. That parity is a different suite's invariant, and
 * this clause should not silently inherit its correctness from it.
 */
describe.each([
  ["en", enHelp],
  ["bg", bgHelp],
])("%s/help.json entry blocks", (locale, bundle) => {
  const blocks = Object.entries(bundle as Record<string, Record<string, unknown>>);
  const has = (block: Record<string, unknown>, field: string) => typeof block[field] === "string";

  const entryBlocks = blocks
    .filter(([, block]) => ENTRY_FIELDS.every((field) => has(block, field)))
    .map(([name]) => name);

  it("has a key for every entry block", () => {
    const keys = new Set<string>(HELP_KEYS);
    const orphans = entryBlocks
      .filter((name) => !keys.has(name))
      .map(
        (name) =>
          `${locale}/help.json: "${name}" is a full help entry with no HELP_KEYS entry, so ` +
          `nothing can ever render it. Delete the block from BOTH locales, or add "${name}" ` +
          `back to HELP_KEYS and give it a door.`,
      );

    expect(orphans).toEqual([]);
  });

  it("has an entry block for every key", () => {
    const present = new Set(entryBlocks);
    const missing = HELP_KEYS.filter((key) => !present.has(key)).map(
      (key) =>
        `${locale}/help.json: no complete "${key}" block, but "${key}" is in HELP_KEYS. Add ` +
        `all four of ${ENTRY_FIELDS.join("/")} for it in this locale.`,
    );

    expect(missing).toEqual([]);
  });

  /**
   * A half-deleted entry would otherwise hide as chrome: strip three of its four
   * fields and the shape test above stops recognising it as an entry at all, so
   * it slips past both directions silently.
   */
  it("has no half-written entry block", () => {
    const partial = blocks
      .filter(
        ([, block]) =>
          ENTRY_FIELDS.some((field) => has(block, field)) &&
          !ENTRY_FIELDS.every((field) => has(block, field)),
      )
      .map(([name, block]) => {
        const absent = ENTRY_FIELDS.filter((field) => !has(block, field));
        return (
          `${locale}/help.json: "${name}" has some help fields but is missing ` +
          `${absent.join("/")}. Complete it, or delete the block entirely — a partial block ` +
          `is read as chrome and checked by nothing.`
        );
      });

    expect(partial).toEqual([]);
  });
});

/**
 * ☠️ `tsc` forces the `HELP_IMAGES` entry out but NEVER the file on disk.
 * `HELP_IMAGES` is a `Partial<Record<HelpKey, …>>`, so an entry for a deleted
 * key fails the excess-property check (TS2353) — but the PNG it pointed at
 * survives in git, shipped and unreferenced. `distortion_guide.png` was 465 KB,
 * the largest help image in the app.
 *
 * A substring match against the module's own source is enough because a
 * filename appears in exactly one place: its `require()`.
 *
 * ⚠️ Only this direction is asserted. An entry with no PNG is already a build
 * error, and a key with NO image is perfectly legal — images are optional and
 * the sheet renders conditionally — so asserting that inverse would quietly
 * mandate an illustration for every future key.
 *
 * This clause cannot go vacuous the way a filtered walk can: `readdirSync`
 * throws if the directory ever moves, rather than returning an empty list.
 */
describe("help images", () => {
  const IMAGES_MODULE = "src/features/help/help-images.ts";
  const HELP_IMAGE_DIR = "assets/images/help";

  it("references every PNG in assets/images/help/", () => {
    const source = readFileSync(join(REPO, IMAGES_MODULE), "utf8");
    const unreferenced = readdirSync(join(REPO, HELP_IMAGE_DIR))
      .filter((name) => name.endsWith(".png"))
      .filter((name) => !source.includes(name))
      .map(
        (name) =>
          `${HELP_IMAGE_DIR}/${name} is not referenced by ${IMAGES_MODULE}, so it ships in ` +
          `the bundle and renders nowhere. Delete the file, or add its HELP_IMAGES entry.`,
      );

    expect(unreferenced).toEqual([]);
  });
});
