/**
 * The one gain the post-processor applies, and the empty take that used to
 * poison it (#1346).
 *
 * ☠️ WHY THIS FILE EXISTS. `normalisationGain` decides how loud every shipped
 * clip is, and it did it with unguarded arithmetic on numbers that can come back
 * non-finite. Found by running the audition over the failed Round B's masters:
 * `wind_exhale-c01.pcm` measures -69.76 LUFS-I as stereo, drops under loudnorm's
 * -70 LUFS absolute gate once downmixed to the mono a texture ships as, and
 * loudnorm then prints `-inf` — `Number()` turns that into NaN, the NaN reaches
 * ffmpeg as `volume=NaNdB`, and the run dies behind a wall of filter-graph errors
 * naming neither the file nor the cause. Same trap #1320 met in `classifyTake`.
 *
 * Testing it at all required removing the top-level `await` from
 * `postprocess.mjs` — babel's CJS transform cannot compile one, which is why
 * `test/audio-render-reroll.test.ts` still has to mock the module out wholesale.
 */
import { normalisationGain } from "../scripts/audio/postprocess.mjs";

/** A bed: -20 LUFS-I under a -3 dBTP ceiling (#1138, #1139). */
const BED = { lufs: -20 };

describe("normalisationGain", () => {
  it("takes the loudness target when there is headroom for it", () => {
    // -9.81 LUFS needs -10.19 dB to reach -20; its peak has room to spare.
    const { gain, ceilingBound } = normalisationGain({ lufs: -9.81, dbtp: -6 }, BED);
    expect(gain).toBeCloseTo(-10.19, 2);
    expect(ceilingBound).toBe(false);
  });

  it("is bound by the ceiling when the source has too little headroom", () => {
    // ☠️ brown-noise-c01 of the failed pass, measured: 0.01 dBTP — full scale.
    // Reaching -20 LUFS-I would need +9.8 dB, which would put the peak 12.8 dB
    // over the ceiling that exists because both shipped bells at 0.0 dBTP are
    // exactly the condition that makes AAC decode clip (#1138).
    const { gain, ceilingBound } = normalisationGain({ lufs: -29.8, dbtp: 0.01 }, BED);
    expect(gain).toBeCloseTo(-3.01, 2);
    expect(ceilingBound).toBe(true);
  });

  it("never lets the true peak exceed the ceiling, whichever bound wins", () => {
    for (const pre of [
      { lufs: -9.81, dbtp: -6 },
      { lufs: -29.8, dbtp: 0.01 },
      { lufs: -40, dbtp: -38 },
    ]) {
      const { gain } = normalisationGain(pre, BED);
      expect(pre.dbtp + gain).toBeLessThanOrEqual(-3 + 1e-9);
    }
  });

  it("reports ceilingBound false when the two bounds land on the same number", () => {
    // Exactly at the boundary the gain is still the wanted one, so the run must
    // not report a ceiling cap that did not actually cost anything.
    expect(normalisationGain({ lufs: -20, dbtp: -3 }, BED).ceilingBound).toBe(false);
  });

  it("refuses a take whose loudness came back non-finite, naming the file", () => {
    expect(() =>
      normalisationGain({ lufs: NaN, dbtp: -50.96 }, BED, "wind_exhale-c01.pcm"),
    ).toThrow(/wind_exhale-c01\.pcm has no measurable signal/);
  });

  it("refuses a take whose true peak came back non-finite", () => {
    expect(() => normalisationGain({ lufs: -40, dbtp: NaN }, BED)).toThrow(/no measurable signal/);
  });

  it("says the take cannot be normalised rather than letting NaN reach ffmpeg", () => {
    // The failure mode being guarded: without this, gain is NaN and ffmpeg is
    // handed `volume=NaNdB`.
    expect(() => normalisationGain({ lufs: NaN, dbtp: NaN }, BED)).toThrow(/cannot be normalised/);
  });
});
