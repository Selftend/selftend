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
//   - the runner OS, and an SDK check on it. The build compiles locally on a
//     GitHub macOS runner (free and unlimited on public repos), so the runner's
//     own Xcode is what ships - eas.json's `image` field is IGNORED for local
//     builds. Losing the pin or the SDK guard means an SDK-too-old archive is
//     rejected by Apple only after a full build and a consumed build number.
//   - no Apple identifiers hard-coded into eas.json as `$VAR` strings. eas-cli
//     interpolates only ascApiKeyPath/ascApiKeyIssuerId/ascApiKeyId, so a
//     literal "$ASC_APP_ID" fails `ascAppId`'s /^\d+$/ validation - and fails
//     after the build, since the submit profile is resolved last. The workflow
//     writes real values in with jq instead.
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

const easJsonSource = readFileSync(resolve(ROOT, "eas.json"), "utf8");

const easJson = JSON.parse(easJsonSource) as {
  cli?: { appVersionSource?: string };
  build?: Record<string, { autoIncrement?: boolean; ios?: { image?: string } }>;
  submit?: Record<string, { ios?: { ascAppId?: string; appleTeamId?: string } }>;
};

describe("iOS release lands on TestFlight, not the App Store", () => {
  it("submits the locally built IPA with the production submit profile", () => {
    expect(iosWorkflow).toContain("submit --platform ios --profile production");
    expect(iosWorkflow).toContain('--path "$IOS_OUTPUT_PATH"');
    // Auto-submit is refused by eas-cli for local builds ("Auto-submits are not
    // yet supported when building locally"), so a reintroduced --auto-submit
    // would fail the release rather than shorten it.
    expect(iosWorkflow).not.toContain("--auto-submit");
  });

  it("never commits Apple identifiers as uninterpolated eas.json placeholders", () => {
    // eas-cli interpolates only the three ascApiKey* fields. A "$ASC_APP_ID"
    // here would reach Joi as a literal and fail /^\d+$/ - after the build has
    // already been spent, because the submit profile is resolved last of all.
    expect(easJsonSource).not.toContain("$ASC_APP_ID");
    expect(easJsonSource).not.toContain("$APPLE_TEAM_ID");
    expect(easJson.submit?.production?.ios?.ascAppId).toBeUndefined();
    expect(easJson.submit?.production?.ios?.appleTeamId).toBeUndefined();
    // ...and the workflow supplies them for real, from GitHub variables.
    expect(iosWorkflow).toMatch(/jq --arg app "\$ASC_APP_ID" --arg team "\$APPLE_TEAM_ID"/);
    expect(iosWorkflow).toContain("ascAppId: $app, appleTeamId: $team");
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
  it("builds on a pinned macOS runner, never a billed larger one", () => {
    // Standard GitHub-hosted runners are free and unlimited on public repos, so
    // compiling here (rather than on EAS) costs nothing and removes the Expo
    // free tier's 15-builds/month ceiling entirely.
    expect(iosWorkflow).toMatch(/runs-on:\s*macos-26\b/);
    // `macos-latest` moved from macOS 15 to 26 during 2026 and will move again,
    // silently changing the toolchain under a release.
    expect(iosWorkflow).not.toMatch(/runs-on:\s*macos-latest/);
    // -large/-xlarge are billed even on public repositories.
    expect(iosWorkflow).not.toMatch(/runs-on:\s*macos[\w.-]*-x?large/);
  });

  it("verifies the runner's iOS SDK instead of trusting eas.json's image", () => {
    // `image` is ignored for local builds, so pinning it there guarantees
    // nothing. The runner's own Xcode ships, and Apple rejects anything built
    // against an SDK older than iOS 26 - after the build, so check first.
    expect(easJson.build?.production?.ios?.image).toBeUndefined();
    expect(iosWorkflow).toContain("xcrun --sdk iphoneos --show-sdk-version");
    expect(iosWorkflow).toMatch(/-lt 26\b/);
  });

  it("runs the build locally and non-interactively", () => {
    expect(iosWorkflow).toContain("--non-interactive");
    expect(iosWorkflow).toContain("--local");
    // The IPA must land at a known path for `eas submit --path` to find it.
    expect(iosWorkflow).toContain('--output "$IOS_OUTPUT_PATH"');
    // --wait belongs to remote builds; a local build is synchronous by nature,
    // and passing it would be a sign the job had drifted back to EAS builders.
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
