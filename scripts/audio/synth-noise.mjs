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
 * ways the shipped placeholder ended up misbehaving.
 *
 * ☠️☠️ THE POLE IS 0.995 AND NOT 0.999 BECAUSE LUFS IS K-WEIGHTED. At 0.999 this
 * bed measured **-26.3 LUFS-I against -6.0 dBTP — a 20.3 dB crest**, so it could
 * not be gained to the -20 LUFS target under the -3 dBTP ceiling and came out
 * CEILING-BOUND. Nothing is wrong with the audio: K-weighting deliberately
 * discounts low frequencies, so a bed made almost entirely of them reads far
 * quieter than it peaks. The loudness target is simply unreachable for a signal
 * that dark, and no amount of gain fixes a ratio.
 *
 * 📌 This is very probably why ElevenLabs' own `brown-noise` takes came back
 * HARD-CLIPPED at 0.0 dBTP: the same physics, met by a model pushing for level.
 *
 * Measured against the real meter (crest, lower is safer): 0.999 -> 20.3,
 * 0.997 -> 16.7, 0.995 -> 14.8, 0.99 -> 13.3, 0.97 -> 11.7. 0.995 puts the corner
 * near 38 Hz — still deep and dark to the ear — and leaves ~2 dB of margin.
 * ⚠️ Do not push it back down for "more brown" without re-measuring: the ceiling
 * is where that road ends.
 */
function brownStep(x, s) {
  s.y = 0.995 * (s.y ?? 0) + x * 0.035;
  return s.y;
}

/**
 * A one-pole low-pass, given a corner frequency.
 *
 * `alpha = exp(-2*pi*fc/fs)` is the standard mapping, and the gain is normalised
 * so the filter passes DC at unity — otherwise every cascade quietly loses level
 * and the peak normalisation at the end has to make it back up as gain, which
 * lifts the noise with it.
 */
function lowpass(fc, sampleRate) {
  const a = Math.exp((-2 * Math.PI * fc) / sampleRate);
  return (x, s) => {
    s.y = a * (s.y ?? 0) + (1 - a) * x;
    return s.y;
  };
}

/** Run several circular passes in sequence — a steeper slope than one pole. */
function chain(input, steps) {
  return steps.reduce((signal, step) => filterCircular(signal, step), input);
}

function mix(...parts) {
  const n = parts[0][0].length;
  const out = new Float64Array(n);
  for (const [buf, gain] of parts) {
    for (let i = 0; i < n; i += 1) out[i] += buf[i] * gain;
  }
  return out;
}

/**
 * Sparse decaying impulses, placed so they WRAP rather than stopping at the end.
 *
 * ☠️ The whole seam guarantee depends on this. An impulse struck near the end of
 * the buffer has to finish inside the head of the same buffer, or the loop point
 * cuts a crackle in half and clicks once per lap — audible forever on a bed that
 * repeats every 30 seconds. Writing with `(start + k) % n` makes the buffer a
 * circle for the events too, matching what `filterCircular` does for the filters.
 */
function crackle(n, random, { perSecond, sampleRate, decaySeconds }) {
  const out = new Float64Array(n);
  const count = Math.round((n / sampleRate) * perSecond);
  const tail = Math.max(1, Math.round(decaySeconds * sampleRate));
  for (let e = 0; e < count; e += 1) {
    const start = Math.floor(random() * n);
    // Each event gets its own amplitude and decay so the texture does not pulse
    // with one recognisable click repeated at different times.
    const amp = 0.35 + random() * 0.65;
    const decay = Math.exp(-1 / (tail * (0.4 + random())));
    let env = amp;
    for (let k = 0; k < tail; k += 1) {
      out[(start + k) % n] += env * (random() * 2 - 1);
      env *= decay;
      if (env < 1e-4) break;
    }
  }
  return out;
}

