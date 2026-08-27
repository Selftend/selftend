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
const pinnedPolicyRelease = {
  version: "2026-08-27-feedback-processors",
  englishDigest: "f81267ba3bbf3a1131d32f5a9bc7036f7021927f1cc95e5e307a6c16f2ce0864",
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
