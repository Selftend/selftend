# Test Coverage — Phase 1: Coverage Tooling & Ratchet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Jest coverage measurement for the app's logic surface and a "ratchet" check that fails CI only when coverage drops below a committed baseline.

**Architecture:** Enable Istanbul coverage in `jest.config.js` scoped to `src/**/*.ts` (logic; screens/`.tsx` are covered by e2e, not ratcheted). A small Node script (`scripts/check-coverage-ratchet.js`) compares the fresh `coverage/coverage-summary.json` against a committed `coverage/baseline.json` and exits non-zero on a regression beyond a small epsilon. `npm run verify` and CI run coverage + the ratchet so the floor can only rise.

**Tech Stack:** Jest (`jest-expo` preset), Istanbul coverage reporters (`json-summary`, `text-summary`, `lcov`), Node CLI script, GitHub Actions.

**Source spec:** `docs/superpowers/specs/2026-05-30-test-coverage-and-strategy-design.md` (§5, §10).

---

## Git policy (read first)

This repository's owner performs **all** staging and commits (see `AGENTS.md` → "Git safety rule"). The `git` commands in the "Commit" steps below mark logical checkpoints and show exactly what to stage — **the executor must not stage or commit autonomously**. At each commit step, prepare the change and let the user run the command (or confirm they want it run). Never add a `Co-Authored-By` trailer.

---

## File structure

| File                                     | Responsibility                                                                              | Action             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------ |
| `jest.config.js`                         | Adds `collectCoverageFrom`, coverage reporters, coverage dir                                | Modify             |
| `package.json`                           | Adds `test:coverage`, `coverage:ratchet`, `coverage:ratchet:update` scripts; wires `verify` | Modify             |
| `scripts/check-coverage-ratchet.js`      | Pure `compareCoverage()` + CLI that reads summary/baseline and gates                        | Create             |
| `scripts/check-coverage-ratchet.test.js` | Unit tests for `compareCoverage()`                                                          | Create             |
| `coverage/baseline.json`                 | Committed per-metric coverage floor                                                         | Create (generated) |
| `.gitignore`                             | Ignore `coverage/` artifacts **except** `coverage/baseline.json`                            | Modify             |
| `.github/workflows/ci.yml`               | `verify` job emits a coverage step-summary                                                  | Modify             |
| `README.md`                              | Document the coverage + ratchet commands                                                    | Modify             |

---

## Task 1: Enable coverage collection in Jest

**Files:**

- Modify: `jest.config.js`
- Modify: `package.json` (scripts)

**Context:** The current `jest.config.js` is:

```js
const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/integration/", "/test/e2e/"],
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace("native-base))", "native-base|@rn-primitives))"),
  ),
};
```

We scope coverage to `src/**/*.ts`. Rationale: our unit-testable logic lives in `.ts` (repositories, schemas, stores, hooks, utils, lib, logic helpers, queries). `.tsx` screens/components are intentionally **excluded** — their behavior is covered by e2e and the existing component tests still run; we just don't ratchet them (matches the spec's "behavior via e2e + logic units" decision). Constant-data and i18n-barrel modules are excluded as pure data.

- [ ] **Step 1: Add coverage config to `jest.config.js`**

Replace the `module.exports = { ... }` object with this exact content (adds three coverage keys, keeps everything else):

```js
const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/test/setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/integration/", "/test/e2e/"],
  // jest-expo's default leaves @rn-primitives untransformed; our UI primitives
  // (Text, Label) depend on it, so widen the allowlist to transform it too.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.replace("native-base))", "native-base|@rn-primitives))"),
  ),
  // Coverage is scoped to the .ts logic surface. .tsx screens/components are
  // covered by e2e (not ratcheted); pure data/barrel modules are excluded.
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/types.ts",
    "!src/**/*.d.ts",
    "!src/i18n/**",
    "!src/lib/design-tokens.ts",
    "!src/features/help/help-images.ts",
    "!src/features/gratitude/breaks.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["json-summary", "text-summary", "lcov"],
};
```

- [ ] **Step 2: Add coverage scripts to `package.json`**

In the `"scripts"` block, add these three entries after the existing `"test:e2e"` line:

```json
    "test:coverage": "jest --coverage --runInBand --forceExit",
    "coverage:ratchet": "node scripts/check-coverage-ratchet.js",
    "coverage:ratchet:update": "node scripts/check-coverage-ratchet.js --update",
```

- [ ] **Step 3: Run coverage to verify the summary is produced**

Run: `npm run test:coverage`
Expected: the unit suite passes and a coverage table prints; the file `coverage/coverage-summary.json` now exists.

Verify the file exists and has a `total` key:

Run: `node -e "console.log(Object.keys(require('./coverage/coverage-summary.json').total))"`
Expected output includes: `lines`, `statements`, `functions`, `branches`.

- [ ] **Step 4: Commit** _(user runs — see Git policy)_

```bash
git add jest.config.js package.json
git commit -m "test: collect Jest coverage from the src logic surface"
```

---

## Task 2: Build the ratchet script (TDD)

**Files:**

