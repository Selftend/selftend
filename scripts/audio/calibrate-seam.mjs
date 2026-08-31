#!/usr/bin/env node
/**
 * Where the seam gate's threshold comes from, and why there is only one left
 * (#1296, re-derived by #1571).
 *
 * A gate nobody has calibrated is decoration: set the limit too loose and it
 * passes everything, too tight and it fails the known-good beds and gets ignored.
 * The second is what happened — `energyDeltaRatio` blocked five of the nine
 * shipped beds on evidence that said the audio was fine.
 *
 * ☠️ THIS SCRIPT WAS DEAD FROM #1569 UNTIL #1571. It read
 * `assets/sounds/breathing/*.wav`, which that release replaced with `.m4a`, so it
 * threw on its first ffmpeg call. The one tool that could answer "is the limit
 * right?" could not be run at the moment the limit started failing beds.
 *
 * It no longer reads a shipped asset at all. The population is SYNTHESISED from
 * `synth-noise.mjs`, whose beds are built by circular filtering — the last sample
 * flows into the first exactly as it flows into any other, asserted in
 * `test/audio-synth-noise.test.ts`. That is the only material in the project whose
 * seam is known to be zero, it costs no credits, and no asset swap can break it.
 *
 * Two tables:
 *
 *   1. WRAP STEP — the click detector, and the only surviving gate. Clean beds
 *      against a tonal splice, which is the audible defect it exists for.
 *
 *   2. HEAD/TAIL — why that ratio is reported and not gated. Five denominators
 *      against clean beds and beds carrying a deliberate level defect. Every one
 *      of them puts a clean clip above a defective one, so no threshold works.
 *
 * Run it after changing a threshold, a window length, the fold or `seamMetrics`.
 * Exits non-zero if the wrap-step limit stops separating its two populations, or
 * if the head/tail ratio unexpectedly starts separating its own (which would mean
 * this script's conclusion is stale and the gate could be restored).
 *
 *   node scripts/audio/calibrate-seam.mjs
 */

import { OUTPUT_SAMPLE_RATE } from "./catalog.mjs";
import { seamMetrics, SEAM_LIMITS } from "./postprocess.mjs";
import { mulberry32, synthesiseBed } from "./synth-noise.mjs";

const CHANNELS = 2;
const SECONDS = 30;
const WINDOW_MS = 250;

/** `synthesiseBed` returns interleaved s16le; `seamMetrics` wants floats. */
function toFloat(buf) {
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}

function scaled(samples, gainAt) {
  const out = Float32Array.from(samples);
  const frames = samples.length / CHANNELS;
  for (let i = 0; i < frames; i += 1) {
    const g = gainAt(i, frames);
    for (let c = 0; c < CHANNELS; c += 1) out[i * CHANNELS + c] *= g;
  }
  return out;
}

/** The defect the head/tail half was built for: level walks steadily down. */
const withDrift = (samples, db) =>
  scaled(samples, (i, frames) => 10 ** ((-db * (i / frames)) / 20));

/** Ambience that legitimately changes level in blocks. Clean — no seam added. */
function withWander(samples, db, blockSeconds) {
  const rnd = mulberry32(7);
  const block = Math.round(blockSeconds * OUTPUT_SAMPLE_RATE);
  const gains = [];
  for (let b = 0; b * block < samples.length / CHANNELS; b += 1) {
    gains.push(10 ** (((rnd() * 2 - 1) * db) / 20));
  }
  return scaled(samples, (i) => gains[Math.floor(i / block)]);
}

/** A real, audible defect: the last tenth of the clip sits `db` lower. */
const withTailStep = (samples, db) =>
  scaled(samples, (i, frames) => (i >= Math.floor(frames * 0.9) ? 10 ** (-db / 20) : 1));

