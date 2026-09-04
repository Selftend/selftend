import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The combined DPIA and minors' data-protection assessment (#1768, spec #227
 * §4).
 *
 * The document is prose, and prose is what a tidy-up quietly hollows out. Two
 * failure modes are worth a machine's attention, and neither is "the wording
 * changed":
 *
 * 1. **A table row loses its answer.** The duties table is the compliance
 *    argument - one row per Connecticut/Colorado duty, each naming the
 *    universal default that satisfies it. A row whose mitigation cell empties
 *    out still renders as a table and reads as coverage.
 * 2. **The document contradicts the one it supersedes.** The 2026-05-12 DPIA
 *    screening in the ops runbook concluded no DPIA was required. It is kept on
 *    purpose, so the only thing standing between a reader and the wrong answer
 *    is the pointer at the top of it. A doc split across five files
 *    re-contradicts itself the moment one of them is edited alone.
 *
 * ☠️ **KEYED ON IDENTIFIERS AND STRUCTURE, NEVER ON SENTENCES** - the same rule
 * `test/child-safety-cadence.test.ts` states for the runbook, and for the same
 * reason: a guard that fails on an honest rewrite gets deleted rather than
 * fixed. So what is asserted here is that the Art. 35(7) elements each have a
 * section, that the statutes are named, that every table row carries an answer,
 * that every residual risk above Low is picked up again in the conclusion
 * (read out of the table rather than spelled out twice), and that every
 * cross-document link still resolves - file and anchor.
 */

const ROOT = resolve(__dirname, "..");
const DOC = "docs/dpia-minors-assessment.md";

const assessment = readFileSync(resolve(ROOT, DOC), "utf8");
const gdprPosture = readFileSync(resolve(ROOT, "docs/gdpr-compliance.md"), "utf8");
const runbook = readFileSync(resolve(ROOT, "docs/operations-runbook.md"), "utf8");

/** The body of one section, up to the next heading at the same level or above. */
function section(markdown: string, headingPattern: RegExp): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^#{2,3} /.test(line) && headingPattern.test(line));

  if (start === -1) {
    return "";
  }

  const level = (lines[start].match(/^#+/) ?? ["##"])[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const heading = line.match(/^#+(?= )/);
    return heading !== null && heading[0].length <= level;
  });

  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * The data rows of the first markdown table under a heading, each as its cells.
 * Header and separator rows are dropped; a row is only a row if it is inside
 * the first contiguous run of `|` lines, so a later table in the same section
 * cannot silently stand in for a missing one.
 */
function firstTableAfter(markdown: string, headingPattern: RegExp): string[][] {
  const body = section(markdown, headingPattern);
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trimStart().startsWith("|"));

  if (start === -1) {
    return [];
  }

  const block: string[] = [];
  for (const line of lines.slice(start)) {
    if (!line.trimStart().startsWith("|")) break;
    block.push(line);
  }

  return block
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)))
    .slice(1);
}

