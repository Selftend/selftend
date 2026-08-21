/**
 * The decision surface of the `loop: true` probe (#1347).
 *
 * ☠️ WHY THIS FILE EXISTS AT ALL. `audio-masters/probe-results.json` recorded
 * `loop: true` returning 288,000 bytes of lossless PCM for a 1s request back on
 * #1214, and the belief it contradicts — that loop mode forces MP3 — had already
 * made the `seamless()` fold the default bed path in #1138. A recorded number
 * nobody could interpret is a number nobody acts on: 288,000 bytes is 1.5s of
 * stereo *or* 3.0s of mono, and the probe that wrote it did not derive a channel
 * count. Everything here is the arithmetic that makes such a buffer readable,
 * pinned so the next reading is not a fresh guess.
 *
 * Costs nothing and needs no ffmpeg — the spending half is driven separately
 * against a stubbed API.
 */
import {
  SFX_MAX_DURATION_SECONDS,
  channelReading,
  creditHypotheses,
  creditVerdict,
  describeReturn,
  zeroCrossingsPerSecond,
} from "../scripts/audio/loop-probe.mjs";
import { edgeSilence } from "../scripts/audio/postprocess.mjs";

const RATE = 48000;

/** One second of stereo 16-bit at 48k, the shape #1159 established. */
const ONE_SECOND_STEREO_BYTES = RATE * 2 * 2;

