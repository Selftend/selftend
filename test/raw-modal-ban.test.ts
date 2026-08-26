import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { sourceFiles, stripComments } from "@/test/source-scan";

/**
 * The raw-Modal ban (#1166 clause G2, #1260) and the one way a path-based
 * exemption list rots: silently. ESLint never complains about an `ignores`
 * entry that matches nothing, so a bypasser converted to PressShieldModal - or
 * deleted outright - would leave a stale exemption behind, a hole the next raw
 * Modal could be written into. And the inverse hole is quieter still: a
 * surviving file whose Modal import was removed keeps satisfying an
 * existence check forever, which is why the set below is compared by CONTENT
 * (does the file still import Modal?), not by presence on disk.
 *
 * Three assertions, three failure modes:
 *
 * - the ban FIRES on a new file, in each block family that must re-state it
 *   (no-restricted-imports is last-wins per file, so the captured-frame and
 *   src-dirs blocks each carry their own copy) - verified through the real
 *   eslint binary and the real config, not assumed;
 * - the exemption list equals the set of files that actually import Modal, so
 *   both stale-entry directions fail loudly;
 * - the exempt files lint clean as they stand, so the exemption mechanism is
 *   known to reach them (the repo-wide `npm run lint` proves the same thing,
 *   but this suite should not depend on another job to mean anything).
 *
 * Spawning eslint is slow (a full config load per probe), hence the explicit
 * timeout - test/audio-render-reroll.test.ts already showed what the 5s
 * default does to a suite that outgrows it.
 */
jest.setTimeout(180_000);

const ROOT = join(__dirname, "..");

/**
 * `import { Modal } from "react-native"` in any spelling the rule bans:
 * aliased (`Modal as RNModal`), multi-line, or riding along other names.
 * `[^}]` spans newlines, and `\bModal\b` cannot match `ModalProps`.
 */
const RAW_MODAL_IMPORT = /import\s+(?:type\s+)?\{[^}]*\bModal\b[^}]*\}\s*from\s*"react-native"/;

const CONFIG = readFileSync(join(ROOT, "eslint.config.js"), "utf8");

/** The literal entries of RAW_MODAL_EXEMPT_FILES in eslint.config.js. */
const exemptions = (() => {
  const start = CONFIG.indexOf("const RAW_MODAL_EXEMPT_FILES = [");
  const block = CONFIG.slice(start, CONFIG.indexOf("];", start));
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
})();

const PROBE_SOURCE = 'import { Modal } from "react-native";\n\nexport const probe = Modal;\n';

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

const modalBanFindings = (messages: LintMessage[]) =>
  messages.filter(
    (m) => m.ruleId === "no-restricted-imports" && /PressShieldModal/.test(m.message),
  );

describe("the raw-Modal ban (#1260)", () => {
  it("declares the rule and its exemptions at all, so nothing below passes vacuously", () => {
    expect(CONFIG).toMatch(/const RAW_MODAL_RESTRICTION = \{/);
    expect(CONFIG).toMatch(/name: "react-native"/);
    expect(CONFIG).toMatch(/importNames: \["Modal"\]/);
    expect(exemptions.length).toBeGreaterThan(0);
    expect(exemptions).toContain("src/components/app/press-shield-modal.tsx");
  });

  it("exempts exactly the files that import Modal - a converted or deleted bypasser must be pruned here", () => {
    const importers = sourceFiles(ROOT, { dirs: ["src", "app", "lib"] }).filter((file) =>
      RAW_MODAL_IMPORT.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );
    expect([...importers].sort()).toEqual([...exemptions].sort());
  });

  // One probe per block family that must carry the restriction, because
  // no-restricted-imports is last-wins per file: dropping the re-statement in
  // any one block would un-ban Modal for its files with everything else green.
  it.each([
    ["the component dirs", "src/components/app/raw-modal-ban-probe.tsx"],
    ["a captured-frame feature dir", "src/features/mood/raw-modal-ban-probe.tsx"],
    ["the src dirs outside the component blocks", "src/lib/raw-modal-ban-probe.tsx"],
  ])("fires on a new raw Modal import in %s", (_family, virtualPath) => {
    const findings = modalBanFindings(
      runEslint(["--stdin", "--stdin-filename", virtualPath], PROBE_SOURCE),
    );
    expect(findings.length).toBeGreaterThan(0);
  });

  it("leaves the sanctioned importer and the frozen bypassers alone", () => {
    expect(modalBanFindings(runEslint(exemptions))).toEqual([]);
  });
});
