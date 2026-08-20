#!/usr/bin/env node
/**
 * The audio post-processor and the automated seam gate (#1296).
 *
 * Turns a raw ElevenLabs master into the finished clip the app ships, in the
 * order #1138 fixed:
 *
 *   decode -> resample to 44.1 kHz -> downmix -> seamless() fold (beds only)
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
import { mkdtemp, readFile, writeFile, rm, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";

import {
  SFX_MASTER_PCM,
  outputSpecFor,
  OUTPUT_SAMPLE_RATE,
  TRUE_PEAK_CEILING_DBTP,
  AAC_ENCODER,
} from "./catalog.mjs";

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
 * wanders between windows of the same length. A raw dB threshold cannot work -
 * `rain` is stochastic and moves ~3.5 dB between windows of seam-clean material,
 * while `brown-noise` barely moves at all.
 *
 * ☠️ A hard cut of STOCHASTIC material is not caught, and that is a true negative
 * rather than a hole. Splicing two independent stretches of dense noise scores
 * 1.08-1.22 because the step's broadband energy is indistinguishable from the
 * material's own - there is nothing there to hear. #1137 reached the same
 * conclusion from the other direction: `brown-noise`'s 8s loop is *already*
 * undetectable, and the loop tell is event-driven, not seam-driven. What the gate
 * does catch is the case that is actually audible: a TONAL bed whose phase jumps.
 */
