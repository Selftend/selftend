import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { LOCALE_STRINGS, type Locale } from "@/test/locale-strings";
import { APP_STORE_CAPS } from "@/test/store-caps";

/**
 * The merge-gate half of `docs/positioning.md` (#1611, spec'd by #1606).
 *
 * `docs/positioning.md` says what Selftend is. This is the part of it a machine
 * can hold. It is the same family as `test/restraint-copy.test.ts` - copy read
 * off disk, failing `verify` on a banned phrasing - and it exists for the same
 * reason: a positioning decision that lives only in a closed issue is a
 * decision the next person with a good idea reverses without knowing.
 *
 * ☠️ **IT WAS SEEDED DELIBERATELY SHORT, AND #1616 IS ITS FIRST GROWTH RING.**
 * The loudest positioning decision on the map - that "guided self-help" is
 * unsayable, because it is a clinical term meaning *with a practitioner* and
 * Selftend has none - could not be guarded on arrival: it shipped in 22 i18n
 * strings plus the PWA manifest and three prose docs, and #1606 rejected a
 * 22-entry suppression list on the grounds that a list that size silently
 * becomes permanent. So the copy was fixed first and the rule joined this file
 * in the SAME change, with no exemptions - the only order that leaves the guard
 * meaning what it says. The frame-spelling invariant (map defect 12, #1627) is
 * the second ring and landed the same way; the plain noun beneath it (#1638) is
 * the third, and is the one nobody had promised - #1627 closed believing it was
 * the last rule this file would need, and the copy disagreed the following day.
 *
 * What was seeded originally are the rules with zero live violations - which, as
 * #1606 put it, turn out to be the highest-consequence ones on the map: the
 * claims a person writing marketing copy in good faith reaches for first.
 *
 * ☠️ **ONE-SIDED UNTIL #1790, AND THE EXCEPTION IS NAMED RATHER THAN QUIET.**
 * #1606 §9 seeded this file as bans only: *"There is no assertion that the hero
 * contains 'CBT', because that pins a string and fails on any legitimate
 * rewrite."* #1759 re-weighed that and declined to change it. #1790 overturned
 * it for ONE rule, on a fact neither of them had: the repositioning (#2004)
 * took CBT out of the category noun, so the noun no longer carries the method
 * onto the surfaces it reaches, and `docs/positioning.md`'s clause 1 became the
 * only thing keeping the method on a surface - under a heading that says no
 * gate can enforce it.
 *
 * ⚠️ The rewrite objection is answered by scope rather than waved away: the one
 * positive rule asserts the METHOD IS PRESENT, never that a sentence is equal,
 * and it runs only over surfaces this repo ships. See the ring at the bottom of
 * this file for what it covers and the two things it deliberately does not.
 *
 * ⚠️ Unchanged by that: #1604's real positive rule - the everyday tools are an
 * on-ramp, never listed flat beside the programme - is a judgement no regex
 * reaches. It stays in `docs/positioning.md` in prose precisely so nobody
 * builds a brittle gate for it here, watches it fail on good copy, and deletes
 * the whole file.
 */

const ROOT = path.resolve(__dirname, "..");

/** One scannable piece of copy: an i18n string, or a whole file. */
interface Scanned {
  surface: string;
  id: string;
  text: string;
}

function readFile(relative: string): Scanned {
  return {
    surface: relative,
    id: relative,
    text: fs.readFileSync(path.join(ROOT, relative), "utf8"),
  };
}

/**
 * The same, with markup replaced by whitespace — for the artwork sources in
 * `RENDERED_ARTWORK_SOURCES`.
 *
 * ☠️☠️ **WITHOUT THIS, ADDING THE FILE TO THE CORPUS GUARDS NOTHING, AND
 * THE SUITE IS GREEN EITHER WAY.** Every rule in this file is a regex over a
 * flat string, and the phrases they ban are multi-word. In an HTML document a
 * tag can fall between any two of those words — and in the file this was
 * written for, one did: the headline was
 *
 *     <h1>Calm, guided <span class="accent">self-help</span></h1>
 *
 * `\bguided\s+(?:[\w-]+\s+){0,1}self[-\s]help` does not match that, because
 * `<span class="accent">` is not `[\w-]+`. So the corpus entry would have been
 * added in response to a live violation, over the exact file carrying it, and
 * reported clean — the worst outcome available, because it also looks like
 * proof the rest of the repository is clean.
 *
 * Replaced with a SPACE and never the empty string: `a<br>b` is two words, and
 * concatenating it into `ab` would hide a phrase as surely as splitting one.
 */
function readArtworkSource(relative: string): Scanned {
  return {
    surface: relative,
    id: relative,
    text: fs.readFileSync(path.join(ROOT, relative), "utf8").replace(/<[^>]+>/g, " "),
  };
}

/**
 * Copy a user reads inside the product. The i18n half is read via
 * `locale-strings` rather than imported, so a namespace added tomorrow is
 * covered the day its file lands - the property `restraint-copy` was written
 * for after a namespace-scoped guard had been wrong twice.
 */
const USER_FACING: Scanned[] = [
  ...(["en", "bg"] as const).flatMap((locale) =>
    LOCALE_STRINGS[locale].map(({ namespace, key, text }) => ({
      surface: `i18n/${locale}`,
      id: `${namespace}:${key}`,
      text,
    })),
  ),
  readFile("public/manifest.webmanifest"),
  readFile("public/index.html"),
];

/**
 * The i18n half of `USER_FACING`, on its own.
 *
 * ☠️ The house-style spelling rules (#1639) MUST run against this and not
 * against `USER_FACING`, because the two static files in that list are full of
 * CSS and manifest tokens that are correctly American and are not copy at all:
 * `theme_color` and `background_color` in `manifest.webmanifest`,
 * `prefers-color-scheme`, `theme-color` and `backgroundColor` in `index.html`.
 * A `colour` rule at `user-facing` scope goes red on all five on the day it
 * lands - the over-sweep failure that gets a guard deleted rather than fixed.
 */
const I18N_VALUES: Scanned[] = USER_FACING.filter(({ surface }) => surface.startsWith("i18n/"));

/**
 * Docs that REPRODUCE something already published, and the one doc these rules
 * come from. They are excluded from the prose corpus below — and the distinction
 * matters, because this is a list of files that are not copy, never a list of
 * violations that are tolerated.
 *
 * A record's job is to match the artefact it records, not the current
 * positioning. Editing one does not change the artefact; it only makes the
 * record lie about it.
 *
 *   - `positioning.md` is the document the rules come from, so it necessarily
 *     quotes every banned phrasing in order to ban it. Same reason it is absent
 *     from `ALL_SURFACES`.
 *   - `app-store-review-information.md` is the reply ALREADY SENT to Apple for
 *     build 6, and its own line 84 forbids syncing it until the build under
 *     review carries the change.
 *   - `app-store-recording-script.md` quotes the sign-in copy as it was when a
 *     video was recorded. Correcting the quote would make the script describe a
 *     recording that does not exist.
 *   - `android-closed-testing.md` reproduces the LIVE Play short and full
 *     descriptions verbatim, inside fenced blocks. It changes when the listing
 *     changes — which is an owner action in App Store Connect and Play Console,
 *     not a file edit. ☠️ #1644 listed only `store/play-listing.md` for that;
 *     fixing one without the other silently desynchronises them.
 *   - `campaign/scripts/` are the narrations of eight videos already recorded.
 *     Changing a script does not change a recording. ☠️ Those eight went
 *     **Private** on 2026-09-06 (#1965) rather than being re-narrated — the
 *     owner declined the re-record — so the compound they spell is no longer
 *     public. The recordings themselves are untouched, so this exclusion and
 *     the `cbt.md` pin below both still hold, and editing a script would still
 *     make it lie.
 *   - `launch/` holds a published Reddit banner, and the July closed-testing
 *     thread as it went out. ☠️ It does NOT hold only records, and is carved
 *     back out TWICE: the Play feature graphic's HTML source is regenerated on
 *     demand rather than published once (`RENDERED_ARTWORK_SOURCES`, #2022),
 *     and the Reddit promotion package is seven drafts nobody has posted yet
 *     (`READY_TO_POST_DRAFTS`, #1901). Both carve out per FILE and neither
 *     drops the entry, because what is left under `launch/` really is history.
 *   - `design/1822-before/` transcribes every LIVE surface verbatim (#1822), so
 *     that #1823 can diff its rewrite against what a visitor actually sees. It
 *     exists BECAUSE the live copy violates these rules: `main` is 117 commits
 *     behind `dev`, so the #1616 fix is merged and unreleased, and the banned
 *     compound is live 11 times. ☠️ Correcting the quotes would delete the only
 *     record of that gap and make the "before" describe a release that has not
 *     shipped. It stops being a record the moment the surfaces are recaptured.
 *   - `design/1825-handoff/prompt.md` is the Claude Design brief (#1825). Like
 *     `positioning.md`, and for the same reason, it QUOTES the banned phrases
 *     in order to ban them — the designer reads the brief and never the repo,
 *     so a rule the brief cannot spell out is a rule the designer cannot obey.
 *     Only the prompt file is excluded; the README beside it stays scanned.
 *   - `design/1980-handoff/prompt.md` is the DBT module's Claude Design brief
 *     (#1994), the same shape for the same reason: its "Never write" table
 *     spells the American spellings and the banned phrases out to ban them.
 *     Only the prompt file is excluded; the README and the spec it is drawn
 *     from (`modules/dbt-mckay-skills-workbook.md`) stay scanned - the spec
 *     cites the workbook without spelling its American title.
 */
const PUBLISHED_RECORDS = [
  "docs/positioning.md",
  "docs/app-store-review-information.md",
  "docs/app-store-recording-script.md",
  "docs/android-closed-testing.md",
  "docs/campaign/scripts/",
  "docs/design/1822-before/",
  "docs/design/1825-handoff/prompt.md",
  "docs/design/1980-handoff/prompt.md",
  "docs/launch/",
];

/**
 * Every path git is tracking under `docs/`, repo-relative and POSIX-separated.
 *
 * ☠️☠️ **READING A CORPUS OFF DISK IS RIGHT FOR `src/i18n/locales/` AND WRONG
 * FOR `docs/`, AND #1908 IS WHERE THAT DIFFERENCE COST SOMETHING.** The walk
 * below is what keeps a doc added tomorrow covered without anyone remembering
 * to list it, and it is safe over the locales tree because that tree has no
 * untracked members. `docs/` does: `docs/superpowers/` is gitignored
 * (`.gitignore:63`) and holds old plans and copy audits that legitimately quote
 * the banned compound in order to record it. So the working tree and the git
 * index disagree, and the corpus was built from the wrong one — **six offenders
 * on a clean `dev`, all of them gitignored scratch, and green in CI, on the
 * machine of the person most likely to act on it.**
 *
 * That is the exact failure `docs/positioning.md` says twice gets a guard
 * deleted rather than fixed: red on files that are not copy at all. The index
 * is what CI scans, so the index is what the corpus is intersected with.
 *
 * ⚠️ This is a filter, never the source. Discovery stays the disk walk, so a
 * committed doc still cannot hide by being absent from a list — and an
 * `execSync` that fails takes the whole suite down loudly rather than returning
 * an empty set and making every prose rule vacuously green.
 */
