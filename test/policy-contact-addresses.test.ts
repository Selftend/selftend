import { contactEmails, projectContactEmails } from "@/src/lib/env";
import { LOCALE_STRINGS, type Locale, type LocaleString } from "@/test/locale-strings";

/**
 * The three contact addresses are configuration, not copy (#2131).
 *
 * They used to exist twice under two sourcing rules: `src/lib/env.ts` read them
 * from `EXPO_PUBLIC_*`, and `policies.json` wrote the literals into the prose. A
 * fork that set `EXPO_PUBLIC_SUPPORT_EMAIL` therefore got its own address on
 * `/support` and `support@selftend.org` on `/faq` and in the parents letter - an
 * address reaching this project, in the document telling a stranger where to send
 * their data-deletion request.
 *
 * Every occurrence now reads `{{privacyEmail}}` / `{{securityEmail}}` /
 * `{{supportEmail}}`, supplied by `InfoScreen` and `ConsentGate` from
 * `contactEmails()`. What is pinned here is the ways that fix silently comes
 * undone.
 *
 * It landed in two tranches, and the split is worth knowing because it explains
 * the shape of the guards below:
 *
 * - **Tranche 1** (`aeab011f`) took the 5 in `faq` plus `settings.json`'s
 *   `consent.healthDataWithdrawal` — the six that are NOT consent-digested, so
 *   they cost nothing to move.
 * - **Tranche 2** took the 15 in `privacy` ×10, `terms` ×3, `cookies` ×1 and
 *   `accountDeletion` ×1. Those four ARE hashed by
 *   `src/features/policies/policy-content.test.ts`, so one character costs a
 *   digest move — and normally a `policyVersion` bump, which re-presents the
 *   consent gate to every existing user. ☠️ It was free only because
 *   `2026-09-04-teen-floor` was still unreleased when it landed, so no user had
 *   accepted the text. That reasoning is recorded beside the digest pin itself.
 *
 * ☠️ The direction that matters has therefore flipped. These guards no longer
 * watch a migration in progress; they watch for a NEW hardcoded address landing
 * in copy that is now expensive to correct.
 */

const SUPPLIED_BY_INFO_SCREEN = Object.keys(contactEmails());

/**
 * `lastUpdated` interpolates `{{date}}` from a different call site in the same
 * component (`t("lastUpdated", { date: policyLastUpdated })`), so it is supplied
 * but not by `contactEmails()`.
 */
const OTHER_SUPPLIED_VARIABLES = ["date"];

function policyStrings(locale: Locale): LocaleString[] {
  return LOCALE_STRINGS[locale].filter(({ namespace }) => namespace === "policies");
}

function faqStrings(locale: Locale): LocaleString[] {
  return policyStrings(locale).filter(({ key }) => key.startsWith("faq."));
}

function placeholdersIn(text: string): string[] {
  return [...text.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map((match) => match[1]);
}

describe.each<Locale>(["en", "bg"])("%s: the FAQ names no contact address of its own", (locale) => {
  it("has FAQ entries to check", () => {
    // Without this the two assertions below pass vacuously the day the `faq.`
    // key prefix is renamed - a guard over an empty list proves nothing.
    expect(faqStrings(locale).length).toBeGreaterThan(20);
  });

  it("holds none of this project's contact addresses as a literal", () => {
    const offenders = faqStrings(locale).filter(({ text }) =>
      Object.values(projectContactEmails).some((address) => text.includes(address)),
    );

    expect(offenders.map(({ key }) => key)).toEqual([]);
  });

  /**
   * Broader than the project's own three on purpose. The defect is not that ONE
   * address was hardcoded, it is that an operator-specific address was written
   * into copy at all - a fork pasting its own address here would recreate the
   * split from the other side, and read as a fix while doing it.
   */
  it("holds no bare email address at all", () => {
    const offenders = faqStrings(locale).filter(({ text }) =>
      /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text),
    );

    expect(offenders.map(({ key }) => key)).toEqual([]);
  });

  /**
   * The addresses have to still be REACHABLE, not merely absent. An interpolation
   * that was deleted rather than replaced would pass both assertions above.
   */
  it("still points readers at all three contacts, through placeholders", () => {
    const used = new Set(faqStrings(locale).flatMap(({ text }) => placeholdersIn(text)));

    expect([...used].sort()).toEqual(["privacyEmail", "securityEmail", "supportEmail"]);
  });
});

