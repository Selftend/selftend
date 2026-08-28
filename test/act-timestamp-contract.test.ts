import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ACT = join(__dirname, "..", "src", "features", "act");

/**
 * #1539's plumbing half, which a rendering test cannot reach.
 *
 * ☠️ `formatTimestamp`, `useLocaleFormats().formatDateTime` and
 * `formatAtOffset(value, null)` all carry `{ dateStyle: "medium", timeStyle: "short" }`
 * and render the **byte-identical string**. So a detail screen that regressed to either
 * old spelling would keep every assertion in `act-timestamp-shape.test.tsx` green. Only
 * a source-level guard can hold that line.
 *
 * `formatAtOffset` is the sanctioned occurrence-timestamp renderer — the captured-frame
 * lint gate names it in its own error text. `formatTimestamp` survives in the repo as
 * the app's `updatedAt` formatter (its two CBT callers are lint exemptions); ACT's
 * defusion row was its one misuse for an occurrence timestamp.
 *
 * ⚠️ This is NOT #1533's gate. That one is the mirror of the captured-frame gate and
 * bans ACT's viewer-local DAY helpers; this one is about which timestamp FORMATTER a
 * surface renders. Adding `src/features/act/` to `CAPTURED_FRAME_FILES` would be
 * actively wrong — see #1533.
 */

/** The six archive rows: flat, newest-first, keyset-paged (#1515, #1517). */
const COMPACT_ROWS = [
  "act-choice-point-list-screen.tsx",
  "act-connection-list-screen.tsx",
  "act-expansion-list-screen.tsx",
  "act-observing-self-list-screen.tsx",
  // Shared with ACT home's recent block, deliberately (#1388) — so home moves with it.
  "defusion-log-row.tsx",
  // The urge-surf archive lives on the tool screen itself; it has no separate list route.
  "act-urge-surf-screen.tsx",
] as const;

/** The six detail screens, matching the house split across four other modules. */
const ABSOLUTE_DETAILS = [
  "act-choice-point-detail-screen.tsx",
  "act-connection-detail-screen.tsx",
  "act-defusion-detail-screen.tsx",
  "act-expansion-detail-screen.tsx",
  "act-observing-self-detail-screen.tsx",
  "act-urge-surf-detail-screen.tsx",
] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

describe("ACT timestamp contract", () => {
  it.each(COMPACT_ROWS)("%s renders its row timestamp compact", (file) => {
    const source = readFileSync(join(ACT, file), "utf8");

    expect(source).toContain("formatCompactAtOffset(");
    // ACT captures no occurrence offset, so the viewer frame is the only frame (#1513).
    // `[,)]` because a row may also pass an explicit `lang` third argument — the urge
    // surf row does, being the one row that renders no translated string and so holds
    // no `useTranslation` subscription of its own.
    expect(source).toMatch(/formatCompactAtOffset\([^)]*,\s*null[,)]/);
  });

  it.each(ABSOLUTE_DETAILS)("%s renders its timestamp absolute", (file) => {
    const source = readFileSync(join(ACT, file), "utf8");

    expect(source).toMatch(/formatAtOffset\([^)]*,\s*null[,)]/);
    expect(source).not.toContain("formatCompactAtOffset(");
  });

  /**
   * The module-wide half: neither old spelling may return to ACT by any route.
   * `useLocaleFormats` itself is NOT banned — `act-values-screen.tsx` reads `formatDate`
   * from it for bull's-eye's deliberate bare date, which #1517 settled stays.
   */
  it("renders no ACT occurrence timestamp through either retired spelling", () => {
    const offenders = sourceFiles(ACT)
      .filter((file) => /\bformatTimestamp\b|\bformatDateTime\b/.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(ACT.length + 1));

    expect(offenders).toEqual([]);
  });
});