/**
 * How each bed is built. A kind is a function of (n, seed, sampleRate) returning
 * one channel, so a bed can be a plain filtered noise or several layers mixed.
 *
 * ☠️ THE WATER AND FIRE BEDS ARE HERE BECAUSE ELEVENLABS COULD NOT MAKE THEM.
 * `ocean`, `stream` and `fire` were rendered 12 times each on 2026-08-30 and
 * every single take was rejected as `ceiling-bound` or `clipped` — 36 for 36,
 * 13,530 credits. The cause is structural rather than unlucky: splashes, crackle
 * and breaking waves are DISCRETE EVENTS, so the model returns a signal whose
 * peaks tower over its average, and such a take cannot be gained to -20 LUFS
 * under a -3 dBTP ceiling however it is worded. Synthesis controls that ratio
 * directly — the event density is a number here, not a wish in a prompt.
 */
const KINDS = {
  "white-noise": (n, seed) => whiteBuffer(n, mulberry32(seed)),

  "pink-noise": (n, seed) => filterCircular(whiteBuffer(n, mulberry32(seed)), pinkStep),

  "brown-noise": (n, seed) => filterCircular(whiteBuffer(n, mulberry32(seed)), brownStep),

  /**
   * A deep body of water: pink noise rolled off hard, with no modulation at all.
   *
   * ⚠️ DELIBERATELY NO SWELL, and that is the owner's ruling, not an omission.
   * The audition rejected every generated take and singled out `ocean-c03-a01`
   * as closest with "the waves are too frequent". A periodic swell would also
   * break the loop: its cycle would have to divide 30s exactly or the wrap lands
   * mid-wave. So this is a steady wash — the sound of water, not of waves.
   */
  ocean: (n, seed, sampleRate) =>
    chain(filterCircular(whiteBuffer(n, mulberry32(seed)), pinkStep), [
      lowpass(680, sampleRate),
      lowpass(680, sampleRate),
    ]),

  /**
   * A small stream: the same water body with a band of moving-water detail over
   * it. The upper band is a high-passed noise (the signal minus its own
   * low-passed self), which is what puts stones under the water without adding
   * the discrete splashes the prompt route kept producing.
   */
  stream: (n, seed, sampleRate) => {
    const source = whiteBuffer(n, mulberry32(seed));
    const body = chain(source, [lowpass(400, sampleRate), lowpass(400, sampleRate)]);
    const wide = filterCircular(source, lowpass(3200, sampleRate));
    const narrow = filterCircular(source, lowpass(900, sampleRate));
    const band = new Float64Array(n);
    for (let i = 0; i < n; i += 1) band[i] = wide[i] - narrow[i];
    return mix([body, 1], [band, 0.9]);
  },

  /**
   * A hearth fire: a warm bed with dense fine crackle over it.
   *
   * The density is the whole trick. #1130's prompt asked for "crackle so dense
   * that it blends into one continuous even wash" and the model would not do it;
   * here `perSecond` says so directly. High enough and the events stop reading as
   * separate pops, which is both what the owner asked for and what keeps the
   * crest factor inside the loudness budget.
   */
  fire: (n, seed, sampleRate) => {
    const rng = mulberry32(seed);
    const bed = chain(whiteBuffer(n, mulberry32(seed + 101)), [
      lowpass(320, sampleRate),
      lowpass(320, sampleRate),
    ]);
    // ☠️ 2,200 events a second is not a guess — it is the tuned answer to the
    // crest budget. At 900/s this bed measured 17.2 dB, i.e. CEILING-BOUND, the
    // identical fault that killed all 12 API takes: too few events, each too
    // exposed. Density is the cure, because overlapping events sum toward an
    // average instead of standing out as peaks. Measured: 900 -> 17.2 dB,
    // 2,200 -> 14.7, 5,000 -> 13.6.
    //
    // ⚠️ Denser is not simply better. Push it far enough and the crackle stops
    // being fire and becomes plain filtered noise, which is `brown-noise` with
    // extra steps. 2,200 keeps individual crackles audible while leaving ~2 dB
    // under the 17 dB limit — the balance, not the extreme.
    const sparks = filterCircular(
      crackle(n, rng, { perSecond: 2200, sampleRate, decaySeconds: 0.006 }),
      lowpass(5200, sampleRate),
    );
    return mix([bed, 1], [sparks, 0.45]);
  },
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
  const build = KINDS[kind];
  // 7919 is just a prime offset: the two channels must be decorrelated, and
  // adjacent seeds in a 32-bit PRNG are not guaranteed to be.
  const channels = [0, 1].map((channel) => build(n, seed + channel * 7919, sampleRate));
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
