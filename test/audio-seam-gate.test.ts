/**
 * Why the seam gate's head/tail half is REPORTED and not GATED (#1571).
 *
 * ☠️ WHY THIS FILE EXISTS. `energyDeltaRatio` blocked five of the nine shipped
 * beds, and the audio was fine. The obvious reading is that the threshold was
 * wrong. It is not: the ratio cannot separate the two populations it would have
 * to separate, under any normalisation tried.
 *
 * A bed whose level legitimately wanders has head and tail levels that
 * legitimately differ. That is indistinguishable, from the numbers alone, from a
 * bed whose level jumps at the loop point — and dividing by "how much this clip
 * moves" does not rescue it, because the material that moves most is exactly the
 * material where a real step hides best. The tests below pin both directions:
 *
 *   - a clean bed can score ABOVE a defective one (so no threshold separates them);
 *   - a real 6 dB step can score BELOW every clean clip (so the defect the check
 *     exists for is unmeasurable on the material it was aimed at).
 *
 * ⚠️ These tests assert the LIMITATION, deliberately. If someone later finds a
 * statistic that does separate the populations, these tests should fail and be
 * deleted — that is the point of writing the counterexamples down rather than a
 * paragraph. `scripts/audio/calibrate-seam.mjs` prints the full table.
 *
 * The synth beds are the fixture because `synth-noise.mjs` builds them by
 * circular filtering — the last sample flows into the first exactly as it flows
 * into any other, asserted directly in `test/audio-synth-noise.test.ts` — so any
 * seam in them is one this file put there on purpose. They cost no credits and
 * need no asset on disk.
 */
import { SEAM_LIMITS, seamMetrics } from "../scripts/audio/postprocess.mjs";
import { mulberry32, synthesiseBed } from "../scripts/audio/synth-noise.mjs";

const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const SECONDS = 30;

/**
 * `synthesiseBed` hands back interleaved s16le; `seamMetrics` wants floats.
 *
 * Memoised because synthesis is the expensive part — 30s of stereo brown noise is
 * a 1.3 M-sample circular filter — and it is deterministic (`SYNTH_SEED`), so
 * every test here wants the identical array rather than its own copy.
 */
const cache = new Map<string, Float32Array>();
function bed(kind: "white-noise" | "brown-noise"): Float32Array {
  const hit = cache.get(kind);
  if (hit) return hit;
  const buf = synthesiseBed({ kind, seconds: SECONDS, sampleRate: SAMPLE_RATE });
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(i * 2) / 32768;
  cache.set(kind, out);
  return out;
}

function scaled(samples: Float32Array, gainAt: (frame: number, frames: number) => number) {
  const out = Float32Array.from(samples);
  const frames = samples.length / CHANNELS;
  for (let i = 0; i < frames; i += 1) {
    const g = gainAt(i, frames);
    for (let c = 0; c < CHANNELS; c += 1) out[i * CHANNELS + c] *= g;
  }
  return out;
}

/** The defect the head/tail half exists to catch: level walks steadily down. */
const withDrift = (samples: Float32Array, db: number) =>
  scaled(samples, (i, frames) => 10 ** ((-db * (i / frames)) / 20));

/**
 * Ambience that legitimately changes level in blocks — wind gusting, rain
 * strengthening, fire flaring. Clean: no seam is introduced, only variation.
 */
const withWander = (samples: Float32Array, db: number, blockSeconds: number) => {
  const rnd = mulberry32(7);
  const block = Math.round(blockSeconds * SAMPLE_RATE);
  const gains: number[] = [];
  for (let b = 0; b * block < samples.length / CHANNELS; b += 1) {
    gains.push(10 ** (((rnd() * 2 - 1) * db) / 20));
  }
  return scaled(samples, (i) => gains[Math.floor(i / block)]);
};

/** A real, audible defect: the last tenth of the clip sits `db` lower. */
const withTailStep = (samples: Float32Array, db: number) =>
  scaled(samples, (i, frames) => (i >= Math.floor(frames * 0.9) ? 10 ** (-db / 20) : 1));

const ratioOf = (samples: Float32Array) =>
  seamMetrics(samples, CHANNELS, SAMPLE_RATE).energyDeltaRatio;

