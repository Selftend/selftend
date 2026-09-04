import {
  crisisActionUrls,
  LEGAL_REVIEW_PENDING,
  policyLastUpdated,
  policyVersion,
} from "@/src/features/policies/policy-content";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import bgSettings from "@/src/i18n/locales/bg/settings.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";
import enSettings from "@/src/i18n/locales/en/settings.json";
import { createHash } from "crypto";

interface DisplayedSection {
  title: string;
  body: string[];
}

const locales = [
  ["en", enPolicies],
  ["bg", bgPolicies],
] as const;

const sectionKeys = ["privacy", "terms", "crisis", "accountDeletion", "cookies"] as const;

function assertSectionsShape(name: string, sections: DisplayedSection[]) {
  it(`${name} sections are non-empty with title and body strings`, () => {
    expect(sections.length).toBeGreaterThan(0);
    sections.forEach((section) => {
      expect(typeof section.title).toBe("string");
      expect(section.title.length).toBeGreaterThan(0);
      expect(Array.isArray(section.body)).toBe(true);
      expect(section.body.length).toBeGreaterThan(0);
      section.body.forEach((line) => {
        expect(typeof line).toBe("string");
        expect(line.length).toBeGreaterThan(0);
      });
    });
  });
}

function flatBody(sections: DisplayedSection[]): string {
  return sections.flatMap((s) => s.body).join(" ");
}

describe("policy content - metadata", () => {
  it("declares a stable last-updated date and version", () => {
    expect(typeof policyLastUpdated).toBe("string");
    expect(/^\d{4}-\d{2}-\d{2}$/.test(policyLastUpdated)).toBe(true);
    expect(typeof policyVersion).toBe("string");
    expect(policyVersion.length).toBeGreaterThan(0);
  });

  // The two constants describe the same publication: the date users read on the
  // policy screen, and the key their stored acceptance is compared against. Left
  // uncoupled, one can move without the other and the screen claims a freshness
  // the consent gate never acted on.
  it("versions the policy under its own last-updated date", () => {
    expect(policyVersion.startsWith(`${policyLastUpdated}-`)).toBe(true);
  });

  it("exposes a boolean LEGAL_REVIEW_PENDING flag", () => {
    expect(typeof LEGAL_REVIEW_PENDING).toBe("boolean");
  });
});

// ProtectedLayout only raises the consent gate when `policyVersionAccepted !==
// policyVersion`, so policy text that ships without a version bump reaches nobody
// who already accepted - their consent stays attached to the disclosure they were
// actually shown, and the policy's own promise to "notify you through the app
// before the changes take effect" quietly goes unkept. That is exactly what Sign
// in with Apple did: it added Apple Inc. as a processor and left the version alone.
//
// Pinning the source text turns that silent drift into a failed build.
//
// English only, deliberately. Translations are Weblate-managed; hashing bg would
// fail CI on an ordinary typo fix and pressure a version bump that re-gates every
// user for a change to no disclosure at all.
const consentBearingSections = ["privacy", "terms", "cookies", "accountDeletion"] as const;

