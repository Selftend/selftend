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
 * still to come.
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

interface Rule {
  name: string;
  pattern: RegExp;
  /**
   * `user-facing` rules are NOT run over the prose docs. See the encryption
   * block for the one trap that makes this distinction load-bearing.
   */
  scope: "user-facing" | "all";
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
 */
const GUIDED_SELF_HELP: Rule[] = [
  {
    name: "en: guided self-help",
    pattern: /\bguided\s+self[-\s]help\b/i,
    scope: "all",
    probe: "Calm, guided self-help tools for personal reflection.",
  },
  {
    name: "bg: насочена самопомощ",
    pattern: /насочен\S*\s+самопомощ/i,
    scope: "all",
    probe: "Спокойни инструменти за насочена самопомощ и лична рефлексия.",
  },
  {
    name: "bg: ръководена самопомощ",
    pattern: /ръководен\S*\s+самопомощ/i,
    scope: "all",
    probe: "Не. Selftend е ръководена самопомощ.",
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
 *   - `policies:*` en - "Why is there no AI counselor?"
 *   - `policies:*` en - "…has no AI therapist, AI counselor, or AI coach."
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

const RULES: Rule[] = [
  ...GUIDED_SELF_HELP,
  ...FRAME_SPELLING,
  ...NEVER_SAYABLE_ENCRYPTION,
  ...AI_AFFIRMATIVE,
  ...STREAK_PROMOTION,
];

function corpusFor(scope: Rule["scope"]) {
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
   * "private CBT thought records or other self-help entries", the support form's
   * warning not to email them, and `settings:modulesQuestion` ("Would a
   * self-help module be useful?"). Bulgarian mirrors all ten with bare
   * `самопомощ`.
   *
   * So if someone later "simplifies" the rules above to `/self-help/i` or
   * `/самопомощ/i`, this test names exactly what the simplification broke,
   * instead of leaving twenty failures to be read as twenty bad strings.
   */
  it("leaves the bare self-help noun alone in both locales", () => {
    const bare = USER_FACING.filter(({ text }) => /self-help|самопомощ/i.test(text));

    // Ten per locale today. A floor rather than an equality, so rewording one
    // string is not a test change - but high enough that an empty or moved
    // corpus cannot make the loop below vacuous.
    expect(bare.length).toBeGreaterThanOrEqual(18);

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

    for (const rule of FRAME_SPELLING) {
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
