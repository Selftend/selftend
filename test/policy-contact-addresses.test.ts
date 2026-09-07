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
 * ☠️ The `privacy`, `terms`, `cookies` and `accountDeletion` sections still carry
 * the literals, and that is deliberate rather than an oversight: those four are
 * hashed by `src/features/policies/policy-content.test.ts`, so editing one
 * character of them fails `verify` until `policyVersion` moves, and a version bump
 * re-presents the consent gate to every existing user. They fold in on the next
 * bump that has a real disclosure to carry. `faq` is exempt from that digest,
 * which is why it could move on its own.
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
