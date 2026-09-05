import fs from "fs";
import path from "path";

import { LOCALE_STRINGS } from "@/test/locale-strings";

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
 * ☠️ **ONE-SIDED ON PURPOSE (#1606 §9).** Every rule here is a ban. There is no
 * assertion that the hero *contains* "CBT", because that pins a string and fails
 * on any legitimate rewrite. And #1604's real positive rule - the everyday tools
 * are an on-ramp, never listed flat beside the programme - is a judgement no
 * regex reaches. It is stated in `docs/positioning.md` in prose precisely so
 * nobody builds a brittle gate for it here, watches it fail on good copy, and
 * deletes the whole file.
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
 *   - `campaign/scripts/` are the narrations of eight videos already on YouTube.
 *     Changing a script does not change a video.
 *   - `launch/` holds a published Reddit banner.
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
 * Contributor-facing prose: `AGENTS.md` and the docs tree, minus the records
 * above. Only the `guided self-help` rules run over this — see their block for
 * why that phrase, and only that phrase, can safely reach this far.
 */
const PROSE_DOCS: Scanned[] = [
  "AGENTS.md",
  ...fs
    .readdirSync(path.join(ROOT, "docs"), { recursive: true, encoding: "utf8" })
    .map((entry) => `docs/${entry.split(path.sep).join("/")}`)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !PUBLISHED_RECORDS.some((record) => file.startsWith(record)))
    .sort(),
].map(readFile);

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
 * ☠️ The dedupe keys on `surface` AND `id`. An i18n entry's `id` is
 * `namespace:key` with no locale in it, so keying on `id` alone treated every
 * Bulgarian value as a duplicate of its English twin and silently dropped the
 * whole `i18n/bg` half (#2019). The control test below pins the count.
 */
const WITH_PROSE_DOCS: Scanned[] = [...ALL_SURFACES, ...PROSE_DOCS].filter(
  (entry, index, all) =>
    all.findIndex((other) => other.surface === entry.surface && other.id === entry.id) === index,
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
 * Selftend encrypts ~36 tables with pgcrypto and holds the Vault key OUTSIDE the
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

function corpusFor(scope: Rule["scope"]) {
  if (scope === "i18n") return I18N_VALUES;
  if (scope === "prose") return WITH_PROSE_DOCS;
  return scope === "user-facing" ? USER_FACING : ALL_SURFACES;
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
   */
  it("keeps every Bulgarian i18n value in the prose corpus (#2019)", () => {
    const count = (surface: string) =>
      WITH_PROSE_DOCS.filter((entry) => entry.surface === surface).length;

    expect(count("i18n/en")).toBeGreaterThan(0);
    expect(count("i18n/bg")).toBeGreaterThanOrEqual(count("i18n/en"));
    // The one genuine duplicate is still collapsed to a single entry.
    expect(count("docs/product-principles.md")).toBe(1);
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
