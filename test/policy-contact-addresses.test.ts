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
 * `faq` moved to `{{privacyEmail}}` / `{{securityEmail}}` / `{{supportEmail}}`,
 * supplied by `InfoScreen` from `contactEmails()`. What is pinned here is the
 * three ways that fix silently comes undone.
 *
 * ☠️ This is 5 of 21 occurrences, not most of them. The `privacy`, `terms`,
 * `cookies` and `accountDeletion` sections still carry 15 literals, and that is
 * deliberate rather than an oversight: those four are hashed by
 * `src/features/policies/policy-content.test.ts`, so editing one character of them
 * fails `verify` until `policyVersion` moves, and a version bump re-presents the
 * consent gate to every existing user. They fold in on the next bump that has a
 * real disclosure to carry. `faq` is exempt from that digest, which is why it
 * could move on its own.
 *
 * ☠️ The 21st lives outside this namespace entirely - `settings.json`'s
 * `consent.healthDataWithdrawal`, the withdrawal route for health-data consent.
 * It is NOT digested, so it is as cheap to move as these five were, and it is
 * pinned verbatim by `src/components/app/consent-gate.test.tsx`. It is left here
 * only because it belongs to the same undecided ruling, not because it is safe.
 *
 * The count below is asserted rather than written in prose, so that a future
 * tranche moving those literals has to come back and update this docblock instead
 * of leaving a stale "15 remain" behind.
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
 * `src/i18n/locale-parity.test.ts` checks that both locales hold the same KEYS.
 * It says nothing about what is inside them, so a Bulgarian translation that
 * dropped `{{supportEmail}}` - or wrote it as `{{supportEmai}}` - would leave the
 * bg parents letter with no address in it and the suite green.
 */
/**
 * The unfinished half, pinned so it cannot drift unnoticed in either direction.
 *
 * Going UP means a new hardcoded address landed in consent-bearing copy - the
 * defect spreading. Going DOWN means someone moved a digested literal, which is
 * only legal alongside a `policyVersion` bump, and this failing beside
 * `policy-content.test.ts` is the reminder that the bump re-gates every existing
 * user.
 */
describe.each<Locale>(["en", "bg"])("%s: the tranche still to move (#2131)", (locale) => {
  it("has 15 literal addresses left in the four consent-bearing sections", () => {
    const consentBearing = ["privacy.", "terms.", "cookies.", "accountDeletion."];

    const remaining = policyStrings(locale)
      .filter(({ key }) => consentBearing.some((section) => key.startsWith(section)))
      .flatMap(({ key, text }) =>
        Object.values(projectContactEmails)
          .filter((address) => text.includes(address))
          .map((address) => ({ key, address })),
      );

    expect(remaining).toHaveLength(15);
  });
});

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
