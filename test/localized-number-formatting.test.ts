import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripCommentsAndStrings } from "@/test/source-scan";

// The call-site gate for #962.
//
// `Number.prototype.toFixed` renders with a hardcoded `.` separator, so every
// user-facing `toFixed(1)` was a Bulgarian bug: a 7-day mood average printed
// `3.0` where the locale wants `3,0`. #962 routed all seven live sites through
// `formatOneDecimal` (src/lib/locale-format.ts), which asks `Intl.NumberFormat`
// for the active language's convention.
//
// This suite exists because the fix is about to be re-tempted. #975 rebuilds
// the same numbers onto the new `ToolRow`, and the widgets holding two of the
// seven original sites are retired in that slice — so the row build will be
// writing fresh one-decimal renderers with the old ones deleted out from under
// it, which is exactly the shape that reintroduced this class of bug before.
//
// The rule is deliberately mechanical: `.toFixed(` may not appear in shipped
// source. It is not a claim that every use is wrong — it is a claim that each
// one has to be argued for here, on a key that changes when the line changes,
// rather than merged unread.
//
// Test files are excluded by `sourceFiles`. Their `toFixed` calls format colour
// deltas into failure messages (habit-palette, exercise-colors) and are neither
// user-facing nor localized.

const ROOT = join(__dirname, "..");

/**
 * Surviving occurrences, keyed on the source line so that editing the line
 * forces the judgement to be re-read rather than silently inherited.
 */
const ALLOWED: Record<string, { line: string; why: string }[]> = {
  "src/lib/theme/contrast.ts": [
    {
      line: "return `${check} on ${where}: ${ratio.toFixed(2)} < ${floor}`;",
      why: "Builds a contrast-gate failure message read by developers in CI output. Never rendered to a user, and a locale-aware separator in a test diagnostic would be actively worse.",
    },
  ],
};

describe("one-decimal numbers are formatted for the active locale (#962)", () => {
  const files = sourceFiles(ROOT, { dirs: ["app", "src"] });

  it("walks a plausible number of source files", () => {
    // A broken walk would pass every assertion below by finding nothing at all.
    expect(files.length).toBeGreaterThan(300);
  });

  it("has no unreviewed toFixed call in shipped source", () => {
    const findings: string[] = [];

    for (const file of files) {
      const source = readFileSync(join(ROOT, file), "utf8");
      // Strings blanked as well as comments: this gate looks for *code*, and a
      // `.toFixed(` merely quoted in a message is not a call site.
      const code = stripCommentsAndStrings(source);
      const allowed = ALLOWED[file] ?? [];

      code.split("\n").forEach((codeLine, index) => {
        if (!codeLine.includes(".toFixed(")) return;
        const raw = source.split("\n")[index]?.trim() ?? "";
        if (allowed.some((entry) => entry.line === raw)) return;
        findings.push(
          `${file}:${index + 1} — ${raw}\n    Use formatOneDecimal(value, lang) from src/lib/locale-format, ` +
            `or add the line to ALLOWED in this file with the reason it may stay.`,
        );
      });
    }

    expect(findings).toEqual([]);
  });

  it("keeps every ALLOWED entry anchored to a line that still exists", () => {
    // An allowance that outlives its call site is a hole in the gate: it stops
    // describing anything, and nothing fails when it stops being true.
    const stale: string[] = [];

    for (const [file, entries] of Object.entries(ALLOWED)) {
      const lines = readFileSync(join(ROOT, file), "utf8")
        .split("\n")
        .map((line) => line.trim());
      for (const entry of entries) {
        if (!lines.includes(entry.line)) stale.push(`${file} — ${entry.line}`);
      }
    }

    expect(stale).toEqual([]);
  });
});
