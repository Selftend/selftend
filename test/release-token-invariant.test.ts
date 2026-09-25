/**
 * ☠️ **Invariant 2: the GitHub Release is published under the PAT, never
 * `GITHUB_TOKEN`** (#2728, ruled on #2677, map #2661).
 *
 * `docs/releasing.md` **Invariants § 2** has said this since before #2631:
 * the Release is *"always created by the PAT … never `GITHUB_TOKEN` — … deploys
 * would silently not run."* Nothing enforced it.
 *
 * Why it is the one thing on that map worth guarding: `release.yml` (production
 * database migration, then web + Android + iOS + edge functions), the
 * r/Selftend thread drafter, and `back-merge.yml` **all** fire on
 * `release: published` — and that event exists only because release-please
 * publishes the Release under `RELEASE_PLEASE_TOKEN`. `GITHUB_TOKEN`-authored
 * events do not trigger `on: release`. So one edit here silences three
 * workflows, and the result is a **green release that deploys nothing**.
 *
 * ⭐ **Why a merge gate and not a reconciliation.** #2677 weighed both and chose
 * this because it catches the failure **in the PR that causes it**, before a
 * silent release can happen at all; a reconciliation can only report afterwards
 * that a release you already shipped deployed nothing. The other causes are
 * already loud — an expired or revoked token reddens `release-please.yml` on an
 * ordinary push to `main`, which is a promotion somebody just merged
 * deliberately.
 *
 * ⛔ **Deliberately uncovered:** a GitHub platform change to `release`-event
 * suppression. #2665 established that suppression is a blanket rule with a
 * closed three-item exception list, so a change there is an announced,
 * GitHub-wide event rather than silent local drift. Do not add coverage for it
 * here.
 *
 * Deliberately a text scan rather than a YAML parse, following
 * `workflow-supabase-cli-pin.test.ts`: no YAML parser is a declared dependency
 * and the repo's dependency policy would rather these convention tests stayed
 * dependency-free.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOW = resolve(__dirname, "../.github/workflows/release-please.yml");

/** The action that publishes the Release. Matched without its pin, which moves. */
const RELEASE_ACTION = /uses:\s*googleapis\/release-please-action/;

/**
 * ☠️ **Comments are stripped before anything is asserted, and that is
 * load-bearing rather than tidy.** The real release step carries the comment
 * *"PAT, not GITHUB_TOKEN: the org locks Actions from creating PRs…"* — so a
 * scan that read raw text would find `GITHUB_TOKEN` inside the very step it is
 * protecting and fail on a correct file. A guard that is red for a wrong reason
 * gets muted.
 */
