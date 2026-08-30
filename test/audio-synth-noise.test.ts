/**
 * The three computed noise beds (#1130).
 *
 * ☠️ WHY THIS FILE EXISTS. These beds replaced ElevenLabs masters on a specific
 * promise: that computing them is not a compromise but strictly better —
 * spectrally exact, seamless, reproducible, and inside the loudness spec the
 * generated ones kept missing. Every one of those is a measurable claim, and an
 * untested DSP change can break any of them while still producing a plausible
 * hiss. So the properties are asserted, not eyeballed.
 *
 * No ffmpeg and no API: everything here reads the PCM the generator returns.
 */
import {
  SYNTH_SEED,
  mulberry32,
  synthesiseBed,
  synthMasterName,
} from "../scripts/audio/synth-noise.mjs";
import {
  BEDS,
  SFX_CLIPS,
  SHIPPED_SFX_CLIPS,
  SYNTH_BEDS,
  TRUE_PEAK_CEILING_DBTP,
} from "../scripts/audio/catalog.mjs";
import { maxCrestDb } from "../scripts/audio/take-gate.mjs";

/** Left channel as floats, which is where every measurement below is taken. */
function leftChannel(pcm: Buffer): Float64Array {
  const frames = pcm.length / 4;
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) out[i] = pcm.readInt16LE(i * 4) / 32767;
  return out;
}

function rms(x: Float64Array): number {
  let sum = 0;
  for (const v of x) sum += v * v;
  return Math.sqrt(sum / x.length);
}

function peak(x: Float64Array): number {
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  return max;
}

/** Crest factor in dB — peak over RMS, the number the gate cares about. */
function crestDb(x: Float64Array): number {
  return 20 * Math.log10(peak(x) / rms(x));
}

/**
 * A cheap stand-in for a spectrum: the RMS of the first difference, relative to
 * the RMS of the signal. Differencing is a high-pass, so this rises with high
 * frequency content and separates the three slopes without an FFT.
 */
function highFrequencyRatio(x: Float64Array): number {
  let sum = 0;
  for (let i = 1; i < x.length; i += 1) {
    const d = x[i] - x[i - 1];
    sum += d * d;
  }
  return Math.sqrt(sum / (x.length - 1)) / rms(x);
}

const KINDS = ["white-noise", "pink-noise", "brown-noise"] as const;

describe("the noise beds are computed, not generated", () => {
  it("keeps all three out of the render list and inside the ship list", () => {
    // The whole saving depends on this: a synth bed that leaked into SFX_CLIPS
    // would be quoted, generated and paid for.
    expect(SYNTH_BEDS.map((b: { id: string }) => b.id).sort()).toEqual([
      "brown-noise",
      "pink-noise",
      "white-noise",
    ]);
    const rendered = SFX_CLIPS.map((c: { id: string }) => c.id);
    const shipped = SHIPPED_SFX_CLIPS.map((c: { id: string }) => c.id);
    for (const kind of KINDS) {
      expect(rendered).not.toContain(kind);
      expect(shipped).toContain(kind);
    }
  });

  it("still ships every bed, synth and generated alike", () => {
    const shipped = SHIPPED_SFX_CLIPS.map((c: { id: string }) => c.id);
    for (const bed of BEDS) expect(shipped).toContain(bed.id);
  });
});