/** GitHub's heading-anchor slug, near enough for the headings this repo writes. */
function slug(heading: string): string {
  return heading
    .replace(/^#+\s*/, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

describe("the assessment covers both frameworks it was asked to combine", () => {
  it("names the GDPR articles the document answers to", () => {
    expect(assessment).toMatch(/Art\. 35/);
    expect(assessment).toMatch(/Art\. 9\(2\)\(a\)/);
    expect(assessment).toMatch(/Art\. 36/);
  });

  it("names the Connecticut and Colorado statutes by their own identifiers", () => {
    expect(assessment).toMatch(/42-529/);
    expect(assessment).toMatch(/SB 24-041/);
    expect(assessment).toMatch(/SB 1295/);
  });

  /**
   * Art. 35(7) lists what a DPIA must contain. Each element gets a section of
   * its own and is labelled with the sub-article, so a reviewer checking the
   * document against the article can do it by heading rather than by reading.
   */
  it.each(["35(7)(a)", "35(7)(b)", "35(7)(c)", "35(7)(d)"])(
    "gives Art. %s a section of its own",
    (element) => {
      const headings = assessment.split("\n").filter((line) => /^#{2,3} /.test(line));

      expect(headings.filter((heading) => heading.includes(element))).toHaveLength(1);
    },
  );
});

describe("the duties table", () => {
  const rows = firstTableAfter(assessment, /^### The duties/);

  /**
   * Not a round number for its own sake: the research behind #227 §4 lists
   * duty of care, the assessment itself, targeted advertising, sale,
   * profiling, engagement-extending design, notifications, necessity and
   * retention, precise geolocation, adult-to-minor contact, dark patterns, and
   * the minor's own consent. Ten is the floor at which dropping a duty is
   * visible.
   */
  it("keeps one row per duty", () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
  });

  it("answers every duty, with a source and somewhere to check it", () => {
    for (const row of rows) {
      expect(row).toHaveLength(4);

      for (const cell of row) {
        expect(cell).not.toBe("");
        expect(cell).not.toMatch(/^(TBD|TODO|N\/A|-)$/i);
      }
    }
  });
});

describe("the risk register", () => {
  const rows = firstTableAfter(assessment, /^## 3\. Risks/);
  const ids = rows.map((row) => row[0]);
  const residuals = new Map(rows.map((row) => [row[0], row[row.length - 1]]));

  it("carries the risks it was written to weigh", () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^R\d+$/);
    }
  });

  it("rates every risk, before and after the controls", () => {
    for (const row of rows) {
      expect(row).toHaveLength(6);
      expect(row[2]).toMatch(/^(Low|Medium|High)$/);
      expect(row[3]).toMatch(/^(Low|Medium|High)$/);
      expect(row[5]).toMatch(/^(Low|Medium|High)$/);
      expect(row[4]).not.toBe("");
    }
  });

  /**
   * The one assertion that is derived rather than restated. A risk left at
   * Medium or High after its controls is a risk the controller has decided to
   * accept, and an accepted risk that nobody argues for is the shape of an
   * oversight. Read the ratings out of the table, then require the conclusion
   * to pick each one up by id - so adding a residual Medium without saying why
   * fails here, and lowering a rating to silence the guard is a visible edit to
   * the rating itself.
   */
  it("argues every risk it does not reduce to Low", () => {
    const conclusion = section(assessment, /^## 7\. Residual risk/);
    const carried = ids.filter((id) => residuals.get(id) !== "Low");

    expect(carried.length).toBeGreaterThan(0);
    expect(conclusion).not.toBe("");

    for (const id of carried) {
      expect(conclusion).toMatch(new RegExp(`\\b${id}\\b`));
    }
  });
});

describe("the no-minor-flag record", () => {
  const body = section(assessment, /no-minor-flag/i);

  it("has a section of its own", () => {
    expect(body).not.toBe("");
  });

  /**
   * The decision is only checkable against the column that carries it. A
   * section that argues the posture without naming `age_floor_met` cannot be
   * verified against the schema by the next reader.
   */
  it("names the column the decision is visible in", () => {
    expect(body).toMatch(/age_floor_met/);
  });
});

describe("the documents it supersedes and is reached from", () => {
  it("is linked from the GDPR posture's Art. 35 section", () => {
    const body = section(gdprPosture, /Data Protection Impact Assessment/i);

    expect(body).toMatch(/dpia-minors-assessment\.md/);
  });

  /**
   * The screening is kept deliberately, so its own text still says a full DPIA
   * is not required. Without a pointer at the top of it, that is simply a wrong
   * answer sitting in the runbook.
   */
  it("is linked from the superseded screening, which says it is superseded", () => {
    const body = section(runbook, /DPIA Screening/i);

    expect(body).toMatch(/dpia-minors-assessment\.md/);
    expect(body).toMatch(/supersed/i);
  });

  it("is what the annual legal-landscape check updates", () => {
    const body = section(runbook, /annual legal-landscape check/i);

    expect(body).toMatch(/dpia-minors-assessment\.md/);
  });

  it("is on the docs map", () => {
    expect(readFileSync(resolve(ROOT, "docs/README.md"), "utf8")).toMatch(
      /dpia-minors-assessment\.md/,
    );
  });
});

describe("every cross-document link still resolves", () => {
  const targets = [...assessment.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^(https?:|mailto:|#)/.test(target));

  it("has links to check", () => {
    expect(targets.length).toBeGreaterThanOrEqual(10);
  });

  it.each([...new Set(targets)])("resolves %s", (target) => {
    const [file, anchor] = target.split("#");
    const path = resolve(ROOT, "docs", file);

    expect(existsSync(path)).toBe(true);

    if (anchor) {
      const headings = readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => /^#+ /.test(line))
        .map(slug);

      expect(headings).toContain(anchor);
    }
  });
});
