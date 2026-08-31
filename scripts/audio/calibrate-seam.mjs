#!/usr/bin/env node
/**
 * Where the seam-gate thresholds in postprocess.mjs come from (#1296, re-derived
 * by #1571).
 *
 * A gate nobody has calibrated is decoration: set the limits too loose and it
 * passes everything, too tight and it fails the known-good beds and gets ignored.
 * The second is what happened — `energyDeltaRatio` blocked five of the nine
 * shipped beds on evidence that said the audio was fine.
 *
 * ☠️ THIS SCRIPT USED TO READ `assets/sounds/breathing/*.wav` AND HAS BEEN DEAD
 * SINCE #1569 REPLACED THEM WITH `.m4a`. It threw on its first ffmpeg call. So the
 * one tool that could have answered "is the limit right?" could not be run at the
 * moment the limit started failing beds — which is most of why #1571 took the
 * shape of an argument rather than a measurement.
 *
 * It no longer reads a shipped asset at all. The population is SYNTHESISED:
 *
 *   clean    — `synth-noise.mjs`'s three beds, built by circular filtering, so the
 *              last sample flows into the first exactly as it flows into any
 *              other. `test/audio-synth-noise.test.ts` asserts that directly.
 *              ☠️ This is the only material in the project whose seam is known to
 *              be zero, which is what makes it the calibration reference. Nothing
 *              here can go stale, cost credits, or be deleted by an asset swap.
 *
 *   drift    — the same clip with its level walked steadily down across the whole
 *              30s. This is the defect the head/tail half exists to catch: every
 *              loop point becomes an audible jump back up.
 *
 *   hard cut — the clip truncated with no crossfade, so the loop jumps from an
 *              arbitrary interior sample to sample zero. ⚠️ On STOCHASTIC material
 *              this is a deliberate true negative, not a miss — see postprocess.mjs.
 *
 *   encoded  — the clean clip, AAC-encoded and decoded back. Present to keep
 *              #1571's finding executable rather than remembered: the gate must
 *              measure the master, and this prints what happens when it does not.
 *
 * Run it after changing a threshold, a window length, the fold, or `seamMetrics`.
 * Exits non-zero if the current limits do not sit cleanly between the populations.
 *
 *   node scripts/audio/calibrate-seam.mjs
 */

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { OUTPUT_SAMPLE_RATE } from "./catalog.mjs";
import { decodeToFloatWav, seamMetrics, SEAM_LIMITS } from "./postprocess.mjs";
import { synthesiseBed } from "./synth-noise.mjs";

const KINDS = ["white-noise", "pink-noise", "brown-noise"];
const CHANNELS = 2;
const SECONDS = 30;
/** Large enough to be plainly audible at a loop point, small enough to be a fair test. */
const DRIFT_DB = 3;

/** `synthesiseBed` returns interleaved s16le; `seamMetrics` wants floats. */
function toFloat(buf) {
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}

function withDrift(samples, db) {
  const out = Float32Array.from(samples);
  const frames = samples.length / CHANNELS;
  for (let i = 0; i < frames; i += 1) {
    const gain = 10 ** ((-db * (i / frames)) / 20);
    for (let c = 0; c < CHANNELS; c += 1) out[i * CHANNELS + c] *= gain;
  }
  return out;
}

function hardCut(samples, cutFrames) {
  const frames = samples.length / CHANNELS;
  return samples.slice(0, (frames - cutFrames) * CHANNELS);
}

/** Minimal float WAV, so the encode round-trip needs nothing but ffmpeg. */
function wavBuffer(samples, channels, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * 4, 28);
  buf.writeUInt16LE(channels * 4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) buf.writeFloatLE(samples[i], 44 + i * 4);
  return buf;
}

const dir = await mkdtemp(join(tmpdir(), "calibrate-"));
const rows = [];