function sine(frequency: number, seconds: number, sampleRate = RATE, amplitude = 0.5) {
  const samples = new Float32Array(Math.round(seconds * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return samples;
}

describe("describeReturn reads a headerless buffer both ways", () => {
  it("states both readings of the 1s loop probe already on disk", () => {
    const shape = describeReturn({ bytes: 288000, requestedSeconds: 1, sampleRate: RATE });

    expect(shape.secondsIfStereo).toBe(1.5);
    expect(shape.secondsIfMono).toBe(3);
    // Neither reading is the duration that was asked for — the whole reason the
    // 30s case has to be run rather than extrapolated.
    expect(shape.honouredAsStereo).toBe(false);
    expect(shape.honouredAsMono).toBe(false);
    expect(shape.durationRatioIfStereo).toBe(1.5);
    // 3s is legal, so this buffer cannot rule the mono reading out on the cap.
    expect(shape.monoExceedsApiCap).toBe(false);
  });

  it("recognises a request that was honoured exactly, as the control's was", () => {
    const shape = describeReturn({
      bytes: ONE_SECOND_STEREO_BYTES * 30,
      requestedSeconds: 30,
      sampleRate: RATE,
    });

    expect(shape.honouredAsStereo).toBe(true);
    expect(shape.secondsIfStereo).toBe(30);
    // ⚠️ This is what makes the 30s call decisive where the 1s one was not: the
    // mono reading of a 30s-shaped buffer is 60s, over the API's own ceiling, so
    // arithmetic alone eliminates it.
    expect(shape.secondsIfMono).toBe(60);
    expect(shape.monoExceedsApiCap).toBe(true);
  });

  it("eliminates the mono reading when 1.5x lands past the API cap", () => {
    const shape = describeReturn({
      bytes: ONE_SECOND_STEREO_BYTES * 45,
      requestedSeconds: 30,
      sampleRate: RATE,
    });

    expect(shape.secondsIfStereo).toBe(45);
    expect(shape.durationRatioIfStereo).toBe(1.5);
    expect(shape.secondsIfMono).toBe(90);
    expect(shape.monoExceedsApiCap).toBe(true);
    expect(SFX_MAX_DURATION_SECONDS).toBe(30);
  });

  it("tolerates the frame-rounding a real return carries, but not a real miss", () => {
    // 30s minus a single frame — a whole-frame return, not a different duration.
    const rounded = describeReturn({
      bytes: ONE_SECOND_STEREO_BYTES * 30 - 4,
      requestedSeconds: 30,
      sampleRate: RATE,
    });
    expect(rounded.honouredAsStereo).toBe(true);

    // 100ms short is a different duration and must not be waved through.
    const short = describeReturn({
      bytes: ONE_SECOND_STEREO_BYTES * 29.9,
      requestedSeconds: 30,
      sampleRate: RATE,
    });
    expect(short.honouredAsStereo).toBe(false);
  });
});

describe("zeroCrossingsPerSecond separates the two readings", () => {
  it("counts a known tone at twice its frequency", () => {
    // 199, not 200: a one-second window holds one fewer crossing than a full
    // cycle count, which is the arithmetic and not an error to be tuned away.
    expect(zeroCrossingsPerSecond(sine(100, 1), 1, RATE)).toBeCloseTo(200, -1);
  });

  /**
   * ☠️ THE LOAD-BEARING CLAIM. Reading a mono stream as stereo is decimation by
   * two at an unchanged assumed sample rate: the same crossings over half the
   * assumed duration. If that doubling did not hold, the probe would have no way
   * at all to tell 45s of stereo from 90s of mono, because every level and
   * loudness measurement is identical under both readings.
   */
  it("doubles when a mono buffer is misread as stereo", () => {
    const mono = sine(100, 1);
    const trueRate = zeroCrossingsPerSecond(mono, 1, RATE);
    const misread = zeroCrossingsPerSecond(mono, 2, RATE);

    expect(misread / trueRate).toBeCloseTo(2, 1);
  });

  it("is unmoved by amplitude, which is what every other measurement reads", () => {
    expect(zeroCrossingsPerSecond(sine(100, 1, RATE, 0.01), 1, RATE)).toBeCloseTo(
      zeroCrossingsPerSecond(sine(100, 1, RATE, 0.9), 1, RATE),
      0,
    );
  });

  it("returns zero rather than dividing by nothing on a buffer too short to cross", () => {
    expect(zeroCrossingsPerSecond(new Float32Array([0.5]), 1, RATE)).toBe(0);
  });
});

describe("channelReading refuses to guess", () => {
  it("reads a matching crossing rate as genuine stereo", () => {
    expect(channelReading({ probeZcr: 412, controlZcr: 400 }).reading).toBe("stereo");
  });

  it("reads a doubled crossing rate as a mono stream misread", () => {
    expect(channelReading({ probeZcr: 800, controlZcr: 400 }).reading).toBe(
      "mono-misread-as-stereo",
    );
  });

  /**
   * ⚠️ `unclear` is a real outcome, not a failure to try harder. Probe and control
   * are two draws of a seedless stochastic prompt, so a ratio between the two
   * hypotheses means the measurement did not separate them and the ear must.
   */
  it("says unclear when the ratio sits between the hypotheses", () => {
    const between = channelReading({ probeZcr: 600, controlZcr: 400 });
    expect(between.reading).toBe("unclear");
    expect(between.ratio).toBe(1.5);
  });

  it("says unclear rather than dividing by a missing control", () => {
    expect(channelReading({ probeZcr: 400, controlZcr: 0 }).reading).toBe("unclear");
    expect(channelReading({ probeZcr: NaN, controlZcr: 400 }).reading).toBe("unclear");
  });
});

describe("the credit question is matched against both billing models", () => {
  const hypotheses = creditHypotheses({
    requestedSeconds: 60,
    returnedSeconds: 75,
    creditsPerSecond: 3.3,
  });

  it("prices both stories", () => {
    expect(hypotheses.ifChargedOnRequested).toBeCloseTo(198, 5);
    expect(hypotheses.ifChargedOnReturned).toBeCloseTo(247.5, 5);
  });

  it("names which one the measured spend matches", () => {
    expect(creditVerdict({ credits: 198, hypotheses })).toContain("REQUESTED");
    expect(creditVerdict({ credits: 248, hypotheses })).toContain("RETURNED");
  });

  /**
   * ☠️ The key that wrote `probe-results.json` lacks `user_read` and 401s on the
   * balance endpoint. An unreadable balance must report itself, never quietly
   * settle on the cheaper story.
   */
  it("reports an unreadable balance as unknown", () => {
    expect(creditVerdict({ credits: NaN, hypotheses })).toContain("unknown");
  });

  it("admits when the call it was given cannot separate the two", () => {
    const same = creditHypotheses({
      requestedSeconds: 30,
      returnedSeconds: 30,
      creditsPerSecond: 3.3,
    });
    expect(creditVerdict({ credits: 99, hypotheses: same })).toContain("cannot separate");
  });

  it("says so when the spend matches neither", () => {
    expect(creditVerdict({ credits: 4000, hypotheses })).toContain("neither");
  });
});

describe("edgeSilence gives #1134's hard rule its first instrument", () => {
  /** A clip that starts and ends at full level, which is what every prompt asks for. */
  const full = sine(100, 1);

  /**
   * Sub-millisecond, not exactly zero: a sine starts AT zero, so its first sample
   * sits under any floor and reads as one sample of silence. That is honest at the
   * resolution the measurement has, and the rule it serves is about the 250ms scale
   * (#1134) — a single sample can never be the difference.
   */
  it("reports no lead or tail on a clip that begins immediately", () => {
    const edges = edgeSilence(full, 1, RATE);
    expect(edges.leadMs).toBeLessThan(1);
    expect(edges.tailMs).toBeLessThan(1);
    expect(edges.silent).toBe(false);
  });

  it("measures a padded head in milliseconds", () => {
    const padded = new Float32Array(RATE + RATE / 4);
    padded.set(full, RATE / 4); // 250ms of digital silence in front

    const edges = edgeSilence(padded, 1, RATE);
    expect(edges.leadMs).toBeCloseTo(250, 0);
    expect(edges.tailMs).toBe(0);
  });

  it("measures a trailing fade to silence", () => {
    const trailing = new Float32Array(RATE + RATE / 10);
    trailing.set(full, 0); // 100ms of digital silence behind

    const edges = edgeSilence(trailing, 1, RATE);
    expect(edges.leadMs).toBeLessThan(1);
    expect(edges.tailMs).toBeCloseTo(100, 0);
  });

  it("finds the edges of an interleaved stereo buffer, not of one channel", () => {
    const frames = RATE;
    const stereo = new Float32Array(frames * 2);
    for (let f = RATE / 2; f < frames; f++) {
      stereo[f * 2] = 0.5;
      stereo[f * 2 + 1] = 0.5;
    }

    const edges = edgeSilence(stereo, 2, RATE);
    expect(edges.leadMs).toBeCloseTo(500, 0);
  });

  /**
   * ⚠️ The floor is ABSOLUTE, not relative to the clip's own peak. A master is
   * normalised later (#1138), so a -70 dBFS take is not "a quiet clip with no
   * lead" — it is the dud #1320's gate rejects, and calling its whole length
   * signal would hide that.
   */
  it("calls a take under the floor silent rather than loud and lead-free", () => {
    const edges = edgeSilence(sine(100, 1, RATE, 1e-4), 1, RATE);
    expect(edges.silent).toBe(true);
    expect(edges.leadMs).toBeCloseTo(1000, 0);
    expect(edges.peakDbfs).toBeLessThan(-60);
  });

  it("reports the peak it measured, so a borderline call can be checked", () => {
    expect(edgeSilence(sine(100, 1, RATE, 0.5), 1, RATE).peakDbfs).toBeCloseTo(-6, 0);
  });
});
