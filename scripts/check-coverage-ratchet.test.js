const { compareCoverage, extractTotals } = require("./check-coverage-ratchet");

describe("compareCoverage", () => {
  const baseline = {
    lines: { pct: 80 },
    statements: { pct: 80 },
    functions: { pct: 75 },
    branches: { pct: 70 },
  };

  it("passes when current meets or exceeds the baseline", () => {
    const current = {
      lines: { pct: 80 },
      statements: { pct: 82 },
      functions: { pct: 75 },
      branches: { pct: 71 },
    };
    expect(compareCoverage(baseline, current)).toEqual({ ok: true, regressions: [] });
  });

  it("passes when a metric dips within the epsilon tolerance", () => {
    const current = {
      lines: { pct: 79.6 },
      statements: { pct: 80 },
      functions: { pct: 75 },
      branches: { pct: 70 },
    };
    expect(compareCoverage(baseline, current, 0.5).ok).toBe(true);
  });

  it("fails and reports the metric when it drops below the floor beyond epsilon", () => {
    const current = {
      lines: { pct: 78 },
      statements: { pct: 80 },
      functions: { pct: 75 },
      branches: { pct: 70 },
    };
    const result = compareCoverage(baseline, current, 0.5);
    expect(result.ok).toBe(false);
    expect(result.regressions).toEqual([{ metric: "lines", baseline: 80, current: 78, delta: -2 }]);
  });

  it("treats a missing current metric as 0%", () => {
    const current = {
      lines: { pct: 80 },
      statements: { pct: 80 },
      functions: { pct: 75 },
    };
    const result = compareCoverage(baseline, current, 0.5);
    expect(result.ok).toBe(false);
    expect(result.regressions.map((r) => r.metric)).toContain("branches");
  });

  it("reports every regressing metric when multiple drop", () => {
    const current = {
      lines: { pct: 70 },
      statements: { pct: 70 },
      functions: { pct: 75 },
      branches: { pct: 70 },
    };
    const { ok, regressions } = compareCoverage(baseline, current, 0.5);
    expect(ok).toBe(false);
    expect(regressions.map((r) => r.metric)).toEqual(["lines", "statements"]);
  });
});

describe("extractTotals", () => {
  it("reduces an Istanbul summary to the four total pcts", () => {
    const summary = {
      total: {
        lines: { pct: 90 },
        statements: { pct: 88 },
        functions: { pct: 85 },
        branches: { pct: 80 },
        branchesTrue: { pct: 99 },
      },
      "src/foo.ts": { lines: { pct: 12 } },
    };
    expect(extractTotals(summary)).toEqual({
      lines: { pct: 90 },
      statements: { pct: 88 },
      functions: { pct: 85 },
      branches: { pct: 80 },
    });
  });

  it("defaults missing totals to 0%", () => {
    expect(extractTotals({})).toEqual({
      lines: { pct: 0 },
      statements: { pct: 0 },
      functions: { pct: 0 },
      branches: { pct: 0 },
    });
  });
});