// Text and version are pinned as ONE tuple, not two independent constants. Pinning
// the digest alone still lets the version be reverted to a superseded release with
// the suite green - the text would be unchanged, so the digest would still match.
// Coupling them means either half moving alone fails the build.
//
// ⚠️ #1616 is the FIRST digest-only move, and the reasoning is recorded here
// because a silently-moved digest is exactly how this gate stops meaning
// anything. It rewrote three consent-bearing sentences - privacy §1 "Who we
// are", terms §3 "Product scope and boundaries" and terms §5 "Acceptable use" -
// to drop the phrase "guided self-help", which clinically means *with a
// practitioner* and which Selftend does not have (docs/positioning.md).
//
// The version deliberately did NOT move, because nothing DISCLOSED changed:
// not the data collected, not a processor, not retention, not a user right, not
// eligibility, not liability, and not one item of the "not therapy, not medical
// care, not diagnosis, not crisis intervention" boundary list. All three
// sentences describe what Selftend *is*; terms §3 now also states that no
// practitioner is involved, which is strictly more protective than what it
// replaced. Every earlier bump here was a real disclosure - Apple as a
// processor, the guest model and 12-month retention, SES and Discord - and
// re-gating every existing user for a wording change that discloses nothing new
// spends their attention on nothing and teaches them to click consent gates
// through. That is the opposite of what this gate is for.
//
// ⚠️ #1627 is the SECOND digest-only move, and it is smaller than the first: it
// changed ONE letter. Terms §3 read "structured cognitive behavioral exercises"
// while the rest of the product spelled the frame word British, so the sentence
// now reads "cognitive behavioural exercises". Nothing disclosed changed - the
// same sentence, the same scope, the same boundary, one spelling. If a rewording
// that discloses nothing must not re-gate users, a respelling that changes no
// word certainly must not.
//
// ⚠️ #1639 is the THIRD digest-only move, and it is the same size as the second:
// one letter, in one word, in one sentence. Privacy §6 read "the processor's
// participation in recognized data transfer frameworks" and now reads
// "recognised", bringing it in line with the house style the rest of the product
// spells British (docs/positioning.md § "Words to use").
//
// The ticket flagged this string as the one place American might be CORRECT,
// because it sits beside GDPR/SCC terms of art. It is not: the terms of art in
// that sentence are "Standard Contractual Clauses (SCCs)" and "European
// Commission", both untouched. "recognised data transfer frameworks" is our own
// descriptive prose ABOUT them, and the EU's own English-language style guide
// mandates British spelling - so for a sentence addressed to EEA, UK and Swiss
// residents the British form is if anything the better fit.
//
// Nothing DISCLOSED changed: same processors, same transfer mechanism, same
// jurisdictions, same rights. Per the two moves above the version therefore does
// not move - re-gating every existing user over one letter is precisely how a
// consent gate teaches people to click through it.
//
// ☠️ The neighbouring "fulfill" -> "fulfil" fix in the same change lives in
// `faq`, which is NOT one of the four consent-bearing sections, so it does not
// touch this digest at all. Only privacy §6 moved it.
//
// So: a disclosure change bumps BOTH fields. A rewording moves the digest alone,
// and says why, right here.
//
// 2026-09-02-donations (#1625 / #1711) is a BOTH-fields move, and it is worth
// saying why when the sentence that moved is one line in terms §8: "Optional
// donations may be introduced in the future" became "Selftend accepts optional
// donations". That is a new fact about money - the product now has a surface
// that takes it - which is the kind of thing a person consents to knowing, and
// the ruling on #1625 accepted the one-time re-gate over a terms document that
// misstates a money fact. The half that did NOT change is the half that
// matters most and is pinned by the required-statements suite below: donations
// are never required for access to any feature.
//
// 2026-09-04-teen-floor (#1767, spec #227 §6) is a BOTH-fields move, and it is
// the largest one this pin has carried - the only entry so far where the thing
// that changed is who the product is FOR.
//
// Eligibility moved from "18 and over" to a per-country floor of 13 or higher
// (privacy §11, terms §2). New data appears in the collected-data list: the
// country you declare and the verdict of the age check, with the statement that
// the date of birth is asked for one comparison and never stored. A new legal
// basis is described - the Art. 9(2)(a) explicit consent of #1766, now a
// separate act with its own withdrawal path - alongside the age check's own
// basis. Retention gains the two rules the floor needs to mean anything:
// nothing is kept from an under-floor attempt, and an account discovered to be
// under its floor is deleted on knowledge. Cookies gains the 24-hour local
// retry timer. And the policy gains a plain-language summary at the top, which
// exists because the youngest reader it now admits is thirteen.
//
// ☠️ The re-gate is not a side effect here, it is the DELIVERY MECHANISM. #1766
// deliberately did not bump the version and did not backfill
// `health_data_consent_at`, because every existing account had only ever ticked
// the old bundled box. This bump is how those accounts reach the separated
// consent step - and, per §7, it reaches them WITHOUT re-asking age or country,
// because the age gate is scoped to accounts that have never passed a consent
// gate at all.
//
// ⚠️ #1770 is the FOURTH digest-only move, and the first made by a REVIEW of the
// copy rather than by a writer changing it. The child-safety content review
// (spec #227 §4, `docs/child-safety-review.md`) found that the plain-language
// summary #1767 had just added carried a 41-word sentence - inside the one
// section of the privacy policy whose whole promise is plain words, written for
// the youngest reader the 13+ floor admits. It is now two sentences.
//
// Nothing DISCLOSED changed, so the version deliberately did not move: the same
// three reading exceptions, in the same order, with the same meaning. A full
// stop moved. Re-gating every existing user over sentence length would spend
// their attention on nothing and teach them to click consent gates through -
// the reasoning the three moves above already settled.
//
// ☠️ The review's other copy fixes are absent from this digest, and that is
// correct rather than an oversight: they landed in `faq` and in the `cbt`,
// `journal` and `modules` namespaces, none of which is consent-bearing. Only
// privacy, terms, cookies and accountDeletion are hashed.
const pinnedPolicyRelease = {
  version: "2026-09-04-teen-floor",
  englishDigest: "97d6fa3466b36a69aba935fdd1030c22371926608cfc490017c9c040ec87e5bd",
};

describe("policy content - version pinning", () => {
  it("publishes the pinned English policy text under the pinned version", () => {
    const digest = createHash("sha256")
      .update(JSON.stringify(consentBearingSections.map((key) => enPolicies[key].sections)))
      .digest("hex");

    if (
      digest !== pinnedPolicyRelease.englishDigest ||
      policyVersion !== pinnedPolicyRelease.version
    ) {
      throw new Error(
        [
          "The English policy text and policyVersion have drifted apart.",
          "",
          `  expected version: ${pinnedPolicyRelease.version}`,
          `    actual version: ${policyVersion}`,
          `   expected digest: ${pinnedPolicyRelease.englishDigest}`,
          `     actual digest: ${digest}`,
          "",
          "If the policy text changed materially, bump policyLastUpdated and",
          "policyVersion in src/features/policies/policy-content.ts so the consent",
          "gate re-notifies existing users - then update BOTH fields of",
          "pinnedPolicyRelease together.",
        ].join("\n"),
      );
    }
  });
});

