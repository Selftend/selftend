import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPORT = join(__dirname, "..", "scripts", "analytics-engagement.sql");

/**
 * ☠️ **The word must not reach the reader.** (#2553, ruled on #2535)
 *
 * [#2530](https://github.com/Selftend/selftend/issues/2530) refused to STORE a
 * `stalled` status, because a threshold freezes one analyst's judgement into a
 * person's row as an inference about a mental-health behaviour. Section 7b
 * prints durations in fixed buckets so the reader draws that conclusion
 * themselves - and a block headed `stalled: 10` would commit the very error
 * #2530 refused, one layer out, in a column heading instead of a column.
 *
 * ⚠️ This guards the OUTPUT, not the file. The reasoning above and in the SQL
 * comments has to be able to say the word in order to explain why the report
 * does not, so comments are excluded and only what psql prints is checked:
 * `\echo` legends, and every string literal a select can emit.
 */

function reportLines(): string[] {
  return readFileSync(REPORT, "utf8").split("\n");
}

/** Only the lines whose text a reader of the report can actually see. */
function printedLines(): string[] {
  return reportLines().filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) return false; // a SQL comment prints nothing
    return true;
  });
}

describe("section 7b states durations and never a verdict", () => {
  const FORBIDDEN = /\bstall(ed|ing|s)?\b/i;

  it("☠️ never prints the word 'stalled' anywhere in the report", () => {
    const offenders = printedLines()
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => FORBIDDEN.test(line))
      .map(({ line, index }) => `${index + 1}: ${line.trim()}`);
    expect(offenders).toEqual([]);
  });

  it("keeps the reasoning that explains the refusal, which must say the word", () => {
    // ⚠️ The inverse assertion, and it is not a formality: a later reader who
    // "fixed" the guard above by deleting the explanation would leave a rule
    // nobody can account for, and an unexplained rule is the kind that gets
    // reverted. The comments must go on saying why.
    const comments = reportLines().filter((line) => line.trim().startsWith("--"));
    expect(comments.some((line) => FORBIDDEN.test(line))).toBe(true);
  });

  it("labels every band by its duration and nothing else", () => {
    // ☠️ An EXACT match, not a denylist of judgement words. A denylist over the
    // whole report cannot work and the attempt is instructive: the legend has
    // to be able to SAY "it does not say how long is too long" in order to
    // promise it, so a scan for that phrase flags the disclaimer that makes the
    // promise. Pinning the labels forbids every verdict by construction - there
    // is no room in the list for one - and needs no vocabulary to be kept up to
    // date.
    const source = readFileSync(REPORT, "utf8");
    const view = source.slice(
      source.indexOf("create temp view quiet_buckets"),
      source.indexOf("create temp view quiet_buckets") + 400,
    );
    const labels = [...view.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(labels).toEqual(["0-7 days", "8-30 days", "31-90 days", "90+ days"]);
  });

  it("names its printed column after the measurement, not a state", () => {
    // `since_last_phase_move` says what was measured. A column called
    // `status`, `health` or anything with a verdict in it would be the same
    // error as a `stalled` bucket, in the heading instead of the cell.
    expect(readFileSync(REPORT, "utf8")).toContain("as since_last_phase_move");
  });
});

describe("the module gate date annotates rather than suppresses", () => {
  const source = () => readFileSync(REPORT, "utf8");

  it("ships empty, so the annotation does not print", () => {
    expect(source()).toContain("\\set programme_gate_date ''");
  });

  it("derives its on/off flag where it is read, so the variable stays overridable", () => {
    // ☠️ The bug this pins. Deriving the flag beside the `\set` in the
    // definitions preamble freezes it at definition time, and a test or a
    // one-off run that overrides the date afterwards would set a variable
    // nothing reads again. The file's own comment on `age_gate_cutoff` says
    // these variables exist to be overridden after the definitions block.
    const lines = reportLines();
    const setAt = lines.findIndex((line) => line.startsWith("\\set programme_gate_date"));
    const gsetAt = lines.findIndex((line) => line.includes("programme_gate_annotated \\gset"));
    const sectionAt = lines.findIndex((line) => line.startsWith("\\echo '=== 7)"));
    expect(setAt).toBeGreaterThan(-1);
    expect(gsetAt).toBeGreaterThan(-1);
    expect(sectionAt).toBeGreaterThan(-1);
    expect(gsetAt).toBeGreaterThan(sectionAt);
  });

  it("guards the annotation on that flag rather than filtering any row", () => {
    const text = source();
    expect(text).toContain("\\if :programme_gate_annotated");
    expect(text).toContain("\\endif");
    // ☠️ It annotates, it does not suppress: the gate date must never appear in
    // a where clause, a filter, or a having clause. A report that hid rows past
    // a date would be deciding what the reader may see.
    const bucketQuery = text.slice(text.indexOf("with open_runs as ("));
    expect(bucketQuery).not.toContain("programme_gate_date");
  });
});
