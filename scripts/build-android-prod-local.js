// Builds a release Android App Bundle (.aab) locally with the EAS `production` profile -
// the same artifact the android-release.yml CI produces - for manual upload to Google Play
// (closed/internal/production tracks). Run via `npm run build:android:production:local`, which
// loads .env (production) with `node --env-file=.env` so EXPO_PUBLIC_* are baked into the build.
//
// Requires local Android tooling (JDK 17, Android SDK/NDK) and EAS auth (EXPO_TOKEN or `eas login`)
// so EAS can fetch the signing keystore. Extra args pass through to `eas build`.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();

// Guard: the AAB inlines EXPO_PUBLIC_* at build time. Without the production backend loaded,
// you'd ship testers a build pointed at nothing (or the wrong Supabase). Fail loudly instead.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error("EXPO_PUBLIC_SUPABASE_URL is not set.");
  console.error("Run `npm run build:android:production:local` (it loads .env via --env-file),");
  console.error("not this script directly.");
  process.exit(1);
}
if (!/^https:\/\//.test(supabaseUrl)) {
  console.error(`Refusing to build: EXPO_PUBLIC_SUPABASE_URL is "${supabaseUrl}",`);
  console.error("which is not an https:// production URL. Check that .env points at prod.");
  process.exit(1);
}

const outputDir = path.join(projectRoot, "local-builds", "android");
fs.mkdirSync(outputDir, { recursive: true });
const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .replace(/Z$/, "");
const aabPath = path.join(outputDir, `selftend-prod-${timestamp}.aab`);

console.log(`Building production AAB (EAS profile: production)`);
console.log(`  backend: ${supabaseUrl}`);
console.log(`  output:  ${path.relative(projectRoot, aabPath)}\n`);

const result = spawnSync(
  "npm",
  [
    "exec",
    "--yes",
    "eas-cli",
    "--",
    "build",
    "--platform",
    "android",
    "--profile",
    "production",
    "--local",
    "--output",
    aabPath,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
if (!fs.existsSync(aabPath)) {
  console.error(`\nExpected AAB at ${aabPath} but it was not created.`);
  process.exit(1);
}

console.log(`\nAAB ready: ${aabPath}`);
console.log("Upload it in Play Console -> Test and release -> Closed testing -> Create release.");