try {
  for (const kind of KINDS) {
    const clean = toFloat(
      synthesiseBed({ kind, seconds: SECONDS, sampleRate: OUTPUT_SAMPLE_RATE }),
    );
    const score = (k, s) => rows.push({ kind, k, ...seamMetrics(s, CHANNELS, OUTPUT_SAMPLE_RATE) });

    score("clean", clean);
    score("drift", withDrift(clean, DRIFT_DB));
    score("cut", hardCut(clean, 3 * OUTPUT_SAMPLE_RATE));

    const wav = join(dir, `${kind}.wav`);
    await writeFile(wav, wavBuffer(clean, CHANNELS, OUTPUT_SAMPLE_RATE));
    const m4a = join(dir, `${kind}.m4a`);
    const encoded = spawnSync(
      "ffmpeg",
      ["-hide_banner", "-nostdin", "-y", "-i", wav, "-c:a", "aac", "-b:a", "96k", m4a],
      { windowsHide: true, stdio: "ignore" },
    );
    if (encoded.status !== 0) throw new Error(`could not encode ${kind} — is ffmpeg on PATH?`);
    const back = await decodeToFloatWav(m4a, join(dir, `${kind}-decoded.wav`), {
      channels: CHANNELS,
      sampleRate: OUTPUT_SAMPLE_RATE,
    });
    rows.push({
      kind,
      k: "encoded",
      ...seamMetrics(back.samples, back.channels, back.sampleRate),
    });
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}

console.log(
  `\n${"bed".padEnd(13)}${"kind".padEnd(9)}${"wrapStep".padStart(10)}${"h/t dB".padStart(9)}` +
    `${"own step".padStart(10)}${"energy".padStart(9)}`,
);
for (const r of rows) {
  console.log(
    r.kind.padEnd(13) +
      r.k.padEnd(9) +
      `${r.wrapStepRatio.toFixed(2)}x`.padStart(10) +
      r.headTailDb.toFixed(2).padStart(9) +
      r.naturalStepDb.toFixed(2).padStart(10) +
      `${r.energyDeltaRatio.toFixed(2)}x`.padStart(9),
  );
}

const of = (k) => rows.filter((r) => r.k === k);
const energies = (k) => of(k).map((r) => r.energyDeltaRatio);
const problems = [];

// 1. The reference population must pass. A bed that cannot have a seam must not
//    be told it has one — this is the assertion #1571 opened on.
for (const r of of("clean")) {
  if (r.energyDeltaRatio > SEAM_LIMITS.energyDeltaRatio) {
    problems.push(`${r.kind}: a clip with no seam by construction FAILS the gate`);
  }
  if (r.wrapStepRatio > SEAM_LIMITS.wrapStepRatio) {
    problems.push(`${r.kind}: a clip with no seam by construction fails the wrap check`);
  }
}

// 2. The audible defect must be caught, on every kind of material.
for (const r of of("drift")) {
  if (r.energyDeltaRatio <= SEAM_LIMITS.energyDeltaRatio) {
    problems.push(`${r.kind}: a ${DRIFT_DB} dB level drift PASSES - the gate is too loose`);
  }
}

// 3. The limit has to sit in a gap, not inside an overlap. Two populations that
//    interleave cannot be separated by any threshold, and a limit chosen from an
//    overlap is a coin toss dressed as a measurement.
const worstClean = Math.max(...energies("clean"));
const bestDrift = Math.min(...energies("drift"));
if (!(worstClean < bestDrift)) {
  problems.push(
    `the two populations overlap (worst clean ${worstClean.toFixed(2)}x, ` +
      `best drift ${bestDrift.toFixed(2)}x) - no threshold separates them`,
  );
}

console.log(
  `\nlimits: wrapStep ${SEAM_LIMITS.wrapStepRatio}x - energy ${SEAM_LIMITS.energyDeltaRatio}x` +
    `   (gap: clean <= ${worstClean.toFixed(2)}x, drift >= ${bestDrift.toFixed(2)}x)`,
);

console.log("\n☠️ Why the gate measures the MASTER and not the finished .m4a (#1571):");
for (const r of of("encoded")) {
  const clean = of("clean").find((c) => c.kind === r.kind);
  console.log(
    `  ${r.kind.padEnd(12)} ${clean.energyDeltaRatio.toFixed(2)}x on the master -> ` +
      `${r.energyDeltaRatio.toFixed(2)}x encoded, on identical audio`,
  );
}

console.log("\nKnown true negative: a hard cut of STOCHASTIC material is not caught");
for (const r of of("cut")) {
  console.log(
    `  ${r.kind.padEnd(12)} hard cut scores ${r.energyDeltaRatio.toFixed(2)}x - inaudible, see postprocess.mjs`,
  );
}

console.log("");
for (const p of problems) console.log(`FAIL: ${p}`);
if (!problems.length) {
  console.log("PASS: a provably seamless bed clears the gate, a level drift is caught,");
  console.log("      and the limit sits in the gap between the two populations.");
}
process.exit(problems.length ? 1 : 0);
