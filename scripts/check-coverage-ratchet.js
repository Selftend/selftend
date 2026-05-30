#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const METRICS = ["lines", "statements", "functions", "branches"];
const DEFAULT_EPSILON = 0.5;

// Pure: a metric regresses when current.pct < baseline.pct - epsilon.
// Returns { ok, regressions: [{ metric, baseline, current, delta }] }.
function compareCoverage(baseline, current, epsilon = DEFAULT_EPSILON) {
  const regressions = [];
  for (const metric of METRICS) {
    const base =
      baseline[metric] && typeof baseline[metric].pct === "number" ? baseline[metric].pct : 0;
    const cur =
      current[metric] && typeof current[metric].pct === "number" ? current[metric].pct : 0;
    // Strict `<`: a drop exactly equal to epsilon is still tolerated.
    if (cur < base - epsilon) {
      regressions.push({
        metric,
        baseline: base,
        current: cur,
        delta: Number((cur - base).toFixed(2)),
      });
    }
  }
  return { ok: regressions.length === 0, regressions };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Reduce an Istanbul json-summary ({ total: {...}, "<file>": {...} }) to just
// the four total pcts. Used on the summary input; baseline is read raw.
function extractTotals(summary) {
  const total = summary.total || {};
  const out = {};
  for (const metric of METRICS) {
    out[metric] = {
      pct: total[metric] && typeof total[metric].pct === "number" ? total[metric].pct : 0,
    };
  }
  return out;
}

function formatLine(current, baseline) {
  return METRICS.map((m) => {
    const cur = current[m] && typeof current[m].pct === "number" ? current[m].pct : 0;
    if (!baseline) return `${m} ${cur}%`;
    const floor = baseline[m] && typeof baseline[m].pct === "number" ? baseline[m].pct : 0;
    return `${m} ${cur}% (floor ${floor}%)`;
  }).join(", ");
}

function main(argv) {
  const update = argv.includes("--update");
  const root = process.cwd();
  const summaryPath = path.join(root, "coverage", "coverage-summary.json");
  const baselinePath = path.join(root, "coverage", "baseline.json");

  if (!fs.existsSync(summaryPath)) {
    console.error(
      `Coverage summary not found at ${summaryPath}. Run \`npm run test:coverage\` first.`,
    );
    process.exit(2);
  }

  const current = extractTotals(readJson(summaryPath));

  if (update || !fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
    console.log(
      `Coverage baseline ${update ? "updated" : "created"}: ${formatLine(current, null)}`,
    );
    return;
  }

  const baseline = readJson(baselinePath); // already in { metric: { pct } } shape
  const missing = METRICS.filter((m) => !baseline[m] || typeof baseline[m].pct !== "number");
  if (missing.length > 0) {
    console.error(
      `coverage/baseline.json is missing or has a non-numeric pct for: ${missing.join(", ")}.\n` +
        "Regenerate it with `npm run coverage:ratchet:update`.",
    );
    process.exit(2);
  }
  const { ok, regressions } = compareCoverage(baseline, current);

  console.log(`Coverage: ${formatLine(current, baseline)}`);
  if (!ok) {
    console.error("Coverage ratchet FAILED — these metrics dropped below the baseline floor:");
    for (const r of regressions) {
      console.error(`  ${r.metric}: ${r.current}% < ${r.baseline}% (${r.delta}%)`);
    }
    console.error(
      "If this drop is intentional, run `npm run coverage:ratchet:update` and commit coverage/baseline.json.",
    );
    process.exit(1);
  }
  console.log("Coverage ratchet passed.");
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { compareCoverage, extractTotals, METRICS, DEFAULT_EPSILON };
