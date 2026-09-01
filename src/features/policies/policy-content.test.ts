import {
  crisisActionUrls,
  LEGAL_REVIEW_PENDING,
  policyLastUpdated,
  policyVersion,
} from "@/src/features/policies/policy-content";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";
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
const pinnedPolicyRelease = {
  version: "2026-08-27-feedback-processors",
  englishDigest: "a0acbe079278e3c4932c5d58b174ec469c63a191e89622cfeccf80ff3c77e82e",
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

  it("terms restrict eligibility to 18+", () => {
    expect(flatBody(policies.terms.sections)).toMatch(/18/);
  });

  // Sign in with Apple sends account identifiers to a processor in the USA, so the
  // disclosure has to survive translation - not just exist in the source locale.
  it("privacy policy names Apple as a processor", () => {
    expect(flatBody(policies.privacy.sections)).toContain("Apple");
  });

  it("crisis sections mention contacting emergency services", () => {
    expect(flatBody(policies.crisis.sections).toLowerCase()).toMatch(/emergency|спешн/);
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
