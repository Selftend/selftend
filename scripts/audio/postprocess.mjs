#!/usr/bin/env node
/**
 * The audio post-processor and the automated seam gate (#1296).
 *
 * Turns a raw ElevenLabs master into the finished clip the app ships, in the
 * order #1138 fixed:
 *
 *   decode -> resample to 44.1 kHz -> downmix -> seamless() fold (only when asked)
 *          -> loudness-normalise -> true-peak limit -> encode AAC
 *
 * Like `catalog.mjs`, this script decides nothing. Every number it applies comes
 * from `outputSpecFor()`, which is the executable form of #1138 and #1139.
 *
 * ☠️ The fold must happen on PCM, before encoding (#1138). That is why the chain
 * decodes to float WAV rather than filtering the compressed file.
 *
 * ☠️ ffmpeg is a deliberate, `scripts/`-only dependency. #1138 retired the
 * post-processor's "pure stdlib" property on purpose: Python's `wave` decodes no
 * MP3 and encodes no AAC. The encoder is pinned to ffmpeg's native `aac` because
 * that is what every measurement on #1138 was taken with.
 */

import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir, stat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";

import {
  SFX_MASTER_PCM,
  outputSpecFor,
  OUTPUT_SAMPLE_RATE,
  TRUE_PEAK_CEILING_DBTP,
  AAC_ENCODER,
  BED_FOLD_SECONDS,
  BED_LIMITER_PEAK,
} from "./catalog.mjs";
import {
  SHIP_BUDGET_BYTES,
  SHIP_FILE_COUNT,
  predictShipping,
  referenceClipFor,
  shipFileName,
  shippingUnits,
  surveyShipping,
} from "./ship-plan.mjs";

/**
 * How far the finished file may sit from its target before the run fails.
 *
 * loudnorm in linear mode applies one constant gain, so it lands within a few
 * tenths of a LU; 1.0 LU is generous enough to absorb the AAC round-trip without
 * being loose enough to hide a mistake. The true-peak ceiling gets only a hair of
 * slack because it is the load-bearing one — #1138 measured both shipped bells at
 * 0.0 dBTP, which is exactly the condition that makes AAC decode clip.
 */
const LUFS_TOLERANCE = 1.0;
const DBTP_EPSILON = 0.1;

/**
 * How much silence may sit in front of the FINISHED file, in milliseconds.
 *
 * ☠️ #1134 calls zero leading silence a HARD rule and #1210 makes it acceptance
 * check number one — and until now nothing in this pipeline measured it.
 * `edgeSilence` existed behind `postprocess edges <file>`, a separate command
 * aimed at a file by hand, so the command that produces what the app ships could
 * report PASS on a clip that starts late.
 *
 * ⚠️ It is in practice a VOICE-clip rule. #1138 measured the shipped set and only
 * the four `guide_*` files carry any lead at all — 36.2 / 34.1 / 15.0 / 3.2 ms —
 * while every bed, texture and bell measures 0.0. It matters because every trigger
 * in the app is *already* up to 250 ms late (`TICK_MS` polling, #1134), so silence
 * in the file adds to a lateness the user can already hear.
 *
 * The number is bracketed by two measurements, not chosen by feel. Above: #1138
 * round-tripped AAC at **+8 samples, 0.18 ms**, so a tighter limit would fail every
 * file this pipeline produces. Below: the smallest real lead in the shipped set is
 * `guide_hold`'s **3.2 ms**, so a looser one waves the actual defect through. It
 * also has to catch the 25.06 ms start_time #1138 measured on MP3, which is #1210's
 * "confirm ffmpeg strips the encoder delay" case.
 *
 * ⚠️ The TAIL is measured and printed but never gated. A bell is a long smooth
 * decay "fading continuously to silence" by #1139's own brief — gating its tail
 * would fail the two clips whose entire character is a tail, for having one.
 */
export const LEAD_SILENCE_LIMIT_MS = 1.0;

/**
 * Seam-gate thresholds, on the five beds only (#1137). Both are set from
 * measurement - `calibrate-seam.mjs` produces the table these came from.
 *
 * `wrapStepRatio` is click energy: the first-difference energy over a few ms
 * straddling the loop point, divided by the same statistic sampled across the
 * clip's interior. Every genuinely clean loop measured scores ~1 (0.92-1.54), and
 * a tonal splice scores 5.29, so the limit sits at 3.
 *
 * `energyDeltaRatio` is #1137's short-term energy delta, self-calibrated the same
 * way: the head/tail level step divided by how much this clip's level naturally
 * wanders. A raw dB threshold cannot work - `rain` is stochastic and moves several
 * dB between windows of seam-clean material, while `brown-noise` barely moves.
 *
 * ☠️ A hard cut of STOCHASTIC material is not caught, and that is a true negative
 * rather than a hole. Splicing two independent stretches of dense noise scores
 * 1.08-1.22 because the step's broadband energy is indistinguishable from the
 * material's own - there is nothing there to hear. #1137 reached the same
 * conclusion from the other direction: `brown-noise`'s 8s loop is *already*
 * undetectable, and the loop tell is event-driven, not seam-driven. What the gate
 * does catch is the case that is actually audible: a TONAL bed whose phase jumps.
 *
 * ☠️☠️ `energyDeltaRatio` IS NO LONGER A LIMIT (#1571). It lives in `SEAM_LISTEN`
 * — the number above which `run` suggests a loop listen, and nothing more. It
 * blocked five of the nine beds on audio that was fine, and the reason turned out
 * not to be a badly chosen threshold: measured against clean beds and beds
 * carrying a deliberate level defect, **five different denominators all put a
 * clean clip above a defective one** (table in `seamMetrics`). A bed whose level
 * legitimately wanders has head and tail levels that legitimately differ, and
 * self-calibration cannot tell that apart from a jump at the wrap.
 *
 * ⚠️ So the gate is now `wrapStepRatio` alone. That is a real narrowing and it is
 * deliberate: a check that cannot separate its two populations is not a weaker
 * gate, it is a coin toss, and #1137's answer to the case it was aimed at was
 * always the 10x loop listen. `calibrate-seam.mjs` reproduces both tables.
 */
export const SEAM_LIMITS = { wrapStepRatio: 3.0 };
/** Not a limit — the level above which `run` says "worth a listen". */
export const SEAM_LISTEN = { energyDeltaRatio: 2.0 };
const SEAM_WINDOW_MS = 250;

// ---------------------------------------------------------------------------
// process helpers
// ---------------------------------------------------------------------------

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) =>
      reject(
        new Error(
          `could not run "${cmd}" — is it on PATH? ffmpeg is required (#1138). ${err.message}`,
        ),
      ),
    );
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function ffmpeg(args) {
  const res = await run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args]);
  if (res.code !== 0) throw new Error(`ffmpeg failed:\n${res.stderr.slice(-2000)}`);
  return res;
}

