/**
 * ☠️ The App Store capture job seeds the account it photographs, and only ever a
 * staging one (#2730, map #2652).
 *
 * Until #2730 the job signed into App Review's PRODUCTION account with no seed at
 * all, because the seed wipes the target user's rows first. What makes adding the
 * seed safe is a handful of properties of the workflow file, and each one is a
 * line someone could delete in a tidy-up without anything else going red:
 *
 * - the jobs name `environment: capture` and never `staging` or `production`,
 *   which both carry deploy credentials;
 * - nothing reads `DEMO_ACCOUNT_*`, which is App Review's production account;
 * - the seed runs in ONE job that the capture matrix `needs` - inside the matrix
 *   it would run twice at once, each wiping the other's inserts;
 * - the capture job refuses a build whose Supabase URL is not the staging
 *   project the seed wrote to.
 *
 * The script's own allowlist is `test/seed-demo-target.test.ts`. Deliberately a
 * text scan rather than a YAML parse, following `workflow-supabase-cli-pin.test.ts`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../.github/workflows/app-store-screenshots.yml"),
  "utf8",
);
/** Non-comment lines only, so a comment that NAMES a forbidden value cannot trip or satisfy a check. */
const code = source
  .split(/\r?\n/)
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");

describe("the capture workflow's seed (#2730)", () => {
  it("runs the seed script, on every run rather than behind a dispatch input", () => {
    expect(code).toMatch(/^\s*node scripts\/seed-demo-data\.mjs\s*$/m);
    expect(code).not.toMatch(/inputs\.\w*seed/i);
  });

  it("seeds in its own job, which the capture matrix waits for", () => {
    expect(code).toMatch(/^ {2}seed:\s*$/m);
    expect(code).toMatch(/^ {4}needs: seed\s*$/m);
  });

  it("names only the `capture` environment - never staging or production", () => {
    const environments = [...code.matchAll(/^\s*environment:\s*(\S+)\s*$/gm)].map((m) => m[1]);
    expect(environments.length).toBeGreaterThanOrEqual(2);
    expect(new Set(environments)).toEqual(new Set(["capture"]));
  });

  it("never reads App Review's production account", () => {
    expect(code).not.toMatch(/DEMO_ACCOUNT_/);
    expect(code).toMatch(/secrets\.CAPTURE_ACCOUNT_EMAIL/);
  });

  it("refuses a build that is not pointed at the staging project the seed wrote to", () => {
    expect(code).toMatch(
      /"\$EXPO_PUBLIC_SUPABASE_URL" != "https:\/\/\$STAGING_PROJECT_ID\.supabase\.co"/,
    );
  });

  it("masks the service key it fetches", () => {
    expect(code).toMatch(/::add-mask::\$key/);
  });
});
