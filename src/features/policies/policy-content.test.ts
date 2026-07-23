import {
  crisisActionUrls,
  LEGAL_REVIEW_PENDING,
  policyLastUpdated,
  policyVersion,
} from "@/src/features/policies/policy-content";
import bgPolicies from "@/src/i18n/locales/bg/policies.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";

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

  it("exposes a boolean LEGAL_REVIEW_PENDING flag", () => {
    expect(typeof LEGAL_REVIEW_PENDING).toBe("boolean");
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
