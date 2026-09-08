import { hasAcceptedPolicy, policyVersionDate } from "@/src/features/policies/policy-consent";
import { policyLastUpdated, policyVersion } from "@/src/features/policies/policy-content";

// Every value the app has ever written into `policy_version_accepted`, oldest
// first, read out of the history of policy-content.ts. They are here rather than
// as invented strings because the ONLY thing that makes these versions orderable
// is that they have all carried an ISO date prefix - if a real one ever did not,
// the guard in 20260911000000_policy_version_monotonic.sql would be ranking
// something it cannot rank, and this list is where that shows up.
const SHIPPED_VERSIONS = [
  "2026-05-03",
  "2026-05-06",
  "2026-05-06-web-push",
  "2026-05-12-adults-only",
  "2026-05-20-local-preferences",
  "2026-07-04-error-monitoring",
  "2026-07-18-web-host-cloudflare",
  "2026-07-31-apple-sign-in",
  "2026-08-26-guest-accounts",
  "2026-08-27-feedback-processors",
  "2026-09-02-donations",
  "2026-09-04-teen-floor",
] as const;

describe("policyVersionDate", () => {
  it("reads the ISO date prefix off every version the app has shipped", () => {
    SHIPPED_VERSIONS.forEach((version) => {
      expect(policyVersionDate(version)).toBe(version.slice(0, 10));
    });
  });

  it("returns null for anything with no date prefix", () => {
    expect(policyVersionDate(null)).toBeNull();
    expect(policyVersionDate(undefined)).toBeNull();
    expect(policyVersionDate("")).toBeNull();
    expect(policyVersionDate("v3")).toBeNull();
    expect(policyVersionDate("teen-floor-2026-09-04")).toBeNull();
  });
});

describe("hasAcceptedPolicy", () => {
  it("accepts the exact current version", () => {
    expect(hasAcceptedPolicy(policyVersion, policyVersion)).toBe(true);
  });

  // The #2217 case. A build behind the rollout reads a row written by a build
  // ahead of it; that person has accepted MORE than this build discloses, and
  // re-asking is what turns the deploy skew into a per-launch wall the database
  // guard then refuses to let them clear.
  it("accepts a version published after the current one", () => {
    expect(hasAcceptedPolicy("2026-09-04-teen-floor", "2026-08-27-feedback-processors")).toBe(true);
    expect(hasAcceptedPolicy("2027-01-01-later", policyVersion)).toBe(true);
  });

  // ⚠️ The half that must not soften. Everything below has NOT accepted the
  // disclosure this build shows, and every one of them still gets asked.
  it("gates a version published before the current one", () => {
    expect(hasAcceptedPolicy("2026-08-27-feedback-processors", "2026-09-04-teen-floor")).toBe(
      false,
    );
  });

  it("gates a never-accepted row", () => {
    expect(hasAcceptedPolicy(null, policyVersion)).toBe(false);
    expect(hasAcceptedPolicy(undefined, policyVersion)).toBe(false);
    expect(hasAcceptedPolicy("", policyVersion)).toBe(false);
  });

  it("gates a value it cannot rank", () => {
    expect(hasAcceptedPolicy("v3", policyVersion)).toBe(false);
    expect(hasAcceptedPolicy(policyVersion, "not-a-dated-version")).toBe(false);
  });

  // Same date, different slug: the slug carries no ordering, so the client takes
  // the safe direction and asks. (The database takes the other one and lets the
  // write through, because refusing a legitimate acceptance is the worse
  // failure there.) '2026-05-06' and '2026-05-06-web-push' are a real pair.
  it("gates a different version published on the same date", () => {
    expect(hasAcceptedPolicy("2026-05-06", "2026-05-06-web-push")).toBe(false);
    expect(hasAcceptedPolicy("2026-05-06-web-push", "2026-05-06")).toBe(false);
  });

  // The shipped history has to be a chain: each version accepted, every earlier
  // one gating. This is the property the SQL guard relies on, checked against
  // the real values rather than against the rule that produced them.
  it("orders every shipped version against every other one", () => {
    SHIPPED_VERSIONS.forEach((older, i) => {
      SHIPPED_VERSIONS.slice(i + 1).forEach((newer) => {
        const sameDate = older.slice(0, 10) === newer.slice(0, 10);
        expect(hasAcceptedPolicy(newer, older)).toBe(!sameDate);
        expect(hasAcceptedPolicy(older, newer)).toBe(false);
      });
    });
  });

  it("ranks the version this build ships as the newest one released so far", () => {
    expect(policyVersionDate(policyVersion)).toBe(policyLastUpdated);
    SHIPPED_VERSIONS.filter((v) => v !== policyVersion).forEach((earlier) => {
      expect(hasAcceptedPolicy(earlier, policyVersion)).toBe(false);
    });
  });
});