describe.each(locales)("policy content - displayed %s section shapes", (locale, policies) => {
  sectionKeys.forEach((key) => {
    assertSectionsShape(`${locale} ${key}`, policies[key].sections);
  });
});

describe.each(locales)("policy content - required statements (%s)", (_locale, policies) => {
  it("privacy policy mentions the privacy contact email", () => {
    expect(flatBody(policies.privacy.sections)).toContain("privacy@selftend.org");
  });

  // The floor itself is guarded country by country in `policy-age-floor.test.ts`,
  // against the table the gate applies. What is pinned HERE is the half that
  // table cannot express: the catch-all clause, which is what makes the terms
  // true in the ~200 countries the table never names. Drop it and the terms
  // promise 13 to a reader whose own law says 16.
  it("terms carry the per-country catch-all age clause", () => {
    expect(flatBody(policies.terms.sections)).toMatch(
      /higher minimum age at which you may consent to the processing of your personal data in your country|по-високата минимална възраст, на която можеш да дадеш съгласие за обработването на личните си данни в своята държава/i,
    );
  });

  it("terms state the 13-year baseline and point at the country list", () => {
    const body = flatBody(policies.terms.sections);
    expect(body).toMatch(/at least 13 years old|на поне 13 години/i);
    expect(body).toMatch(/Privacy Policy|Политиката за поверителност/);
  });

  // The one sentence the whole age check is built to make true: the date of
  // birth is asked and never kept. It is the disclosure a reader checks first
  // and the one a future refactor is likeliest to quietly falsify.
  it("privacy states that the date of birth is never stored", () => {
    expect(flatBody(policies.privacy.sections)).toMatch(
      /We do not store your date of birth|Не съхраняваме датата ти на раждане/i,
    );
  });

  // #1767 replaced every "18 and over" eligibility statement. A single survivor
  // would contradict the floor on the same screen that publishes it.
  it("states no 18-and-over eligibility rule anywhere", () => {
    const everything = [
      flatBody(policies.privacy.sections),
      flatBody(policies.terms.sections),
      flatBody(policies.faq.sections),
    ].join(" ");

    expect(everything).not.toMatch(
      /\b18\s*(?:\+|and over|or older|years old|and older)|под\s*18|на\s*18\s*(?:и повече|или повече)?\s*години/i,
    );
  });

  // Sign in with Apple sends account identifiers to a processor in the USA, so the
  // disclosure has to survive translation - not just exist in the source locale.
  it("privacy policy names Apple as a processor", () => {
    expect(flatBody(policies.privacy.sections)).toContain("Apple");
  });

  it("crisis sections mention contacting emergency services", () => {
    expect(flatBody(policies.crisis.sections).toLowerCase()).toMatch(/emergency|спешн/);
  });

  // The donation path exists since 2026-09-02 (#1625). The sentence that makes it
  // acceptable under AGENTS.md - free to users, never a gate - has to survive
  // translation and every future rewording of terms §8, not just the English source.
  it("terms say donations are never a condition of access", () => {
    expect(flatBody(policies.terms.sections)).toMatch(
      /donations\. they are never required for access|дарения\. те никога не са условие за достъп/i,
    );
  });
});

// The eligibility sweep above reads `policies.json`, and the last surviving
// "18 or older" in the product was not in it - it was the consent gate's tick
// box, in the `settings` namespace, which is where that whole screen's copy
// lives. #1767 removed it. Guarded here rather than in a settings test because
// the rule being kept is a POLICY one: eligibility is stated in the terms, and
// asked by the age gate, and nowhere else claims an age on the user's behalf.
describe.each([
  ["en", enSettings],
  ["bg", bgSettings],
] as const)("consent gate copy (%s)", (_locale, settings) => {
  it("asks for agreement without asserting an age", () => {
    expect(settings.consent.checkbox).not.toMatch(/\b18\b|\b13\b|older|повече години/i);
  });

  it("still names both documents the tick box agrees to", () => {
    expect(settings.consent.checkbox).toMatch(/Privacy Policy|Политика за поверителност/);
    expect(settings.consent.checkbox).toMatch(/Terms of Service|Условия за ползване/);
  });
});

describe("crisis actions", () => {
  it("URL-only entries have stable keys and https URLs", () => {
    expect(crisisActionUrls.length).toBeGreaterThan(0);
    crisisActionUrls.forEach((a) => {
      expect(a.key.length).toBeGreaterThan(0);
      expect(a.url).toMatch(/^https:\/\//);
    });
  });
});