- Create: `scripts/check-coverage-ratchet.js`
- Test: `scripts/check-coverage-ratchet.test.js`

**Context:** The script's core is a **pure** `compareCoverage(baseline, current, epsilon)` function so it can be unit-tested without touching the filesystem. The CLI wrapper reads `coverage/coverage-summary.json` + `coverage/baseline.json` and gates. Both `baseline` and `current` use the shape `{ lines: { pct }, statements: { pct }, functions: { pct }, branches: { pct } }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-coverage-ratchet.test.js`:

```js
const { compareCoverage } = require("./check-coverage-ratchet");

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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest scripts/check-coverage-ratchet.test.js -v`
Expected: FAIL — `Cannot find module './check-coverage-ratchet'`.

- [ ] **Step 3: Write the script**

Create `scripts/check-coverage-ratchet.js`:

```js
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
// the four total pcts. Idempotent-safe only on summary input; baseline is read raw.
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
    const cur = current[m].pct;
    const floor = baseline ? baseline[m].pct : null;
    return floor === null ? `${m} ${cur}%` : `${m} ${cur}% (floor ${floor}%)`;
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest scripts/check-coverage-ratchet.test.js -v`
Expected: PASS — all 4 `compareCoverage` cases green.

- [ ] **Step 5: Commit** _(user runs — see Git policy)_

```bash
git add scripts/check-coverage-ratchet.js scripts/check-coverage-ratchet.test.js
git commit -m "test: add coverage ratchet comparison script"
```

---

## Task 3: Seed and commit the baseline

**Files:**

- Create: `coverage/baseline.json` (generated)
- Modify: `.gitignore`

**Context:** `coverage/` artifacts are throwaway except `baseline.json`, which must be committed so CI has a floor to compare against.

- [ ] **Step 1: Inspect `.gitignore` for a coverage entry**

Run: `grep -n "coverage" .gitignore || echo "no coverage entry"`
Expected: either a line like `coverage` / `/coverage` exists, or `no coverage entry`.

- [ ] **Step 2: Ignore coverage artifacts but keep the baseline**