export function stripComments(block: string[]): string[] {
  return block.map((line) => line.replace(/#.*$/, ""));
}

/**
 * The lines of the `- ` list item containing `index`, bounded so it cannot run
 * past the end of the steps list into the next job. Borrowed from
 * `workflow-supabase-cli-pin.test.ts`, which solved the same problem.
 */
export function stepAround(lines: string[], index: number): string[] {
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
    end += 1;
  }
  return lines.slice(start, end);
}

/**
 * The release-publishing step, comments stripped.
 *
 * ⚠️ Throws when the action is absent rather than returning `[]`. Returning an
 * empty block would make every assertion below pass over nothing — the
 * `registry.test.ts:216` failure, where six stems were matched by no probe at
 * all and a typo in any one would have passed forever.
 */
export function releaseStep(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex((line) => RELEASE_ACTION.test(line));
  if (index === -1) {
    throw new Error(
      "No googleapis/release-please-action step found in release-please.yml. " +
        "Invariant 2 is about who publishes the Release; if that action moved, this guard " +
        "must move with it rather than be deleted.",
    );
  }
  return stripComments(stepAround(lines, index));
}

describe("Invariant 2: the Release is PAT-authored", () => {
  const source = readFileSync(WORKFLOW, "utf8");
  const step = releaseStep(source);

  it("finds the release-publishing step at all", () => {
    // Non-vacuous: proves the assertions below walk a real block.
    expect(step.length).toBeGreaterThan(1);
    expect(step.join("\n")).toMatch(RELEASE_ACTION);
  });

  it("passes RELEASE_PLEASE_TOKEN to it", () => {
    expect(step.join("\n")).toMatch(/token:\s*\$\{\{\s*secrets\.RELEASE_PLEASE_TOKEN\s*\}\}/);
  });

  it("☠️ never passes GITHUB_TOKEN to it", () => {
    // The whole invariant. A GITHUB_TOKEN-authored Release does not fire
    // `on: release`, so three workflows go quiet and the release looks green.
    const offending = step.filter((line) => /GITHUB_TOKEN/.test(line));
    expect(offending).toEqual([]);
  });

  it("⚠️ proves comment-stripping is doing real work on the real file", () => {
    // The step's own comment says "PAT, not GITHUB_TOKEN". If stripping ever
    // stopped happening, the assertion above would fail on a correct file and
    // somebody would weaken it. This asserts the hazard is actually present,
    // so the protection cannot be quietly removed as unnecessary.
    const raw = source.split(/\r?\n/);
    const index = raw.findIndex((line) => RELEASE_ACTION.test(line));
    const rawStep = stepAround(raw, index);
    expect(rawStep.some((line) => /GITHUB_TOKEN/.test(line))).toBe(true);
  });
});

/**
 * ☠️ **The positive controls.** Everything above reads one real file, so it
 * would pass identically if the regexes matched nothing. Each way this guard can
 * fail is driven against a synthetic workflow instead.
 */
describe("the Invariant 2 guard, proved against fixtures", () => {
  const good = [
    "jobs:",
    "  release-please:",
    "    steps:",
    "      # PAT, not GITHUB_TOKEN: the org locks Actions from creating PRs.",
    "      - uses: googleapis/release-please-action@abc123 # v5.0.0",
    "        id: release",
    "        with:",
    "          token: ${{ secrets.RELEASE_PLEASE_TOKEN }}",
    "",
    "      - name: Approve",
    "        env:",
    "          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}",
  ].join("\n");

  it("reads the release step and stops before the next step", () => {
    const step = releaseStep(good).join("\n");
    expect(step).toMatch(/RELEASE_PLEASE_TOKEN/);
    // ⭐ The bounding matters: a later step legitimately uses GITHUB_TOKEN, and
    // a block that ran past its own end would report a false violation.
    expect(step).not.toMatch(/Approve/);
    expect(step.match(/GITHUB_TOKEN/g)).toBeNull();
  });

  it("☠️ catches GITHUB_TOKEN passed to the release step", () => {
    const bad = good.replace("secrets.RELEASE_PLEASE_TOKEN", "secrets.GITHUB_TOKEN");
    const offending = releaseStep(bad).filter((line) => /GITHUB_TOKEN/.test(line));
    expect(offending).toHaveLength(1);
  });

  it("catches the token being dropped entirely", () => {
    const bad = good.replace("          token: ${{ secrets.RELEASE_PLEASE_TOKEN }}\n", "");
    expect(releaseStep(bad).join("\n")).not.toMatch(/RELEASE_PLEASE_TOKEN/);
  });

  it("is not fooled by GITHUB_TOKEN appearing only in a comment", () => {
    // The real file's shape. A raw-text scan would call this a violation.
    expect(releaseStep(good).filter((line) => /GITHUB_TOKEN/.test(line))).toEqual([]);
  });

  it("throws rather than passing over nothing when the action is gone", () => {
    // ☠️ Returning [] here would make the whole suite green forever.
    expect(() => releaseStep("jobs:\n  build:\n    steps:\n      - run: echo hi\n")).toThrow(
      /No googleapis\/release-please-action step/,
    );
  });
});