describe.each<Locale>(["en", "bg"])("%s: every policy placeholder is supplied", (locale) => {
  /**
   * A `{{supportEMail}}` typo does not throw - i18next leaves the braces in place
   * and the reader gets `write to {{supportEMail}}` on a legal page. Nothing else
   * in the suite would notice, because the key still resolves.
   */
  it("uses only variables a call site passes in", () => {
    const allowed = new Set([...SUPPLIED_BY_INFO_SCREEN, ...OTHER_SUPPLIED_VARIABLES]);

    const unsupplied = policyStrings(locale)
      .flatMap(({ key, text }) => placeholdersIn(text).map((variable) => ({ key, variable })))
      .filter(({ variable }) => !allowed.has(variable));

    expect(unsupplied).toEqual([]);
  });
});

/**
 * The occurrence that lives in `settings` rather than `policies` — the
 * withdrawal route for health-data consent, stated beside the tick box.
 *
 * Scoped by namespace rather than folded into the `faq` sweep above, because the
 * thing worth catching is different: there, that a contact answer stopped naming
 * a contact; here, that a consent surface started naming an operator.
 */
describe.each<Locale>(["en", "bg"])("%s: the health-data withdrawal route", (locale) => {
  function withdrawalCopy(): string {
    const entry = LOCALE_STRINGS[locale].find(
      ({ namespace, key }) => namespace === "settings" && key === "consent.healthDataWithdrawal",
    );
    if (!entry) throw new Error(`settings:consent.healthDataWithdrawal missing in ${locale}`);
    return entry.text;
  }

  it("names no address of its own", () => {
    expect(withdrawalCopy()).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  });

  it("still routes the person somewhere, through the privacy placeholder", () => {
    expect(placeholdersIn(withdrawalCopy())).toEqual(["privacyEmail"]);
  });
});

/**
 * ✅ Tranche 2 landed, so this is now ZERO rather than 15 — no hardcoded contact
 * address survives anywhere in `policies.json`.
 *
 * Kept as an assertion rather than deleted, because the direction that matters
 * has flipped rather than gone away: it now catches a NEW literal landing in
 * consent-bearing copy. That is the expensive mistake to make here — once
 * `2026-09-04-teen-floor` releases, undoing it costs a `policyVersion` bump and a
 * re-gate of every existing user, where today it would have been free.
 */
describe.each<Locale>(["en", "bg"])(
  "%s: no literal survives the consent copy (#2131)",
  (locale) => {
    it("holds no hardcoded contact address in the four consent-bearing sections", () => {
      const consentBearing = ["privacy.", "terms.", "cookies.", "accountDeletion."];

      const remaining = policyStrings(locale)
        .filter(({ key }) => consentBearing.some((section) => key.startsWith(section)))
        .flatMap(({ key, text }) =>
          Object.values(projectContactEmails)
            .filter((address) => text.includes(address))
            .map((address) => ({ key, address })),
        );

      expect(remaining).toEqual([]);
    });

    /**
     * Anti-vacuity for the assertion above, and the half it cannot make: those
     * sections must still ROUTE the reader somewhere. A pass that deleted the
     * clauses rather than parameterising them would satisfy "no literal" perfectly.
     */
    it("still names a contact in each of the four, through placeholders", () => {
      const consentBearing = ["privacy.", "terms.", "cookies.", "accountDeletion."];

      for (const section of consentBearing) {
        const used = new Set(
          policyStrings(locale)
            .filter(({ key }) => key.startsWith(section))
            .flatMap(({ text }) => placeholdersIn(text)),
        );

        expect({ section, hasContact: used.size > 0 }).toEqual({ section, hasContact: true });
      }
    });
  },
);

/**
 * `src/i18n/locale-parity.test.ts` checks that both locales hold the same KEYS.
 * It says nothing about what is inside them, so a Bulgarian translation that
 * dropped `{{supportEmail}}` - or wrote it as `{{supportEmai}}` - would leave the
 * bg copy with no address in it and the suite green.
 */
describe("both locales interpolate the same variables in the same strings", () => {
  it("matches placeholder sets key by key", () => {
    const bgByKey = new Map(policyStrings("bg").map((entry) => [entry.key, entry.text]));

    const drift = policyStrings("en")
      .map(({ key, text }) => ({
        key,
        en: placeholdersIn(text).sort(),
        bg: placeholdersIn(bgByKey.get(key) ?? "").sort(),
      }))
      .filter(({ en, bg }) => en.join(",") !== bg.join(","));

    expect(drift).toEqual([]);
  });
});
