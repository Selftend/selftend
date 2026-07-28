import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #371 / #372 - a merge to `main` releases Android to the Play **production**
// track automatically, with no human gate on the release itself.
//
// It currently ships as `inProgress` with a `rollout` fraction: automatic, but
// capped, introduced for the first release under this pipeline (72 commits, 12
// migrations). `completed` - live to everyone - is the intended end state per
// #371. When that flip happens, the rollout assertion below is replaced by
// `expect(releaseStatus).toBe("completed")`, and docs/releasing.md changes with
// it.
//
// What is pinned here is the property that survives either mode: **the release
// must actually reach users**. Two ways that could silently break:
//   - the submit profile being pointed back at a testing track, so releases
//     quietly stop reaching production at all;
//   - a status that serves NOBODY. `draft` uploads a release no user receives -
//     CI stays green, the build appears in Play Console, and it is invisible
//     until somebody notices. A `rollout` of 0 is the same failure wearing the
//     current mode's clothes, which is why it is asserted above zero rather
//     than merely present.
//
// `halted` is not a release mode either: it means "will no longer be served",
// a rollout that WAS serving and got stopped. It is the kill switch.

const ROOT = resolve(__dirname, "..");

// Text scan, no YAML parser - matching the repo's dependency-free convention
// tests (see workflow-supabase-cli-pin.test.ts).
const releaseWorkflow = readFileSync(
  resolve(ROOT, ".github/workflows/android-release.yml"),
  "utf8",
);

const easJson = JSON.parse(readFileSync(resolve(ROOT, "eas.json"), "utf8")) as {
  submit?: Record<
    string,
    { android?: { track?: string; releaseStatus?: string; rollout?: number } }
  >;
};

describe("Android production submit profile (#371)", () => {
  const profile = easJson.submit?.production?.android;

  it("defines a production submit profile", () => {
    expect(profile).toBeDefined();
  });

  it("targets the Play production track", () => {
    expect(profile?.track).toBe("production");
  });

  it("releases in a status that actually serves users", () => {
    // `draft` would upload a release that serves nobody - green CI, build
    // visible in Play Console, users never get it. Fail loudly instead.
    expect(["inProgress", "completed"]).toContain(profile?.releaseStatus);
  });

  it("ships the exact capped rollout this pipeline currently runs", () => {
    // Pinned EXACTLY, not as a range, and with no early return for the other
    // status - both would make this vacuous the moment the policy drifted.
    //
    // The cap is a policy, not an implementation detail: `docs/releasing.md`
    // ("Getting from 20% to everyone"), the workflow header and the job summary
    // all state it, and the rollback runbook tells an operator to halt a 20%
    // rollout as the first mitigation. A config-only edit that removed the cap
    // would leave CI green while four places described a rollout that no longer
    // existed - and an operator would reach for a halt that does nothing.
    //
    // Flipping to `completed` is a deliberate change with a documented exit.
    // Edit this expectation and those four places in the same commit.
    expect(profile?.releaseStatus).toBe("inProgress");
    expect(profile?.rollout).toBe(0.2);
  });
});

describe("Android release workflow track targeting (#371, #374)", () => {
  it("submits with the submit_profile input, defaulting to production", () => {
    // The submit is parameterized for the dev testing feed (#374). What must
    // not drift: the parameter is the one the inputs declare, and every
    // resolution of it falls back to production - so the release orchestrator,
    // which passes no submit_profile, keeps releasing to production.
    const submitLine = releaseWorkflow
      .split(/\r?\n/)
      .find((line) => line.includes("eas-cli -- submit"));

    expect(submitLine).toBeDefined();
    expect(submitLine).toContain('--profile "$SUBMIT_PROFILE"');
    const resolutions = releaseWorkflow.match(/inputs\.submit_profile \|\| 'production'/g) ?? [];
    expect(resolutions.length).toBeGreaterThanOrEqual(3); // submit, mirror, summary
  });

  it("keeps the release orchestrator on the production profile", () => {
    // release.yml invoking the reusable workflow with submit_profile: closed
    // would silently retarget every production release at the testing tracks -
    // the exact failure the original hardcoded assertion existed to catch.
    const orchestrator = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");
    expect(orchestrator).toContain("android-release.yml");
    expect(orchestrator).not.toContain("submit_profile");
  });

  it("mirrors both channels downstream, so testers are never behind", () => {
    // production run: production -> Groups and production -> alpha (the FLOOR:
    // after every release the testing tracks hold at least what users have).
    // closed run: Groups -> alpha (eas already released to Groups).
    const mirrors = releaseWorkflow
      .split(/\r?\n/)
      .filter((line) => line.includes("promote-android-track.cjs"));

    expect(mirrors.some((l) => l.includes("--from production") && l.includes("--to Groups"))).toBe(
      true,
    );
    expect(mirrors.some((l) => l.includes("--from production") && l.includes("--to alpha"))).toBe(
      true,
    );
    expect(mirrors.some((l) => l.includes("--from Groups") && l.includes("--to alpha"))).toBe(true);
  });

  it("scopes build concurrency per submit profile", () => {
    // A shared concurrency group with cancel-in-progress would let a dev
    // testing dispatch cancel an in-flight production release build.
    expect(releaseWorkflow).toContain(
      "group: android-release-${{ inputs.submit_profile || 'production' }}",
    );
  });
});

describe("dev-driven closed testing feed (#374)", () => {
  const testingWorkflow = readFileSync(
    resolve(ROOT, ".github/workflows/android-testing-release.yml"),
    "utf8",
  );

  it("builds dev and submits with the closed profile", () => {
    expect(testingWorkflow).toContain("ref: dev");
    expect(testingWorkflow).toContain("submit_profile: closed");
    expect(testingWorkflow).toContain("android-release.yml");
  });

  it("is manual-only - no push or schedule trigger", () => {
    // A per-merge or nightly trigger would burn ~90-minute builds nobody asked
    // for (#374 decided manual dispatch); this pins that the trigger surface
    // stays dispatch-only.
    expect(testingWorkflow).toContain("workflow_dispatch");
    expect(testingWorkflow).not.toMatch(/\n\s+push:/);
    expect(testingWorkflow).not.toContain("schedule:");
  });

  it("warns about migrations production has not run", () => {
    // The precondition that keeps a dev client honest against the production
    // backend: the preflight diffs supabase/migrations against main and warns.
    expect(testingWorkflow).toContain("supabase/migrations");
    expect(testingWorkflow).toContain("::warning::");
  });

  it("targets the Groups track with a status that serves testers", () => {
    const closed = easJson.submit?.closed?.android;
    expect(closed?.track).toBe("Groups");
    expect(closed?.releaseStatus).toBe("completed");
  });
});
