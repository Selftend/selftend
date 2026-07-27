import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #371 / #372 - a merge to `main` releases Android to the Play **production**
// track as `completed`: live to all users once Google's review clears, with no
// staged rollout and nothing to press.
//
// Two ways that could silently break, both pinned here:
//   - the submit profile being pointed back at a testing track, so releases
//     quietly stop reaching production at all;
//   - `releaseStatus` drifting to `draft`, which uploads a release that serves
//     NOBODY. That failure is silent: CI stays green, the build appears in Play
//     Console, and users simply never receive it until somebody notices.
//
// The remaining statuses are deliberate non-choices, recorded so a future
// reader does not treat them as equivalent:
//   - `halted` means "will no longer be served" - a release that WAS serving
//     and got stopped. It is the kill switch, not a release state.
//   - `inProgress` requires a `rollout` fraction and caps the audience; it is
//     the dial-back option documented in docs/releasing.md, not the default.

const ROOT = resolve(__dirname, "..");

// Text scan, no YAML parser - matching the repo's dependency-free convention
// tests (see workflow-supabase-cli-pin.test.ts).
const releaseWorkflow = readFileSync(
  resolve(ROOT, ".github/workflows/android-release.yml"),
  "utf8",
);

const easJson = JSON.parse(readFileSync(resolve(ROOT, "eas.json"), "utf8")) as {
  submit?: Record<string, { android?: { track?: string; releaseStatus?: string } }>;
};

describe("Android production submit profile (#371)", () => {
  const profile = easJson.submit?.production?.android;

  it("defines a production submit profile", () => {
    expect(profile).toBeDefined();
  });

  it("targets the Play production track", () => {
    expect(profile?.track).toBe("production");
  });

  it("releases as completed so a merge to main actually reaches users", () => {
    // `draft` here would upload a release that serves nobody - green CI, build
    // visible in Play Console, users never get it. Fail loudly instead.
    expect(profile?.releaseStatus).toBe("completed");
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
