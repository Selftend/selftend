/**
 * The seam gate, calibrated against material whose seam is KNOWN (#1571).
 *
 * ☠️ WHY THIS FILE EXISTS. The gate's `energyDeltaRatio` failed five of the nine
 * shipped beds, and the audio was fine — the measurement was not. Two independent
 * defects, and neither could be seen from the bed table because nothing in the
 * repo ever scored the gate against a clip guaranteed to have no seam:
 *
 *   1. Numerator and denominator were different statistics. `headTailDb` is the
 *      |difference between TWO windows|; the old `naturalDb` was the median
 *      |deviation of ONE window from the clip's centre|. A difference of two draws
 *      runs ~1.4x a single deviation with nothing wrong at all, so the docblock's
 *      "seam-clean material scores ~1" was unreachable by construction. Worse for
 *      slowly-wandering material: brown noise moves little between neighbours and
 *      a lot across 30s, so it scored 2.68x against a 2.0 limit with a seam that
 *      is mathematically zero.
 *
 *   2. It measured the ENCODED file. AAC's MDCT has no wrap-around context at a
 *      file's two ends, so the decoded head and tail differ from the master at
 *      exactly the two windows this check samples. Synth white noise moved from
 *      0.98x on the master to 19.93x encoded.
 *
 * The synth beds are the control that makes both visible: `synth-noise.mjs` builds
 * them by circular filtering, so the last sample flows into the first exactly as
 * it flows into any other, and `test/audio-synth-noise.test.ts` asserts that
 * directly. They cost no credits, need no ffmpeg and need no asset on disk — which
 * is why the gate can now be re-derived at any time.
 *
 * ⚠️ These are the SYNTH beds, not the six ElevenLabs ones. Those masters are
 * unrepeatable and no longer on any disk, so this file cannot speak for them; what
 * it fixes is the instrument they will be measured with on the next render.
 */
import { SEAM_LIMITS, seamMetrics } from "../scripts/audio/postprocess.mjs";
import { synthesiseBed } from "../scripts/audio/synth-noise.mjs";

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const SECONDS = 30;

/** The three beds that are periodic by construction. */
const SEAMLESS_KINDS = ["white-noise", "pink-noise", "brown-noise"] as const;

/**
 * `synthesiseBed` hands back interleaved s16le; `seamMetrics` wants floats.
 *
 * Memoised because synthesis is the expensive part — 30s of stereo brown noise is
 * a 1.3 M-sample circular filter — and it is deterministic (`SYNTH_SEED`), so
 * every test in this file wants the identical array rather than its own copy.
 */
const cache = new Map<string, Float32Array>();
function bed(kind: (typeof SEAMLESS_KINDS)[number]): Float32Array {
  const hit = cache.get(kind);
  if (hit) return hit;
  const buf = synthesiseBed({ kind, seconds: SECONDS, sampleRate: SAMPLE_RATE });
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(i * 2) / 32768;
  cache.set(kind, out);
  return out;
}

/**
 * The defect the head/tail half exists to catch: the level walks steadily down
 * across the clip, so every loop point is an audible jump back up.
 */
function withDrift(samples: Float32Array, db: number): Float32Array {
  const out = Float32Array.from(samples);
  const frames = samples.length / CHANNELS;
  for (let i = 0; i < frames; i += 1) {
    const gain = 10 ** ((-db * (i / frames)) / 20);
    for (let c = 0; c < CHANNELS; c += 1) out[i * CHANNELS + c] *= gain;
  }
  return out;
}

const ratioOf = (samples: Float32Array) =>
  seamMetrics(samples, CHANNELS, SAMPLE_RATE).energyDeltaRatio;

describe("the head/tail half judges a step against the same kind of step", () => {
  it.each(SEAMLESS_KINDS)("passes %s, which cannot have a seam", (kind) => {
    // ☠️ The assertion that catches defect 1. brown-noise scored 2.68x here
    // against the old 2.0 limit, and pink 1.85x — a "known-good" population
    // straddling its own threshold, which is not a gate.
    expect(ratioOf(bed(kind))).toBeLessThanOrEqual(SEAM_LIMITS.energyDeltaRatio);
  });

  it("scores a genuinely seamless clip near 1, not near 1.4", () => {
    // White noise is the case with no colour to it: adjacent windows and distant
    // windows are drawn from the same distribution, so a correct instrument reads
    // ~1. The old one read 0.05x, because its denominator was pinned at a 0.5 dB
    // floor two orders of magnitude above the real step. A number far below 1 is
    // as much a broken instrument as one far above it.
    const metrics = seamMetrics(bed("white-noise"), CHANNELS, SAMPLE_RATE);
    expect(metrics.energyDeltaRatio).toBeGreaterThan(0.5);
    expect(metrics.energyDeltaRatio).toBeLessThan(1.5);
    // The floor must not be what is doing the work.
    expect(metrics.naturalStepDb).toBeGreaterThan(0.02);
  });

  it.each(SEAMLESS_KINDS)("still catches a 6 dB drift across %s", (kind) => {
    expect(ratioOf(withDrift(bed(kind), 6))).toBeGreaterThan(SEAM_LIMITS.energyDeltaRatio);
  });

  it("separates clean from drifting with no overlap, which is what sets the limit", () => {
    // The limit is not a taste: it is the gap between two measured populations.
    // Re-run `node scripts/audio/calibrate-seam.mjs` after touching either.
    const clean = SEAMLESS_KINDS.map((kind) => ratioOf(bed(kind)));
    const drifting = SEAMLESS_KINDS.map((kind) => ratioOf(withDrift(bed(kind), 3)));

    expect(Math.max(...clean)).toBeLessThan(Math.min(...drifting));
    expect(Math.max(...clean)).toBeLessThanOrEqual(SEAM_LIMITS.energyDeltaRatio);
    expect(Math.min(...drifting)).toBeGreaterThan(SEAM_LIMITS.energyDeltaRatio);
  });

  it("does not fail a hard cut of stochastic material, which is a true negative", () => {
    // Documented in postprocess.mjs: splicing two independent stretches of dense
    // noise is inaudible, and the gate is not supposed to fail it. Asserted so
    // that tightening the limit to "catch more" has to break a test that explains
    // why it should not.
    const samples = bed("white-noise");
    const cut = samples.slice(0, (samples.length / CHANNELS - 3 * SAMPLE_RATE) * CHANNELS);
    expect(seamMetrics(cut, CHANNELS, SAMPLE_RATE).energyDeltaRatio).toBeLessThanOrEqual(
      SEAM_LIMITS.energyDeltaRatio,
    );
  });
});