const TRACKED_DOCS: ReadonlySet<string> = new Set(
  execFileSync("git", ["ls-files", "-z", "--cached", "--", "docs"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean),
);

/**
 * Copy filed under a `PUBLISHED_RECORDS` directory that has NOT gone out yet,
 * carved back into the scan (#1901).
 *
 * ☠️☠️ **A DIRECTORY EXEMPTION EARNED BY ONE FINISHED ARTEFACT SILENTLY
 * COVERS EVERY UNFINISHED ONE FILED BESIDE IT.** `docs/launch/` is excluded
 * because it holds a posted Reddit banner, and a record's job is to match the
 * artefact it records rather than the current positioning.
 * `reddit-promotion-package.md` then landed in that same directory carrying
 * seven ready-to-post drafts written around 2026-08-19 — before
 * `positioning.md` existed — and inherited an exemption it had never earned.
 * They drifted through two repositionings (#1616, #2003) and no gate could say
 * so, because the gate had been told this directory was history.
 *
 * The test a directory cannot apply per file, this list can, and it is not
 * "image vs doc" but whether the artefact is FINISHED. A posted banner is
 * finished: editing its source changes nothing anyone can see and only makes
 * the record lie. A draft is inventory, and the file's own copy rules invite
 * whoever posts it to edit it first. Copy you are invited to rewrite is copy,
 * and copy is gated — the same line #2022 drew for the feature graphic,
 * reached from the other side of the same directory.
 *
 * ⚠️ **THIS CARVES OUT; IT DOES NOT DROP THE EXEMPTION**, following #2022
 * deliberately. `reddit-post-android-closed-testing.md` beside it is the July
 * thread as it was posted, and stays out.
 *
 * ☠️ **PROSE SCOPE ONLY, WHICH IS A MEASUREMENT AND NOT TIMIDITY.** The
 * tempting next step is to treat ready-to-post marketing copy the way
 * `STORE_LISTING_TEXT` is treated, appended to every scope. That goes red on
 * the day it lands: the r/reactnative draft quotes `behavior="padding"`, a
 * React Native prop name that is correctly American, and the house-style rules
 * would fail the file over an API it does not get to rename. This document is
 * a package — drafts, sub research, verdicts and checklists — not marketing
 * prose end to end, which is exactly the property #1760 relied on for the
 * store listings. A guard that fails on good copy gets deleted rather than
 * fixed.
 */
const READY_TO_POST_DRAFTS = ["docs/launch/reddit-promotion-package.md"];

/**
 * The corpus filter, extracted so it can be exercised on synthetic input: on a
 * clean checkout — CI, or any worktree — the gitignored tree simply is not
 * there, so the bug is invisible to a test that can only read this machine.
 */
function proseDocIds(walked: string[], tracked: ReadonlySet<string>): string[] {
  return walked
    .filter((file) => file.endsWith(".md"))
    .filter((file) => tracked.has(file))
    .filter(
      (file) =>
        READY_TO_POST_DRAFTS.includes(file) ||
        !PUBLISHED_RECORDS.some((record) => file.startsWith(record)),
    )
    .sort();
}

/**
 * Artwork that is TEXT in this repository and pixels everywhere else (#2022).
 *
 * ☠️☠️ **"IT IS AN IMAGE, SO NO GATE CAN SEE IT" IS HALF WRONG, AND THE WRONG
 * HALF IS THE ONE THAT COSTS SOMETHING.** The Play feature graphic published the
 * banned compound as its headline for the whole of the #1616 → #2003
 * repositioning, and every account of it — the ticket that found it, and
 * `store/play-listing.md` — explained the miss by saying a PNG is unreadable to
 * a gate. True, and beside the point: the PNG is a *screenshot* of
 * `feature-graphic.html`, which is text, tracked, and sitting in this repository
 * the entire time. The words were greppable; nothing was grepping them.
 *
 * They fell through two filters at once, and neither was aimed at them:
 *
 *   1. `proseDocIds` keeps `.md` files only, because the corpus was built to
 *      walk a documentation tree. An `.html` file is not a doc, so it was never
 *      a candidate.
 *   2. `docs/launch/` is a `PUBLISHED_RECORDS` entry, earned by the Reddit
 *      banner beside it — a banner posted once, whose source must keep matching
 *      the image on Reddit rather than the current positioning.
 *
 * ⚠️ **The exclusion is right about the banner and wrong about the graphic, and
 * the difference is not "image vs doc" — it is whether the artefact is FINISHED.**
 * A posted banner is a record: editing its source changes nothing that anyone
 * can see, and would only make the record lie. A store asset is live inventory:
 * `docs/launch/play-listing/README.md` says in as many words to edit this file
 * and re-screenshot, and the listing takes whatever it is regenerated into. A
 * file the repository invites you to rewrite is copy, and copy is gated.
 *
 * Only the `guided self-help` rules reach here, exactly as for the prose docs —
 * so this adds one file's worth of banned-compound coverage and no house-style
 * or user-facing rule, which would go red on the CSS this file is mostly made of.
 *
 * ☠️ These are read through `readArtworkSource`, never `readFile`, and that is
 * not a detail: the headline that prompted all of this had a `<span>` sitting
 * between the two banned words, which every rule here is blind to. See that
 * function.
 */
const RENDERED_ARTWORK_SOURCES = ["docs/launch/play-listing/feature-graphic.html"];

/**
 * Contributor-facing prose: `AGENTS.md` and the docs tree, minus the records
 * above and minus anything git is not tracking — plus the rendered-artwork
 * sources above, which are neither prose nor Markdown but are copy. Only the
 * `guided self-help` rules run over this — see their block for why that phrase,
 * and only that phrase, can safely reach this far.
 */
const PROSE_DOCS: Scanned[] = [
  ...[
    "AGENTS.md",
    ...proseDocIds(
      fs
        .readdirSync(path.join(ROOT, "docs"), { recursive: true, encoding: "utf8" })
        .map((entry) => `docs/${entry.split(path.sep).join("/")}`),
      TRACKED_DOCS,
    ),
  ].map(readFile),
  ...RENDERED_ARTWORK_SOURCES.map(readArtworkSource),
];

/**
 * The user-facing copy plus the three prose surfaces that also declare what
 * Selftend is. `README.md` and `CONTEXT.md` are the two files a stranger and an
 * agent session respectively read first; `docs/product-principles.md` is the
 * guardrail document positioning answers to.
 *
 * ⚠️ `docs/positioning.md` is deliberately NOT scanned, and must not be added.
 * It is the document these rules come from, so it necessarily quotes every
 * banned phrasing in order to ban it - its "Words never to use" table alone
 * would trip four of the rules below. Adding it turns the guard red on the file
 * that defines the guard.
 */
const ALL_SURFACES: Scanned[] = [
  ...USER_FACING,
  readFile("README.md"),
  readFile("CONTEXT.md"),
  readFile("docs/product-principles.md"),
];

/**
 * `ALL_SURFACES` plus the prose docs, deduplicated - `product-principles.md` is
 * in both.
 *
 * ☠️ The dedupe keys on `surface` AND `id`, never `id` alone - see
 * `keeps every Bulgarian i18n value in the prose corpus` below for what `id`
 * alone silently dropped, and why nothing went red over it (#2019).
 */
const WITH_PROSE_DOCS: Scanned[] = [...ALL_SURFACES, ...PROSE_DOCS].filter(
  (entry, index, all) =>
    all.findIndex((other) => other.surface === entry.surface && other.id === entry.id) === index,
);

const APPLE_INFO_SURFACE = "store/apple-info.json";
const PLAY_VERBATIM_SURFACE = "store/play-listing.md";

/** Where `store/play-listing.md` starts quoting the listing rather than describing it. */
const PLAY_VERBATIM_HEADING = "## Verbatim, as saved";

/**
 * The text that is actually ON a store listing, pulled out of the two files
 * that mirror them. See the `#1760` describe near the bottom for why this
 * corpus exists at all, and why it is the listing text rather than the files.
 *
 * ☠️ **THROWS rather than returning an empty list.** Both halves are extracted
 * by structure — JSON fields, and the blockquote under a heading — and both can
 * silently yield nothing when the file is reorganised. A corpus that quietly
 * empties leaves every rule vacuously green while looking covered, which is the
 * #1908 / #2019 failure mode this file has already paid for twice.
 *
 * ⚠️ Takes the file contents rather than reading them, so the extraction can be
 * exercised on synthetic input. Nothing else here is testable without it.
 */
function storeListingText(appleInfoJson: string, playListingMd: string): Scanned[] {
  const entries: Scanned[] = [];

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

const STORE_LISTING_TEXT: Scanned[] = storeListingText(
  fs.readFileSync(path.join(ROOT, APPLE_INFO_SURFACE), "utf8"),
  fs.readFileSync(path.join(ROOT, PLAY_VERBATIM_SURFACE), "utf8"),
);

interface Rule {
  name: string;
  pattern: RegExp;
  /**
   * `user-facing` rules are NOT run over the prose docs. See the encryption
   * block for the one trap that makes this distinction load-bearing.
   *
   * `i18n` is narrower still - translated values only, no static files. The
   * house-style block explains why it has to exist.
   */
  scope: "i18n" | "user-facing" | "all" | "prose";
  /**
   * A string this rule MUST match. ☠️ This is not decoration - see the Cyrillic
   * note on the test that runs it.
   */
  probe: string;
}

/**
 * The frame decision itself (#1604, swept by #1616), and the one banned phrase
 * on this map that is unsafe rather than merely off-frame: "guided self-help" is
 * a clinical term for self-help *with a practitioner*, and Selftend employs
 * none. `AGENTS.md` already forbids therapist-replacement framing, so this is a
 * claim the product cannot back rather than a weak pitch. `docs/positioning.md`
 * § *Words never to use* bans it outright; the vocabulary that replaced it is
 * "a CBT programme".
 *
 * ☠️ **SCOPE IS `all`, WHICH INCLUDES `CONTEXT.md`.** The glossary's own entry
 * for "CBT programme" therefore CANNOT spell the banned compound out, and
 * deliberately does not - it names the ban by pointing at `docs/positioning.md`,
 * the one file excluded from this scan. If you are reading this because
 * CONTEXT.md just went red, the fix is to refer to the ban rather than quote it.
 * Adding an exemption instead is what the test at the bottom of this file exists
 * to argue you out of.
 *
 * ☠️ **BULGARIAN SPELLS IT TWO WAYS, WHICH IS WHY THERE ARE TWO PATTERNS.**
 * `насочена самопомощ` shipped in ten of the eleven bg strings and
 * `ръководена самопомощ` in the FAQ answer alone, so a single find-and-replace
 * misses one - as #1616 recorded after finding it the hard way.
 *
 * ⚠️ **BARE "self-help" IS LEGITIMATE AND MUST STAY LEGAL.** Only the
 * adjective+noun compound is banned. Twenty live strings use the bare noun
 * correctly - the GDPR clauses naming "self-help entries", the support form's
 * warning not to email them, and `settings:modulesQuestion` en ("Would a
 * self-help module be useful?"). A rule keyed on the noun alone fails all
 * twenty, which is the same over-sweep failure the AI block below is shaped to
 * avoid (#1606 §9). The test that pins them is at the bottom of this file.
 *
 * ☠️ No `\b` anywhere near Cyrillic - see the probe test below.
 *
 * ☠️☠️ **ONE WORD MAY INTERVENE, AND THAT IS #1872's WHOLE POINT.** The category
 * noun is now "a CBT self-help app" (#1814), so the banned compound sits ONE
 * ADJECTIVE from the category on every surface, permanently - and the missing
 * word is the frame's own: `A guided CBT self-help app` walked straight through
 * the adjacent-only pattern, in both languages. `guided` is not a word this
 * repo can retire either; it is live module vocabulary in 29 English strings
 * ("Guided programmes", "A guided programme", both breathing voices).
 *
 * ⚠️ **THE BOUND IS `{0,1}` AND NOT `{0,2}`.** `{0,2}` was tested and fails on
 * legitimate copy in both languages - "Guided meditation and self-help tools",
 * "насочена медитация и самопомощ" - and Selftend SHIPS guided meditation, so
 * that is not a hypothetical string. It is the over-sweep failure this document
 * names repeatedly: a guard that fails on good copy gets deleted rather than
 * fixed. Swept before landing: zero new offenders corpus-wide against the
 * narrow patterns.
 *
 * ☠️ **THE PROBES ARE THE INTERVENING FORM, DELIBERATELY.** If they stayed
 * adjacent, a later "simplification" back to `\bguided\s+self[-\s]help\b` would
 * go GREEN and silently reopen the gap. The adjacent form is pinned separately
 * below, so both shapes are held by something.
 */
const GUIDED_SELF_HELP: Rule[] = [
  {
    name: "en: guided self-help",
    pattern: /\bguided\s+(?:[\w-]+\s+){0,1}self[-\s]help/i,
    scope: "prose",
    probe: "A guided CBT self-help app",
  },
  {
    name: "bg: насочена самопомощ",
    pattern: /насочен\S*\s+(?:\S+\s+){0,1}самопомощ/i,
    scope: "prose",
    probe: "насочена КПТ самопомощ",
  },
  {
    name: "bg: ръководена самопомощ",
    pattern: /ръководен\S*\s+(?:\S+\s+){0,1}самопомощ/i,
    scope: "prose",
    probe: "ръководена КПТ самопомощ",
  },
];

/** The adjacent form each rule above ALSO has to keep catching (#1872). */
const GUIDED_SELF_HELP_ADJACENT: Record<string, string> = {
  "en: guided self-help": "Calm, guided self-help tools for personal reflection.",
  "bg: насочена самопомощ": "Спокойни инструменти за насочена самопомощ и лична рефлексия.",
  "bg: ръководена самопомощ": "Не. Selftend е ръководена самопомощ.",
};

/**
 * ☠️ **A MANAGEMENT VERB MAY NOT TAKE A HEALTH-OR-CONDITION OBJECT** (#1815).
 *
 * The ruling that killed the phrase this repositioning map was opened with -
 * "an app that helps you self-manage your mental health". The failure is the
 * PAIRING, not either word. `self-management` is a defined term in healthcare
 * (NHS England scopes it to services that help you "manage your long term
 * conditions"), so a management verb over a health noun imports a clinical
 * claim Selftend does not make, whatever the sentence around it asserts.
 * `docs/product-principles.md` §6 was widened to ratify exactly that reading
 * (#1820): the guardrail bites on what a phrase MEANS IN THE CLINIC, not only
 * on what it asserts about the product.
 *
 * ✅ **THE VERB SURVIVES ALONE AND MUST STAY LEGAL.** `self-manage` is not
 * banned - it is the one word that says *no practitioner* without saying *no
 * help* - and neither is any of these verbs over a non-health object. Only the
 * pairing is caught, which is why the pattern is verb + `your` + a closed list
 * of health nouns rather than a word ban.
 *
 * ✅ **NON-MANAGEMENT VERBS ARE PERMITTED OVER THE SAME OBJECTS**, and this is
 * the escape hatch the ban depends on having: "look after your mental health",
 * "take care of your wellbeing", "tend" - none of them claim to operate ON a
 * condition. A rule keyed on the object alone would fail all of them.
 *
 * ☠️☠️ **#1815 ALSO PROPOSED BARE `treat` / `treatment` / `symptoms` /
 * `recovery`, AND THAT HALF IS NOT SHIPPABLE.** Swept before writing this:
 * `treatment` appears in SIX live strings and five of them are SAFETY COPY
 * saying what Selftend is NOT ("not therapy, medical care, diagnosis,
 * treatment, crisis intervention"), including `docs/product-principles.md`'s own
 * "claim treatment outcomes" prohibition; `recovery` appears in THIRTEEN,
 * naming a shipped CBT feature (`cbt:recovery.title` = "Recovery plan") that a
 * relapse-prevention plan is properly called; `treat` catches `AGENTS.md`'s own
 * "Treat this as a wellness and self-help product". Banning those words would
 * turn the guard red on the guardrail document and on the disclaimers, and the
 * only "fix" would be to weaken the safety copy. #1815's own ruling already
 * says why: a condition named as CONTENT is the material describing itself, not
 * the product claiming scope. So the bare words stay legal, and the prose half
 * of the rule (row 4 of § *What binds this document*) carries what a regex
 * cannot.
 *
 * ☠️ No `\b` anywhere near Cyrillic - the bg pattern uses `[а-яё]*` and `\S+`.
 */
const MANAGEMENT_VERB_ON_HEALTH: Rule[] = [
  {
    name: "en: management verb on a health object",
    pattern:
      /\b(?:manage|managing|treat|treating|cure|curing|fix|fixing|improve|improving|work\s+on|working\s+on)\s+your\s+(?:mental\s+health|wellbeing|well-being|anxiety|depression|panic|trauma|OCD|burnout|symptoms|condition)\b/i,
    scope: "all",
    probe: "An app that helps you manage your mental health.",
  },
  {
    name: "bg: управляващ глагол върху здравен обект",
    pattern:
      /(?:управлява|лекува|третира|оправя|подобря)[а-яё]*\s+(?:\S+\s+){0,1}(?:психично\S*\s+(?:си\s+|ти\s+)?здраве|тревожност\S*|депресия\S*|симптомит\S*)/i,
    scope: "all",
    probe: "Приложение, което ти помага да управляваш психичното си здраве.",
  },
];

/**
 * The frame-spelling invariant (#1627) - the second growth ring, and the last
 * gate `docs/positioning.md` promised.
 *
 * `docs/positioning.md` § *Words to use* fixes the frame term as **cognitive
 * behavioural therapy**, spelled out on first use. Before #1627 the product
 * spelled its own defining word two ways in shipped English copy - counting the
 * `-al` adjective in i18n VALUES on `origin/dev`, ten British against five
 * American, of which four were this sense and the fifth is the privacy one
 * below. Both spellings shipped inside `cbt.json`, and "Behavioural activation"
 * and "Behavioral activation" were reachable in one session from `mood.json` and
 * `navigation.json`. British wins because the doc says so, not because it was
 * ahead on the count.
 *
 * ☠️ **KEYED ON THE CBT-SENSE COMPOUND, NEVER ON BARE `behavioral`.** This is
 * the same trap as the AI block below, in a third costume. `behavioral` has a
 * second, entirely legitimate sense in this repo - the privacy one - and a bare
 * `/\bbehavioral\b/i` fails live, CORRECT copy on sight:
 *
 *   - `policies:*` en - "…analytics tracking services, behavioral profiling
 *     tools, or social media pixels." (privacy §3, a consent-bearing section)
 *   - `AGENTS.md` - "behavioral nudges", twice, in the review guardrails
 *   - `docs/analytics.md` - "heavy behavioral profiling", "User-level
 *     behavioral profiling"
 *   - `docs/operations-runbook.md` - "No advertising, behavioral analytics…"
 *
 * Only the first is scanned today, but the sense recurs with a different noun
 * each time - profiling, nudges, analytics, tracking - so a lookahead exemption
 * for `profiling` alone would go red the first time someone writes the next one.
 * The compound is the discriminator; the adjective is not. #1606 §9 again: over-
 * sweeping is the more damaging failure, because a guard that fails on correct
 * copy gets deleted rather than fixed. The test below pins the privacy sense.
 *
 * ☠️ **THE DBT RULE IS A RIDER, AND IT IS WORTH KNOWING HOW MUCH AUTHORITY IT
 * CARRIES.** Positioning mandates the spelling of the frame word and says
 * nothing about DBT. It is guarded anyway because the two render *side by side*
 * - `navigation.json` sidebar has "CBT module - Cognitive Behavioural Therapy"
 * two lines above the DBT label, and the Modules screen lists all three names in
 * one column. A British frame word directly above an American sibling is the
 * exact carelessness this invariant exists to remove, one row down. So: the CBT
 * halves are positioning, the DBT half is the consistency that keeps them
 * credible. #1627 respelled DBT for that reason and this rule holds it.
 *
 * ⚠️ **NO BULGARIAN PATTERNS, DELIBERATELY** - unlike all three blocks around
 * it. Cyrillic has no British/American split: bg spells the frame word
 * `когнитивно-поведенческа терапия` and there is no second form to ban. An empty
 * bg half here is a fact about the language, not an omission to be filled.
 *
 * ⚠️ **THIS READS VALUES, NEVER KEYS, WHICH IS WHY TWO AMERICAN SPELLINGS
 * SURVIVE #1627 ON PURPOSE.** `mood.json`'s key is `behavioralActivation` while
 * its value is the British "Behavioural activation", and `cbt.json`'s sibling
 * key is `behavioural` - the keys disagree with each other and no user can see
 * either. ☠️ More sharply, `behavioral-activation` is a **persisted database
 * value**: it is written to `mood_logs.linked_strategy` and read back by
 * `mood-detail-screen.tsx`. Renaming it orphans every row a user has already
 * saved. The ticket's own acceptance line - `git grep -i behavioral` returns
 * only the privacy string - is therefore unmeetable as literally written, and
 * that is correct rather than a shortfall.
 *
 * ☠️ `docs/positioning.md:92` spells it **American** on purpose - it quotes the
 * search-volume figure for `cognitive behavioral therapy` (>100K/mo), which is
 * what people actually type. Respelling it would falsify the data point. That
 * file is outside this scan by design (see `ALL_SURFACES`), so the two never
 * meet; if it is ever added, that line is the first thing that breaks.
 */
const FRAME_SPELLING: Rule[] = [
  {
    name: "en: cognitive behavioral (American)",
    pattern: /\bcognitive\s+behavioral\b/i,
    scope: "all",
    probe: "Cognitive behavioral therapy",
  },
  {
    name: "en: behavioral activation (American)",
    pattern: /\bbehavioral\s+activation\b/i,
    scope: "all",
    probe: "Behavioral Activation",
  },
  {
    name: "en: dialectical behavior (American)",
    pattern: /\bdialectical\s+behavior\b/i,
    scope: "all",
    probe: "DBT overview - Dialectical Behavior Therapy",
  },
];

/**
 * The plain noun underneath the frame word - the third growth ring (#1638), and
 * the one this file did not expect. `docs/positioning.md` called the ring above
 * "the last one this document promised". That was true of what had been
 * *promised*. It was not true of the copy.
 *
 * `FRAME_SPELLING` settled the ADJECTIVE. Counted on `dev` the day after, the
 * ordinary noun beneath it was split wider than the adjective ever had been:
 * **thirteen American strings (fourteen occurrences) against nine British**,
 * across four namespaces. ☠️ One pair rendered on the SAME CARD - `cbt.json`
 * `pillars.act.sub` is the kicker "Behavioural" and `pillars.act.description`
 * directly beneath it read "Schedule meaningful behavior"; `PillarCard` draws
 * both. That is #1627's lesson one level down: check what renders BESIDE the
 * thing you are fixing.
 *
 * ✅ **THIS RULE NEEDS NO CARVE-OUT, AND THAT IS A PROPERTY OF THE WORD RATHER
 * THAN A CLEVERNESS IN THE PATTERN.** The block above warns that a bare
 * `/\bbehavioral\b/` would fail the privacy sense, and expected the same trap
 * here. It does not arise: there is no word boundary between the `r` of
 * `behavior` and the `al` of `behavioral`, so `\bbehaviors?\b` cannot match the
 * adjective at all. "behavioral profiling tools", `mood.json`'s
 * `behavioralActivation` key and the persisted `behavioral-activation` slug are
 * excluded BY CONSTRUCTION - no lookahead, no exemption. The test below asserts
 * exactly that, because it is the kind of claim that stays obvious right up
 * until someone loosens a `\b` and it silently stops being true.
 *
 * ⚠️ **SCOPE IS `all`, AND THE SURFACE LIST IS THE REASON THAT IS SAFE.** The
 * American noun is alive and CORRECT in the software sense throughout the repo -
 * `AGENTS.md` ("assertions rewritten to match broken behavior"),
 * `.github/CONTRIBUTING.md` ("backend behavior"), `docs/analytics.md`,
 * `docs/deployment.md`, and the whole vendored `.github/CODE_OF_CONDUCT.md`
 * ("Encouraged Behaviors"). None of those are in `ALL_SURFACES`, and none should
 * be. ☠️ If the surface list ever grows to `docs/` or `.github/`, this is the
 * rule that goes red first, and the answer is to narrow the surface - never to
 * weaken the rule.
 *
 * ⚠️ **NO BULGARIAN HALF**, for the reason `FRAME_SPELLING` gives: Cyrillic has
 * no British/American split. Verified for this noun specifically - zero matches
 * for either form anywhere in `bg`.
 */
const PLAIN_NOUN_SPELLING: Rule[] = [
  {
    name: "en: behavior/behaviors (American)",
    pattern: /\bbehaviors?\b/i,
    scope: "all",
    probe: "I used safety behaviors",
  },
];

/**
 * #1602 named a permanent boundary on the encryption claim, and it is the one
 * place on this map where the wrong word is a lie rather than a weak pitch.
 *
 * Selftend encrypts ~43 tables with pgcrypto and holds the Vault key OUTSIDE the
 * database, so a leaked dump is ciphertext. That is a real, checkable claim and
 * the doc says it in those words. What it is NOT is end-to-end: the migration
 * itself calls the design "provider-recoverable". Saying otherwise would promise
 * a property the architecture does not have, to people choosing the product
 * *because* of that property.
 *
 * ☠️ **DO NOT WIDEN THESE TO THE PROSE DOCS.** `end-to-end` appears ~10 times
 * across `docs/` and every single one is the TESTING sense - "account deletion
 * end to end", "end-to-end jobs against local Supabase". i18n has zero. Scoped
 * to user-facing copy, this rule is about a privacy claim; scoped to `docs/`, it
 * would fail the day someone documents a test suite (#1606 trap 2).
 */
const NEVER_SAYABLE_ENCRYPTION: Rule[] = [
  {
    name: "en: end-to-end",
    pattern: /\bend[-\s]to[-\s]end\b/i,
    scope: "user-facing",
    probe: "Your notes are end-to-end encrypted.",
  },
  {
    name: "en: zero-knowledge",
    pattern: /\bzero[-\s]knowledge\b/i,
    scope: "user-facing",
    probe: "A zero-knowledge design keeps them private.",
  },
  {
    name: "en: even we cannot read them",
    pattern: /\beven we (?:can'?t|cannot|can not)\s+(?:read|see|access|open)/i,
    scope: "user-facing",
    probe: "Even we can't read your entries.",
  },
  // ☠️ No `\b` anywhere near Cyrillic - see the probe test below.
  {
    name: "bg: от край до край",
    pattern: /криптиран\S*\s+от\s+край\s+до\s+край|от\s+край\s+до\s+край\s+криптиран/i,
    scope: "user-facing",
    probe: "Записите ти са криптирани от край до край.",
  },
  {
    name: "bg: нулево знание",
    pattern: /нулево\s+знание/i,
    scope: "user-facing",
    probe: "Архитектура с нулево знание пази данните ти.",
  },
  {
    name: "bg: дори ние не можем да прочетем",
    pattern: /дори\s+ние\s+не\s+можем\s+да\s+(?:про)?четем/i,
    scope: "user-facing",
    probe: "Дори ние не можем да прочетем записите ти.",
  },
];

/**
 * AGENTS.md forbids "AI therapist / AI counselor / AI coach" framing, #1609
 * retained AI as a *rationale, never a claim*, and #1603 put "nothing you write
 * trains a model" inside value theme 1 as an input requirement of the method.
 *
 * ☠️☠️ **THESE MUST BE KEYED THE OPPOSITE WAY FROM `restraint-copy`'s RULES, AND
 * THIS IS THE TRAP THAT EATS AN AFTERNOON.** `restraint-copy` bans the NEGATION
 * ("no pressure") because the affirmation is legitimate. AI is the mirror: the
 * negation is the legitimate form and the affirmation is the ban. A bare
 * `/AI (therapist|counselor|coach)/i` fails five live, CORRECT strings:
 *
 *   - `policies:*` en - "Why is there no AI counsellor?"
 *   - `policies:*` en - "…has no AI therapist, AI counsellor, or AI coach."
 *   - `policies:*` bg - "Защо няма AI консултант?"
 *   - `policies:*` bg - "…умишлено няма AI терапевт, AI консултант или AI коуч."
 *   - `docs/product-principles.md` - "must not present itself as an AI
 *     therapist, counselor, or mental-health coach."
 *
 * ⚠️ That last one is why `a`/`an`/`the` are NOT in the possessive alternation
 * below, and why the copular rule is `is a[n] AI …` rather than `as a[n] AI …`.
 * #1606 recorded the four i18n strings; the product-principles line is a fifth,
 * on a surface it did not scan. Over-sweeping is the more damaging failure here
 * (#1606 §9): a guard that fails on the guardrail document itself gets deleted.
 *
 * ⚠️ `\bAI\b` and not bare `AI` - the letters "ai" sit inside "available",
 * "detail", "trailer" and "fail", so an unanchored pattern matches most of
 * `README.md`.
 */
const AI_AFFIRMATIVE: Rule[] = [
  {
    name: "en: your/our AI <role>",
    pattern: /\b(?:your|our|my)\s+(?:own\s+)?\bAI\b\s+(?:therapist|counsell?or|coach|companion)/i,
    scope: "all",
    probe: "Meet your AI coach.",
  },
  {
    name: "en: is a[n] AI <role>",
    pattern: /\bis\s+an?\s+\bAI\b\s+(?:therapist|counsell?or|coach|companion)/i,
    scope: "all",
    probe: "Selftend is an AI therapist in your pocket.",
  },
  {
    name: "en: AI-powered",
    pattern: /\bAI[-\s]powered\b/i,
    scope: "all",
    probe: "AI-powered insights into your mood.",
  },
  {
    name: "en: AI therapy/counselling/coaching",
    pattern: /\bAI\b\s+(?:therapy|counsell?ing|coaching)\b/i,
    scope: "all",
    probe: "AI therapy, free forever.",
  },
  {
    name: "en: talk to an AI",
    pattern: /\b(?:chat|talk|speak)\s+(?:to|with)\s+(?:an?|our|your|the)\s+\bAI\b/i,
    scope: "all",
    probe: "Talk to our AI whenever you need to.",
  },
  {
    name: "bg: твоят AI <role>",
    pattern:
      /(?:тво(?:я|ят|ето)|наш(?:ия|ият)|ваш(?:ия|ият))\s+\bAI\b\s+(?:терапевт|консултант|коуч)/i,
    scope: "all",
    probe: "Запознай се с твоя AI коуч.",
  },
  {
    name: "bg: задвижван от AI",
    pattern: /задвижван\S*\s+от\s+\bAI\b/i,
    scope: "all",
    probe: "Прозрения, задвижвани от AI.",
  },
  {
    name: "bg: AI терапия",
    pattern: /\bAI\b\s+(?:терапия|консултиране|коучинг)/i,
    scope: "all",
    probe: "AI терапия, безплатно завинаги.",
  },
];

/**
 * The owner's 2026-07-24 decision: the build guardrail against streaks stays,
 * but its ABSENCE is never a pitch. Dunford independently agrees - positioning
 * on absence centres your identity on what you lack - and #711's rule already
 * says the product may not advertise its own restraint.
 *
 * ⚠️ Keyed on the NEGATION, never the noun, for the same reason `restraint-copy`
 * leaves bare "pressure" legal. `CONTEXT.md` line 25 reads `_Avoid_: streak,
 * success/fail, pass` - a glossary instruction telling contributors not to use
 * the word, which a `/streak/i` ban would fail. `cbt.json` also carries a
 * `"streakTitle"` KEY whose value is already the clean "Recent sessions"; this
 * guard reads text and never keys, so it cannot see it either way (#1606 trap 4).
 *
 * ⚠️ The Bulgarian half has NOTHING live to match - "серия"/"поредица" appear
 * nowhere in `bg`. It was therefore written red-first against its probe, which
 * is the only evidence it works at all.
 */
const STREAK_PROMOTION: Rule[] = [
  {
    name: "en: no streaks",
    pattern: /\bno\s+streaks?\b/i,
    scope: "all",
    probe: "No streaks, no guilt.",
  },
  {
    name: "en: no streak <noun>",
    pattern: /\bno\s+streak\s+\w+/i,
    scope: "all",
    probe: "No streak pressure here.",
  },
  {
    name: "en: without streaks",
    pattern: /\bwithout\s+(?:\S+\s+)?streaks?\b/i,
    scope: "all",
    probe: "Build a habit without streaks.",
  },
  {
    name: "en: streak-free",
    pattern: /\bstreak[-\s]free\b/i,
    scope: "all",
    probe: "A streak-free habit tracker.",
  },
  {
    name: "bg: без серии/поредици",
    pattern: /без\s+(?:\S+\s+)?(?:серии|поредици)/i,
    scope: "all",
    probe: "Изграждай навици без серии.",
  },
];

/**
 * The house style itself (#1639) - the fourth growth ring, and the one that
 * stops the rule being about a single word.
 *
 * #1627 settled the frame ADJECTIVE and #1638 the plain NOUN, both appealing to
 * a house style - *British spelling, and it is not a preference* - that was
 * enforced for exactly one word. Recounted on `origin/dev` for this change,
 * reading i18n VALUES only, **28 strings across 9 namespaces** still spelled a
 * different word American. They were fixed in the same change that added these
 * rules, inheriting the bargain #1616, #1627 and #1638 each kept: fix the copy
 * first, or do not add the rule. There are no exemptions here either.
 *
 * ☠️ **SCOPED TO `i18n`, NOT `user-facing`, AND THAT IS LOAD-BEARING.** See
 * `I18N_VALUES` - `colour` alone would fail five correct CSS and manifest
 * tokens at the wider scope. The prose docs are excluded for a second reason:
 * `README.md`, `CONTEXT.md` and the docs tree are contributor-facing technical
 * writing where `color`, `program` and `license` are code identifiers.
 *
 * ☠️ **EVERY PATTERN IS BOUNDED ON BOTH SIDES, AND THE DRY RUN PROVES WHY.** A
 * bare `/color/` rewrote the US state **Colorado** to "Colourado" in privacy §9
 * while this change was being made. The same shape of bug is one character away
 * for each of the others: `fulfill` must not reach the correct British
 * "fulfilled" / "fulfilling"; `practic` must not reach the noun "practice",
 * which is identical in both; `humor` is not banned at all because its only
 * occurrence is "humorous", also identical in both. The test below pins all
 * four as literals.
 *
 * ⚠️ **VALUES ONLY, SO THE ROUTE AND THE PLURAL KEYS SURVIVE ON PURPOSE.**
 * `app/(app)/tools/gratitude-log/favorites.tsx` serves
 * `/tools/gratitude-log/favorites`, and `hero.favorites_one` /
 * `hero.favorites_other` are i18next plural keys whose suffixes are structural.
 * Respelling either breaks bookmarks or pluralisation for a word no user reads.
 * Same discipline that kept `behavioral-activation` intact in #1638.
 *
 * ⚠️ **NO BULGARIAN PATTERNS**, for the same reason as `FRAME_SPELLING`:
 * Cyrillic has no British/American split. A census of `bg` values returns zero.
 */
const HOUSE_STYLE_SPELLING: Rule[] = [
  {
    name: "en: favorite (American)",
    pattern: /\bfavorit(e|es|ed|ing)?\b/i,
    scope: "i18n",
    probe: "Added to favorites",
  },
  {
    name: "en: color (American)",
    pattern: /\bcolor(s|ed|ing|ful|less)?\b/i,
    scope: "i18n",
    probe: "Pick a color for this habit",
  },
  {
    name: "en: organize (American)",
    pattern: /\borganiz(e|es|ed|ing|ation|ations)\b/i,
    scope: "i18n",
    probe: "organized as a sequence of ten stages",
  },
  {
    name: "en: practicing/practiced (American)",
    pattern: /\bpractic(ing|ed)\b/i,
    scope: "i18n",
    probe: "a path for practicing psychological flexibility",
  },
  {
    name: "en: recognize (American)",
    pattern: /\brecogniz(e|es|ed|ing|able)\b/i,
    scope: "i18n",
    probe: "Subtle dullness is hard to recognize",
  },
  {
    name: "en: fulfill (American)",
    pattern: /\bfulfill\b/i,
    scope: "i18n",
    probe: "to fulfill a verified privacy request",
  },
  {
    name: "en: fueled/fueling (American)",
    pattern: /\bfuel(ed|ing)\b/i,
    scope: "i18n",
    probe: "The interpretation that fueled the anger",
  },
  /**
   * ☠️ **The fifth ring's headline: this one is the market category itself**
   * (#1651). `docs/positioning.md` § *Words to use* opens with **Programme** and
   * the canvas names the category "a CBT programme" — and shipped copy spelled
   * it `program` 31 times against `programme` 19, with BOTH inside
   * `navigation.json` where `headerButton.program` and
   * `home.widgets.cbtProgramme.title` can render on one screen. A wider split
   * than `behaviour` ever had, on a more important word.
   *
   * ✅ **All 31 turned out to be the course, not software** — the suspicion
   * #1651 recorded, checked one string at a time: "Start the ACT program",
   * "Abandon this program?", "Structured therapeutic programs you can work
   * through". Not one was the software sense, so there is no carve-out and none
   * is needed. Had there been, this would have needed a compound discriminator
   * like `FRAME_SPELLING`'s rather than a bare ban.
   *
   * ⚠️ **`program` remains a KEY namespace in `act.json` and `cbt.json`**
   * (`program.startTitle`, `program.heroTitle`, …), and `navigation.json` has a
   * key literally named `program`. The guard reads values and never keys, so
   * they are outside it by construction — the same reason `behavioralActivation`
   * survived #1638.
   */
  {
    name: "en: program (American)",
    pattern: /\bprograms?\b/i,
    scope: "i18n",
    probe: "Start the ACT program",
  },
  /**
   * `judgment` was split 4 against 2, and the pair rendered in near-identical
   * sentences two surfaces apart: `meditation.json` body-scan said "noticing
   * sensation without judgement" while `act.json` observing-self said "without
   * judgment". `cbt.json` carried both spellings.
   *
   * ⚠️ `judgment` is standard in LEGAL English, which is the one context that
   * could have argued to keep it. None of the four is legal — they are ACT and
   * CBT phrasings about noticing without evaluating — so British wins with no
   * carve-out.
   */
  {
    name: "en: judgment (American)",
    pattern: /\bjudgm/i,
    scope: "i18n",
    probe: "Notice sensations without judgment",
  },
  /**
   * Added with the store corpus above, because without it that corpus would not
   * have caught the defect it was built for: the live Play description spelled
   * `catastrophizing` while `cbt.json` spelled the same word `Catastrophising`
   * two surfaces away (#2061). The corpus gap and the rule gap were separate,
   * and closing only the first would have looked like closing both.
   *
   * ☠️ **The distortion's KEY is `catastrophizing` and must stay that way.**
   * It is a persisted identifier — `src/constants/distortions.ts`, the rows
   * already saved against it, and the i18n key itself — so this is the
   * `behavioral-activation` situation exactly. Safe here by construction: this
   * scope reads translated VALUES and never keys, the same reason
   * `behavioralActivation` survives the `behavioral` rules.
   */
  {
    name: "en: catastrophize (American)",
    pattern: /\bcatastrophiz(e|es|ed|ing|ation)\b/i,
    scope: "i18n",
    probe: "thinking patterns (like catastrophizing or mind-reading)",
  },
];

const RULES: Rule[] = [
  ...GUIDED_SELF_HELP,
  ...FRAME_SPELLING,
  ...PLAIN_NOUN_SPELLING,
  ...HOUSE_STYLE_SPELLING,
  ...NEVER_SAYABLE_ENCRYPTION,
  ...AI_AFFIRMATIVE,
  ...STREAK_PROMOTION,
  ...MANAGEMENT_VERB_ON_HEALTH,
];

/**
 * ⚠️ **The store listing text is appended to EVERY scope, including `i18n`.**
 * That looks like a violation of the narrowing the house-style block argues
 * for, and is not: `i18n` is narrow because the wider corpora carry CSS
 * tokens, manifest keys and file paths where `color` and `program` are code
 * rather than copy. A store listing has none of those — it is marketing prose
 * end to end, so every rule that applies to shipped copy applies to it, and the
 * spelling rules are the half that would have caught #2061.
 */
function corpusFor(scope: Rule["scope"]) {
  const base =
    scope === "i18n"
      ? I18N_VALUES
      : scope === "prose"
        ? WITH_PROSE_DOCS
        : scope === "user-facing"
          ? USER_FACING
          : ALL_SURFACES;

  return [...base, ...STORE_LISTING_TEXT];
}

/** Renders offenders for a failure message: which surface said it, and what it said. */
function describe_(entries: Scanned[], pattern: RegExp) {
  return entries.map(({ surface, id, text }) => {
    const hit = pattern.exec(text);
    return `${surface} ${id} - ${hit ? `…${hit[0]}…` : text.slice(0, 80)}`;
  });
}

describe("shipped copy matches the positioning in docs/positioning.md", () => {
  it("scans every i18n namespace in both locales, plus the five declaring surfaces", () => {
    const surfaces = new Set(ALL_SURFACES.map((entry) => entry.surface));

    expect(surfaces).toContain("i18n/en");
    expect(surfaces).toContain("i18n/bg");
    expect(surfaces).toContain("public/manifest.webmanifest");
    expect(surfaces).toContain("README.md");
    expect(surfaces).toContain("CONTEXT.md");
    expect(surfaces).toContain("docs/product-principles.md");

    // Positive control on the i18n half: `loadLocale` reading an empty or moved
    // directory would make every ban below vacuously green.
    const namespaces = new Set(LOCALE_STRINGS.en.map((entry) => entry.namespace));
    expect(namespaces.size).toBeGreaterThanOrEqual(20);
  });

  /**
   * The same positive control for the prose corpus (#1644), which is built by
   * walking `docs/` rather than from a literal list. A renamed directory or a
   * changed extension would return an empty array and make the guided-self-help
   * ban vacuously green over exactly the surfaces it was widened to cover.
   *
   * The exclusions are asserted too, because they are the half that is easy to
   * get wrong in the damaging direction: a record swept into the corpus turns
   * the build red on a file nobody may edit, and the tempting fix is to weaken
   * the rule.
   */
  it("walks the docs tree for prose, and holds the published records out of it", () => {
    const ids = new Set(PROSE_DOCS.map((entry) => entry.id));

    expect(PROSE_DOCS.length).toBeGreaterThanOrEqual(20);
    expect(ids).toContain("AGENTS.md");
    expect(ids).toContain("docs/naming.md");
    expect(ids).toContain("docs/self-hosting.md");
    // Nested, so the walk is genuinely recursive rather than one level deep.
    expect(ids).toContain("docs/modules/tools.md");

    for (const record of [
      "docs/positioning.md",
      "docs/app-store-review-information.md",
      "docs/app-store-recording-script.md",
      "docs/android-closed-testing.md",
      "docs/campaign/scripts/cbt.md",
    ]) {
      expect({ record, scanned: ids.has(record) }).toEqual({ record, scanned: false });
    }

    // And each of those really does still contain the phrase - so the exclusion
    // is load-bearing, not a leftover.
    for (const record of ["docs/app-store-review-information.md", "docs/campaign/scripts/cbt.md"]) {
      expect(readFile(record).text).toMatch(/guided self-help/i);
    }
  });

  /**
   * The feature graphic's source is scanned, and the exclusion around it still
   * holds (#2022).
   *
   * ☠️ The assertion that matters is the THIRD one. Adding the file to the
   * corpus is worth nothing unless the rules actually reach it, and "the suite
   * is green" cannot show that — it is equally green when the corpus entry is
   * dropped. So the rule is run directly against the string the graphic carried
   * until 2026-09-06, which is the shape this entry exists to catch.
   *
   * ⚠️ The Reddit banner beside it is asserted OUT, and is the ONLY file
   * under `docs/launch/` still carrying the compound — measured across all
   * eight, #1901. ☠️ But the filter holding it out is the `.md` one, NOT
   * `PUBLISHED_RECORDS`: an `.html` file is dropped before the exemption is
   * ever consulted. So the directory entry protects the banner in intent only,
   * and a carve-out written per DIRECTORY rather than per file would sweep the
   * banner straight in and turn the build red on an image nobody may edit.
   * That is why `READY_TO_POST_DRAFTS` names a file.
   */
  it("scans the feature graphic's HTML source, but not the posted banner beside it (#2022)", () => {
    const ids = new Set(PROSE_DOCS.map((entry) => entry.id));
    const graphic = "docs/launch/play-listing/feature-graphic.html";

    expect(ids).toContain(graphic);
    expect(ids.has("docs/launch/reddit-post/banner.html")).toBe(false);

    // The banner really does still carry the compound, so holding `docs/launch/`
    // out of the walk is load-bearing rather than a leftover.
    expect(readFile("docs/launch/reddit-post/banner.html").text).toMatch(/guided self-help/i);

    const rule = GUIDED_SELF_HELP.find(({ name }) => name === "en: guided self-help")!;

    // The headline this file carried until 2026-09-06, verbatim. The rule misses
    // it as markup and catches it as text: that gap is the whole reason the
    // corpus entry is read through `readArtworkSource`, and asserting the miss
    // is what stops someone "simplifying" that back to `readFile`.
    const wasLive = '<h1>Calm, guided <span class="accent">self-help</span></h1>';
    expect(rule.pattern.test(wasLive)).toBe(false);
    expect(rule.pattern.test(wasLive.replace(/<[^>]+>/g, " "))).toBe(true);

    // So the entry in the corpus must be the stripped form, not the raw file.
    // ⚠️ The headline is matched with `\s+` and not as a literal: the accent
    // span around the noun becomes whitespace, and the full stop after its
    // closing tag detaches into `tools .`. Harmless for every rule that reaches
    // this corpus, since all three match word sequences — but a future rule
    // anchored on adjacent punctuation would not survive the strip, and should
    // be written against the raw file instead of being bent to fit this one.
    const scanned = PROSE_DOCS.find(({ id }) => id === graphic)!;
    expect(scanned.text).not.toMatch(/<h1/);
    expect(scanned.text).toMatch(/Private\s+mental health tools/);

    // And what it carries today is clean under every guided-self-help rule.
    for (const { pattern } of GUIDED_SELF_HELP) {
      expect({ rule: pattern.source, hit: pattern.test(scanned.text) }).toEqual({
        rule: pattern.source,
        hit: false,
      });
    }
  });

  /**
   * The seven ready-to-post Reddit drafts are scanned; the posted thread filed
   * beside them is not (#1901).
   *
   * ☠️ **MEMBERSHIP IS THE ASSERTION THAT PROVES LEAST**, which is the
   * #2022 lesson restated: the live corpus is equally green when the whole
   * directory is swept in, and equally green when the carve-out is deleted and
   * the file drops back out. So the carve-out is exercised on synthetic input
   * instead — a draft and a record sitting in the same excluded directory,
   * where only the named file may come back. Nothing about that is visible
   * from reading this machine's `docs/` tree.
   *
   * ⚠️ The drafts were rewritten against current positioning first (#2046),
   * so this lands green on a file that is already clean. That ordering is the
   * point: a gate added over copy that violates it is a gate someone deletes.
   */
  it("scans the unposted Reddit drafts, but not the posted thread beside them (#1901)", () => {
    const ids = new Set(PROSE_DOCS.map((entry) => entry.id));
    const drafts = "docs/launch/reddit-promotion-package.md";
    const posted = "docs/launch/reddit-post-android-closed-testing.md";

    expect(ids).toContain(drafts);
    expect(ids.has(posted)).toBe(false);

    // The carve-out is what puts it there. Same directory, same exemption, and
    // only the file named in `READY_TO_POST_DRAFTS` survives — so deleting
    // that list fails here rather than silently un-gating the drafts again.
    expect(
      proseDocIds([drafts, posted, "docs/naming.md"], new Set([drafts, posted, "docs/naming.md"])),
    ).toEqual([drafts, "docs/naming.md"]);

    // The corpus entry is the real file. An empty or moved read would make the
    // three rules below vacuously green over exactly the document this entry
    // was added for.
    const scanned = PROSE_DOCS.find(({ id }) => id === drafts)!;
    expect(scanned.text).toMatch(/^# Reddit promotion package/);
    expect(scanned.text.length).toBeGreaterThan(5000);

    // And it is clean under every rule that reaches the prose corpus.
    for (const { name, pattern } of GUIDED_SELF_HELP) {
      expect({ rule: name, hit: pattern.test(scanned.text) }).toEqual({ rule: name, hit: false });
    }
  });

  /**
   * ☠️ **THE CORPUS IS THE GIT INDEX, NOT THE WORKING TREE** (#1908).
   *
   * This one cannot be written against the real filesystem, and that is the
   * whole difficulty: the offending files are gitignored, so on CI and in any
   * fresh worktree they do not exist, and a test that reads this machine would
   * be green everywhere the bug is not. So the filter is exercised on synthetic
   * input — a walk containing a path the index does not carry — and the real
   * corpus is then checked for the property that filter guarantees.
   *
   * ⚠️ The tracked set is asserted non-empty first. An `execFileSync` that
   * returned nothing would filter the entire docs tree away, and every prose
   * rule would pass over `AGENTS.md` alone: the vacuum this file's other
   * positive controls exist to refuse.
   */
  it("builds the prose corpus from the git index, not the working tree (#1908)", () => {
    expect(TRACKED_DOCS.size).toBeGreaterThanOrEqual(20);
    expect(TRACKED_DOCS.has("docs/positioning.md")).toBe(true);

    // Gitignored scratch is dropped even though the walk found it; a tracked
    // sibling in the same walk is kept, so this is a filter and not a wipe.
    expect(
      proseDocIds(
        [
          "docs/naming.md",
          "docs/superpowers/bg-copy-audit-2026-07.md",
          "docs/superpowers/plans/2026-07-08-ux-polish-phase2b-inapp-clarity.md",
        ],
        new Set(["docs/naming.md"]),
      ),
    ).toEqual(["docs/naming.md"]);

    // And the live corpus really did go through it: nothing in it is untracked.
    const untracked = PROSE_DOCS.map(({ id }) => id).filter(
      (id) => id !== "AGENTS.md" && !TRACKED_DOCS.has(id),
    );
    expect(untracked).toEqual([]);
  });

  /**
   * The prose corpus keeps BOTH locales (#2019). It is built by deduplicating
   * `ALL_SURFACES` against `PROSE_DOCS`, and an i18n entry's `id` is
   * `namespace:key` with no locale in it - so a dedupe on `id` alone kept the
   * first locale listed and dropped the second as a "duplicate". `en` is listed
   * first and `locale-parity` guarantees every `bg` key has an `en` twin, which
   * made the two Bulgarian guided-self-help rules green over ZERO Bulgarian copy
   * from the day the corpus was introduced. The other three corpora never
   * dedupe, so the hole was confined to the loudest rule in the file.
   *
   * The dedupe now keys on `surface` as well, and this pins it: a locale is
   * only a duplicate of itself.
   *
   * The two counts are asserted EQUAL rather than merely "bg is not fewer".
   * `src/i18n/locale-parity.test.ts` makes the two key sets identical, so
   * equality holds today and catches a half dropped in either direction - the
   * looser inequality would sit green if the `en` half were the one to vanish.
   *
   * ☠️ Equality alone is not enough either, and neither is a bare "more than
   * zero". Deduping on `surface` ALONE - the tempting mis-fix in the other
   * direction - collapses each locale to ONE entry, which is still equal, still
   * non-zero, and still leaves the prose rules scanning two strings. So each
   * locale is pinned against the whole locale it was built from: every value
   * `locale-strings` read has to survive into the corpus, not merely some.
   */
  it("keeps every Bulgarian i18n value in the prose corpus (#2019)", () => {
    const inCorpus = (surface: string) =>
      WITH_PROSE_DOCS.filter((entry) => entry.surface === surface).length;

    // Nothing is lost between `locale-strings` and the corpus, in either locale.
    expect(inCorpus("i18n/en")).toBe(LOCALE_STRINGS.en.length);
    expect(inCorpus("i18n/bg")).toBe(LOCALE_STRINGS.bg.length);
    expect(inCorpus("i18n/bg")).toBe(inCorpus("i18n/en"));

    // And a named Bulgarian value really is in there, not just a matching count.
    expect(
      WITH_PROSE_DOCS.some(
        (entry) => entry.surface === "i18n/bg" && entry.id === "auth:landing.subtitle",
      ),
    ).toBe(true);

    // The one genuine duplicate is still collapsed to a single entry.
    expect(inCorpus("docs/product-principles.md")).toBe(1);
  });

  /**
   * ☠️☠️ **THE TEST THAT KEEPS THE CYRILLIC RULES HONEST.** JavaScript's `\b` is
   * defined against ASCII `\w`, so between a Cyrillic letter and the space or
   * full stop beside it there is NO word boundary - `/оценки\b/` once matched
   * nothing and went green on the very string it was written to catch
   * (`restraint-copy` carries that scar in a comment).
   *
   * A ban that matches nothing passes forever and proves nothing. So every rule
   * carries a string it MUST match, and this test is the reason a Bulgarian
   * pattern here can be trusted at all - three of them have no live copy to
   * catch and this probe is their only evidence.
   */
  it.each(RULES)("$name actually matches something (probe)", ({ pattern, probe }) => {
    expect(pattern.test(probe)).toBe(true);
  });

  it.each(RULES)("no copy in scope matches $name", ({ pattern, scope }) => {
    const offenders = corpusFor(scope).filter(({ text }) => pattern.test(text));

    expect(describe_(offenders, pattern)).toEqual([]);
  });

  /**
   * The five strings named in the AI block above are the reason those patterns
   * are shaped the way they are. Pinning them here means that if someone later
   * "simplifies" a rule to `/AI (therapist|coach)/i`, this test names exactly
   * what the simplification broke, instead of leaving five failures to be read
   * as five bad strings.
   */
  it("leaves the legitimate NEGATED AI statements alone, in both locales and in the guardrail doc", () => {
    const negated = [
      ...USER_FACING.filter(({ text }) => /no AI (?:therapist|counsell?or|coach)/i.test(text)),
      ...USER_FACING.filter(({ text }) =>
        /няма\s+\bAI\b\s+(?:терапевт|консултант|коуч)/i.test(text),
      ),
    ];
    // The en FAQ answer and its bg twin at minimum.
    expect(negated.length).toBeGreaterThanOrEqual(2);

    for (const rule of AI_AFFIRMATIVE) {
      for (const entry of negated) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }

    const principles = readFile("docs/product-principles.md");
    expect(principles.text).toMatch(/must not present itself as an AI therapist/i);
    for (const rule of AI_AFFIRMATIVE) {
      expect({ rule: rule.name, matched: rule.pattern.test(principles.text) }).toEqual({
        rule: rule.name,
        matched: false,
      });
    }
  });

  /**
   * The mirror of the AI test above, and it exists for the same reason.
   *
   * ☠️ The compound is banned; the bare noun is not. #1616 swept 22 strings and
   * deliberately left twenty alone, because "self-help" on its own is accurate
   * and legally load-bearing where it appears: the GDPR clauses that name
   * "private CBT thought records or other self-help entries". The support
   * form's placeholder was one of the twenty until #1727 replaced it with four
   * per-category placeholders, none of which needs the noun; the onboarding's
   * `settings:modulesQuestion` ("Would a self-help module be useful?") was
   * another until #1958 deleted the panel that asked it.
   * Bulgarian mirrors every remaining one with bare `самопомощ`.
   *
   * So if someone later "simplifies" the rules above to `/self-help/i` or
   * `/самопомощ/i`, this test names exactly what the simplification broke,
   * instead of leaving eighteen failures to be read as eighteen bad strings.
   */
  it("leaves the bare self-help noun alone in both locales", () => {
    const bare = USER_FACING.filter(({ text }) => /self-help|самопомощ/i.test(text));

    // Seven per locale today (nine until #1727, eight until #1958 deleted the
    // onboarding's "Would a self-help module be useful?" with its modules
    // panel). A floor rather than an equality, so rewording one string is not a
    // test change - but high enough that an empty or moved corpus cannot make
    // the loop below vacuous.
    expect(bare.length).toBeGreaterThanOrEqual(14);

    for (const rule of GUIDED_SELF_HELP) {
      for (const entry of bare) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }
  });

  /**
   * ☠️ **THE HALF THE PROBES NO LONGER COVER** (#1872). Each `GUIDED_SELF_HELP`
   * probe is now the INTERVENING form, so that a later narrowing back to
   * adjacency fails loudly instead of going green. That leaves the adjacent
   * form - the one actually shipping in the App Store subtitle today - held by
   * nothing, which is what this test is for. Both shapes, or the widening was a
   * swap rather than a widening.
   */
  it("catches the adjacent compound as well as the intervening one", () => {
    for (const rule of GUIDED_SELF_HELP) {
      const adjacent = GUIDED_SELF_HELP_ADJACENT[rule.name];
      expect({ rule: rule.name, adjacent: Boolean(adjacent) }).toEqual({
        rule: rule.name,
        adjacent: true,
      });
      expect({ rule: rule.name, matched: rule.pattern.test(adjacent) }).toEqual({
        rule: rule.name,
        matched: true,
      });
      // And the probe really is the intervening form, not a second adjacent one.
      expect({ rule: rule.name, sameAsProbe: rule.probe === adjacent }).toEqual({
        rule: rule.name,
        sameAsProbe: false,
      });
    }
  });

  /**
   * ☠️☠️ **THE ESCAPE HATCH `MANAGEMENT_VERB_ON_HEALTH` DEPENDS ON HAVING.**
   * #1815 permitted the same health objects under a non-management verb - "look
   * after your mental health", "take care of" - because those claim to help a
   * person rather than to operate on a condition. If someone later "simplifies"
   * the rule to a ban on the OBJECT, every one of these fails, and so does the
   * safety copy below.
   *
   * ☠️ The second half is the expensive one. #1815 also proposed banning bare
   * `treat` / `treatment` / `symptoms` / `recovery`, and a sweep found the words
   * doing SAFETY work: five live strings use `treatment` to say what Selftend is
   * NOT, `docs/product-principles.md` uses it in its own prohibition, and
   * `AGENTS.md` opens its guardrails with "Treat this as a wellness and
   * self-help product". Those are pinned here as literals so a later
   * completeness sweep meets the decision instead of rediscovering the bare
   * words as an oversight.
   */
  it("leaves non-management verbs and the safety-copy uses of 'treatment' alone", () => {
    const permitted = [
      "Look after your mental health.",
      "Take care of your wellbeing.",
      "Грижи се за психичното си здраве.",
      "Selftend is a free, private CBT self-help app - cognitive behavioural therapy - with everyday tools for right now and a programme to work through when you want one.",
      "Selftend is a set of free, private mental health tools: everyday tools for right now, and a CBT programme - cognitive behavioural therapy - to work through when you want one.",
      "Private mental health tools.",
      "Work through something, don't just track how you feel.",
    ];

    for (const rule of MANAGEMENT_VERB_ON_HEALTH) {
      for (const text of permitted) {
        expect({ rule: rule.name, text, matched: rule.pattern.test(text) }).toEqual({
          rule: rule.name,
          text,
          matched: false,
        });
      }
    }

    // The live safety copy, read off disk rather than quoted, so this fails if
    // the strings are reworded into something the rule would catch.
    const safety = [
      ...ALL_SURFACES.filter(({ text }) => /\btreatment\b/i.test(text)),
      ...ALL_SURFACES.filter(({ text }) => /\brecovery plan\b/i.test(text)),
    ];
    expect(safety.length).toBeGreaterThanOrEqual(6);

    for (const rule of MANAGEMENT_VERB_ON_HEALTH) {
      for (const entry of safety) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }
  });

  /**
   * The third of these, and it exists for exactly the reason the other two do.
   *
   * ☠️ `behavioral` is British in the frame word and correct as-is in the privacy
   * sense, and the two live in the SAME FILE - `policies.json` privacy §3 says
   * "behavioral profiling tools" three sections before terms §3 says "cognitive
   * behavioural exercises". #1627 respelled the second and deliberately left the
   * first, because "behavioral profiling" is the term of art for the thing the
   * privacy policy is promising not to do.
   *
   * So if someone later "simplifies" `FRAME_SPELLING` to a bare
   * `/\bbehavioral\b/i`, this test names what the simplification broke - and it
   * breaks a consent-bearing section, which is the expensive kind. It also fails
   * loudly if the string is ever reworded away, which is the point of a floor
   * that is an equality rather than a `>=`: there is exactly one, and a second
   * one appearing is a question worth asking rather than a number to bump.
   */
  it("leaves the privacy sense of 'behavioral' alone", () => {
    const privacySense = USER_FACING.filter(({ text }) => /\bbehavioral\b/i.test(text));

    expect(privacySense.map((entry) => entry.id)).toHaveLength(1);
    expect(privacySense[0].text).toMatch(/behavioral profiling tools/i);

    // #1638 added a rule for the plain noun and claims the adjective is outside
    // it by construction. That claim is checked against the LIVE string here,
    // and against the two invisible survivors in the test below.
    for (const rule of [...FRAME_SPELLING, ...PLAIN_NOUN_SPELLING]) {
      for (const entry of privacySense) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }
  });

  /**
   * The fourth of these tests, and the only one that pins a claim about the
   * PATTERN rather than about a string.
   *
   * `PLAIN_NOUN_SPELLING` bans the bare American noun with no exemption list,
   * and is only safe to do so because `\b` cannot fall between the `r` of
   * `behavior` and the `al` of `behavioral`. Three American spellings survive on
   * that fact alone, and two of them are invisible to every corpus this file
   * scans - `loadLocale` reads values, so the `behavioralActivation` KEY is not
   * in `USER_FACING` at all, and `behavioral-activation` lives in Postgres.
   *
   * ☠️ The slug is the expensive one: it is written to
   * `mood_logs.linked_strategy` and read back by `mood-detail-screen.tsx`, so a
   * rule that reached it would invite a rename that orphans rows users have
   * already saved. Asserting them as literals is the point - there is no corpus
   * that would otherwise notice if the pattern were loosened to `/behaviors?/i`
   * or `/\bbehavior/i`, both of which look harmless and match all three.
   *
   * The second half is the positive control the ban needs: a rule whose corpus
   * contains no near-misses proves nothing, so this checks the British noun is
   * genuinely present in shipped copy and genuinely unmatched.
   */
  it("leaves the American adjective, the i18n key and the persisted slug alone", () => {
    const survivesOnPurpose = [
      "behavioral profiling tools",
      "behavioralActivation",
      "behavioral-activation",
    ];

    const british = USER_FACING.filter(({ text }) => /\bbehaviours?\b/i.test(text));

    // 22 en strings once #1638 swept its thirteen across. A floor rather than an
    // equality, so rewording one string is not a test change - but high enough
    // that an empty or moved corpus cannot make the loop below vacuous.
    expect(british.length).toBeGreaterThanOrEqual(20);

    for (const rule of PLAIN_NOUN_SPELLING) {
      for (const kept of survivesOnPurpose) {
        expect({ rule: rule.name, kept, matched: rule.pattern.test(kept) }).toEqual({
          rule: rule.name,
          kept,
          matched: false,
        });
      }

      for (const entry of british) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }
  });

  /**
   * ☠️ The near-misses the house-style block must never reach, as literals.
   *
   * Every one of these is a real string that a plausible loosening of a pattern
   * would match, and four of them are the difference between a guard and a
   * liability:
   *
   *   - **Colorado** is in privacy §9's list of US state privacy laws. A bare
   *     `/color/` rewrote it to "Colourado" during this change, on the dry run,
   *     in a consent-bearing section. This is not hypothetical.
   *   - **fulfilled / fulfilling** are CORRECT British spellings - the double l
   *     returns in the inflected forms - so only the bare verb is banned.
   *   - **practice** the noun is identical in both, and appears everywhere in a
   *     meditation app. Only the `-ing` / `-ed` verb forms differ.
   *   - **humorous** is identical in both, which is why there is no `humour`
   *     rule at all even though a prefix census flagged it.
   *
   * The CSS and manifest tokens are the scope half of the same argument: they
   * are not in `I18N_VALUES`, so the rules cannot see them, and asserting the
   * patterns WOULD match them is what makes the scoping deliberate rather than
   * lucky.
   */
  it("leaves correct British inflections, identical-in-both words and CSS tokens alone", () => {
    const survivesOnPurpose = [
      "Colorado (CPA)",
      "We do not read your records except to fulfilled",
      "fulfilling a legal obligation",
      "Practice for ten minutes",
      "the humorous side of life",
      // #1651: the British forms must not be re-matched by their own rules.
      // `\bprogram\b` cannot reach "programme" because the next character is a
      // word char, and "judgement" does not contain the substring "judgm".
      "Start the ACT programme",
      "Structured therapeutic programmes you can work through",
      "noticing sensation without judgement",
      "Cultivate non-judgemental awareness",
      // ☠️ #1651 decided `licence` is NOT guarded and NOT swept. Three of the
      // four occurrences are the verb/participle "licensed", which is already
      // correct British; the two nouns both refer to the AGPL, an instrument
      // titled "GNU Affero General Public License", matching the repo's own
      // LICENSE file. Respelling a noun that names a document makes it disagree
      // with the document. Asserted here so a later "completeness" sweep meets
      // the decision instead of rediscovering it as an oversight.
      "The Selftend application source code is licensed under AGPL-3.0-only.",
      "This license applies to the software, not to your personal data.",
      "a substitute for a licensed mental health professional",
      "License direction",
    ];

    for (const rule of HOUSE_STYLE_SPELLING) {
      for (const kept of survivesOnPurpose) {
        expect({ rule: rule.name, kept, matched: rule.pattern.test(kept) }).toEqual({
          rule: rule.name,
          kept,
          matched: false,
        });
      }
    }

    // The scoping, asserted from both sides: these WOULD be caught, and the
    // only thing keeping them safe is that they are not in the corpus.
    const colour = HOUSE_STYLE_SPELLING.find((rule) => rule.name.startsWith("en: color"))!;
    expect(colour.pattern.test("prefers-color-scheme")).toBe(true);
    expect(I18N_VALUES.some(({ text }) => /prefers-color-scheme/.test(text))).toBe(false);
    expect(USER_FACING.some(({ text }) => /prefers-color-scheme/.test(text))).toBe(true);

    // Positive control: the British forms are genuinely present in shipped copy
    // and genuinely unmatched, so the rules are not passing over an empty set.
    const british = I18N_VALUES.filter(({ text }) =>
      /\bfavourit|\bcolour|\borganis|\bpractis|\brecognis|\bfulfil\b/i.test(text),
    );
    expect(british.length).toBeGreaterThanOrEqual(25);
    for (const rule of HOUSE_STYLE_SPELLING) {
      for (const entry of british) {
        expect({ rule: rule.name, id: entry.id, matched: rule.pattern.test(entry.text) }).toEqual({
          rule: rule.name,
          id: entry.id,
          matched: false,
        });
      }
    }
  });

  /**
   * There is no allowlist here, and adding one needs a very good reason.
   *
   * `restraint-copy` has an `ALLOWED` list that is now empty, and its docstring
   * explains the shape: an exemption dies when the COPY is fixed, not when
   * someone deletes the key. #1606 rejected seeding this guard with the 22
   * "guided self-help" strings for exactly that reason - a 22-entry list is one
   * nobody ever finishes, and it would have made this file a record of what
   * Selftend tolerates rather than what it has decided.
   *
   * ✅ That call was vindicated: #1616 fixed all 22 and the rule landed clean in
   * the same change. The list would still be here, at 22 entries, had it been
   * seeded. Every rule added after this one inherits the same bargain - fix the
   * copy first, or do not add the rule.
   */
  it("has no exemptions, because every rule was added only once its copy already passed", () => {
    for (const rule of RULES) {
      expect({
        rule: rule.name,
        offenders: corpusFor(rule.scope).filter(({ text }) => rule.pattern.test(text)).length,
      }).toEqual({ rule: rule.name, offenders: 0 });
    }
  });
});

/**
 * ☠️☠️ **THE STORE LISTINGS ARE COPY, AND NO RULE HAD EVER READ THEM** (#1760,
 * #1789). Every corpus above is built from what the app ships or what the
 * repository documents. The two files that carry what the App Store and Play
 * actually say were in none of them, so a banned phrase in a store listing
 * passed `verify` **by construction** — and did, twice over:
 *
 *   - `store/apple-info.json`'s `subtitle` read _"Calm, guided self-help
 *     tools"_ from #1611 until #2009/#2021, the one phrase this file calls
 *     unsafe rather than merely off-frame, live on the App Store the whole time.
 *   - The Play full description spelled `catastrophizing` while the app spelled
 *     the same word `Catastrophising` (#2061) — and there was no rule for that
 *     word either, so the corpus gap and the rule gap were both real.
 *
 * ⚠️ **The corpus is the mirrored listing TEXT, never the files.** Both files
 * are mostly prose ABOUT the listings — `store/play-listing.md` quotes retired
 * spellings and banned compounds inside records of the fixes that retired them,
 * exactly as `docs/positioning.md` does. Scanning the files whole would go red
 * on those records, and the tempting fix would be to weaken the rule. So this
 * reads the App Store fields and the Play verbatim block, and nothing else.
 *
 * ☠️ `storeListingText` THROWS rather than returning `[]` when the Play heading
 * moves or the block is empty. An extractor that silently yields nothing makes
 * every rule below vacuously green over a corpus that looks covered — the
 * #1908/#2019 failure in a third costume.
 */
describe("the store listings are in scope (#1760)", () => {
  it("puts the App Store fields and the Play verbatim block in every corpus", () => {
    for (const scope of ["i18n", "user-facing", "all", "prose"] as const) {
      const surfaces = new Set(corpusFor(scope).map(({ surface }) => surface));

      expect({
        scope,
        apple: surfaces.has(APPLE_INFO_SURFACE),
        play: surfaces.has(PLAY_VERBATIM_SURFACE),
      }).toEqual({ scope, apple: true, play: true });
    }
  });

  it("reads the real listing text, so the corpus cannot be quietly empty", () => {
    const subtitle = STORE_LISTING_TEXT.find(
      ({ surface, id }) => surface === APPLE_INFO_SURFACE && id === "subtitle",
    );
    const verbatim = STORE_LISTING_TEXT.find(({ surface }) => surface === PLAY_VERBATIM_SURFACE);

    expect(subtitle?.text.length).toBeGreaterThan(10);
    expect(verbatim?.text).toContain("What's inside:");
  });

  /**
   * The wiring, proven on synthetic input rather than on the live files: if the
   * copy is ever wrong again, a rule has to see it. Running the real rule set
   * over a mutated listing is the only assertion here that would fail if
   * `corpusFor` stopped appending the store text.
   */
  it("catches a banned phrase planted in either store surface", () => {
    const planted = storeListingText(
      JSON.stringify({ subtitle: "Calm, guided self-help tools" }),
      `## Verbatim, as saved on 2026-01-01\n\n> A guided self-help app.\n`,
    );

    const caught = GUIDED_SELF_HELP.filter((rule) =>
      planted.some(({ text }) => rule.pattern.test(text)),
    ).map(({ name }) => name);

    expect(caught).toContain("en: guided self-help");
    expect(planted.map(({ surface }) => surface)).toEqual([
      APPLE_INFO_SURFACE,
      PLAY_VERBATIM_SURFACE,
    ]);
  });

  it("refuses to yield an empty corpus when the Play verbatim block moves", () => {
    expect(() => storeListingText(`{"subtitle":"x"}`, "# no verbatim heading here\n")).toThrow(
      /Verbatim/,
    );
    expect(() =>
      storeListingText(
        `{"subtitle":"x"}`,
        "## Verbatim, as saved on 2026-01-01\n\nno quote lines\n",
      ),
    ).toThrow(/Verbatim/);
  });
});

/**
 * ☠️☠️ **THE ONE POSITIVE RULE, AND WHY IT IS THE ONLY ONE** (#1790).
 *
 * Every rule above fails when someone WRITES a forbidden thing. This one fails
 * when someone DELETES a required one — a different failure, and since #2004 a
 * live one rather than a theoretical one.
 *
 * Under the old noun, *a CBT self-help app*, the method rode inside the
 * category noun, so every surface that named the category named the method for
 * free and a positive pin was a second lock on a door that locked itself.
 * `docs/positioning.md` records what changed, in its own words:
 *
 * > Clause 1 is now the **only** thing keeping the method on a surface: under
 * > _a CBT self-help app_ the noun carried the method wherever the noun went,
 * > and under _mental health tools_ it does not, so a surface that names the
 * > category and stops has already failed the first reading test.
 *
 * …under a heading reading *"two clauses, and no gate can enforce either"*, and
 * beside the doc's own note that the failure mode is **already shipping** (the
 * iOS first screenshot is a home screen headed `Your tools`, no programme in
 * frame). Deleting `CBT programme` from the web hero passes `verify` on `dev`
 * today. That is what this ring is for, and nothing above it reaches.
 *
 * ☠️ **PRESENCE, NEVER EQUALITY.** The pattern is the method's NAME, not the
 * frame sentence. #1606 §9's objection — a pin "fails on any legitimate
 * rewrite" — is real and is answered by staying this loose: beat two may be
 * recut freely as long as it still names the thing. Anything stricter guards
 * phrasing, which this file pointedly does not do even to `positioning.md`.
 *
 * ☠️☠️ **TWO EXCLUSIONS, EACH FOR ITS OWN REASON. NEITHER IS A BACKLOG.**
 *
 *  1. **Capped fields are out by RULE, not by timing.** `subtitle` (30) and
 *     Play's short description (80) carry the short form — *"Private mental
 *     health tools."*, 28 characters, no method — because the frame sentence is
 *     174 and does not fit. A pin over them is red by design, and no fix
 *     anywhere turns it green. ⚠️ #1790 was filed believing it was blocked
 *     until #1760 cleared `subtitle`; it never was. #1760's own decided
 *     replacement is that same method-free 28, so closing it changes nothing
 *     here.
 *  2. **Transcripts of live external listings are out because the repo is not
 *     where they get fixed.** `store/play-listing.md`'s full description is the
 *     Play listing *"word for word, not a summary"*. If the listing drifts the
 *     transcript must follow it to stay true, and a pin would fight that
 *     correction — going red pending an owner action in the Play Console. That
 *     is the bargain #1616 set and #1790 restated: fix the copy and add the
 *     rule in the same change, or do not add the rule.
 *
 * What is left is what this repository ships and can fix inside a PR.
 */
describe("the frame's second beat survives on the surfaces this repo ships (#1790)", () => {
  /**
   * The method as beat two names it, per locale.
   *
   * ☠️ The COMPOUND, never the bare acronym. `promoText` says "CBT thought
   * records" and has no programme in it at all, so a `/CBT/` pattern would call
   * that surface conformant — and the whole point of clause 1 is that naming a
   * tool is not naming the method.
   *
   * ☠️ No `\b` and no `\w` near the Bulgarian pattern: both are ASCII-only in
   * JS, so against Cyrillic they do not do what they appear to. A plain
   * substring is what is wanted in either locale anyway, and it keeps the rule
   * loose enough to survive inflection (`КПТ програмата` still matches).
   */
  const METHOD: Record<Locale, RegExp> = {
    en: /CBT programme/i,
    bg: /КПТ програма/i,
  };

  const INDEX_HTML = readFile("public/index.html").text;
  const MANIFEST = JSON.parse(readFile("public/manifest.webmanifest").text) as Record<
    string,
    string
  >;

  /** One `<meta>`'s content, whether it is written on one line or on four. */
  function metaContent(named: string): string {
    const hit = new RegExp(`<meta\\s+(?:name|property)="${named}"\\s+content="([^"]*)"`).exec(
      INDEX_HTML,
    );
    if (!hit) throw new Error(`public/index.html has no <meta> named "${named}"`);
    return hit[1];
  }

  /** One i18n value by `namespace:dotted.key`, from the same corpus the bans use. */
  function i18nValue(locale: Locale, id: string): string {
    const hit = LOCALE_STRINGS[locale].find(({ namespace, key }) => `${namespace}:${key}` === id);
    if (!hit) throw new Error(`${locale} has no ${id}`);
    return hit.text;
  }

  /**
   * The uncapped, repo-shipped surfaces `docs/positioning.md` says carry the
   * frame sentence. Each is addressed as the FIELD it is, never as "somewhere
   * in the file": `index.html` carries the sentence in three separate metas,
   * and a whole-file scan would stay green with two of them hollowed out.
   */
  const FRAME_CARRIERS: { id: string; locale: Locale; text: string }[] = [
    ...(["en", "bg"] as const).flatMap((locale) =>
      ["auth:landing.subtitle", "auth:landingPage.heroSupport"].map((key) => ({
        id: `i18n/${locale} ${key}`,
        locale,
        text: i18nValue(locale, key),
      })),
    ),
    ...["description", "og:description", "twitter:description"].map((named) => ({
      id: `public/index.html <meta ${named}>`,
      locale: "en" as Locale,
      text: metaContent(named),
    })),
    {
      id: "public/manifest.webmanifest description",
      locale: "en" as Locale,
      text: MANIFEST.description,
    },
  ];

  it("names the method on every frame-carrying surface, in both locales", () => {
    for (const { id, locale, text } of FRAME_CARRIERS) {
      expect({ id, namesTheMethod: METHOD[locale].test(text) }).toEqual({
        id,
        namesTheMethod: true,
      });
    }
  });

  /**
   * The category noun as each locale writes it - the half of the frame that
   * § _The hard rule_ clause 1 says may never appear on its own.
   */
  const CATEGORY: Record<Locale, RegExp> = {
    en: /mental health tools/i,
    bg: /инструменти за психично здраве/i,
  };

  const DRAFTS_DOC = "docs/launch/reddit-promotion-package.md";

  /**
   * The `### N. sub` sections of the Reddit drafts file, each returned both raw
   * and flattened - blockquote markers stripped and every run of whitespace
   * collapsed to one space.
   *
   * ☠️☠️ **THE FLATTENING IS THE RULE'S REACH, NOT TIDINESS**, and it is the
   * `readArtworkSource` lesson in a second costume: these phrases are multi-word
   * and the drafts are hard-wrapped inside `>` blockquotes, so a line break can
   * fall between any two words. Draft 4 wraps the category noun itself
   * (`...free, private mental health` / `> tools: ...`), so a guard written
   * against the raw file finds no category, calls that draft exempt, and passes
   * over **the exact draft this rule exists for**. Exercised on synthetic input
   * below, because a fixture taken from today's wrapping would go green the day
   * someone reflows the paragraph.
   */
  function draftSections(markdown: string): { id: string; raw: string; text: string }[] {
    return markdown
      .split(/\n### /)
      .slice(1)
      .filter((section) => /^\d+\./.test(section))
      .map((section) => ({
        id: section.split("\n")[0].trim(),
        raw: section,
        text: section.replace(/^[ \t]*>[ ]?/gm, "").replace(/\s+/g, " "),
      }));
  }

  /**
   * ☠️☠️ **CLAUSE 1 IS AN OBLIGATION FOR SOMETHING TO BE PRESENT, AND EVERY
   * OTHER RULE IN THIS FILE IS A BAN ON A STRING** (#1901). A ban cannot check a
   * presence, which is why `docs/positioning.md` says in its own heading that no
   * gate can enforce either clause, and why [#2073](https://github.com/Selftend/selftend/pull/2073)
   * adding this file to the prose corpus did not help: the drafts were clean
   * against every banned phrase in both languages **and still had two
   * violations**. Drafts 4 (r/webdev) and 5 (r/reactnative) named the category
   * and stopped, carrying the method nowhere in the post.
   *
   * ⚠️ **One narrow form of clause 1 IS checkable, and it is the form that
   * actually failed.** `positioning.md` gives the reading test as _"a surface
   * that names the category and stops has already failed"_ - so within one
   * structured file, per draft: **if the section names the category noun, it
   * must also name the method.** That is mechanical. What stays unreachable is
   * the general clause, which asks whether a surface *presents the tools* at
   * all, and that is a judgement no regex makes.
   *
   * ☠️ **THE EXEMPTION IS EARNED BY THE TEXT, NOT BY A LIST.** Draft 8 (the
   * tester-sub update comments) names no category and presents no tools, so
   * there is no bare inventory for clause 1 to bind and the rule skips it on its
   * own. That is deliberate: an allowlist would have to be maintained, and the
   * day someone gives draft 8 a frame it would keep exempting it. Conversely
   * nothing here asserts that a draft IS exempt - adding the frame to draft 8 is
   * a legitimate edit, and it simply moves that section into the checked half.
   *
   * ☠️ The method pattern is the COMPOUND and never the bare acronym, for the
   * reason `METHOD` above gives: naming a tool is not naming the method, so a
   * draft saying "CBT thought records" and nothing else must still fail.
   */
  it("keeps the method in every Reddit draft that names the category (#1901)", () => {
    const sections = draftSections(readFile(DRAFTS_DOC).text);

    // Positive control: a renamed heading level or a moved file would return an
    // empty list and make the loop below pass by never running.
    expect(sections.length).toBeGreaterThanOrEqual(8);

    const checked: string[] = [];
    for (const { id, text } of sections) {
      const locale = (["en", "bg"] as const).find((candidate) => CATEGORY[candidate].test(text));
      if (!locale) continue;
      checked.push(id);
      expect({ id, namesTheMethod: METHOD[locale].test(text) }).toEqual({
        id,
        namesTheMethod: true,
      });
    }

    // And the rule really did run over the drafts rather than skipping them all
    // on a category noun that has quietly moved on. Both locales are covered:
    // draft 7 is the Bulgarian one and is checked through the `bg` pattern.
    expect(checked.length).toBeGreaterThanOrEqual(7);
  });

  /**
   * The flattening above, on synthetic input (#1901).
   *
   * ☠️ Without this the guard is worth nothing on the draft it was written
   * for, and the suite is green either way - the same shape of miss #2022
   * recorded when a `<span>` sat between the two banned words.
   */
  it("sees a category noun that a blockquote line break splits in two (#1901)", () => {
    const wrapped =
      "9. r/example\n\n> Selftend is a set of free, private mental health\n> tools: everyday tools for right now.\n";

    // Raw, the phrase is not there at all - the newline and the `> ` sit inside it.
    expect(CATEGORY.en.test(wrapped)).toBe(false);

    // Flattened, it is, so the section reaches the method check rather than
    // being waved through as one that never named the category.
    const [section] = draftSections(`\n### ${wrapped}`);
    expect(section.id).toBe("9. r/example");
    expect(CATEGORY.en.test(section.text)).toBe(true);
    expect(METHOD.en.test(section.text)).toBe(false);
  });

  /**
   * ☠️ Non-vacuous in the two ways this repo has already been bitten.
   *
   * The corpus has to be non-empty — `i18nValue` throwing would be loud, but a
   * filter quietly matching nothing would leave the loop above passing by never
   * running at all. And the locale halves are compared as a RELATION rather
   * than to a literal count (#2019): a fix that deletes one locale wholesale
   * satisfies "bg has N entries" by editing N, and cannot satisfy "bg has as
   * many as en".
   */
  it("covers both locales in equal number, over a corpus that is not empty", () => {
    const i18nCount = (locale: Locale) =>
      FRAME_CARRIERS.filter((c) => c.locale === locale && c.id.startsWith("i18n/")).length;

    expect(i18nCount("en")).toBeGreaterThan(0);
    expect(i18nCount("bg")).toEqual(i18nCount("en"));
    // And the web surfaces are really in there beside the i18n half.
    expect(FRAME_CARRIERS.length).toBeGreaterThan(i18nCount("en") + i18nCount("bg"));
  });

  /**
   * ☠️ A pattern that cannot fail is green over hollowed-out copy and looks
   * exactly like a working one. Both directions are probed, in both locales:
   * the noun ALONE must not satisfy the rule — that is the precise state clause
   * 1 calls a failed first reading test — and beat two must.
   */
  it("uses a pattern that rejects the category noun standing alone", () => {
    expect(METHOD.en.test("a set of free, private mental health tools")).toBe(false);
    expect(METHOD.en.test("and a CBT programme - cognitive behavioural therapy")).toBe(true);
    expect(METHOD.bg.test("Набор от безплатни, лични инструменти за психично здраве")).toBe(false);
    expect(METHOD.bg.test("и КПТ програма - когнитивно-поведенческа терапия")).toBe(true);
  });

  /**
   * Exclusion 1, pinned as the FACT that justifies it rather than as the list
   * itself. Re-listing the excluded fields would only restate the decision;
   * this goes red if the world moves under it — if the short form ever gains a
   * method, the capped fields become pinnable and this exclusion needs
   * re-arguing rather than inheriting.
   */
  it("leaves the capped store fields out, because the short form they carry has no method in it", () => {
    const APPLE = JSON.parse(readFile("store/apple-info.json").text) as Record<string, string>;

    for (const field of Object.keys(APP_STORE_CAPS)) {
      expect({ field, namesTheMethod: METHOD.en.test(APPLE[field]) }).toEqual({
        field,
        namesTheMethod: false,
      });
    }
    expect(FRAME_CARRIERS.some(({ id }) => id.includes("apple-info"))).toBe(false);
  });

  /**
   * Exclusion 2, stated so it cannot be mistaken for a tolerated violation: the
   * Play transcript DOES carry the method today. It is out because of where a
   * future divergence would have to be fixed — in the Play Console, by the
   * owner — and not because it currently fails.
   */
  it("leaves the Play transcript out, though it carries the method today", () => {
    expect(FRAME_CARRIERS.some(({ id }) => id.includes("play-listing"))).toBe(false);
    expect(METHOD.en.test(readFile("store/play-listing.md").text)).toBe(true);
  });
});

/**
 * ☠️☠️ **THE GOVERNING DOCUMENT COULD NOT BE WRONG OUT LOUD** (#1944).
 *
 * Everything above scans copy *against* `docs/positioning.md`.
 * `docs/positioning.md` was scanned against nothing. It is in
 * `PUBLISHED_RECORDS` and deliberately held out of every corpus - correctly,
 * since it necessarily quotes the phrases it bans - but that exclusion is
 * total, and the copy gate is the only thing that reads the file. So its
 * factual claims had no automated check of any kind.
 *
 * What that cost: the document asserted **in bold** that the App Store
 * `subtitle` was the only capped store field. Two others are capped, and one of
 * them was named on the next line of the same `CAPS` object. The claim was
 * wrong from the moment #1824 merged it, and it survived merge, review and a
 * `verify` run until #1940 happened to read both.
 *
 * ☠️ **The fix for a wrong claim was a more specific claim, and specificity
 * rots.** #1940 replaced the false sentence with a sourced table of exact
 * numbers. Six numbers and two file references now sit in prose, and every one
 * of them goes stale the moment a cap moves or a listing is edited - which two
 * of them already had by the time this guard was written: the Play row still
 * quoted **34** after `store/play-listing.md` had moved to 28, and the
 * `subtitle` row still named the #1760 defect string as the committed value
 * after #2009 had replaced it.
 *
 * ⚠️ **SCOPE: THIS ASSERTS NUMBERS AND IDENTITIES, NEVER PHRASING.** Do not
 * close a gap here by adding `docs/positioning.md` to `PROSE_DOCS` - the
 * comment on `ALL_SURFACES` forbids exactly that, and doing it turns the build
 * red on a file quoting its own bans, whose tempting fix is to weaken the rule.
 * Nothing below reads the document for style.
 *
 * ⚠️ **Reading `store/` for a NUMBER is not scanning `store/` for phrasing.**
 * Still true of THIS block — `store/play-listing.md` is read here for the
 * digits in its own "N of 80 characters" line and for nothing else. ✅ The gap
 * it used to point at is closed: `STORE_LISTING_TEXT` puts the App Store fields
 * and the Play verbatim block into every corpus (#1760). #1789 remains open for
 * the surfaces outside this repository.
 *
 * ☠️ **Line numbers are deliberately not asserted.** Pinning
 * `store-info-invariants.test.ts:39` in a test re-creates the rot it is meant
 * to catch. The values are matched; a `:NN` suffix in the prose is treated as
 * decoration and stripped before the path is checked.
 */
describe("docs/positioning.md's own facts, which nothing else can check", () => {
  const POSITIONING = readFile("docs/positioning.md").text;
  const PLAY_LISTING = readFile("store/play-listing.md").text;
  const APPLE_INFO = JSON.parse(readFile("store/apple-info.json").text) as Record<string, string>;

  /** The body of one `###` section, up to the next heading of any depth. */
  function section(heading: string): string {
    const at = POSITIONING.indexOf(`\n${heading}\n`);
    if (at === -1) throw new Error(`docs/positioning.md has no "${heading}" section`);
    const rest = POSITIONING.slice(at + heading.length + 2);
    const end = rest.search(/\n#{2,4} /);
    return end === -1 ? rest : rest.slice(0, end);
  }

  /** The data rows of the first table in `body` whose header line matches. */
  function rowsOf(body: string, header: RegExp): string[][] {
    const lines = body.split("\n");
    const at = lines.findIndex((line) => header.test(line));
    if (at === -1) throw new Error(`no table matching ${header} in the section`);

    const rows: string[][] = [];
    for (let i = at + 2; i < lines.length && lines[i].startsWith("|"); i += 1) {
      rows.push(
        lines[i]
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
    }
    return rows;
  }

  /** A cell's literal string: bold stripped, a trailing italic aside dropped. */
  function plain(cell: string): string {
    return cell
      .replace(/\*\*/g, "")
      .replace(/\s*_\([^)]*\)_\s*$/, "")
      .trim();
  }

  /** The number a cell leads with — `**28**`, `28`, `34 live — …` all give it. */
  function leadingNumber(cell: string): number | null {
    const hit = /^\**(\d+)\**/.exec(cell.trim());
    return hit ? Number(hit[1]) : null;
  }

  const SHORT_FORM = section("### The short form");
  const INVENTORY = rowsOf(SHORT_FORM, /^\|\s*Field\s*\|\s*Cap\s*\|/);
  const CANDIDATES = rowsOf(SHORT_FORM, /^\|\s*Candidate\s*\|\s*Chars\s*\|/);

  const rowNaming = (needle: RegExp) => INVENTORY.find((cells) => needle.test(cells[0]));

  it("parses the section it is asserting, rather than passing over an empty one", () => {
    // The positive control every corpus in this file has. A renamed heading or
    // a reformatted table would otherwise make all of this vacuously green.
    expect(INVENTORY.length).toBeGreaterThanOrEqual(3);
    expect(CANDIDATES.length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(APP_STORE_CAPS).length).toBeGreaterThanOrEqual(2);
  });

  /**
   * The first half of #1944: every field this repo caps has to be named in the
   * document's inventory, at the cap the repo actually enforces. A third cap
   * added to `store-caps.ts` and not written down here fails, which is the
   * failure #1940 found by hand.
   */
  it("names every capped App Store field, at the cap this repo enforces", () => {
    for (const [field, cap] of Object.entries(APP_STORE_CAPS)) {
      const row = rowNaming(new RegExp(`\`${field}\``));
      expect({ field, named: Boolean(row) }).toEqual({ field, named: true });
      expect({ field, cap: leadingNumber(row![1]) }).toEqual({ field, cap });
    }

    // The same numbers also appear in the prose above the table - "caps the App
    // Store `subtitle` at **30**" is the sentence #1819 and #2007 both reasoned
    // from. Every occurrence has to agree with the object; none is REQUIRED to
    // exist, because requiring a sentence is guarding phrasing, and this file
    // does not do that to `positioning.md`.
    for (const [field, cap] of Object.entries(APP_STORE_CAPS)) {
      for (const [, stated] of SHORT_FORM.matchAll(
        new RegExp(`\`${field}\` at \\*\\*(\\d+)\\*\\*`, "g"),
      )) {
        expect({ field, stated: Number(stated) }).toEqual({ field, stated: cap });
      }
    }
  });

  /**
   * The second half: the Play cap is not in `store-caps.ts` - Play is not App
   * Store Connect - so it is matched against the only place that records it,
   * `store/play-listing.md`'s own count line. Both numbers on that line are
   * used: the cap, and how much of it the committed short description spends.
   */
  it("matches the Play short-description cap and usage to store/play-listing.md", () => {
    const counted = /Short description \((\d+) of (\d+) characters\)/.exec(PLAY_LISTING);
    expect({ found: Boolean(counted) }).toEqual({ found: true });

    const [, used, cap] = counted!;
    const row = rowNaming(/Play short description/i);
    expect({ named: Boolean(row) }).toEqual({ named: true });
    expect({ cap: leadingNumber(row![1]) }).toEqual({ cap: Number(cap) });
    expect({ committed: leadingNumber(row![2]) }).toEqual({ committed: Number(used) });
  });

  /**
   * The "committed today" column, against the committed files themselves. This
   * is the column with the shortest half-life: it changes whenever a listing is
   * edited, and nothing used to notice.
   */
  it("states the committed lengths the store files actually carry", () => {
    for (const field of Object.keys(APP_STORE_CAPS)) {
      const row = rowNaming(new RegExp(`\`${field}\``))!;
      expect({ field, stated: leadingNumber(row[2]) }).toEqual({
        field,
        stated: APPLE_INFO[field].length,
      });
    }
  });

  /**
   * ☠️ A length is not enough, and this is the trap that proves it: the
   * `subtitle` row named _"Calm, guided self-help tools"_ as the committed
   * value long after #2009 had replaced it with _"Private mental health
   * tools."_ - and **both are 28 characters**, so the check above sat green
   * over a false quotation. Where the document quotes a committed value, the
   * quotation is compared, not just its length.
   */
  it("quotes committed values verbatim where it quotes them at all", () => {
    let quoted = 0;

    for (const field of Object.keys(APP_STORE_CAPS)) {
      const row = rowNaming(new RegExp(`\`${field}\``))!;
      const hit = /_"([^"]*)"_/.exec(row[2]);
      if (!hit) continue;

      quoted += 1;
      expect({ field, quoted: hit[1] }).toEqual({ field, quoted: APPLE_INFO[field] });
    }

    // Non-vacuous: at least one row really does quote, so the loop above is not
    // skipping every iteration.
    expect(quoted).toBeGreaterThanOrEqual(1);
  });

  /**
   * The Source column, checked as references rather than as prose: the files
   * exist, and where a source line is quoted the quotation is really in it.
   * A `:NN` suffix is stripped first - #1944's own warning is that pinning line
   * numbers re-creates the rot, so they are decoration here and nothing more.
   */
  it("cites sources that exist and quotes them accurately", () => {
    let checked = 0;

    for (const cells of INVENTORY) {
      const source = cells[cells.length - 1];

      for (const [, cited] of source.matchAll(/`([^`]+)`/g)) {
        // Backticks also wrap identifiers in this column; only paths are files.
        if (!cited.includes("/")) continue;

        const file = cited.replace(/:\d+$/, "");
        expect({ file, exists: fs.existsSync(path.join(ROOT, file)) }).toEqual({
          file,
          exists: true,
        });

        const quote = /_"([^"]*)"_/.exec(source);
        if (quote) {
          expect({
            file,
            quoted: fs.readFileSync(path.join(ROOT, file), "utf8").includes(quote[1]),
          }).toEqual({ file, quoted: true });
        }
        checked += 1;
      }
    }

    expect(checked).toBeGreaterThanOrEqual(3);
  });

  /**
   * The candidates table is pure arithmetic - a character count beside a string
   * - and it is the table #1819 and #2007 both reasoned from. It has been
   * repeated row for row once already, so a miscount here would propagate.
   */
  it("counts its own candidate strings correctly, and adopts one that fits", () => {
    for (const cells of CANDIDATES) {
      const candidate = plain(cells[0]);
      expect({ candidate, chars: leadingNumber(cells[1]) }).toEqual({
        candidate,
        chars: candidate.length,
      });
    }

    const adopted = CANDIDATES.filter((cells) => /adopted/i.test(cells[2]));
    expect(adopted).toHaveLength(1);

    const shortForm = plain(adopted[0][0]);
    expect(shortForm.length).toBeLessThanOrEqual(APP_STORE_CAPS.subtitle);

    // And the blockquote under the heading is that same adopted string, so the
    // section cannot advertise one short form and reason about another.
    const quoted = /^> \*\*(.+)\*\*$/m.exec(SHORT_FORM);
    expect({ found: Boolean(quoted) }).toEqual({ found: true });
    expect(quoted![1]).toBe(shortForm);
  });
});
