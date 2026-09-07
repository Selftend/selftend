import { LOCALE_STRINGS, type LocaleString } from "@/test/locale-strings";

/**
 * **`bg` addresses one reader informally — the `ти`-form — everywhere the app
 * speaks to them (#2163).**
 *
 * Bulgarian has a formal second person (the `вие`-form) that English does not.
 * Picking it is a voice decision, not a translation detail: the formal register
 * is the one a bank or a government form uses, and Selftend's whole surface is
 * built the other way — `Влез в акаунта си`, `Вече имаш акаунт?`, `Твоят акаунт`,
 * `Започни оттук`. A single formal string does not read as politeness, it reads
 * as a paragraph someone else wrote.
 *
 * ☠️ **The tell that this is drift and never a decision: the corpus contradicts
 * itself inside one file, in adjacent strings doing the same job.**
 *
 * - `policies` privacy §6 listed Google with `само ако избереш` and Apple, the
 *   very next processor entry, with `само ако изберете`.
 * - `auth` shipped `Вече имаш акаунт?` (`signUp.hasAccount`) and
 *   `Вече имате акаунт в Selftend?` (`apple.shareEmailHint`) — the same sentence,
 *   both registers, both in `auth.json`.
 * - ☠️ Sharpest of all, `verifyBanner` disagreed with **itself**: `confirm` read
 *   `Потвърди` and `title` read `Потвърдете` — one verb, one block, both forms.
 *
 * Eight strings carried it, and the clustering says batch rather than intent:
 * six of the eight are `auth.verifyBanner.*`, one is `auth.apple.*`, one is the
 * Apple processor entry in the privacy policy. All three sites are Apple sign-in
 * or e-mail verification — most likely one late batch by a different hand.
 *
 * ⚠️ **`bg` is not consent-digested** — `policy-content.test.ts` hashes
 * `enPolicies` only — so the privacy-policy edit moves no digest, needs no
 * `policyVersion` bump, and re-gates nobody. `en` is untouched by all of this.
 *
 * ☠️☠️ **Cyrillic patterns must not use `\b` or `\w` — both are ASCII-only in JS,
 * so a Cyrillic pattern written with `\b` matches nothing and the guard goes
 * silently, permanently green.** `over-use-copy.test.ts` and `practice-copy.test.ts`
 * carry the same warning. This file uses explicit lookarounds over a Cyrillic
 * letter class instead, and `asserts the pattern actually fires` below is the
 * self-test that stops a mis-written pattern from passing everything.
 */

/** Cyrillic letters, for the word boundaries JS `\b` cannot express. */
const CYRILLIC = "А-Яа-яЁёЍѝ";

/**
 * Formal `вие`-form address markers: the polite pronouns, and the 2nd-person
 * plural verb forms that actually occur in this corpus.
 *
 * ⚠️ The left boundary rejects a preceding digit or hyphen on purpose. `ви` is
 * also the Bulgarian ordinal suffix — `habits` ships `1-ви закон` ("1st law"),
 * which is not a pronoun and must not be read as one.
 */
const FORMAL_MARKERS = [
  "вие",
  "ви",
  "вас",
  "ваш",
  "ваша",
  "вашата",
  "вашия",
  "вашият",
  "вашите",
  "вашето",
  "изберете",
  "скриете",
  "можете",
  "имате",
  "сте",
  "проверете",
  "изпратете",
  "натиснете",
  "въведете",
  "влезте",
  "пишете",
  "потвърдете",
  "защитите",
  "изчакайте",
  "опитайте",
  "опитате",
];

const formalPattern = new RegExp(
  `(?<![${CYRILLIC}\\d-])(${FORMAL_MARKERS.join("|")})(?![${CYRILLIC}])`,
  "i",
);

function formalMarkersIn(text: string): string[] {
  const all = new RegExp(formalPattern.source, "gi");
  return [...new Set([...text.matchAll(all)].map((m) => m[1].toLowerCase()))];
}

/**
 * The two places a `вие`-form word is correct, matched **by text rather than by
 * key** so the licence expires the moment the copy it excuses changes — a stale
 * suppression that outlives its string is how a guard quietly stops guarding
 * ([[reference_suppression_list_expiry]] is the standing rule).
 */
const LEGITIMATE: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /двамата можете/i,
    reason:
      "dbt interpersonal: a TRUE plural — 'when you both can give a little' addresses two people, so the plural verb is the only correct form, not a register choice.",
  },
  {
    pattern: /свържа с вас/i,
    reason:
      "policies FAQ: the reader addressing US ('how can I contact you and what should I expect') — 'вас' is Selftend the organisation here, not a formally-addressed reader.",
  },
];

const isLegitimate = (text: string) => LEGITIMATE.some(({ pattern }) => pattern.test(text));

const bgStrings = (): LocaleString[] => LOCALE_STRINGS.bg;

describe("bg speaks to the reader in the informal ти-form (#2163)", () => {
  it("asserts the pattern actually fires — a Cyrillic \\b would match nothing", () => {
    // ☠️ Anti-vacuity. Without this, a pattern broken by an ASCII-only `\b`
    // makes every sweep below pass and the guard becomes decoration.
    expect(formalMarkersIn("само ако изберете вход с Apple")).toEqual(["изберете"]);
    expect(formalMarkersIn("Ако скриете имейла си, до вас")).toEqual(["скриете", "вас"]);
    expect(formalMarkersIn("Вече имате акаунт")).toEqual(["имате"]);

    // ...and that it does NOT fire on the informal forms it must leave alone,
    // nor on the ordinal `ви`, which is a suffix and not a pronoun.
    expect(formalMarkersIn("само ако избереш вход с Apple")).toEqual([]);
    expect(formalMarkersIn("Вече имаш акаунт?")).toEqual([]);
    expect(formalMarkersIn("1-ви закон - Направи го очевиден")).toEqual([]);
  });

  it("loads a bg corpus that really contains informal address", () => {
    // Positive control: a sweep over an empty or unread corpus passes vacuously.
    const strings = bgStrings();
    expect(strings.length).toBeGreaterThan(500);
    expect(
      strings.some(({ text }) => /(?<![А-Яа-я])(имаш|можеш|твоят)(?![А-Яа-я])/i.test(text)),
    ).toBe(true);
  });

  it("carries no formally-addressed string outside the two documented exceptions", () => {
    const offenders = bgStrings()
      .filter(({ text }) => !isLegitimate(text))
      .map((s) => ({ ...s, markers: formalMarkersIn(s.text) }))
      .filter(({ markers }) => markers.length > 0)
      .map(({ namespace, key, markers, text }) => `${namespace}:${key} [${markers}] — ${text}`);

    expect(offenders).toEqual([]);
  });

  it("keeps each documented exception alive and still matching", () => {
    // ☠️ An exception whose string has been reworded is dead weight that would
    // hide the next real offender at the same key. Fail when one stops matching.
    for (const { pattern, reason } of LEGITIMATE) {
      const matched = bgStrings().filter(({ text }) => pattern.test(text));
      // The reason rides in the compared value, so a failure names the licence
      // that died rather than just reporting `0 is not greater than 0`.
      expect(matched.length > 0 ? "alive" : `DEAD EXEMPTION ${pattern} — ${reason}`).toBe("alive");
    }
  });
});
