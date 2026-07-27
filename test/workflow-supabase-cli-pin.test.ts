import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// #264 - `version: latest` makes supabase/setup-cli@v1 resolve the release through
// the GitHub releases API, which is rate-limited on busy runners; it killed two CI
// jobs in <40s on 2026-07-26 before any test ran. A concrete version skips that call
// entirely (the action only calls resolveLatestVersion() for the literal `latest`,
// and otherwise builds the download URL directly) and keeps CI reproducible.
//
// The same incident had a second symptom: cleanup ran under a bare `always()`, so
// with the CLI never installed `supabase stop` died with exit 127 and buried the
// real error. Both invariants are pinned here.

const WORKFLOWS_DIR = resolve(__dirname, "../.github/workflows");

// No `v` prefix: the action feeds this input straight into semver's gte(), which
// throws on `v`-prefixed input.
const CONCRETE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

// Deliberately a text scan rather than a YAML parse: no YAML parser is a declared
// dependency, and the repo's dependency policy would rather this convention test
// stayed dependency-free (see migration-conventions.test.ts).
function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
}

// The lines of the `- ` list item (the step) containing `index`, bounded so it
// cannot run past the end of the steps list into the next job.
function stepAround(lines: string[], index: number): string[] {
  let start = index;
  while (start > 0 && !/^\s*-\s+\S/.test(lines[start])) start--;
  const indent = lines[start].search(/\S/);

  let end = index + 1;
  while (end < lines.length) {
    const line = lines[end];
    if (line.trim() !== "") {
      const lineIndent = line.search(/\S/);
      if (lineIndent < indent) break;
      if (lineIndent === indent && /^\s*-\s+\S/.test(line)) break;
    }
    end++;
  }

  return lines.slice(start, end);
}

// Every step matching `anchor`, as {file, line, body}.
function stepsMatching(anchor: RegExp): { file: string; line: number; body: string[] }[] {
  const found: { file: string; line: number; body: string[] }[] = [];

  for (const file of workflowFiles()) {
    const lines = readFileSync(resolve(WORKFLOWS_DIR, file), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (anchor.test(line)) found.push({ file, line: index + 1, body: stepAround(lines, index) });
    });
  }

  return found;
}

function valueOf(body: string[], key: string): string | null {
  for (const line of body) {
    const match = line.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`));
    // Strip only balanced surrounding quotes - an `if:` expression is full of
    // its own quotes and must survive intact.
    if (match) {
      const quoted = match[1].match(/^(["'])(.*)\1$/);
      return quoted ? quoted[2] : match[1];
    }
  }
  return null;
}

describe("supabase/setup-cli version pins (#264)", () => {
  const setupSteps = stepsMatching(/^\s*(-\s*)?uses:\s*supabase\/setup-cli@/);

  it("still finds setup-cli steps to check", () => {
    // Guards the assertions below from silently passing on an empty list if the
    // workflows are ever restructured.
    expect(setupSteps.length).toBeGreaterThan(0);
  });

  it("pins every setup-cli step to a concrete version, never `latest`", () => {
    const offenders = setupSteps
      .map((step) => ({ ...step, version: valueOf(step.body, "version") }))
      .filter((step) => step.version === null || !CONCRETE_VERSION_PATTERN.test(step.version))
      .map((step) => `${step.file}:${step.line} -> ${step.version ?? "(no version: input)"}`);

    expect(offenders).toEqual([]);
  });

  it("pins every setup-cli step to the same version", () => {
    // One version across CI, staging and release keeps a bump to a single sweep
    // and stops the environments drifting apart.
    const versions = [...new Set(setupSteps.map((step) => valueOf(step.body, "version")))];

    expect(versions).toHaveLength(1);
  });
});

describe("supabase stop cleanup guards (#264)", () => {
  const stopSteps = stepsMatching(/^\s*run:\s*supabase stop\s*$/);

  it("still finds cleanup steps to check", () => {
    expect(stopSteps.length).toBeGreaterThan(0);
  });

  it("gates cleanup on the start step having actually run", () => {
    // A bare `always()` runs cleanup even when CLI setup failed, so `supabase` is
    // absent from PATH and the job fails a second time with exit 127, burying the
    // real error. The guard must be a POSITIVE outcome check: a step that never
    // ran may report `skipped` or no value at all, so only an explicit
    // success/failure pair proves it executed. Both are required - cleanup must
    // still run when start ran and failed, because containers may be up.
    const offenders = stopSteps
      .map((step) => ({ ...step, condition: valueOf(step.body, "if") }))
      .filter(
        (step) =>
          step.condition === null ||
          !/steps\.[\w-]+\.outcome == 'success'/.test(step.condition) ||
          !/steps\.[\w-]+\.outcome == 'failure'/.test(step.condition),
      )
      .map((step) => `${step.file}:${step.line} -> ${step.condition ?? "(no if: guard)"}`);

    expect(offenders).toEqual([]);
  });
});
