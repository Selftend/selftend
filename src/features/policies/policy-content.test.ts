import {
  accountDeletionSections,
  cookiePolicySections,
  crisisActions,
  crisisActionUrls,
  crisisSections,
  LEGAL_REVIEW_PENDING,
  policyLastUpdated,
  policyVersion,
  privacyPolicySections,
  termsSections,
  type PolicySection,
} from "@/src/features/policies/policy-content";

function assertSectionsShape(name: string, sections: PolicySection[]) {
  it(`${name} sections are non-empty with title and body strings`, () => {
    expect(sections.length).toBeGreaterThan(0);
    sections.forEach((section, idx) => {
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

describe("policy content - section shapes", () => {
  assertSectionsShape("privacyPolicy", privacyPolicySections);
  assertSectionsShape("terms", termsSections);
  assertSectionsShape("crisis", crisisSections);
  assertSectionsShape("accountDeletion", accountDeletionSections);
  assertSectionsShape("cookiePolicy", cookiePolicySections);
});

describe("policy content - required statements", () => {
  it("privacy policy mentions the privacy contact email", () => {
    const body = privacyPolicySections.flatMap((s) => s.body).join(" ");
    expect(body).toContain("privacy@selftend.org");
  });

  it("terms restrict eligibility to 18+", () => {
    const body = termsSections.flatMap((s) => s.body).join(" ");
    expect(body).toMatch(/18/);
  });

  it("crisis sections mention contacting emergency services", () => {
    const body = crisisSections.flatMap((s) => s.body).join(" ");
    expect(body.toLowerCase()).toContain("emergency");
  });
});

describe("crisis actions", () => {
  it("has at least one action with a label and an https url", () => {
    expect(crisisActions.length).toBeGreaterThan(0);
    crisisActions.forEach((a) => {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.url).toMatch(/^https:\/\//);
    });
  });

  it("URL-only entries have stable keys and https URLs", () => {
    expect(crisisActionUrls.length).toBeGreaterThan(0);
    crisisActionUrls.forEach((a) => {
      expect(a.key.length).toBeGreaterThan(0);
      expect(a.url).toMatch(/^https:\/\//);
    });
  });
});