export const SEAM_LIMITS = { wrapStepRatio: 3.0, energyDeltaRatio: 2.0 };
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
function inputArgs(file) {
  if (!file.toLowerCase().endsWith(".pcm")) return ["-i", file];
  const { codec, sampleRate, channels } = SFX_MASTER_PCM;
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

function writeWavBuffer(samples, channels, sampleRate) {
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

export async function decodeToFloatWav(input, out, { channels, sampleRate }) {
  await ffmpeg([
    ...inputArgs(input),
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
 * #1137's automated wrap check. Runs on the *decoded finished file*, not on the
 * pre-encode PCM, so anything the encoder adds at the boundaries is included.
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

  const headTailDb = Math.abs(rmsDb(frames - win) - rmsDb(0));

  // ☠️ A raw dB threshold on this is not usable, and measuring it taught us why:
  // `rain` is stochastic, so two 50 ms windows of perfectly seam-clean material
  // differ by ~3.5 dB just from its own drops, while `brown-noise` barely moves.
  // So the head/tail step is judged against how much THIS clip's level naturally
  // wanders between windows of the same length. Seam-clean material scores ~1.
  const spread = [];
  const positions = Math.min(200, Math.floor(frames / win));
  for (let i = 0; i < positions; i++) {
    spread.push(rmsDb(Math.floor((i * (frames - win)) / Math.max(1, positions - 1))));
  }
  const spreadMedian = [...spread].sort((a, b) => a - b)[Math.floor(spread.length / 2)];
  const deviations = spread.map((v) => Math.abs(v - spreadMedian)).sort((a, b) => a - b);
  // A 0.5 dB floor stops a perfectly steady bed (brown noise) from making any
  // step at all look like an outlier by dividing through a near-zero spread.
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

async function postprocess(input, clipId, outPath) {
  const spec = outputSpecFor(clipId);
  const dir = await mkdtemp(join(tmpdir(), "postproc-"));

  try {
    // 1-2. decode, resample to 44.1k, downmix to the class's channel count.
    step("decode + resample + downmix");
    const decodedPath = join(dir, "decoded.wav");
    const decoded = await decodeToFloatWav(input, decodedPath, {
      channels: spec.channels,
      sampleRate: OUTPUT_SAMPLE_RATE,
    });

    // 3. fold - beds only.
    let working = decodedPath;
    let foldNote = "not a bed, no fold";
    if (spec.foldSeconds) {
      const foldFrames = Math.round(spec.foldSeconds * OUTPUT_SAMPLE_RATE);
      const folded = fold(decoded.samples, decoded.channels, foldFrames);
      working = join(dir, "folded.wav");
      await writeFile(working, writeWavBuffer(folded, decoded.channels, decoded.sampleRate));
      const before = decoded.samples.length / decoded.channels / decoded.sampleRate;
      const after = folded.length / decoded.channels / decoded.sampleRate;
      foldNote = `${spec.foldSeconds}s fold, ${before.toFixed(2)}s -> ${after.toFixed(2)}s`;
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
    step("measure source");
    const pre = await measure(working);
    const wantedGain = spec.lufs - pre.lufs;
    const headroomGain = TRUE_PEAK_CEILING_DBTP - pre.dbtp;
    const gain = Math.min(wantedGain, headroomGain);
    const ceilingBound = gain < wantedGain - 1e-9;

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
    if (spec.klass === "beds") step("seam gate");
    const seam = spec.klass === "beds" ? await seamCheckFile(outPath) : null;

    return { spec, pre, post, size, seam, foldNote, gain, ceilingBound };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function report(clipId, result) {
  const { spec, pre, post, size, seam, foldNote, gain, ceilingBound } = result;
  const failures = [];

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
  if (seam) {
    if (seam.wrapStepRatio > SEAM_LIMITS.wrapStepRatio) {
      failures.push(
        `seam: wrap step is ${seam.wrapStepRatio.toFixed(1)}x the median sample step ` +
          `(limit ${SEAM_LIMITS.wrapStepRatio})`,
      );
    }
    if (seam.energyDeltaRatio > SEAM_LIMITS.energyDeltaRatio) {
      failures.push(
        `seam: head/tail energy step is ${seam.energyDeltaRatio.toFixed(1)}x this clip's natural ` +
          `window-to-window spread (limit ${SEAM_LIMITS.energyDeltaRatio})`,
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
  if (seam) {
    console.log(
      `   seam      wrap step ${seam.wrapStepRatio.toFixed(2)}x median · ` +
        `head/tail ${seam.headTailDb.toFixed(2)} dB = ${seam.energyDeltaRatio.toFixed(2)}x natural ${seam.naturalDb.toFixed(2)} dB`,
    );
  }
  for (const failure of failures) console.log(`   FAIL: ${failure}`);
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

const USAGE = `
Usage:
  node scripts/audio/postprocess.mjs run <input> --clip <id> [--out <file.m4a>]
  node scripts/audio/postprocess.mjs measure <file>
  node scripts/audio/postprocess.mjs seamcheck <file>

<id> is a clip id from catalog.mjs - a bell, bed, texture or guide_* cue.
Requires ffmpeg on PATH (#1138).
`.trim();

const command = process.argv[2];
const target = process.argv[3];

// Only run the CLI when invoked directly, so `fold` and `seamMetrics` can be
// imported and measured by calibrate-seam.mjs without this file executing.
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;

if (isMain)
  try {
    if (command === "run") {
      const clipId = flag("clip");
      if (!target || !clipId) throw new Error(USAGE);
      const out = flag("out", join("audio-masters", "finished", `${clipId}.m4a`));
      const ok = report(clipId, await postprocess(target, clipId, out));
      console.log(`\nwrote ${out}`);
      process.exit(ok ? 0 : 1);
    } else if (command === "measure") {
      if (!target) throw new Error(USAGE);
      const m = await measure(target);
      console.log(`${basename(target)}: ${m.lufs} LUFS-I · ${m.dbtp} dBTP · LRA ${m.lra}`);
    } else if (command === "seamcheck") {
      if (!target) throw new Error(USAGE);
      const seam = await seamCheckFile(target);
      const ok =
        seam.wrapStepRatio <= SEAM_LIMITS.wrapStepRatio &&
        seam.energyDeltaRatio <= SEAM_LIMITS.energyDeltaRatio;
      console.log(
        `${basename(target)}: wrap step ${seam.wrapStepRatio.toFixed(2)}x median ` +
          `(${seam.wrapStepDbfs.toFixed(1)} dBFS) · head/tail ${seam.energyDeltaRatio.toFixed(2)}x natural · ` +
          (ok ? "PASS" : "FAIL"),
      );
      process.exit(ok ? 0 : 1);
    } else {
      console.log(USAGE);
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
