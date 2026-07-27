import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #371 / #372 - a merge to `main` must never put Android bits in front of real
// users on its own. The pipeline uploads to the Play **production** track with
// `releaseStatus: "draft"` ("the release's APKs are not being served to users"),
// and a human presses `Start rollout to Production` in Play Console.
//
// Two ways that gate could silently disappear: flipping the submit profile back
// to a testing track, or flipping the release status to `completed` (which
// serves it to everyone the moment review clears). Both are pinned here.
//
// `draft` is deliberate, not interchangeable with the neighbouring statuses:
//   - `halted` means "will no longer be served" - it describes a release that
//     WAS serving and got stopped. That is the kill switch, not a pre-rollout
//     state, and Play would reject it for a release that never rolled out.
//   - `inProgress` with a zero rollout is invalid: `userFraction` is documented
//     as exclusive of 0, so "in progress to nobody" is unsayable.

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

  it("uploads as a draft so the rollout stays a human action", () => {
    // If this ever reads "completed", a merge to main ships straight to every
    // user with no human in the loop. That is the whole point of the gate.
    expect(profile?.releaseStatus).toBe("draft");
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
    // The same versionCode is copied to the closed tracks as `completed` while
    // production waits on the human - testers stay at or ahead of real users.
    // Interim arrangement; #374 moves closed-track feeding to `dev`.
    const mirrors = releaseWorkflow
      .split(/\r?\n/)
      .filter((line) => line.includes("promote-android-track.cjs"));

    expect(mirrors.length).toBeGreaterThan(0);
    for (const line of mirrors) {
      expect(line).toContain("--from production");
    }
  });
});