/**
 * Fail before anything expensive happens if ffmpeg is not on PATH.
 *
 * ☠️ `render` now measures every take it generates (#1320), which makes ffmpeg a
 * hard dependency of a pass that spends unreproducible credits. Discovering it is
 * missing *after* the first generation would mean paying for takes nothing can
 * grade. Callers run this before their first API call, never after.
 */
export async function assertFfmpeg() {
  const res = await run("ffmpeg", ["-hide_banner", "-version"]);
  if (res.code !== 0) {
    throw new Error(`ffmpeg is on PATH but exited ${res.code}:\n${res.stderr.slice(-500)}`);
  }
}

// ---------------------------------------------------------------------------
// WAV read/write - float32 only, which is all this pipeline ever hands itself
// ---------------------------------------------------------------------------

/**
 * ffmpeg input arguments for one file.
 *
 * ☠️ `render` writes Sound Effects masters as RAW `.pcm` — no header, no
 * container — so `ffmpeg -i` fails outright with "Invalid data found when
 * processing input". Raw input needs its format declared before `-i`, and the
 * parameters have to come from the catalog because the bytes carry none.
 */
function inputArgs(file, pcm = SFX_MASTER_PCM) {
  if (!file.toLowerCase().endsWith(".pcm")) return ["-i", file];
  const { codec, sampleRate, channels } = pcm;
  return ["-f", codec, "-ar", String(sampleRate), "-ac", String(channels), "-i", file];
}

export function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, body + Math.min(size, buf.length - body));
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("WAV is missing a fmt or data chunk");
  if (fmt.bitsPerSample !== 32) {
    throw new Error(`expected 32-bit float WAV, got ${fmt.bitsPerSample}-bit`);
  }
  const samples = new Float32Array(
    data.byteOffset % 4 === 0
      ? data.buffer.slice(data.byteOffset, data.byteOffset + data.length - (data.length % 4))
      : Uint8Array.prototype.slice.call(data, 0, data.length - (data.length % 4)).buffer,
  );
  return { ...fmt, samples };
}

/** Exported so `calibrate-seam.mjs` writes its round-trip WAV with this header
 *  rather than a second copy of it. */
export function writeWavBuffer(samples, channels, sampleRate) {
  const bytes = samples.length * 4;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + bytes, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // IEEE float
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 4, 28);
  header.writeUInt16LE(channels * 4, 32);
  header.writeUInt16LE(32, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(bytes, 40);
  return Buffer.concat([header, Buffer.from(samples.buffer, samples.byteOffset, bytes)]);
}

/**
 * ⚠️ `inputPcm` declares how the RAW BYTES ARE READ; `channels`/`sampleRate`
 * declare what comes out. They are usually the same and the default keeps them
 * so — but #1347 has to read one headerless buffer *both* ways (as the stereo
 * #1159 established, and as the mono the byte count also admits), and a downmix
 * of the stereo reading is a different signal from the mono reading of the same
 * bytes. Only an input-side override can express that.
 */
export async function decodeToFloatWav(input, out, { channels, sampleRate, inputPcm }) {
  await ffmpeg([
    ...inputArgs(input, inputPcm ?? SFX_MASTER_PCM),
    "-ac",
    String(channels),
    "-ar",
    String(sampleRate),
    "-c:a",
    "pcm_f32le",
    "-f",
    "wav",
    out,
  ]);
  return parseWav(await readFile(out));
}

// ---------------------------------------------------------------------------
// the fold
// ---------------------------------------------------------------------------

/**
 * `seamless()` from generate-breathing-sounds.py:78 — with one deliberate change.
 *
 * ☠️ It TRIMS. The Python generator makes `n + cf` samples and keeps `n`; a
 * rendered bed has no spare tail because Sound Effects caps at 30s, so the last
 * `cf` seconds are folded into the head and the loop comes out `cf` shorter.
 * A 30s render becomes a 29.6s bed.
 *
 * ☠️ DIVERGENCE, on measurement: the crossfade is EQUAL-POWER (`sqrt`), where
 * `seamless()` is LINEAR. The two halves of a fold are decorrelated noise, so
 * linear weights sum to ~0.707x mid-fold — a level dip that recurs at every loop
 * point. Measured against untouched material in the same clip:
 *
 *   bed          linear    equal-power
 *   rain         -3.29 dB  -0.20 dB
 *   forest       -3.57 dB  -0.53 dB
 *   brown-noise  -7.92 dB  -4.87 dB
 *
 * A periodic level dip is precisely the recurring audible event #1137's
 * eventless-bed rule exists to remove — it is a loop tell, and the whole bed
 * strategy rests on not having one. Nobody ever *decided* linear: it is an
 * incidental property of a generator written for a different job. The endpoints
 * are unchanged (sqrt(0)=0, sqrt(1)=1), so this only lifts the middle. Recorded
 * on #1296; revert by swapping the two weights if it is ever overruled.
 */
export function fold(samples, channels, foldFrames) {
  const totalFrames = samples.length / channels;
  if (foldFrames <= 0 || foldFrames >= totalFrames) {
    throw new Error(`fold length ${foldFrames} does not fit in ${totalFrames} frames`);
  }
  const keep = totalFrames - foldFrames;
  const out = samples.slice(0, keep * channels);
  for (let i = 0; i < foldFrames; i++) {
    const w = i / foldFrames;
    const headGain = Math.sqrt(w);
    const tailGain = Math.sqrt(1 - w);
    for (let c = 0; c < channels; c++) {
      const head = i * channels + c;
      out[head] = out[head] * headGain + samples[(keep + i) * channels + c] * tailGain;
    }
  }
  return out;
}

/**
 * Whether this clip gets folded, and why — the decision, separated from the doing.
 *
 * ☠️ THE FOLD STOPPED BEING THE BED PATH ON #1347, AND DID NOT STOP EXISTING.
 * It used to run for any clip whose spec carried a `foldSeconds`, which was every
 * bed and only beds: always or never, decided by the catalog. Then `loop: true`
 * turned out to be accepted with lossless PCM and to genuinely loop — `brown-noise`
 * at 30s scored a 0.67x wrap step against its own paired non-looping control's
 * 14.34x, four times better than the folded path's best-ever 2.85x — so a natively
 * looping bed needs no fold at all, and folding one would cost 0.4s of an
 * unrepeatable master and a -0.20..-4.87 dB dip at every loop point for nothing.
 *
 * ⚠️ BUT THE TONAL CASE IS NOT CLEARED. All three `night` draws landed under
 * #1320's usable gate, and of the two carrying signal the join was fine while the
 * head/tail energy ratio FAILED — loop mode gives a clean join without
 * guaranteeing one level end to end. So the seam gate still runs on every bed
 * however it was rendered, and the fold survives as what a bed that fails it can
 * be put through: `postprocess run <in> --clip <bed> --fold`.
 *
 * Three states, and they have to stay coherent:
 *
 *   bed, rendered looping   -> no fold, unless asked (the seam-gate fallback)
 *   bed, rendered non-looping -> fold, because a raw 30s render does not loop
 *   anything else           -> never, and asking is an error rather than a no-op
 *
 * The middle row is not dead code: it is what this pipeline does if `CLASS_LOOP.beds`
 * is ever put back to false, and without it that flip would ship the raw 14.34x cut.
 */