describe("the head/tail ratio cannot be an acceptance criterion", () => {
  it("scores a clean wandering bed ABOVE a bed carrying a real level step", () => {
    // ☠️ The assertion that settles #1571. No threshold can pass the first and
    // fail the second, so no threshold makes this ratio a gate.
    const cleanButWandering = ratioOf(withWander(bed("white-noise"), 3, 1));
    const genuinelyDefective = ratioOf(withTailStep(withWander(bed("white-noise"), 6, 0.25), 6));

    expect(cleanButWandering).toBeGreaterThan(genuinelyDefective);
  });

  it("scores a real 6 dB step below the flat bed it was applied to", () => {
    // The same point from the other side: on material that varies quickly, a
    // genuine 6 dB tail step reads as LESS anomalous than the quiet material it
    // was added to, because the clip's own steps are larger than the defect.
    const flat = ratioOf(bed("white-noise"));
    const stepped = ratioOf(withTailStep(withWander(bed("white-noise"), 6, 0.25), 6));

    expect(stepped).toBeGreaterThan(flat);
    // ...and yet it sits in the same range as clean wandering material, which is
    // what makes it unusable. Both of these are "clean" and "defective" mixed.
    expect(stepped).toBeLessThan(ratioOf(withWander(bed("white-noise"), 3, 1)));
  });

  it("is not one of the gate's limits, so a high score cannot fail a bed", () => {
    // ☠️ The regression guard. Re-adding `energyDeltaRatio` to SEAM_LIMITS is the
    // one-line change that silently restores the false failures, and `report`
    // reads SEAM_LIMITS by key — so an absent key is the whole enforcement.
    expect(Object.keys(SEAM_LIMITS)).toEqual(["wrapStepRatio"]);
  });
});

describe("the wrap-step half, which is still a gate", () => {
  it("passes a bed that is periodic by construction", () => {
    // Both synth beds loop exactly, so the click detector must see nothing.
    for (const kind of ["white-noise", "brown-noise"] as const) {
      expect(seamMetrics(bed(kind), CHANNELS, SAMPLE_RATE).wrapStepRatio).toBeLessThanOrEqual(
        SEAM_LIMITS.wrapStepRatio,
      );
    }
  });

  it("catches a tonal splice, which is the audible defect it exists for", () => {
    // A pure tone whose loop length is not a whole number of cycles: the phase
    // jumps at the wrap and that is a click. This is the control the old
    // `calibrate-seam.mjs` ran against `night`'s drone before that asset was
    // replaced — reconstructed synthetically so it cannot go stale again.
    //
    // ☠️ Two things make this a control, and getting either wrong asserts nothing.
    //
    // 1. THE LENGTH. 440 Hz over exactly 30s is 13,200 whole cycles and loops
    //    PERFECTLY. The clip has to end mid-cycle — here a quarter-cycle past
    //    zero, so the wrap steps from full amplitude straight back to 0.
    //
    // 2. THE FREQUENCY, which is the subtler one. `wrapStep` is the RMS first
    //    difference over ±5 ms, so one discontinuity is averaged against ~880
    //    ordinary samples. A 440 Hz tone's own sample-to-sample steps are big
    //    enough to swallow it — measured, a maximal splice there scores 1.30x,
    //    under the 3.0 limit. At 50 Hz the interior steps are ~9x smaller and the
    //    same splice stands out. That is not a flaw: it is the documented true
    //    negative in `postprocess.mjs` seen from the other side — a click is only
    //    detectable against material quieter than the click. `night`, the bed this
    //    control replaces, was a low drone for exactly that reason.
    const HZ = 50;
    const quarterCycle = Math.round(SAMPLE_RATE / HZ / 4);
    const frames = SECONDS * SAMPLE_RATE + quarterCycle + 1;
    const tone = new Float32Array(frames * CHANNELS);
    for (let i = 0; i < frames; i += 1) {
      const v = 0.5 * Math.sin((2 * Math.PI * HZ * i) / SAMPLE_RATE);
      for (let c = 0; c < CHANNELS; c += 1) tone[i * CHANNELS + c] = v;
    }
    expect(seamMetrics(tone, CHANNELS, SAMPLE_RATE).wrapStepRatio).toBeGreaterThan(
      SEAM_LIMITS.wrapStepRatio,
    );
  });

  it("does not fail a hard cut of stochastic material, which is a true negative", () => {
    // Documented in postprocess.mjs: splicing two independent stretches of dense
    // noise is inaudible, and the gate is not supposed to fail it. Asserted so
    // that tightening the limit to "catch more" has to break a test saying why not.
    const samples = bed("white-noise");
    const cut = samples.slice(0, (samples.length / CHANNELS - 3 * SAMPLE_RATE) * CHANNELS);
    expect(seamMetrics(cut, CHANNELS, SAMPLE_RATE).wrapStepRatio).toBeLessThanOrEqual(
      SEAM_LIMITS.wrapStepRatio,
    );
  });

  it("is unaffected by the drift that the head/tail half was aimed at", () => {
    // Worth pinning: the two halves measure different things, and narrowing the
    // gate to the wrap step does NOT mean drift now fails it by another route.
    // A reader deciding whether the narrowing lost coverage needs this to be
    // explicit rather than inferred.
    const drifted = seamMetrics(withDrift(bed("white-noise"), 6), CHANNELS, SAMPLE_RATE);
    expect(drifted.wrapStepRatio).toBeLessThanOrEqual(SEAM_LIMITS.wrapStepRatio);
    // The head/tail number still moves on drift — it is a real measurement, just
    // not a separating one. It is reported for exactly this reason.
    expect(drifted.energyDeltaRatio).toBeGreaterThan(ratioOf(bed("white-noise")));
  });
});