Add these two lines at the end of `.gitignore` (there is currently no `coverage` entry). Note the pattern is `/coverage/*` (ignore the directory's **contents**), **not** `/coverage/` — Git cannot re-include a file whose parent directory is itself excluded, so the trailing-slash form would defeat the `!` negation:

```gitignore
/coverage/*
!/coverage/baseline.json
```

- [ ] **Step 3: Generate the baseline from a real run**

Run: `npm run test:coverage && npm run coverage:ratchet:update`
Expected: ends with `Coverage baseline created: lines NN%, statements NN%, functions NN%, branches NN%`.

Confirm the file:

Run: `cat coverage/baseline.json`
Expected: JSON with `lines`/`statements`/`functions`/`branches`, each `{ "pct": <number> }`.

- [ ] **Step 4: Verify the ratchet passes against the fresh baseline**

Run: `npm run coverage:ratchet`
Expected: `Coverage: ...` line then `Coverage ratchet passed.` (exit 0).

- [ ] **Step 5: Verify the ratchet FAILS on a simulated drop**

Temporarily raise a floor by 5% and confirm the gate trips:

```bash
node -e "const f='coverage/baseline.json';const b=require('./'+f);b.lines.pct=Math.min(100,b.lines.pct+5);require('fs').writeFileSync(f,JSON.stringify(b,null,2)+'\n')"
npm run coverage:ratchet; echo "exit=$?"
```

Expected: `Coverage ratchet FAILED ... lines: ...` and `exit=1`.

Restore the real baseline:

Run: `npm run coverage:ratchet:update`
Expected: `Coverage baseline updated: ...` (exit 0).

- [ ] **Step 6: Commit** _(user runs — see Git policy)_

```bash
git add .gitignore coverage/baseline.json
git commit -m "test: seed committed coverage baseline floor"
```

---

## Task 4: Wire coverage + ratchet into `verify` and CI

**Files:**

- Modify: `package.json` (the `verify` script)
- Modify: `.github/workflows/ci.yml`

**Context:** The current `verify` script is:

```
"verify": "npm run lint && npm run format:check && npm run typecheck && npm test -- --runInBand",
```

CI's `verify` job runs `npm run verify`. Routing coverage + ratchet through `verify` keeps local and CI behavior identical. The ratchet script auto-seeds a missing baseline (exit 0), so first-time local runs won't spuriously fail; CI relies on the committed baseline from Task 3.

- [ ] **Step 1: Update the `verify` script**

Replace the `verify` script value with:

```json
    "verify": "npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run coverage:ratchet",
```

- [ ] **Step 2: Run `verify` end-to-end**

Run: `npm run verify`
Expected: lint, format check, typecheck, the coverage run, then `Coverage ratchet passed.` — overall exit 0.

- [ ] **Step 3: Add a coverage step-summary to the CI `verify` job**

In `.github/workflows/ci.yml`, inside the `verify` job's `steps:`, add this step immediately after the existing `- name: Verify` step:

```yaml
- name: Coverage summary
  if: always()
  run: |
    if [ -f coverage/coverage-summary.json ]; then
      node -e "const s=require('./coverage/coverage-summary.json').total;const m=['lines','statements','functions','branches'];let o='| Metric | % | Covered/Total |\n|---|---|---|\n';for(const k of m){const t=s[k];o+='| '+k+' | '+t.pct+'% | '+t.covered+'/'+t.total+' |\n';}console.log(o);" >> "$GITHUB_STEP_SUMMARY"
    fi
```

- [ ] **Step 4: Validate the CI YAML parses**

`js-yaml` is already in `node_modules` (transitive dep). Run:

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('YAML OK')"
```

Expected: `YAML OK` (a parse error here means the added step's indentation is off — YAML uses 6-space indentation for job step keys in this file).

- [ ] **Step 5: Commit** _(user runs — see Git policy)_

```bash
git add package.json .github/workflows/ci.yml
git commit -m "ci: run coverage ratchet in verify and publish a coverage summary"
```

---

## Task 5: Document the coverage workflow

**Files:**

- Modify: `README.md`

**Context:** `AGENTS.md` requires README updates when contributor-visible commands change. `test:coverage` and the ratchet are new contributor commands.

- [ ] **Step 1: Find where test commands are documented**

Run: `grep -n "test:integration\|test:e2e\|npm test\|## Test" README.md || echo "no test section"`
Expected: line numbers of the existing testing section, or `no test section`.

- [ ] **Step 2: Add a coverage subsection**

Add this block to the testing area of `README.md` (after the existing unit/integration/e2e command list; if there is no test section, add it under a new `## Testing` heading):

```markdown
### Coverage ratchet

`npm run test:coverage` writes a coverage report to `coverage/`. `npm run coverage:ratchet`
fails if any metric (lines/statements/functions/branches) falls below the committed floor in
`coverage/baseline.json`. `npm run verify` runs both. After intentionally raising coverage, lock
in the gain with `npm run coverage:ratchet:update` and commit the updated `coverage/baseline.json`.
```

- [ ] **Step 3: Verify formatting passes**

Run: `npm run format:check`
Expected: passes (no formatting violations in the edited files).

- [ ] **Step 4: Commit** _(user runs — see Git policy)_

```bash
git add README.md
git commit -m "docs: document the coverage ratchet workflow"
```

---

## Phase 1 acceptance

- `npm run verify` runs lint + format + typecheck + coverage + ratchet, all green.
- `coverage/baseline.json` is committed; `coverage/` artifacts are otherwise gitignored.
- A simulated coverage drop fails `npm run coverage:ratchet` (verified in Task 3 Step 5).
- CI's `verify` job publishes a coverage table to the GitHub step summary.

---

## Roadmap: subsequent phases (separate plans, authored just-in-time)

Each later phase becomes its own plan so its test code is written against freshly-read source (no placeholders), and each lands as a reviewable increment that raises the ratchet floor. When Phase 1 is merged, return to the `superpowers:writing-plans` skill for the next plan.

- **Phase 2 — Unit gaps** → `docs/superpowers/plans/<date>-test-coverage-phase-2-units.md`
  High-value logic (`cbt/use-cbt-insights`, `act/program-definition`, `mood/relative-time`, `mood/use-emotion-display`, `auth/use-auth-throttle`, `lib/use-wizard-draft`), the logic-bearing stores (`create-draft-store`, `create-wizard-draft-store`, `cookie-consent-store`, `emotions-store`), the extracted edge-function modules (`supabase/functions/_shared/web-reminders.ts` + `feedback.ts`) and their jest units, and the 8 query hooks worth testing (act, breathing, exposure, goals, grounding, habits, home, procrastination). Re-record the baseline at the end. (Spec §6, §8, Appendix C.)

- **Phase 3 — Integration breadth (privacy-first)** → `docs/superpowers/plans/<date>-test-coverage-phase-3-integration.md`
  RLS isolation sweep (35 uncovered tables: into the 14 new feature tests, extend act/meditation/habits for siblings, centralize orphans `web_push_subscriptions`/`noticing_logs`/`recovery_plans`/`challenge_plans`/`widget_preferences` + anon sweep); edge-function HTTP contract via `supabase functions serve`; remaining DB functions (`invoke_send_web_reminders`, `schedule_send_web_reminders_cron`, `set_current_timestamp_updated_at`); 14 feature DB-contract tests mirroring `sleep-repository.integration.test.ts`. Includes promoting private cleanup helpers to `test/integration/helpers.ts`. (Spec §7, Appendices A–B.)

- **Phase 4 — E2e flows** → `docs/superpowers/plans/<date>-test-coverage-phase-4-e2e.md`
  Shared helper additions (ACT/CBT cleanup helpers, `resetWidgetPreferencesForUser`, `fetchRecoveryLink`); High-tier journeys first (edit/delete for mood/journal/sleep/gratitude/habit/thought-record, ACT defusion, CBT belief & goal, password reset → update, GDPR export, account deletion, widget add/remove/reorder), then Medium, then Low. (Spec §9, Appendix D.)
