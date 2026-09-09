import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The web deploy forwards every EXPO_PUBLIC_* variable the app cannot default
 * for itself (#2263).
 *
 * ☠️ **A variable that is SET but never forwarded is invisible.** Expo inlines
 * `process.env.EXPO_PUBLIC_*` into the bundle at export time, so a name absent
 * from `web-deploy.yml`'s `env:` block reads as the empty string in the
 * deployed app no matter what the GitHub Environment holds.
 * `EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` sat in exactly that state from the
 * workflow's first commit (2026-05-05) until #2263: both environments held an
 * 87-character key, #89 had declared web push live, `docs/deployment.md` told
 * the operator to set it — and both live bundles carried
 * `webPushVapidPublicKey:""`. Nothing was red, because nothing asked.
 *
 * ☠️ **The key list is READ off `src/lib/env.ts`, never hardcoded here.** The
 * rule is the one env.ts itself states: a reader that falls back to `""` has
 * no usable default, so the deployment must supply it; a reader that falls
 * back to a URL ships something real when unset and is an override. The next
 * `?? ""` reader added to env.ts is covered the day it lands, and a key whose
 * default stops being empty leaves the list by itself. Same construction as
 * `test/env-example-opt-outs.test.ts`.
 *
 * A text scan rather than a YAML parse, for the reason
 * `test/release-thread-workflow.test.ts` gives: no YAML parser is a declared
 * dependency.
 */
const ROOT = join(__dirname, "..");
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/web-deploy.yml"), "utf8");
const ENV_TS = readFileSync(join(ROOT, "src/lib/env.ts"), "utf8");

/**
 * Every reader in env.ts whose fallback chain ends in `""`, keyed by the FIRST
 * variable in the chain — the one a deployment sets. A later name in the same
 * chain is a legacy alias (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) and is deliberately
 * not required of the workflow.
 */
const EMPTY_DEFAULT_KEYS = [
  ...ENV_TS.matchAll(
    /process\.env\.(EXPO_PUBLIC_[A-Z_]+)\s*\?\?(?:\s*process\.env\.EXPO_PUBLIC_[A-Z_]+\s*\?\?)*\s*""/g,
  ),
].map((match) => match[1]);

/** Every `NAME: ${{ vars.NAME }}` line in the workflow's job-level `env:` block. */
const FORWARDED_KEYS = [
  ...WORKFLOW.matchAll(
    /^\s+(EXPO_PUBLIC_[A-Z_]+):\s*\$\{\{\s*vars\.(EXPO_PUBLIC_[A-Z_]+)\s*\}\}$/gm,
  ),
].map((match) => ({ name: match[1], from: match[2] }));

describe("web-deploy forwards the variables the app cannot default (#2263)", () => {
  it("derives both lists from the files, so the assertions below are not vacuous", () => {
    // If either regex stops matching, these fail rather than passing over an
    // empty set - the failure shape that let the VAPID key go missing for months.
    expect(EMPTY_DEFAULT_KEYS).toContain("EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY");
    expect(EMPTY_DEFAULT_KEYS).toContain("EXPO_PUBLIC_SUPABASE_URL");
    expect(EMPTY_DEFAULT_KEYS.length).toBeGreaterThanOrEqual(7);
    expect(FORWARDED_KEYS.length).toBeGreaterThanOrEqual(13);
  });

  it("reads the primary variable of a fallback chain, not its legacy alias", () => {
    // `supabaseKey` is PUBLISHABLE_KEY ?? ANON_KEY ?? "": the deployment sets the
    // first, and requiring the alias would be asking for a variable nobody sets.
    expect(EMPTY_DEFAULT_KEYS).toContain("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(EMPTY_DEFAULT_KEYS).not.toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  });

  it.each(EMPTY_DEFAULT_KEYS)("forwards %s into the export environment", (key) => {
    expect(FORWARDED_KEYS.map((entry) => entry.name)).toContain(key);
  });

  it("reads each forwarded value from the variable of the same name", () => {
    // The env block is job-level under `environment: ${{ inputs.environment || 'production' }}`,
    // so `vars.*` already resolves per environment; a mismatched right-hand side
    // would silently hand production the staging value.
    for (const entry of FORWARDED_KEYS) {
      expect(entry.from).toBe(entry.name);
    }
  });
});
