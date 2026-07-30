import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// iOS ships to TestFlight, never straight to users - the deliberate asymmetry
// with Android, which releases to the Play production track on every `main`
// merge (#371). There is no iOS equivalent of a capped staged rollout, so the
// gate is that a human promotes the build in App Store Connect.
//
// What is pinned here is the set of properties whose silent loss would either
// break every release or, worse, produce a release that LOOKS fine and is not:
//
//   - the export-compliance key. Expo does not default it and
//     `eas build --non-interactive` only warns when it is missing, so dropping
//     it yields a build that uploads, reports success, and then sits in App
//     Store Connect as "Missing Compliance" - invisible to testers until
//     somebody notices and answers the encryption question by hand.
//   - `--non-interactive` on the build. Without it eas-cli prompts and the job
//     hangs until the timeout.
//   - the runner OS. The point of this pipeline is that macOS compute happens on
//     EAS, not on a GitHub macOS runner at ~10x the included-minute burn; a
//     `runs-on: macos-*` creeping in here is a silent cost regression.
//   - no `ios.buildNumber` in app config. Under appVersionSource "remote" a
//     local value is ignored, so one reintroduced would read as authoritative
//     while doing nothing.
//
// Text scan, no YAML parser - matching the repo's dependency-free convention
// tests (see workflow-supabase-cli-pin.test.ts, android-release-track.test.ts).

const ROOT = resolve(__dirname, "..");

const iosWorkflow = readFileSync(resolve(ROOT, ".github/workflows/ios-release.yml"), "utf8");
const releaseWorkflow = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");
const appConfigSource = readFileSync(resolve(ROOT, "app.config.ts"), "utf8");

const easJson = JSON.parse(readFileSync(resolve(ROOT, "eas.json"), "utf8")) as {
  cli?: { appVersionSource?: string };
  build?: Record<string, { autoIncrement?: boolean; ios?: { image?: string } }>;
  submit?: Record<string, { ios?: { ascAppId?: string; appleTeamId?: string } }>;
};

describe("iOS release lands on TestFlight, not the App Store", () => {
  it("submits with the production submit profile", () => {
    expect(iosWorkflow).toContain("--auto-submit-with-profile production");
  });

  it("keeps a submit profile for iOS carrying the app and team identifiers", () => {
    const profile = easJson.submit?.production?.ios;
    expect(profile).toBeDefined();
    // Interpolated from GitHub variables so no Apple identifiers are committed;
    // the workflow's gate job refuses to run when either is unset, because EAS
    // would otherwise try to create an App Store Connect record from the
    // literal string.
    expect(profile?.ascAppId).toBe("$ASC_APP_ID");
    expect(profile?.appleTeamId).toBe("$APPLE_TEAM_ID");
    expect(iosWorkflow).toContain("ASC_APP_ID");
    expect(iosWorkflow).toContain("APPLE_TEAM_ID");
  });

  it("is wired into the release orchestrator behind migrate-prod", () => {
    expect(releaseWorkflow).toContain("uses: ./.github/workflows/ios-release.yml");
    // Bounded to the deploy-ios block: sliced to end-of-file this would still
    // pass on the `needs: migrate-prod` belonging to deploy-functions-prod, so
    // the assertion would survive deploy-ios losing its dependency entirely.
    const start = releaseWorkflow.indexOf("  deploy-ios:");
    expect(start).toBeGreaterThan(-1);
    const rest = releaseWorkflow.slice(start + "  deploy-ios:".length);
    const nextJob = rest.search(/^ {2}\S/m);
    const iosJob = nextJob === -1 ? rest : rest.slice(0, nextJob);
    expect(iosJob).toContain("needs: migrate-prod");
    expect(iosJob).toContain("uses: ./.github/workflows/ios-release.yml");
  });
});

describe("iOS release cost and correctness guards", () => {
  it("never builds on a GitHub macOS runner", () => {
    expect(iosWorkflow).not.toMatch(/runs-on:\s*macos/);
    expect(iosWorkflow).toMatch(/runs-on:\s*ubuntu-latest/);
    // The macOS work belongs to EAS's builders, pinned to an Xcode 26 image
    // because Apple requires the iOS 26 SDK for App Store Connect uploads.
    expect(easJson.build?.production?.ios?.image).toBe("macos-sequoia-15.6-xcode-26.0");
  });

  it("runs the build non-interactively and waits for the real outcome", () => {
    expect(iosWorkflow).toContain("--non-interactive");
    expect(iosWorkflow).toContain("--wait");
    // --no-wait would report success the moment the build is queued, so a
    // compile failure would land after the workflow had already gone green.
    // Matched as a flag on its own continuation line, so the prose above that
    // explains this choice doesn't trip the assertion.
    expect(iosWorkflow).not.toMatch(/^\s*--no-wait\s*$/m);
  });

  it("declares export compliance so builds are testable on arrival", () => {
    expect(appConfigSource).toMatch(/usesNonExemptEncryption:\s*false/);
  });

  it("never interpolates the dispatch input into a shell command", () => {
    // `${{ }}` is substituted before the shell parses the line, so an input
    // reaching the script body is arbitrary code execution with the production
    // EXPO_TOKEN and SENTRY_AUTH_TOKEN in scope. It must travel via env only.
    expect(iosWorkflow).not.toContain("${{ inputs.what_to_test }}\n          --");
    expect(iosWorkflow).not.toMatch(/--what-to-test[^\n]*\$\{\{/);
    expect(iosWorkflow).toMatch(/WHAT_TO_TEST:\s*\$\{\{\s*inputs\.what_to_test\s*\}\}/);
    expect(iosWorkflow).toContain('--what-to-test "$WHAT_TO_TEST"');
  });
});

describe("iOS build versioning stays remote", () => {
  it("lets EAS own CFBundleVersion", () => {
    expect(easJson.cli?.appVersionSource).toBe("remote");
    expect(easJson.build?.production?.autoIncrement).toBe(true);
  });

  it("keeps buildNumber out of the app config", () => {
    expect(appConfigSource).not.toMatch(/^\s*buildNumber:/m);
  });
});
