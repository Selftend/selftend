/**
 * The shape of `.github/workflows/release-thread.yml` (#1951): the workflow
 * that turns a published release into one `reddit-draft` issue.
 *
 * Every assertion below is a decision from #1878 or a rule from #1877 that a
 * later edit could quietly undo:
 *
 * - a SEPARATE workflow on `release: published` with NO `needs:` on any deploy
 *   job (#1878 decision 2) — a deploy gate would have suppressed the draft on
 *   two of the four releases before the map, whose run-level conclusion read
 *   `cancelled` while everything but TestFlight shipped;
 * - the release pipeline itself is untouched by it;
 * - pre-releases are skipped (#1878 decision 4);
 * - the render runs BEFORE any issue call, so a drafter error is a red run and
 *   no issue (#1878 decision 6);
 * - the workflow's own token is the only credential: no secret, and nothing
 *   that could reach the Reddit API (#1884);
 * - the release body reaches the drafter as an environment value, never
 *   interpolated into a shell line (a changelog line containing a backtick or
 *   a `$(` is otherwise a command).
 *
 * A text scan rather than a YAML parse, for the reason
 * `workflow-supabase-cli-pin.test.ts` gives: no YAML parser is a declared
 * dependency.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOWS_DIR = resolve(__dirname, "../.github/workflows");
const WORKFLOW = "release-thread.yml";

const source = readFileSync(resolve(WORKFLOWS_DIR, WORKFLOW), "utf8");
const lines = source.split(/\r?\n/);

/** The lines of the top-level `key:` block. */
function block(key: string): string[] {
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) return [];
  let end = start + 1;
  while (end < lines.length && (lines[end].trim() === "" || /^\s/.test(lines[end]))) end++;
  return lines.slice(start + 1, end);
}

/** The first line index matching `pattern`, or -1. */
function lineOf(pattern: RegExp): number {
  return lines.findIndex((line) => pattern.test(line));
}

describe("the trigger (#1878 decision 2)", () => {
  it("fires on a published release", () => {
    const on = block("on");
    expect(on).toContain("  release:");
    expect(on.some((line) => /^\s+types:\s*\[published\]\s*$/.test(line))).toBe(true);
  });

  it("carries a workflow_dispatch with a required tag input, mirroring the release pipeline", () => {
    const on = block("on");
    expect(on).toContain("  workflow_dispatch:");
    expect(on.some((line) => /^\s+tag:\s*$/.test(line))).toBe(true);
    expect(on.some((line) => /^\s+required:\s*true\s*$/.test(line))).toBe(true);
    expect(on.some((line) => /^\s+type:\s*string\s*$/.test(line))).toBe(true);
  });

  it("has no `needs:` at all: nothing gates it on a deploy", () => {
    expect(lines.filter((line) => /^\s*needs:/.test(line))).toEqual([]);
  });

  it("is a separate workflow: the release pipeline neither calls it nor names it", () => {
    for (const file of readdirSync(WORKFLOWS_DIR)) {
      if (file === WORKFLOW) continue;
      expect(readFileSync(resolve(WORKFLOWS_DIR, file), "utf8")).not.toContain("release-thread");
    }
  });

  it("skips a pre-release (#1878 decision 4)", () => {
    const guard = lines.find((line) => /^\s+if:.*prerelease/.test(line));
    expect(guard).toBeDefined();
    // The guard must NEGATE prerelease, not require it.
    expect(guard).toMatch(/!\s*github\.event\.release\.prerelease/);
  });
});

describe("the credential (#1884: nothing touches the Reddit API)", () => {
  it("asks for issues: write and contents: read, nothing more", () => {
    const permissions = block("permissions")
      .map((line) => line.trim())
      .filter((line) => line !== "");
    expect(permissions.sort()).toEqual(["contents: read", "issues: write"]);
  });

  it("references no secret: the workflow's own token is the only credential", () => {
    expect(source).not.toMatch(/secrets\./);
    expect(source).toMatch(/github\.token/);
  });

  it("names no Reddit endpoint", () => {
    expect(source).not.toMatch(/reddit\.com/i);
  });
});

describe("the order of steps (#1878 decision 6)", () => {
  const render = lineOf(/renderer\.mjs/);
  const filer = lineOf(/filer\.mjs/);

  it("renders in one step and files in a later one", () => {
    expect(render).toBeGreaterThan(-1);
    expect(filer).toBeGreaterThan(render);
  });

  it("makes every issue call through the filer, after the render", () => {
    // `gh issue` in the YAML would be an issue call the render cannot guard.
    expect(source).not.toMatch(/gh issue/);
    expect(source).not.toMatch(/\/issues\b/);
  });

  it("writes the nothing-picked trace as a step-summary line", () => {
    // The filer writes it; the workflow must hand it the summary file by
    // leaving GITHUB_STEP_SUMMARY alone, so the only thing to pin here is that
    // no step overrides it.
    expect(source).not.toMatch(/GITHUB_STEP_SUMMARY\s*:/);
  });
});

describe("the release body", () => {
  it("reaches the shell only as an environment value", () => {
    const uses = lines.filter((line) => line.includes("github.event.release.body"));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(/^\s+RELEASE_BODY:\s*\$\{\{\s*github\.event\.release\.body\s*\}\}\s*$/);
    }
  });

  it("derives the tag from the event or the dispatch input, as the release pipeline does", () => {
    expect(source).toContain("github.event.release.tag_name || inputs.tag");
  });
});