describe("synthesiseBed", () => {
  it("reproduces the same bytes from the same seed", () => {
    // The property the ElevenLabs masters can never have, and the reason these
    // three do not need archiving at all.
    expect(synthesiseBed({ kind: "pink-noise", seconds: 1 })).toEqual(
      synthesiseBed({ kind: "pink-noise", seconds: 1 }),
    );
  });

  it("produces different audio from a different seed", () => {
    expect(synthesiseBed({ kind: "pink-noise", seconds: 1, seed: 1 })).not.toEqual(
      synthesiseBed({ kind: "pink-noise", seconds: 1, seed: 2 }),
    );
  });

  it("writes interleaved 16-bit stereo at the master rate", () => {
    const pcm = synthesiseBed({ kind: "white-noise", seconds: 2, sampleRate: 8000 });
    expect(pcm.length).toBe(2 * 8000 * 2 * 2);
  });

  it("refuses a kind it cannot compute", () => {
    expect(() => synthesiseBed({ kind: "grey-noise", seconds: 1 })).toThrow(/unknown noise kind/);
  });

  it.each(KINDS)("gives %s a crest the loudness gate will accept", (kind) => {
    // ☠️ THE POINT OF THE WHOLE EXERCISE. A take is unusable when it cannot be
    // gained to its target under the -3 dBTP ceiling, which happens exactly when
    // its crest exceeds `maxCrestDb`. Beds target -20, so the budget is 17 dB;
    // 10 of Round B's 22 accepted takes failed this and nothing noticed.
    const x = leftChannel(synthesiseBed({ kind, seconds: 3 }));
    expect(crestDb(x)).toBeLessThan(maxCrestDb(-20));
  });

  it.each(KINDS)("leaves %s real headroom rather than arriving at the rail", (kind) => {
    // `brown-noise` came back from Round B pinned at full scale, and gain
    // reduction cannot unflatten a clipped peak.
    const x = leftChannel(synthesiseBed({ kind, seconds: 2 }));
    expect(peak(x)).toBeLessThan(0.95);
    expect(peak(x)).toBeGreaterThan(0.05);
  });

  it("orders the three slopes white > pink > brown", () => {
    // The spectral claim, and the one a wrong filter coefficient breaks silently.
    const hf = Object.fromEntries(
      KINDS.map((kind) => [
        kind,
        highFrequencyRatio(leftChannel(synthesiseBed({ kind, seconds: 3 }))),
      ]),
    );
    expect(hf["white-noise"]).toBeGreaterThan(hf["pink-noise"]);
    expect(hf["pink-noise"]).toBeGreaterThan(hf["brown-noise"]);
  });

  it.each(KINDS)("wraps %s seamlessly, so it loops with no fold", (kind) => {
    // ☠️ The circular filtering is what earns `loop: true` and skips the fold. If
    // someone replaces it with a plain left-to-right pass this is the assertion
    // that fails: the join would become a step far larger than a normal sample
    // transition, which is the seam a bed is gated on.
    const x = leftChannel(synthesiseBed({ kind, seconds: 2 }));
    let steps = 0;
    for (let i = 1; i < x.length; i += 1) steps += Math.abs(x[i] - x[i - 1]);
    const meanStep = steps / (x.length - 1);
    const wrapStep = Math.abs(x[x.length - 1] - x[0]);
    expect(wrapStep).toBeLessThan(meanStep * 8);
  });

  it("gives the two channels different noise, so the bed has width", () => {
    const pcm = synthesiseBed({ kind: "white-noise", seconds: 1 });
    const frames = pcm.length / 4;
    let identical = true;
    for (let i = 0; i < frames && identical; i += 1) {
      if (pcm.readInt16LE(i * 4) !== pcm.readInt16LE(i * 4 + 2)) identical = false;
    }
    expect(identical).toBe(false);
  });
});

describe("mulberry32", () => {
  it("is a pure function of its seed", () => {
    const a = mulberry32(SYNTH_SEED);
    const b = mulberry32(SYNTH_SEED);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays inside [0, 1)", () => {
    const next = mulberry32(7);
    for (let i = 0; i < 2000; i += 1) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("synthMasterName", () => {
  it("uses the same slot naming `render` writes, so postprocess needs no special case", () => {
    expect(synthMasterName("white-noise")).toBe("white-noise-c01-a01.pcm");
  });
});

describe("the ceiling the crest budget is derived from", () => {
  it("is the one the catalog publishes", () => {
    expect(TRUE_PEAK_CEILING_DBTP).toBe(-3);
    expect(maxCrestDb(-20)).toBe(17);
    expect(maxCrestDb(-23)).toBe(20);
  });
});