export function foldPlan(spec, { fold = false } = {}) {
  if (spec.foldSeconds == null) {
    // ☠️ An ignored `--fold` would report a fold that never ran. It is worse than
    // useless on these classes — the fold trims 0.4s off the end, which on a 2s
    // temple block is a fifth of its decay — so an operator who typed it gets an
    // error naming the class, not silence.
    if (fold) {
      throw new Error(
        `${spec.klass} are never folded — only beds have a seam to gate, and the fold ` +
          `trims ${BED_FOLD_SECONDS}s off the end. Drop --fold.`,
      );
    }
    return { foldSeconds: null, note: "not a bed, no fold" };
  }
  if (fold) {
    return {
      foldSeconds: spec.foldSeconds,
      note: `${spec.foldSeconds}s fold (seam-gate fallback)`,
    };
  }
  if (spec.loop) {
    return { foldSeconds: null, note: "rendered loop: true, no fold (#1347)" };
  }
  return { foldSeconds: spec.foldSeconds, note: `${spec.foldSeconds}s fold (non-looping render)` };
}

// ---------------------------------------------------------------------------
// measurement
// ---------------------------------------------------------------------------

/** Integrated loudness and true peak, via one loudnorm analysis pass. */
export async function measure(file) {
  const res = await run("ffmpeg", [
    "-hide_banner",
    "-nostdin",
    ...inputArgs(file),
    "-af",
    `loudnorm=I=-20:TP=${TRUE_PEAK_CEILING_DBTP}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  const match = res.stderr.match(/\{[\s\S]*?\}/g);
  if (!match)
    throw new Error(`could not read loudnorm output for ${file}:\n${res.stderr.slice(-1500)}`);
  const parsed = JSON.parse(match[match.length - 1]);
  return {
    lufs: Number(parsed.input_i),
    dbtp: Number(parsed.input_tp),
    lra: Number(parsed.input_lra),
    thresh: Number(parsed.input_thresh),
  };
}

/**
 * The absolute floor below which a frame counts as silence.
 *
 * Absolute rather than relative to the clip's own peak, because a master is
 * normalised later (#1138) — "quiet" and "silent" have to be separated *before*
 * the gain that would move them together. -60 dBFS is two orders of magnitude
 * under the quietest lane the app ships (#1138's beds at -23 LUFS-I).
 */
export const SILENCE_FLOOR_DBFS = -60;

/**
 * How much silence sits at each end of a clip.
 *
 * ☠️ NOTHING IN THIS DIRECTORY MEASURED THIS BEFORE. #1134 made zero leading
 * silence a HARD rule — the app's triggers are already up to 250ms late — and
 * #1316 re-phrased it positively inside `SHARED_TAIL` rather than dropping it.
 * But `preflight` and the take gate grade LEVEL, and a clip with a 300ms lead
 * passes a level bar comfortably: the one rule with the word "hard" on it was the
 * one rule with no instrument. Added for #1347, where the open question is
 * whether a natively looping render pads its own head.
 */
export function edgeSilence(samples, channels, sampleRate, floorDbfs = SILENCE_FLOOR_DBFS) {
  const frames = samples.length / channels;
  const floor = Math.pow(10, floorDbfs / 20);
  const ms = (count) => (count / sampleRate) * 1000;

  let first = -1;
  let last = -1;
  let peak = 0;
  for (let f = 0; f < frames; f++) {
    let level = 0;
    for (let c = 0; c < channels; c++) {
      const magnitude = Math.abs(samples[f * channels + c]);
      if (magnitude > level) level = magnitude;
    }
    if (level > peak) peak = level;
    if (level >= floor) {
      if (first === -1) first = f;
      last = f;
    }
  }

  const peakDbfs = 20 * Math.log10(peak || Number.EPSILON);
  if (first === -1) {
    return { silent: true, leadMs: ms(frames), tailMs: ms(frames), peakDbfs, floorDbfs };
  }
  return {
    silent: false,
    leadMs: ms(first),
    tailMs: ms(frames - 1 - last),
    peakDbfs,
    floorDbfs,
  };
}

/**
 * #1137's automated wrap check.
 *
 * ☠️ Give it the PRE-ENCODE master. This docblock used to say the opposite —
 * "runs on the decoded finished file, so anything the encoder adds at the
 * boundaries is included" — and that was the bug (#1571): AAC's MDCT has no
 * wrap-around context at a file's two ends, so what the encoder "adds at the
 * boundaries" lands on exactly the two windows the head/tail half samples. On
 * synth white noise, whose seam is zero by construction, encoding moved the
 * verdict from 0.98x to 19.93x. `postprocess` now hands this the normalised WAV.
 */
export function seamMetrics(samples, channels, sampleRate, windowMs = SEAM_WINDOW_MS) {
  const frames = samples.length / channels;
  const win = Math.min(Math.floor((windowMs / 1000) * sampleRate), Math.floor(frames / 4));

  // ☠️ A single-sample wrap step is the wrong instrument, and measuring the shipped
  // beds is what showed it. Two independent failures:
  //
  //   - it is ONE random draw. `rain` hard-cut scored |x[0]-x[N-1]| = 2.4e-3, well
  //     under its own median step of 2.6e-2 - the two samples simply landed close,
  //     so a real discontinuity read as a perfect loop.
  //   - the step distribution is heavy-tailed, so no single-sample normaliser works.
  //     `night` has a median step of 1.8e-3 against a p99 of 6.0e-2, a factor of 34,
  //     so an ordinary high-frequency moment at the wrap scored 25x.
  //
  // A click is a short broadband burst, so it is measured as one: the energy of the
  // first difference over a few ms straddling the join in the LOOPED signal, judged
  // against the same statistic sampled all over the clip's interior.
  const clickWin = Math.max(8, Math.round(0.005 * sampleRate));
  const wrapAt = (i) => ((i % frames) + frames) % frames;
  const diffEnergyAt = (centre) => {
    let sum = 0;
    let n = 0;
    for (let k = -clickWin; k <= clickWin; k++) {
      const i = wrapAt(centre + k);
      const prev = wrapAt(centre + k - 1);
      for (let c = 0; c < channels; c++) {
        const d = samples[i * channels + c] - samples[prev * channels + c];
        sum += d * d;
        n++;
      }
    }
    return Math.sqrt(sum / n);
  };

  // Centre 0 straddles the join: it reaches back into the tail and forward into the
  // head, which is exactly the boundary a looping player crosses.
  const wrapStep = diffEnergyAt(0);
  const interior = [];
  const probes = 400;
  for (let i = 1; i < probes; i++) interior.push(diffEnergyAt(Math.floor((i * frames) / probes)));
  interior.sort((a, b) => a - b);
  const medianStep = interior[Math.floor(interior.length / 2)] || Number.EPSILON;

  const rmsDb = (startFrame) => {
    let sum = 0;
    for (let i = 0; i < win; i++) {
      for (let c = 0; c < channels; c++) {
        const v = samples[(startFrame + i) * channels + c];
        sum += v * v;
      }
    }
    return 20 * Math.log10(Math.sqrt(sum / (win * channels)) || Number.EPSILON);
  };

  // In the LOOPED signal the tail window is immediately followed by the head
  // window, so this is the level step a listener actually crosses at the wrap.
  const headTailDb = Math.abs(rmsDb(frames - win) - rmsDb(0));

  // ☠️☠️ THIS RATIO IS REPORTED, NOT GATED (#1571), because no normalisation of
  // it separates the two populations it would have to separate.
  //
  // A raw dB threshold cannot work — `rain` is stochastic and two windows of
  // seam-clean material differ by several dB from its own drops, while
  // `brown-noise` barely moves — so the step has to be divided by something. Five
  // denominators were measured against clean beds and beds carrying a deliberate
  // level defect, and EVERY ONE puts a clean clip above a defective one:
  //
  //   denominator                        worst CLEAN   best DEFECT
  //   deviation from the clip's centre       4.45x        1.88x
  //   median step between adjacent windows 275.62x        1.96x
  //   median step over random window pairs   3.39x        1.46x
  //   p95 step between adjacent windows      4.05x        0.59x
  //   p90 step between adjacent windows     89.35x        0.67x
  //
  // The reason is not a bad choice of divisor, it is the numerator: a bed whose
  // level legitimately wanders has head and tail levels that legitimately differ,
  // and no amount of self-calibration tells that apart from a level jump at the
  // wrap. Worse, the defect the check exists for becomes UNMEASURABLE on exactly
  // the material it was aimed at — a real 6 dB tail step on ambience that varies
  // 6 dB every 250 ms scores 0.59x, below every clean clip, because the material's
  // own steps are bigger than the defect's.
  //
  // So `postprocess` prints this and does not fail on it. `wrapStepRatio` — the
  // half that detects the audible click, and the half that measures cleanly — is
  // still a gate. Reproduce the table with `node scripts/audio/calibrate-seam.mjs`.
  //
  // The denominator below is deliberately left as it was: it is no worse than the
  // alternatives, and changing a number nothing gates on would only invalidate the
  // history in #1571 for no gain.
  const spread = [];
  const positions = Math.min(200, Math.floor(frames / win));
  for (let i = 0; i < positions; i++) {
    spread.push(rmsDb(Math.floor((i * (frames - win)) / Math.max(1, positions - 1))));
  }
  const spreadMedian = [...spread].sort((a, b) => a - b)[Math.floor(spread.length / 2)];
  const deviations = spread.map((v) => Math.abs(v - spreadMedian)).sort((a, b) => a - b);
  const naturalDb = Math.max(deviations[Math.floor(deviations.length / 2)] || 0, 0.5);

  return {
    wrapStepRatio: wrapStep / medianStep,
    headTailDb,
    naturalDb,
    energyDeltaRatio: headTailDb / naturalDb,
    wrapStepDbfs: 20 * Math.log10(wrapStep || Number.EPSILON),
  };
}

async function seamCheckFile(file) {
  const dir = await mkdtemp(join(tmpdir(), "seam-"));
  try {
    const wav = join(dir, "decoded.wav");
    await ffmpeg([...inputArgs(file), "-c:a", "pcm_f32le", "-f", "wav", wav]);
    const parsed = parseWav(await readFile(wav));
    return seamMetrics(parsed.samples, parsed.channels, parsed.sampleRate);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// the pipeline
// ---------------------------------------------------------------------------

/** Stage progress on stderr, so a long run shows where it is rather than sitting mute. */
const step = (msg) => process.stderr.write(`   · ${msg}\n`);

/**
 * The one gain that "normalise, then limit" actually means here.
 *
 * Scaling by G dB moves integrated loudness and true peak alike, so the ceiling
 * is arithmetic rather than a limiter and no peak-squashing ever touches the
 * audio. Whichever of the two bounds is lower wins; when it is the ceiling, the
 * caller says so rather than reporting a loudness miss that looks like a fault.
 *
 * ☠️ NON-FINITE IN, CLEAR ERROR OUT. A take with no signal makes loudnorm print
 * `-inf`, which `Number()` turns into NaN — and NaN propagates silently through
 * this arithmetic into `volume=NaNdB`, where ffmpeg dies with "Invalid value NaN
 * for volume" behind a wall of filter-graph errors naming neither the file nor
 * the cause. #1320 met the same non-finite return in `classifyTake` and
 * classified it deliberately; this is the other half of that trap. Found on
 * `wind_exhale-c01.pcm`, a dud of the failed Round B: -69.76 LUFS-I as stereo,
 * then under loudnorm's -70 LUFS absolute gate once downmixed to the mono a
 * texture ships as — so the failure appears only after the downmix, which is why
 * measuring the raw master by hand shows a finite number and suggests nothing is
 * wrong.
 */
export function normalisationGain(pre, spec, label = "the take") {
  if (!Number.isFinite(pre.lufs) || !Number.isFinite(pre.dbtp)) {
    throw new Error(
      `${label} has no measurable signal (loudness ${pre.lufs}, true peak ${pre.dbtp}). ` +
        `The take is empty or below loudnorm's -70 LUFS gate; it cannot be normalised. ` +
        `Re-render or pick another take.`,
    );
  }
  const wantedGain = spec.lufs - pre.lufs;
  const headroomGain = TRUE_PEAK_CEILING_DBTP - pre.dbtp;
  const gain = Math.min(wantedGain, headroomGain);
  return { gain, ceilingBound: gain < wantedGain - 1e-9 };
}

