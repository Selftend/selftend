import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Section 6 of the engagement report counts the cohort the age gate actually
 * asks (#2241, after #2227).
 *
 * ☠️ The gate and the report are two restatements of one rule, in two
 * languages, and only the gate has a runtime. `ProtectedLayout` scopes who is
 * asked by account age against `AGE_GATE_INTRODUCED_AT` - the migration instant,
 * deliberately not the release date - and asks everyone at or after it whatever
 * their consent column says. The report used to key its window on the release
 * date and require `policy_version_accepted is null` as well, which excluded
 * exactly the two cohorts #2227 was written for: accounts created between the
 * migration and the release, and accounts that consented on 0.17.0 before ever
 * seeing the gate. The integration suite proves the SQL against fixtures, but
 * it cannot see the client's constant; this is the pin that holds the two
 * instants together.
 */
const ROOT = join(__dirname, "..");

const sql = readFileSync(join(ROOT, "scripts/analytics-engagement.sql"), "utf8");
const layout = readFileSync(join(ROOT, "src/components/app/protected-layout.tsx"), "utf8");
const doc = readFileSync(join(ROOT, "docs/analytics.md"), "utf8");

/** Section 6 alone, comments stripped, so a commented-out condition cannot pass as live. */
const SECTION_6 = (() => {
  const start = sql.indexOf("=== 6)");
  const rest = sql.slice(start);
  const next = rest.indexOf("\\echo '===", 1);
  return (next === -1 ? rest : rest.slice(0, next))
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
})();

describe("the engagement report's age-gate cutoff (#2241)", () => {
  const reportCutoff = /\\set age_gate_cutoff '([^']+)'/.exec(sql)?.[1];
  const clientCutoff = /AGE_GATE_INTRODUCED_AT = Date\.parse\("([^"]+)"\)/.exec(layout)?.[1];

  it("is the gate's own instant, AGE_GATE_INTRODUCED_AT, not a release date", () => {
    expect(reportCutoff).toBeDefined();
    expect(clientCutoff).toBeDefined();
    // Compared as instants, so `Z` versus `.000Z` cannot split them; and both
    // must be real dates, so a placeholder like `infinity` fails loudly.
    expect(Number.isFinite(Date.parse(reportCutoff!))).toBe(true);
    expect(Date.parse(reportCutoff!)).toBe(Date.parse(clientCutoff!));
    // The row says which constant the window is keyed on.
    expect(sql).toContain("\\set age_gate_cutoff_source 'AGE_GATE_INTRODUCED_AT'");
  });

  it("asks everyone at or after the instant - the gate exempts strictly-before", () => {
    expect(SECTION_6).toContain("a.created_at >= :'age_gate_cutoff'::timestamptz");
  });

  it("does not require the consent column to be null - the 0.17.0 cohort has consented", () => {
    // The #2227 cohort is asked WITH a policy version on record. A live
    // condition on the column excludes them; the comments may explain it.
    expect(SECTION_6).not.toContain("policy_version_accepted");
    expect(SECTION_6).toContain("p.age_floor_met is null");
  });

  it("is described by docs/analytics.md as keyed on the gate's constant", () => {
    expect(doc).toContain("AGE_GATE_INTRODUCED_AT");
    expect(doc).toContain(reportCutoff!);
  });
});
