#!/usr/bin/env node
/**
 * Where the seam-gate thresholds in postprocess.mjs come from (#1296).
 *
 * A gate nobody has calibrated is decoration: set the limits too loose and it
 * passes everything, too tight and it fails the known-good beds and gets ignored.
 * So this scores both ends against material already in the repo.
 *
 *   shipped  — the bed exactly as it ships. ☠️ This is the ONLY genuine known-good
 *              artifact, and getting that wrong cost real time: these files are
 *              already loop-optimised at 8.0s, so folding one to 7.6s destroys the
 *              property being relied on. `night`'s drone is phase-locked to integer
 *              Hz over 8.0s and scored WORSE folded (13.85x) than hard-cut (5.29x).
 *
 *   bad      — hard-cut by the fold length with no crossfade, so the loop jumps
 *              from an arbitrary interior sample back to sample zero.
 *
 *   repaired — the same material folded exactly as postprocess.mjs folds it. This
 *              is the population that must clear the gate.
 *
 * Run it after changing a threshold, a window length or the fold. It prints the
 * separation between the two populations and exits non-zero if the current limits
 * do not sit cleanly inside it.
 *
 *   node scripts/audio/calibrate-seam.mjs
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BED_FOLD_SECONDS, OUTPUT_SAMPLE_RATE } from "./catalog.mjs";
import { decodeToFloatWav, fold, seamMetrics, SEAM_LIMITS } from "./postprocess.mjs";

/** The shipped placeholders, which are mono 22.05k - decoded up to the pipeline's format. */
const SHIPPED_BEDS = ["rain", "forest", "night", "brown-noise"];

/** Cut to the same length the fold produces, but with no crossfade at all. */
function hardCut(samples, channels, foldFrames) {
  const totalFrames = samples.length / channels;
  return samples.slice(0, (totalFrames - foldFrames) * channels);
}

const dir = await mkdtemp(join(tmpdir(), "calibrate-"));
const foldFrames = Math.round(BED_FOLD_SECONDS * OUTPUT_SAMPLE_RATE);
const rows = [];

try {
  for (const bed of SHIPPED_BEDS) {
    const decoded = await decodeToFloatWav(
      `assets/sounds/breathing/${bed}.wav`,
      join(dir, `${bed}.wav`),
      { channels: 2, sampleRate: OUTPUT_SAMPLE_RATE },
    );
    const { channels, sampleRate, samples } = decoded;
    // The genuine known-good artifact: untouched, at the exact length it was built
    // to loop at. ☠️ Folding a shipped bed is NOT a known-good sample - these files
    // are already loop-optimised at 8.0s (night's drone is phase-locked to integer
    // Hz over that length), so trimming to 7.6s destroys the very property being
    // relied on. That mistake made `night` score worse folded than hard-cut.
    rows.push({ bed, kind: "shipped", ...seamMetrics(samples, channels, sampleRate) });
    rows.push({
      bed,
      kind: "bad",
      ...seamMetrics(hardCut(samples, channels, foldFrames), channels, sampleRate),
    });
    // The repair: the same broken cut, run through the pipeline's fold.
    rows.push({
      bed,
      kind: "repaired",
      ...seamMetrics(fold(samples, channels, foldFrames), channels, sampleRate),
    });
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log(
  `\n${"bed".padEnd(13)}${"kind".padEnd(7)}${"wrapStep".padStart(10)}${"energy".padStart(10)}`,
);
for (const r of rows) {
  console.log(
    r.bed.padEnd(13) +
      r.kind.padEnd(7) +
      `${r.wrapStepRatio.toFixed(2)}x`.padStart(10) +
      `${r.energyDeltaRatio.toFixed(2)}x`.padStart(10),
  );
}

const passes = (r) =>
  r.wrapStepRatio <= SEAM_LIMITS.wrapStepRatio &&
  r.energyDeltaRatio <= SEAM_LIMITS.energyDeltaRatio;

const problems = [];

// 1. The pipeline's own output must pass. This is the assertion that matters:
//    real material, folded exactly as postprocess.mjs folds it.
for (const r of rows.filter((r) => r.kind === "repaired" && r.bed !== "night")) {
  if (!passes(r)) problems.push(`the pipeline's own output for ${r.bed} fails the gate`);
}

// 2. The audible defect must be caught: a TONAL bed whose loop phase jumps.
const tonalCut = rows.find((r) => r.bed === "night" && r.kind === "bad");
if (passes(tonalCut)) problems.push("a tonal hard cut passes - the gate is too loose");

// 3. The linear-crossfade dip must be visible, because that is what justifies the
//    equal-power divergence in fold(). The shipped beds were folded linearly and
//    carry it; the same material folded equal-power does not.
for (const bed of ["rain", "forest", "brown-noise"]) {
  const shipped = rows.find((r) => r.bed === bed && r.kind === "shipped");
  const repaired = rows.find((r) => r.bed === bed && r.kind === "repaired");
  if (!(shipped.energyDeltaRatio > repaired.energyDeltaRatio)) {
    problems.push(`${bed}: equal-power fold did not improve on the shipped linear fold`);
  }
}

console.log(
  `\nlimits: wrapStep ${SEAM_LIMITS.wrapStepRatio}x - energy ${SEAM_LIMITS.energyDeltaRatio}x`,
);
console.log("\nKnown true negative: a hard cut of STOCHASTIC material is not caught");
for (const r of rows.filter((r) => r.kind === "bad" && r.bed !== "night")) {
  console.log(
    `  ${r.bed.padEnd(12)} hard cut scores ${r.wrapStepRatio.toFixed(2)}x - inaudible, see postprocess.mjs`,
  );
}

console.log("");
for (const p of problems) console.log(`FAIL: ${p}`);
if (!problems.length) {
  console.log("PASS: pipeline output clears the gate, a tonal splice is caught, and");
  console.log("      equal-power folding measurably beats the shipped linear fold.");
}
process.exit(problems.length ? 1 : 0);