/**
 * Exported so the audition (#1346) previews candidates through the real chain
 * rather than a lookalike. A preview the owner picks a winner from has to be the
 * same file the app would ship, or the pick is made on a sound that never exists.
 */
export async function postprocess(input, clipId, outPath, { fold: foldRequested = false } = {}) {
  const spec = outputSpecFor(clipId);
  // ☠️ Before the first ffmpeg call, not inside the chain: `--fold` on a bell is a
  // refusal, and a refusal that arrives after three minutes of decoding is a
  // refusal nobody reads.
  const plan = foldPlan(spec, { fold: foldRequested });
  const dir = await mkdtemp(join(tmpdir(), "postproc-"));

  try {
    // 1-2. decode, resample to 44.1k, downmix to the class's channel count.
    step("decode + resample + downmix");
    const decodedPath = join(dir, "decoded.wav");
    const decoded = await decodeToFloatWav(input, decodedPath, {
      channels: spec.channels,
      sampleRate: OUTPUT_SAMPLE_RATE,
    });

    // 3. fold - beds only, and since #1359 only when `foldPlan` says so.
    let working = decodedPath;
    let foldNote = plan.note;
    if (plan.foldSeconds) {
      const foldFrames = Math.round(plan.foldSeconds * OUTPUT_SAMPLE_RATE);
      const folded = fold(decoded.samples, decoded.channels, foldFrames);
      working = join(dir, "folded.wav");
      await writeFile(working, writeWavBuffer(folded, decoded.channels, decoded.sampleRate));
      const before = decoded.samples.length / decoded.channels / decoded.sampleRate;
      const after = folded.length / decoded.channels / decoded.sampleRate;
      foldNote = `${plan.note}, ${before.toFixed(2)}s -> ${after.toFixed(2)}s`;
    }

    // 4. loudness-normalise, then true-peak limit - as one explicit constant gain.
    //
    // ☠️ NOT ffmpeg's `loudnorm`. Its `linear=true` is a request, not a guarantee:
    // when the source LRA exceeds the target LRA it silently falls back to DYNAMIC
    // mode and compresses. Measured here on the shipped meditation bell (LRA 12.8
    // against the usual LRA=11 target), that landed the file 2.61 LU from its
    // target while reporting success. A bell is exactly the material #1138 warned
    // about, and compressing one would flatten the attack #1139 relies on.
    //
    // A single gain is what "normalise then limit" actually means here, and it is
    // exactly predictable: scaling a signal by G dB moves both its integrated
    // loudness and its true peak by G. So the ceiling is arithmetic, not a limiter,
    // and no peak-squashing ever touches the audio.
    // 3.5. limit peaks — BEDS ONLY, and only since 2026-08-30.
    //
    // ☠️ The paragraph above says "no peak-squashing ever touches the audio", and
    // for bells and voice that still holds exactly. Beds are the documented
    // exception, because the alternative was shipping nothing: ambience is quiet
    // on average with occasional peaks, so its crest exceeds any budget a pure
    // gain can satisfy. Measured across 36 generations, six human-vetted library
    // sounds and synthesis — see CLASS_OUTPUT.beds.
    //
    // The limiter runs BEFORE the measurement, so the gain that follows is still
    // one exact arithmetic constant applied to whatever the limiter produced.
    // #1138's real invariant — that the final level move is predictable and not a
    // silent dynamic-mode fallback — survives intact.
    if (spec.limit) {
      step("limit peaks (bed)");
      const limited = join(dir, "limited.wav");
      await ffmpeg([
        "-i",
        working,
        "-af",
        // `level=disabled` stops alimiter applying its own auto make-up gain,
        // which would move the loudness this chain is about to measure.
        `alimiter=limit=${BED_LIMITER_PEAK}:level=disabled`,
        "-c:a",
        "pcm_f32le",
        limited,
      ]);
      working = limited;
    }

    step("measure source");
    const pre = await measure(working);
    const { gain, ceilingBound } = normalisationGain(pre, spec, basename(input));

    const normalised = join(dir, "normalised.wav");
    await ffmpeg([
      "-i",
      working,
      "-af",
      `volume=${gain.toFixed(4)}dB`,
      "-ar",
      String(OUTPUT_SAMPLE_RATE),
      "-c:a",
      "pcm_f32le",
      normalised,
    ]);

    // 5. encode.
    step(`encode ${spec.bitrate} aac`);
    await mkdir(dirname(outPath), { recursive: true });
    await ffmpeg([
      "-i",
      normalised,
      "-c:a",
      AAC_ENCODER,
      "-b:a",
      spec.bitrate,
      "-ar",
      String(OUTPUT_SAMPLE_RATE),
      "-ac",
      String(spec.channels),
      "-movflags",
      "+faststart",
      outPath,
    ]);

    // 6. verify the finished file, decoded - not the PCM we handed the encoder.
    step("verify finished file");
    const post = await measure(outPath);
    const size = (await stat(outPath)).size;

    // ☠️ #1134's ONE HARD RULE, measured here for the first time. `edgeSilence`
    // has existed since #1347 but only behind `postprocess edges <file>` — a
    // separate command aimed at a file by hand — so `run` could report PASS on a
    // clip that starts late, on the one class that has ever started late (#1138:
    // the four `guide_*` files carry 3.2-36.2 ms and nothing else carries any).
    //
    // ⚠️ On the FINISHED file, not the master. Encoding is where a delay would be
    // introduced — #1210's own wording is "confirm ffmpeg strips the encoder delay"
    // — so measuring the input would answer a question nobody asked.
    step("lead-in check");
    const finishedPath = join(dir, "finished.wav");
    const finished = await decodeToFloatWav(outPath, finishedPath, {
      channels: spec.channels,
      sampleRate: OUTPUT_SAMPLE_RATE,
    });
    const edges = edgeSilence(finished.samples, finished.channels, finished.sampleRate);
    // ⚠️ #1136 sets `introMs` from the MEASURED duration of the chosen guide_intro,
    // never from an estimate — and this is the only place that number exists.
    const durationSeconds = finished.samples.length / finished.channels / finished.sampleRate;

    // ☠️ ON THE NORMALISED MASTER, NOT THE ENCODED FILE (#1571). The seam is a
    // property of the audio; the encoder's first and last frames are not. AAC's
    // MDCT has no wrap-around context at the two ends of a file, so the decoded
    // head and tail differ from the master exactly where this check samples —
    // measured on synth white noise, which is periodic by circular filtering and
    // therefore has NO seam at all, encoding moved the head/tail step from
    // 0.027 dB to 1.220 dB and the verdict from 0.98x to 19.93x.
    //
    // This is the rule `repeatLoop` below already states for the human listen
    // ("looping the .m4a would splice AAC frames … inventing precisely the
    // artifact the listen exists to detect"), applied to the automated half that
    // was still measuring the wrong file.
    //
    // ⚠️ Reading `normalised` and not `working`: the gate must see the same gain
    // the file ships at, and a limiter (beds only) runs before it. Everything
    // after this point is the encode, which is what we are deliberately excluding.
    let seam = null;
    if (spec.klass === "beds") {
      step("seam gate");
      const master = parseWav(await readFile(normalised));
      seam = seamMetrics(master.samples, master.channels, master.sampleRate);
    }

    return {
      spec,
      pre,
      post,
      size,
      seam,
      edges,
      durationSeconds,
      foldNote,
      gain,
      ceilingBound,
      folded: plan.foldSeconds != null,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Tile a finished loop N times, for the listen #1137's seam gate asks for (#1346).
 *
 * ☠️ THE TILING HAPPENS ON DECODED PCM, NOT ON THE ENCODED FILE. Looping the
 * `.m4a` would splice AAC frames, putting the codec's own priming gap at every
 * join — inventing precisely the artifact the listen exists to detect, and
 * failing a bed for a defect the app would never play. #1138 established that no
 * platform loops by buffer wrap anyway (iOS duplicates an `AVPlayerItem`, Android
 * sets `REPEAT_MODE_ONE`, web sets `HTMLAudioElement.loop`), so the honest thing
 * to put in front of an ear is the file's own seam, sample-exact and once-encoded.
 *
 * ⚠️ Since #1571 the ear and the ratio no longer judge the identical boundary,
 * and that is deliberate. This listen crosses the DECODED file's join; the gate
 * measures the MASTER's, because the encoder's two end frames are an artifact of
 * the encode rather than a seam. The wrap-step half is what would catch an
 * audible click here, and it is unchanged.
 */
export async function repeatLoop(input, outPath, times, clipId) {
  if (!Number.isInteger(times) || times < 2) {
    throw new Error(`repeat count must be an integer of 2 or more, got ${times}`);
  }
  const spec = outputSpecFor(clipId);
  const dir = await mkdtemp(join(tmpdir(), "loop-"));
  try {
    const wav = join(dir, "decoded.wav");
    await ffmpeg([...inputArgs(input), "-c:a", "pcm_f32le", "-f", "wav", wav]);
    await mkdir(dirname(outPath), { recursive: true });
    await ffmpeg([
      "-stream_loop",
      String(times - 1),
      "-i",
      wav,
      "-c:a",
      AAC_ENCODER,
      "-b:a",
      spec.bitrate,
      "-ar",
      String(OUTPUT_SAMPLE_RATE),
      "-ac",
      String(spec.channels),
      "-movflags",
      "+faststart",
      outPath,
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function report(clipId, result) {
  const { spec, pre, post, size, seam, edges, durationSeconds, foldNote, gain, ceilingBound } =
    result;
  const failures = [];
  /** Things to try next. Printed, but never counted against the file. */
  const hints = [];

  const lufsOff = Math.abs(post.lufs - spec.lufs);
  if (ceilingBound) {
    // Not a bug: the source had too little headroom to reach its loudness target
    // without breaching -3 dBTP, and #1138 makes the ceiling the one that wins.
    // Say so loudly rather than reporting a miss that looks like a pipeline fault.
    failures.push(
      `cannot reach ${spec.lufs} LUFS-I without breaching ${TRUE_PEAK_CEILING_DBTP} dBTP; ` +
        `gain capped at ${gain.toFixed(2)} dB, landing at ${post.lufs}. Re-render or pick another take.`,
    );
  } else if (lufsOff > LUFS_TOLERANCE) {
    failures.push(`loudness ${post.lufs} LUFS-I is ${lufsOff.toFixed(2)} LU from ${spec.lufs}`);
  }
  if (post.dbtp > TRUE_PEAK_CEILING_DBTP + DBTP_EPSILON) {
    failures.push(`true peak ${post.dbtp} dBTP is above the ${TRUE_PEAK_CEILING_DBTP} ceiling`);
  }

  // ☠️ A rule that was not measured is not a rule that passed. Reporting PASS on a
  // result carrying no edges would restore exactly the silence this check removes.
  if (!edges) {
    failures.push(
      "leading silence was not measured, so #1134's zero-lead rule is unverified for this file",
    );
  } else if (edges.leadMs > LEAD_SILENCE_LIMIT_MS) {
    failures.push(
      `starts ${edges.leadMs.toFixed(2)} ms late (limit ${LEAD_SILENCE_LIMIT_MS} ms). ` +
        "#1134 makes zero leading silence a hard rule: every trigger in the app is " +
        "already up to 250 ms late, and this adds to it.",
    );
    // ⚠️ The remedy is class-specific and it is not the same remedy. Text to
    // Speech takes a seed, so a late voice cue is genuinely re-drawable for
    // nothing. Sound Effects has none — naming a seed there would point at a path
    // that does not exist, which is the whole reason the masters are the source.
    hints.push(
      spec.klass === "voice"
        ? "voice is the one class that can be re-drawn: audition the other candidate, " +
            "or re-render this cue with a different seed (TTS_CANDIDATE_SEEDS)."
        : "this take cannot be re-drawn in matching style — trim the head of the master " +
            "before re-running, or choose another candidate.",
    );
  }
  if (seam) {
    if (seam.wrapStepRatio > SEAM_LIMITS.wrapStepRatio) {
      failures.push(
        `seam: wrap step is ${seam.wrapStepRatio.toFixed(1)}x the median sample step ` +
          `(limit ${SEAM_LIMITS.wrapStepRatio})`,
      );
    }
    // ☠️ A HINT, NOT A FAILURE (#1571). See `seamMetrics` for the measured reason:
    // no normalisation of this ratio separates clean beds from defective ones, so
    // it cannot be an acceptance criterion. It is still worth printing — a high
    // number is a reason to listen to the loop, which is what #1137 asked for.
    if (seam.energyDeltaRatio > SEAM_LISTEN.energyDeltaRatio) {
      hints.push(
        `head/tail level step is ${seam.energyDeltaRatio.toFixed(1)}x this clip's own spread ` +
          `(${seam.headTailDb.toFixed(2)} dB) — worth a 10x loop listen. Not a failure: this ` +
          `ratio reads high on beds whose level legitimately wanders (#1571).`,
      );
    }
    // ⚠️ The fallback #1347 kept the fold for. A bed that fails the gate having
    // been rendered `loop: true` has one more thing to try before it costs a
    // re-render nobody can reproduce in matching style.
    // ☠️ It is a HINT, not a failure — it goes in `hints`, never in `failures`.
    // Pushing guidance into `failures` prints it as "FAIL:", which labels advice
    // as a fault and pads the count of things actually wrong with the file.
    // ☠️ On TONAL material the fold makes the seam WORSE, not better (#1296:
    // `night` scored 13.85x folded against 5.29x hard-cut), so this is an offer to
    // measure, never an instruction to ship.
    if (failures.some((failure) => failure.startsWith("seam:")) && !result.folded) {
      hints.push(
        "the fold is the fallback: re-run with --fold and compare. On tonal material " +
          "it makes the seam worse, so keep whichever measures better and re-render if neither passes.",
      );
    }
  }

  console.log(`\n=== ${clipId} (${spec.klass})`);
  console.log(
    `   ${spec.channels === 2 ? "stereo" : "mono"} ${spec.bitrate} @ ${OUTPUT_SAMPLE_RATE} Hz · ${foldNote}`,
  );
  console.log(
    `   gain      ${gain >= 0 ? "+" : ""}${gain.toFixed(2)} dB${ceilingBound ? " (capped by the dBTP ceiling)" : ""}`,
  );
  console.log(`   loudness  ${pre.lufs} -> ${post.lufs} LUFS-I   (target ${spec.lufs})`);
  console.log(
    `   true peak ${pre.dbtp} -> ${post.dbtp} dBTP     (ceiling ${TRUE_PEAK_CEILING_DBTP})`,
  );
  console.log(`   size      ${(size / 1024).toFixed(1)} KB`);
  if (edges) {
    // ⚠️ The tail is printed and never gated — a bell decaying "continuously to
    // silence" (#1139) has one by design. It is here because a texture that quietly
    // ends early is invisible any other way.
    console.log(
      `   edges     lead ${edges.leadMs.toFixed(2)} ms · tail ${edges.tailMs.toFixed(2)} ms` +
        (Number.isFinite(durationSeconds) ? `   (${durationSeconds.toFixed(3)}s)` : ""),
    );
  }
  if (seam) {
    console.log(
      `   seam      wrap step ${seam.wrapStepRatio.toFixed(2)}x median · ` +
        `head/tail ${seam.headTailDb.toFixed(2)} dB = ${seam.energyDeltaRatio.toFixed(2)}x its own step ${seam.naturalDb.toFixed(2)} dB`,
    );
  }
  for (const failure of failures) console.log(`   FAIL: ${failure}`);
  for (const hint of hints) console.log(`   next: ${hint}`);
  if (!failures.length) console.log("   PASS");
  return failures.length === 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

/**
 * Where the finished set lives while the pass is running.
 *
 * The same default `run --out` has always used. Named here because `budget` has
 * to look in the same place `run` writes to, and two literals that must agree is
 * one literal that will not.
 */
export const SHIP_DIR = join("audio-masters", "finished");

/**
 * How long one clip runs, for the half of the set the catalog does not fix.
 *
 * ☠️ Returns null instead of throwing when ffprobe is not there. `budget`'s PREDICTED
 * half is sold as needing no rendered byte, and `run()` REJECTS on ENOENT — so an
 * absent ffprobe used to kill the command before it printed a single line, including
 * the half that never needed ffprobe at all. A missing length is already a case this
 * reports (as a FLOOR); a missing prober is just one more way to be missing it.
 *
 * @param {string} file
 * @returns {Promise<number|null>}
 */
async function secondsOf(file) {
  try {
    const res = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ]);
    if (res.code !== 0) return null;
    const seconds = Number.parseFloat(res.stdout.trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

/** @param {number} bytes */
const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(3)} MiB`;

/**
 * The one rendering of a budget verdict.
 *
 * ⚠️ The commit that gave the ceiling one implementation left its *printing* with
 * two, which is the same duplication one layer out — a report that disagrees with
 * itself is as misleading as a check that does.
 *
 * @param {{totalBytes: number, headroomBytes: number, over: boolean}} verdict
 */
function budgetLine(verdict) {
  return (
    `${mib(verdict.totalBytes)} of ${mib(SHIP_BUDGET_BYTES)} · ` +
    `${mib(verdict.headroomBytes)} spare · ${verdict.over ? "OVER" : "fits"}`
  );
}

/**
 * #1210's budget acceptance check: twenty-one files, under #1138's 4.0 MiB.
 *
 * Prints two facts and keeps them apart, the way `manifest --check` has to keep
 * currency and completeness apart:
 *
 *   PREDICTED — what the set weighs on paper, from the catalog's own durations and
 *   bitrates. Runnable before a single byte is rendered, which is the only time
 *   the answer can still change anything: the render is unrepeatable.
 *
 *   MEASURED — what is actually in the ship directory. Only this one can fail the
 *   command, and it fails on a missing unit just as readily as on the byte count.
 *   ☠️ A set that fits because four of its files were never written is not a set
 *   that fits, and 20 of 21 is exactly what the voice-name collision used to
 *   produce.
 *
 * The voice cues' lengths come from the clips shipping today, which say the same
 * words. That is an estimate and it is labelled as one — TTS decides the real
 * number, and it does not exist until the pass has run.
 *
 * @param {string} dir the finished set's directory
 * @param {{measureSeconds?: (file: string) => Promise<number|null>}} [options]
 * @returns {Promise<boolean>} whether the set is complete, plausible and within budget
 */
export async function budget(dir, { measureSeconds = secondsOf } = {}) {
  const units = shippingUnits();

  const shippedToday = new Map();
  for (const unit of units) {
    const reference = referenceClipFor(unit);
    if (!reference || shippedToday.has(unit.clip)) continue;
    // ☠️ A prober that throws must not take the PREDICTED half with it. That half is
    // sold as needing no rendered byte and no ffmpeg, and `run()` rejects on ENOENT,
    // so an absent ffprobe used to kill the command before it printed a single line.
    // An unmeasurable length is a case this already reports — as a FLOOR.
    let seconds = null;
    try {
      seconds = await measureSeconds(join(...reference));
    } catch {
      seconds = null;
    }
    shippedToday.set(unit.clip, seconds);
  }
  const predicted = predictShipping(units, (unit) => shippedToday.get(unit.clip) ?? null);

  console.log(`PREDICTED (${SHIP_FILE_COUNT} files, from catalog.mjs)`);
  console.log(`  ${budgetLine(predicted)}`);
  console.log(
    predicted.complete
      ? `  voice lengths estimated from the clips shipping today (#1136 measures the real ones)`
      : `  ⚠️ ${predicted.unknown.length} unit(s) have no length — the total above is a FLOOR`,
  );
  // ⚠️ Payload only. The .m4a container adds a few KB of moov per file, and #1138's
  // published 3.21 MB was computed the same way, so the two agree to within the
  // container. It must not be read as precision it does not have.
  console.log(`  payload only; the container adds a few KB per file`);

  let names = [];
  try {
    names = await readdir(dir);
  } catch {
    console.log(`\nMEASURED\n  nothing at ${dir}/ — the pass has not written a finished set yet`);
    return false;
  }

  // ☠️ EVERY entry, not just `*.m4a`. Filtering here made a 5 MB stray `.wav` weigh
  // nothing and go unreported, on a ceiling #1138 justifies by that exact case — and
  // made an uppercase `.M4A` disappear from the total while its unit read as missing.
  // ⚠️ `isFile` matters for the same reason: a DIRECTORY named `rain.m4a` surveyed as
  // a present unit, because presence was "a name matched".
  const files = [];
  for (const name of names) {
    const info = await stat(join(dir, name));
    if (!info.isFile()) continue;
    files.push({ name, bytes: info.size });
  }
  const survey = surveyShipping(units, files);

  console.log(`\nMEASURED (${dir}/)`);
  console.log(
    `  ${survey.rows.filter((row) => row.present).length}/${SHIP_FILE_COUNT} files · ` +
      budgetLine(survey),
  );
  for (const gap of survey.gaps) {
    console.log(`  ${gap.kind.padEnd(12)} ${gap.file ?? gap.unit ?? ""} — ${gap.detail}`);
  }
  console.log(
    survey.complete ? `  the set is complete and fits` : `  the set is NOT ready to ship`,
  );
  return survey.complete;
}

const USAGE = `
Usage:
  node scripts/audio/postprocess.mjs run <input> --clip <id> [--voice <v>] [--out <file.m4a>] [--fold]
  node scripts/audio/postprocess.mjs measure <file>
  node scripts/audio/postprocess.mjs seamcheck <file>
  node scripts/audio/postprocess.mjs edges <file>
  node scripts/audio/postprocess.mjs budget [--dir <d>]

<id> is a clip id from catalog.mjs - a bell, bed, texture or guide_* cue.

--voice is REQUIRED on a guide_* cue and refused on a sound effect: each cue ships
once per voice (#1136), and without it both takes default to the same output path
and the second silently overwrites the first.

budget is #1210's size acceptance check - 21 files under #1138's 4.0 MiB ceiling.
It prints what the catalog predicts (runnable before the render) and what is
actually in the ship directory, and fails on a missing unit as well as on bytes.

--fold is the seam-gate FALLBACK, not the path. Beds render loop: true and ship
unfolded at the full 30.0s (#1347); reach for --fold only when a bed fails its seam
gate, and compare the two - on tonal material the fold makes the seam worse.

Requires ffmpeg on PATH (#1138).
`.trim();

/**
 * ☠️ Wrapped in `main()`, not run at the top level.
 *
 * A bare `await postprocess(...)` here is a top-level `await`, which babel's CJS
 * transform cannot compile — it made this module unimportable from jest, which is
 * why `test/audio-render-reroll.test.ts` has to mock it out wholesale to test
 * `render`. #1320 applied the same fix to `render.mjs` for the same reason; this
 * is the other half of it, and it is what lets `normalisationGain` be tested at
 * all.
 */
async function main() {
  const command = process.argv[2];
  const target = process.argv[3];

  try {
    if (command === "run") {
      const clipId = flag("clip");
      if (!target || !clipId) throw new Error(USAGE);
      // ☠️ The default output name carries the voice, and `shipFileName` throws
      // when a cue arrives without one. It used to be `${clipId}.m4a` for every
      // clip, so post-processing the male take of a cue wrote over the female's
      // finished file — 20 files where the set needs 21, and nothing counted them.
      //
      // ⚠️ Computed only when it is needed. `flag(name, fallback)` evaluates its
      // fallback eagerly, so building the default inline would make an explicit
      // --out on a cue throw for want of a --voice it does not need.
      const explicitOut = flag("out");
      const out =
        explicitOut ?? join(SHIP_DIR, shipFileName({ clip: clipId, voice: flag("voice") }));
      // Named for what it is, not `fold` — that is the module-scope function this
      // very call reaches through `postprocess`.
      const foldRequested = process.argv.includes("--fold");
      const ok = report(clipId, await postprocess(target, clipId, out, { fold: foldRequested }));
      console.log(`\nwrote ${out}`);
      process.exit(ok ? 0 : 1);
    } else if (command === "measure") {
      if (!target) throw new Error(USAGE);
      const m = await measure(target);
      console.log(`${basename(target)}: ${m.lufs} LUFS-I · ${m.dbtp} dBTP · LRA ${m.lra}`);
    } else if (command === "seamcheck") {
      if (!target) throw new Error(USAGE);
      // ☠️ `run`'s gate measures the pre-encode master (#1571). This command is
      // aimed at a file by hand, so it measures whatever it is given — and on an
      // encoded file the head/tail half reads high for a reason that is not in the
      // audio. Say so rather than let the number be quoted as a verdict.
      if (!/\.wav$/i.test(target)) {
        console.log(
          "⚠️  Not a WAV. AAC has no wrap-around context at a file's two ends, so the\n" +
            "    head/tail half reads high on an encoded file even with no seam present\n" +
            "    (synth white noise: 0.98x on the master, 19.93x encoded). Point this at\n" +
            "    the master to get the number `run` gates on.",
        );
      }
      const seam = await seamCheckFile(target);
      // ⚠️ The verdict is the wrap step ALONE (#1571). The head/tail ratio is
      // printed beside it and decides nothing — it cannot separate a clean bed
      // from a defective one, so putting it back here would restore exactly the
      // false failures this command is used to investigate.
      const ok = seam.wrapStepRatio <= SEAM_LIMITS.wrapStepRatio;
      console.log(
        `${basename(target)}: wrap step ${seam.wrapStepRatio.toFixed(2)}x median ` +
          `(${seam.wrapStepDbfs.toFixed(1)} dBFS) · head/tail ${seam.energyDeltaRatio.toFixed(2)}x ` +
          `(reported, not gated) · ` +
          (ok ? "PASS" : "FAIL"),
      );
      process.exit(ok ? 0 : 1);
    } else if (command === "edges") {
      if (!target) throw new Error(USAGE);
      const dir = await mkdtemp(join(tmpdir(), "edges-"));
      try {
        const wav = join(dir, "decoded.wav");
        const { codec: _codec, ...pcm } = SFX_MASTER_PCM;
        const decoded = await decodeToFloatWav(target, wav, pcm);
        const edges = edgeSilence(decoded.samples, decoded.channels, decoded.sampleRate);
        console.log(
          `${basename(target)}: lead ${edges.leadMs.toFixed(1)} ms · tail ${edges.tailMs.toFixed(1)} ms · ` +
            `peak ${edges.peakDbfs.toFixed(1)} dBFS (floor ${edges.floorDbfs} dBFS)` +
            (edges.silent ? " · SILENT" : ""),
        );
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    } else if (command === "budget") {
      process.exit((await budget(flag("dir", SHIP_DIR))) ? 0 : 1);
    } else {
      console.log(USAGE);
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

// Only run the CLI when invoked directly, so `fold`, `seamMetrics`,
// `normalisationGain` and `postprocess` can be imported by calibrate-seam.mjs,
// audition.mjs and the test suite without this file executing.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
