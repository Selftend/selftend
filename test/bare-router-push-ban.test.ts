import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

/**
 * The bare-push ban (#1167 clause O3, #1269) and the one way a path-based
 * exemption list rots: silently. ESLint never complains about an `ignores`
 * entry that matches nothing, so an opt-out migrated onto the helper - or
 * deleted outright - would leave a stale exemption behind, a hole the next
 * bare push could be written into. And the inverse hole is quieter still: a
 * surviving file whose bare call was removed keeps satisfying an existence
 * check forever, which is why the set below is compared by CONTENT (does the
 * file still call router.push / router.navigate?), not by presence on disk.
 *
 * Three assertions, three failure modes (the shape test/raw-modal-ban.test.ts
 * established):
 *
 * - the ban FIRES on a new file, in each directory family the block's globs
 *   must reach (src feature dirs, app/ routes, src/lib) - verified through the
 *   real eslint binary and the real config, not assumed. This is also #1269's
 *   "verify by exit code" criterion, run on every CI pass rather than once;
 * - the exemption list equals the set of files that actually make a bare
 *   call, so both stale-entry directions fail loudly;
 * - the exempt files lint clean of THIS rule as they stand, so the exemption
 *   mechanism is known to reach them.
 *
 * Spawning eslint is slow (a full config load per probe), hence the explicit
 * timeout - test/audio-render-reroll.test.ts already showed what the 5s
 * default does to a suite that outgrows it.
 */
jest.setTimeout(180_000);

const ROOT = join(__dirname, "..");

/**
 * A bare `router.push(...)` / `router.navigate(...)` call. Applied to source
 * with comments AND strings blanked, so neither prose ("never reach
 * `router.navigate()`", src/lib/notifications.ts) nor a string literal naming
 * the call can register as a call site.
 */
const BARE_ROUTER_CALL = /\brouter\.(push|navigate)\s*\(/;

const CONFIG = readFileSync(join(ROOT, "eslint.config.js"), "utf8");

/** The literal entries of BARE_ROUTER_PUSH_EXEMPT_FILES in eslint.config.js. */
const exemptions = (() => {
  const start = CONFIG.indexOf("const BARE_ROUTER_PUSH_EXEMPT_FILES = [");
  const block = CONFIG.slice(start, CONFIG.indexOf("];", start));
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();

const PROBE_SOURCE = [
  'import { router } from "expo-router";',
  "",
  "export function probe() {",
  '  router.push("/settings");',
  '  router.navigate("/settings");',
  "}",
  "",
].join("\n");

interface LintMessage {
  ruleId: string | null;
  message: string;
}

/** Runs the real eslint binary with the repo config. `stdinPath` lints
 * PROBE_SOURCE as if it lived at that path; `files` lints real files. */
function runEslint(args: string[], input?: string): LintMessage[] {
  // Resolved from the eslint package itself rather than spelled as
  // <root>/node_modules/...: the bin is not in eslint's `exports`, and in an
  // agent worktree node_modules lives in the parent clone, not beside ROOT.
  const eslintBin = join(dirname(require.resolve("eslint")), "..", "bin", "eslint.js");
  const result = spawnSync(process.execPath, [eslintBin, "--format", "json", ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // 0 = clean, 1 = lint findings; anything else means eslint itself fell over.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`eslint exited ${result.status}:\n${result.stderr}`);
  }
  const reports: { messages: LintMessage[] }[] = JSON.parse(result.stdout);
  return reports.flatMap((report) => report.messages);
}

const banFindings = (messages: LintMessage[]) =>
  messages.filter(
    (m) => m.ruleId === "no-restricted-properties" && /escape-origin/.test(m.message),
  );

describe("the bare router.push ban (#1269)", () => {
  it("declares the rule and its exemptions at all, so nothing below passes vacuously", () => {
    expect(CONFIG).toMatch(/const BARE_ROUTER_PUSH_RESTRICTIONS = \[/);
    expect(CONFIG).toMatch(/property: "push"/);
    expect(CONFIG).toMatch(/property: "navigate"/);
    expect(exemptions.length).toBeGreaterThan(0);
    expect(exemptions).toContain("src/lib/escape-origin.ts");
  });

  it("exempts exactly the files that make a bare call - a migrated or deleted opt-out must be pruned here", () => {
    const callers = sourceFiles(ROOT, { dirs: ["src", "app", "lib"] }).filter((file) =>
      BARE_ROUTER_CALL.test(stripCommentsAndStrings(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect([...callers].sort()).toEqual([...exemptions].sort());
  });

  // One probe per directory family the single block's globs must reach - not
  // per re-statement (no other block configures no-restricted-properties, so
  // there is no last-wins copy to drop), but per glob: a narrowed `files`
  // entry would un-ban a whole family with everything else green.
  it.each([
    ["a feature dir", "src/features/mood/bare-router-push-ban-probe.tsx"],
    ["the app router tree", "app/(app)/bare-router-push-ban-probe.tsx"],
    ["src/lib, beside the helper itself", "src/lib/bare-router-push-ban-probe.ts"],
  ])("fires on a bare push and a bare navigate in %s", (_family, virtualPath) => {
    const findings = banFindings(
      runEslint(["--stdin", "--stdin-filename", virtualPath], PROBE_SOURCE),
    );
    expect(findings).toHaveLength(2);
  });

  it("leaves the helper and the declared opt-outs alone", () => {
    expect(banFindings(runEslint(exemptions))).toEqual([]);
  });
});
