import { LOCALE_STRINGS, type Locale } from "@/test/locale-strings";

/**
 * The practice boundary's machine-checkable floor (#1655, placed by #1662,
 * landed by #1664): **the product never prescribes a return, and never names
 * a run to keep.**
 *
 * Principle: `docs/product-principles.md` §12 *Fulfilling, And Done* — every
 * completion moment satisfies and ends. Long form: ADR-0004. This file is the
 * third ring of the copy-guard family, after `test/restraint-copy.test.ts`
 * (#711) and `test/positioning-copy.test.ts` (#1611): every namespace off
 * disk, both locales, values only, and **no allowlist** (#1606 — a list that
 * size silently becomes permanent). The landing rule is fix-first-or-together,
 * which is why this file arrived in the same change as the #1666/#1667 fixes,
 * each fix beside the pattern that would have caught it.
 *
 * ☠️ ONE-SIDED ON PURPOSE. Every rule is a ban with zero live hits on
 * arrival. The census (#1658) proved an enumerating grep finds under a third
 * of the boundary-relevant copy — the judgement calls stay with the principle
 * and the reviewer bullet, so nobody builds a brittle gate here, watches it
 * fail good copy, and deletes the file.
 *
 * ☠️ DELIBERATELY NEVER IN THIS LIST:
 * - bare `keep going` — three dialog cancel-buttons mean *continue this
 *   session*;
 * - bare `due` — "due to";
 * - bare `miss`/`missing`/`не пропускай` — the framework may talk about
 *   missing, and habits' never-miss-twice teaching does, legitimately (#711);
 * - bare `come back`/`върни се` — grounding teaches "come back to your
 *   breath" and errors says "върни се в началото"; only the time-anchored
 *   form is a return prescription;
 * - bare `momentum`/`устрем` — the framework may say small steps *build*
 *   momentum in a life (`help.json`); the violation is the product claiming
 *   you *built* momentum at a completion moment (#1666);
 * - restraint claims shaped like `/no reminders/` — config surfaces are
 *   disclosure, practice surfaces are advertising (#1662); that family
 *   belongs to `restraint-copy`, which records the same exception.
 */
const RETURN_PRESCRIPTIONS: { locale: Locale; pattern: RegExp }[] = [
  // A run the user is told to keep. The `grounding.streakTitle` KEY survives
  // over a clean value — this guard reads values only; the key is a
  // rename-on-touch smell (#1658).
  { locale: "en", pattern: /streak/i },
  { locale: "en", pattern: /overdue/i },
  { locale: "en", pattern: /you missed/i },
  { locale: "en", pattern: /keep it going/i },
  { locale: "en", pattern: /keep it up/i },
  { locale: "en", pattern: /don'?t stop/i },
  { locale: "en", pattern: /don'?t break/i },
  { locale: "en", pattern: /back on track/i },
  // The word boundary defeats "see YOUR rhythm" / "see YOUR latest session".
  { locale: "en", pattern: /\bsee you\b/i },
  { locale: "en", pattern: /come back (tomorrow|later|soon|every|each|daily)/i },
  { locale: "en", pattern: /built (real )?momentum/i },
  // ☠️ The Cyrillic patterns carry NO \b — JS \b is ASCII-only, so a Cyrillic
  // pattern written with it matches nothing and the guard is vacuous. Each of
  // these was proven red against a planted string before landing.
  { locale: "bg", pattern: /серия/i },
  { locale: "bg", pattern: /просроч/i },
  { locale: "bg", pattern: /не спирай/i },
  { locale: "bg", pattern: /не прекъсвай/i },
  { locale: "bg", pattern: /до скоро/i },
  { locale: "bg", pattern: /ще се видим/i },
  { locale: "bg", pattern: /(върни се|се върни) (утре|по-късно|скоро|всеки)/i },
  { locale: "bg", pattern: /постигна (истински )?устрем/i },
];

describe("practice copy never prescribes a return, and never names a run to keep", () => {
  it.each(RETURN_PRESCRIPTIONS.map((rule) => [`${rule.locale} ${rule.pattern}`, rule] as const))(
    "%s has no hits",
    (_name, { locale, pattern }) => {
      const offenders = LOCALE_STRINGS[locale]
        .filter(({ text }) => pattern.test(text))
        .map(({ namespace, key, text }) => `${namespace}:${key}: ${text}`);

      expect(offenders).toEqual([]);
    },
  );
});