/** A low drone ending a quarter-cycle past zero — see the test for why 50 Hz. */
function tonalSplice(hz = 50) {
  const quarter = Math.round(OUTPUT_SAMPLE_RATE / hz / 4);
  const frames = SECONDS * OUTPUT_SAMPLE_RATE + quarter + 1;
  const out = new Float32Array(frames * CHANNELS);
  for (let i = 0; i < frames; i += 1) {
    const v = 0.5 * Math.sin((2 * Math.PI * hz * i) / OUTPUT_SAMPLE_RATE);
    for (let c = 0; c < CHANNELS; c += 1) out[i * CHANNELS + c] = v;
  }
  return out;
}

/**
 * The five denominators #1571 measured, so the conclusion stays executable.
 * The numerator is always |rmsDb(tail window) - rmsDb(head window)|.
 */
function denominators(samples) {
  const frames = samples.length / CHANNELS;
  const win = Math.min(Math.floor((WINDOW_MS / 1000) * OUTPUT_SAMPLE_RATE), Math.floor(frames / 4));
  const rmsDb = (start) => {
    let sum = 0;
    for (let i = 0; i < win; i += 1) {
      for (let c = 0; c < CHANNELS; c += 1) {
        const v = samples[(start + i) * CHANNELS + c];
        sum += v * v;
      }
    }
    return 20 * Math.log10(Math.sqrt(sum / (win * CHANNELS)) || Number.EPSILON);
  };

  const headTail = Math.abs(rmsDb(frames - win) - rmsDb(0));
  const positions = Math.min(200, Math.floor(frames / win));
  const levels = [];
  for (let i = 0; i < positions; i += 1) {
    levels.push(rmsDb(Math.floor((i * (frames - win)) / Math.max(1, positions - 1))));
  }

  const sorted = (a) => [...a].sort((x, y) => x - y);
  const median = (a) => sorted(a)[Math.floor(a.length / 2)];
  const quantile = (a, q) => {
    const s = sorted(a);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
  };

  const centre = Math.max(median(levels.map((v) => Math.abs(v - median(levels)))), 0.5);

  const adjacent = [];
  for (let i = 0; i + 1 < levels.length; i += 1) {
    adjacent.push(Math.abs(levels[i + 1] - levels[i]));
  }

  const rnd = mulberry32(1571);
  const anyPair = [];
  for (let i = 0; i < 2000; i += 1) {
    const a = Math.floor(rnd() * levels.length);
    const b = Math.floor(rnd() * levels.length);
    if (a !== b) anyPair.push(Math.abs(levels[a] - levels[b]));
  }

  return {
    headTail,
    centre: headTail / centre,
    adjacent: headTail / Math.max(median(adjacent), 0.02),
    anyPair: headTail / Math.max(median(anyPair), 0.02),
    p95: headTail / Math.max(quantile(adjacent, 0.95), 0.02),
    p90: headTail / Math.max(quantile(adjacent, 0.9), 0.02),
  };
}

const white = toFloat(
  synthesiseBed({ kind: "white-noise", seconds: SECONDS, sampleRate: OUTPUT_SAMPLE_RATE }),
);
const brown = toFloat(
  synthesiseBed({ kind: "brown-noise", seconds: SECONDS, sampleRate: OUTPUT_SAMPLE_RATE }),
);

const problems = [];

// ---------------------------------------------------------------------------
// 1. The wrap step — the surviving gate.
// ---------------------------------------------------------------------------

const wrapCases = [
  ["white noise", "clean", white],
  ["brown noise", "clean", brown],
  ["white +6dB drift", "clean", withDrift(white, 6)],
  ["50 Hz tonal splice", "defect", tonalSplice()],
];

console.log(`\n1. WRAP STEP — the click detector (limit ${SEAM_LIMITS.wrapStepRatio}x)\n`);
console.log(`${"material".padEnd(22)}${"kind".padEnd(9)}${"wrapStep".padStart(10)}`);
const wrapScores = { clean: [], defect: [] };
for (const [name, kind, samples] of wrapCases) {
  const { wrapStepRatio } = seamMetrics(samples, CHANNELS, OUTPUT_SAMPLE_RATE);
  wrapScores[kind].push(wrapStepRatio);
  console.log(name.padEnd(22) + kind.padEnd(9) + `${wrapStepRatio.toFixed(2)}x`.padStart(10));
}

