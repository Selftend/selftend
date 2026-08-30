/**
 * The three noise beds, computed rather than generated (#1130).
 *
 * ☠️ WHY THESE LEFT ELEVENLABS. #1133 settled that every clip comes from
 * ElevenLabs, and #1134 immediately flagged the exception it expected to need:
 * brown noise "is the one clip a generative model is a strictly worse tool for
 * — deterministic, free and inherently seamless in eight lines", with the note
 * that a bed failing its gate would be "the obvious single-class reopen". Round
 * B duly returned all three brown-noise takes HARD-CLIPPED at 0.0 dBTP, so the
 * stated reopen condition was met and the owner reopened it on 2026-08-29.
 *
 * White and pink came in with it, for that reason plus one the prompt path
 * cannot answer at all: `SHARED_TAIL` says "Dark and warm, no glassy highs",
 * which a bright noise contradicts *by definition*. That is the same shape of
 * self-contradiction #1262 found between the `ocean` bed and its distance —
 * except that one was fixable by rewording, and this one is not, because
 * brightness is the specification rather than a flavour of it.
 *
 * What computing them buys, beyond the credits: they are EXACT (a spectral slope
 * is a number, not an opinion), they are reproducible from a seed where Sound
 * Effects has none, and they are periodic to the sample, so they loop with no
 * fold and no seam gate to argue with.
 *
 * The output is deliberately identical in shape to what `render` writes — raw
 * `SFX_MASTER_PCM` at the master rate — so everything downstream (`postprocess`,
 * the loudness normalisation, the ship budget) treats a synth bed and a rendered
 * bed the same way and neither one needs a special case.
 */
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { SFX_MASTER_PCM, SYNTH_BEDS } from "./catalog.mjs";

/**
 * The seed each bed is computed from. Fixed, and part of the record: unlike a
 * Sound Effects master these files can be reproduced byte-for-byte forever, so
 * the seed is the whole provenance and losing it would be the one way to make
 * them as unrepeatable as the clips they replace.
 */
export const SYNTH_SEED = 1130;

/**
 * mulberry32 — small, fast, and identical on every platform.
 *
 * ☠️ NOT `Math.random()`. The point of this file is that a re-run reproduces the
 * same bytes; an unseeded source would hand back a different bed each time and
 * quietly reintroduce the exact property (unrepeatability) that makes the
 * ElevenLabs masters so expensive to lose.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform white noise in [-1, 1), which is flat by construction. */
function whiteBuffer(n, random) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) out[i] = random() * 2 - 1;
  return out;
}

/**
 * Run a one-pole filter around the buffer as a CIRCLE, not a line.
 *
 * ☠️ THIS IS WHAT MAKES THE LOOP SEAMLESS, and it is the whole reason these beds
 * need no fold. Filtering a buffer left-to-right from a zero state gives an
 * output whose beginning is a transient and whose end is steady — so the wrap
 * has a step in it, which is precisely the seam a bed is gated on. Running the
 * filter repeatedly over the same buffer instead lets the state converge to the
 * filter's periodic steady-state response to a periodic input; after a couple of
 * laps the output is the same on every subsequent lap, so the last sample flows
 * into the first exactly as it flows into any other.
 *
 * Two warm-up laps is generous: these poles decay to inaudibility within a small
 * fraction of one 30-second lap.
 */
function filterCircular(input, step, laps = 3) {
  const n = input.length;
  const out = new Float64Array(n);
  const state = {};
  for (let lap = 0; lap < laps; lap += 1) {
    for (let i = 0; i < n; i += 1) out[i] = step(input[i], state);
  }
  return out;
}

/**
 * Paul Kellet's economical pink filter — a cascade of one-poles approximating
 * -3 dB/octave to within ~0.05 dB across the audible band. Chosen over the Voss
 * summing method because it is a plain IIR, which is what {@link filterCircular}
 * can wrap into a periodic signal.
 */
function pinkStep(x, s) {
  s.b0 = 0.99886 * (s.b0 ?? 0) + x * 0.0555179;
  s.b1 = 0.99332 * (s.b1 ?? 0) + x * 0.0750759;
  s.b2 = 0.969 * (s.b2 ?? 0) + x * 0.153852;
  s.b3 = 0.8665 * (s.b3 ?? 0) + x * 0.3104856;
  s.b4 = 0.55 * (s.b4 ?? 0) + x * 0.5329522;
  s.b5 = -0.7616 * (s.b5 ?? 0) - x * 0.016898;
  const out = s.b0 + s.b1 + s.b2 + s.b3 + s.b4 + s.b5 + (s.b6 ?? 0) + x * 0.5362;
  s.b6 = x * 0.115926;
  return out * 0.11;
}

