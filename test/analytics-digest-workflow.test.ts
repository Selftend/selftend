// test/analytics-digest-workflow.test.ts
//
// The monthly digest workflow (#2381) is the one piece of the analytics
// instrument that nothing else executes: it runs once a month against
// production, and a mistake in it is invisible until the 1st - or, worse,
// invisible ON the 1st, because a digest that fails to post cannot report that
// it failed to post.
//
// So the decisions that would be expensive to get wrong are pinned here.
import * as fs from "node:fs";
import * as path from "node:path";

const WORKFLOW = path.resolve(__dirname, "..", ".github", "workflows", "analytics-digest.yml");
const source = fs.readFileSync(WORKFLOW, "utf8");

/** The workflow's lines with whole-line `#` comments removed. */
const codeLines = source
  .split("\n")
  .filter((line) => !line.trim().startsWith("#"))
  .join("\n");

describe("the monthly analytics digest workflow", () => {
  it("runs at 06:17 UTC on the 1st", () => {
    // ☠️ THE 1st, DELIBERATELY NOT THE 9th. The 9th is the recurring-checks duty
    // day in docs/operations-runbook.md, and a no-duty delivery landing on a
    // duty day gets read as a duty soon enough. `:17` is the house
    // off-the-hour minute.
    expect(source).toContain('cron: "17 6 1 * *"');
  });

  it("☠️ never uses the owner's database credential", () => {
    // THE most important assertion in this file. `SUPABASE_DB_URL` is the
    // `postgres` role: it can write and it bypasses RLS. The digest feeds
    // repository-authored SQL to production on a schedule - the first scheduled
    // job whose executed text a merged pull request can change - so it runs as a
    // dedicated read-only role (#2380) under its own name.
    //
    // Someone reusing the familiar variable would hand a scheduled job write
    // access to production, and nothing else in the repository would notice.
    expect(codeLines).not.toContain("SUPABASE_DB_URL");
    expect(codeLines).toContain("ANALYTICS_DIGEST_DB_URL");
  });

  it("posts to the standing thread, one comment, with the issue pinned", () => {
    // A new issue each month was rejected: monthly issues accumulate into what
    // reads as a backlog, and a backlog implies duty.
    expect(codeLines).toContain("DIGEST_REPO: vasilyoshev/control-tower");
    expect(codeLines).toMatch(/DIGEST_ISSUE: "\d+"/);
    expect(codeLines).toContain("gh issue comment");
  });

  it("prints all three reports, in the order the masthead is read against", () => {
    // ☠️ Order is load-bearing, not cosmetic: the release list in the masthead
    // and the first-occurrences section printed by the ENGAGEMENT report have to
    // be read together - one says what changed, the other says something began -
    // which is why engagement is printed first.
    const order = ["engagement", "onboarding", "segment"];
    const positions = order.map((name) => codeLines.indexOf(`## $name`.replace("$name", name)));
    const loop = codeLines.match(/for name in ([a-z ]+); do/);
    expect(loop?.[1].trim()).toBe(order.join(" "));
    expect(positions.every((position) => position === -1)).toBe(true); // printed by the loop, not listed
  });

  it("☠️ lets each report fail without stopping the others", () => {
    // A run that aborted on the first failure would leave a gap
    // indistinguishable from a month nobody ran, and silently omitting a failed
    // section is worse still. The reports step deliberately does NOT `set -e`.
    // ⚠️ Bounded to THIS step. Slicing to the end of the file instead sweeps in
    // the posting step, which does use `set -euo pipefail` quite correctly - and
    // the assertion below would then fail for a reason that is not a defect.
    const reportsStep = codeLines.slice(
      codeLines.indexOf("Run the three reports"),
      codeLines.indexOf("Assemble and post the comment"),
    );
    expect(reportsStep.length).toBeGreaterThan(200);
    expect(reportsStep).toContain("set -uo pipefail");
    expect(reportsStep).not.toContain("set -euo pipefail");
    expect(reportsStep).toContain("REPORT FAILED");
  });

  it("always posts, even when a report threw", () => {
    // The comment carries the failure lines; that is the record. What fails the
    // JOB is a failure to deliver, because that is the half the thread cannot
    // witness for itself.
    const postStep = codeLines.slice(codeLines.indexOf("Assemble and post the comment"));
    const commentAt = postStep.indexOf("gh issue comment");
    const exitAt = postStep.indexOf("exit 1");
    expect(commentAt).toBeGreaterThan(-1);
    // The only `exit 1` after posting is the truncation case, and it comes AFTER
    // the comment has been posted - never instead of it.
    expect(exitAt).toBeGreaterThan(commentAt);
  });

  it("guards the comment size rather than trusting it to fit", () => {
    // Every table is bounded, so the full output is expected to fit. Measured at
    // roughly 26KB against GitHub's 65536 limit when this shipped. The cap is
    // here so that being wrong about that is LOUD: the comment still posts,
    // truncated and saying so, and the run then fails.
    expect(codeLines).toMatch(/COMMENT_LIMIT: "\d+"/);
    expect(codeLines).toContain("TRUNCATED");
  });

  it("records the asymmetry it cannot fix, and the decision not to alert", () => {
    // ⚠️ Both are decisions a later reader would otherwise "fix": the thread
    // records a REPORT failure but cannot record its own failure to post, and
    // nothing happens when a number moves sharply. Alerting is where a threshold
    // - and with it loss framing - would re-enter.
    expect(source).toContain("A FAILURE TO POST CANNOT POST");
    expect(source).toContain("WHEN A NUMBER MOVES SHARPLY: NOTHING HAPPENS");
  });

  it("assembles the masthead and nothing else", () => {
    // ☠️ Anything the workflow builds sits outside every guard the repository
    // has. The population block in particular stays per-report, printed three
    // times, deliberately - hoisting it here would return it to exactly the
    // strippable territory it was put into the SQL to escape.
    expect(source).toContain("ASSEMBLES THE MASTHEAD AND NOTHING ELSE");
    expect(codeLines).not.toContain("Population provenance");
  });
});
