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

describe("Android release workflow track targeting (#371)", () => {
  it("submits using the production profile, not a testing profile", () => {
    const submitLine = releaseWorkflow
      .split(/\r?\n/)
      .find((line) => line.includes("eas-cli -- submit"));

    expect(submitLine).toBeDefined();
    expect(submitLine).toContain("--profile production");
  });

  it("mirrors onto the closed tracks from production, so testers are never behind", () => {
    // The same versionCode is copied to the closed tracks, so the tester group
    // is never left on an older build than production. Interim arrangement;
    // #374 moves closed-track feeding to `dev`.
    const mirrors = releaseWorkflow
      .split(/\r?\n/)
      .filter((line) => line.includes("promote-android-track.cjs"));

    expect(mirrors.length).toBeGreaterThan(0);
    for (const line of mirrors) {
      expect(line).toContain("--from production");
    }
  });
});