/**
 * A leaky integrator: -6 dB/octave.
 *
 * ⚠️ Leaky, not a true integrator. A pure `y += x` has infinite DC gain and walks
 * away from zero, which shows up as an inaudible sub-sonic wander that eats all
 * the headroom before the audible part is anywhere near full scale — one of the
 * ways the shipped placeholder ended up misbehaving. The 0.999 pole puts a corner
 * a few Hz up, well below anything a bed is meant to be heard through.
 */
function brownStep(x, s) {
  s.y = 0.999 * (s.y ?? 0) + x * 0.035;
  return s.y;
}

const KINDS = {
  "white-noise": null,
  "pink-noise": pinkStep,
  "brown-noise": brownStep,
};

/** Scale to a target peak. Left well below full scale — `postprocess` sets the
 *  shipping loudness, and a master that arrives near 0 dBFS is the clipping this
 *  whole exercise exists to stop. */
function normalisePeak(channels, peak) {
  let max = 0;
  for (const ch of channels) for (const v of ch) max = Math.max(max, Math.abs(v));
  if (max === 0) throw new Error("synthesised silence — check the filter coefficients");
  const gain = peak / max;
  for (const ch of channels) for (let i = 0; i < ch.length; i += 1) ch[i] *= gain;
  return gain;
}

/**
 * One noise bed as interleaved 16-bit stereo, ready to be written as a master.
 *
 * The two channels are independently seeded so the bed has natural width rather
 * than being a mono signal duplicated — but they share a kind and a level, so it
 * stays mono-compatible and nothing cancels when a phone sums it.
 */
export function synthesiseBed({
  kind,
  seconds = 30,
  sampleRate = SFX_MASTER_PCM.sampleRate,
  seed = SYNTH_SEED,
  peak = 0.5,
}) {
  if (!(kind in KINDS)) {
    throw new Error(
      `unknown noise kind "${kind}" — expected one of: ${Object.keys(KINDS).join(", ")}`,
    );
  }
  const n = Math.round(seconds * sampleRate);
  const step = KINDS[kind];
  const channels = [0, 1].map((channel) => {
    const source = whiteBuffer(n, mulberry32(seed + channel * 7919));
    return step ? filterCircular(source, step) : source;
  });
  normalisePeak(channels, peak);

  const out = Buffer.alloc(n * 2 * 2);
  for (let i = 0; i < n; i += 1) {
    for (let c = 0; c < 2; c += 1) {
      // Round, then clamp to the 16-bit range: at peak 0.5 nothing can reach the
      // rail, but a future peak change must degrade into a quiet master rather
      // than into wrapped samples that read as violent clicks.
      const v = Math.max(-32768, Math.min(32767, Math.round(channels[c][i] * 32767)));
      out.writeInt16LE(v, (i * 2 + c) * 2);
    }
  }
  return out;
}

/** Where a synth bed's master goes — the same layout `render` writes, so the
 *  post-processor finds it without being told anything new. */
export function synthMasterName(clipId) {
  return `${clipId}-c01-a01.pcm`;
}

/** Write every synth bed's master into `dir/beds`. Returns what it wrote. */
export async function writeSynthBeds(dir, { seed = SYNTH_SEED } = {}) {
  const bedsDir = join(dir, "beds");
  await mkdir(bedsDir, { recursive: true });
  const written = [];
  for (const bed of SYNTH_BEDS) {
    const pcm = synthesiseBed({ kind: bed.id, seconds: bed.durationSeconds, seed });
    const file = synthMasterName(bed.id);
    await writeFile(join(bedsDir, file), pcm);
    written.push({ id: bed.id, file, bytes: pcm.length, seconds: bed.durationSeconds, seed });
  }
  return written;
}

/**
 * ☠️ Wrapped in `main()` rather than run at the top level, so this module has no
 * top-level await — the same reason `audition.mjs` gives. Jest transpiles these
 * `.mjs` files to CommonJS, where a top-level await is a hard syntax error, so a
 * module that used one could not be imported by a test at all.
 */
async function main() {
  const outIndex = process.argv.indexOf("--out");
  const dir = outIndex === -1 ? "audio-masters/round-B" : process.argv[outIndex + 1];
  const written = await writeSynthBeds(dir);
  for (const w of written) {
    console.log(`${w.id.padEnd(12)} ${w.file}  ${w.bytes} bytes  ${w.seconds}s  seed ${w.seed}`);
  }
  console.log(
    `\n${written.length} noise bed(s) written to ${join(dir, "beds")}. ` +
      "No credits spent — these are computed, and a re-run reproduces them exactly.",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