const worstClean = Math.max(...wrapScores.clean);
const bestDefect = Math.min(...wrapScores.defect);
if (worstClean > SEAM_LIMITS.wrapStepRatio) {
  problems.push(`a clean bed fails the wrap-step gate (${worstClean.toFixed(2)}x)`);
}
if (bestDefect <= SEAM_LIMITS.wrapStepRatio) {
  problems.push(`a tonal splice passes the wrap-step gate (${bestDefect.toFixed(2)}x)`);
}
console.log(
  `\n   clean <= ${worstClean.toFixed(2)}x, splice >= ${bestDefect.toFixed(2)}x, ` +
    `limit ${SEAM_LIMITS.wrapStepRatio}x`,
);

// ---------------------------------------------------------------------------
// 2. The head/tail ratio — reported, not gated, and this is why.
// ---------------------------------------------------------------------------

const energyCases = [
  ["white flat", "clean", white],
  ["brown flat", "clean", brown],
  ["wander 6dB @0.25s", "clean", withWander(white, 6, 0.25)],
  ["wander 6dB @1s", "clean", withWander(white, 6, 1)],
  ["wander 3dB @1s", "clean", withWander(white, 3, 1)],
  ["white +3dB drift", "defect", withDrift(white, 3)],
  ["white +6dB drift", "defect", withDrift(white, 6)],
  ["brown +6dB drift", "defect", withDrift(brown, 6)],
  ["wander6@.25 tail -6dB", "defect", withTailStep(withWander(white, 6, 0.25), 6)],
  ["wander6@1s tail -6dB", "defect", withTailStep(withWander(white, 6, 1), 6)],
];

const NAMES = ["centre", "adjacent", "anyPair", "p95", "p90"];

console.log("\n\n2. HEAD/TAIL — five denominators, none of which separates\n");
console.log(
  "material".padEnd(23) +
    "kind".padEnd(8) +
    "h/t dB".padStart(8) +
    NAMES.map((n) => n.padStart(11)).join(""),
);
const byDenominator = Object.fromEntries(NAMES.map((n) => [n, { clean: [], defect: [] }]));
for (const [name, kind, samples] of energyCases) {
  const d = denominators(samples);
  for (const n of NAMES) byDenominator[n][kind].push(d[n]);
  console.log(
    name.padEnd(23) +
      kind.padEnd(8) +
      d.headTail.toFixed(2).padStart(8) +
      NAMES.map((n) => `${d[n].toFixed(2)}x`.padStart(11)).join(""),
  );
}

console.log(
  "\n   worst CLEAN vs best DEFECT — a separating statistic would have clean < defect:\n",
);
let anySeparates = false;
for (const n of NAMES) {
  const clean = Math.max(...byDenominator[n].clean);
  const defect = Math.min(...byDenominator[n].defect);
  const separates = clean < defect;
  if (separates) anySeparates = true;
  console.log(
    `   ${n.padEnd(10)} clean <= ${clean.toFixed(2).padStart(8)}x   ` +
      `defect >= ${defect.toFixed(2).padStart(8)}x   ${separates ? "SEPARATES" : "overlaps"}`,
  );
}

// ☠️ Deliberately asserted in the NEGATIVE. If someone finds a statistic that
// separates, this script must fail so the finding is revisited rather than
// quietly outliving its evidence — the gate could then be restored.
if (anySeparates) {
  problems.push(
    "a head/tail denominator now SEPARATES clean from defective — #1571's conclusion " +
      "may be stale, and `energyDeltaRatio` could go back into SEAM_LIMITS",
  );
}

console.log("");
for (const p of problems) console.log(`FAIL: ${p}`);
if (!problems.length) {
  console.log("PASS: the wrap step separates a tonal splice from clean beds, and no head/tail");
  console.log("      denominator separates its own two populations — so it stays a report.");
}
process.exit(problems.length ? 1 : 0);
