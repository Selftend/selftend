/**
 * Reading what `loop: true` actually returns (#1347).
 *
 * Kept apart from `render.mjs` for the same reason `take-gate.mjs` is: everything
 * here is a pure function of bytes and samples, so the whole decision surface can
 * be exercised in jest without a key, without credits and without ffmpeg. The
 * part that spends lives next door and is driven against a stubbed API.
 *
 * ☠️ WHY THIS EXISTS. `audio-masters/probe-results.json` has recorded since #1214
 * that `loop: true` is accepted with lossless `pcm_48000` on Creator — 288,000
 * bytes against the 192,000 a 1s stereo request returns. Nobody acted on it, and
 * #1138 had already made the `seamless()` fold the default bed path on the belief
 * (from #1131) that loop mode forces MP3 and so collides with #1134's
 * zero-leading-silence rule. That belief is false, and #1296 has since measured
 * what the fold costs: a 30s render becomes a 29.6s bed, and the crossfade dips
 * -0.20 dB (rain) to -4.87 dB (brown-noise) at every loop point.
 *
 * ☠️ RAW PCM CARRIES NO HEADER, so a returned buffer is genuinely ambiguous: the
 * 1s loop probe's 288,000 bytes is 1.5s of stereo or 3.0s of mono, and the code
 * that recorded it did not even derive a channel count. Both halves of that
 * ambiguity are answered here — the duration by asking for 30s and reading the
 * byte count, the channel count by a measurement that survives it.
 */

/** 1 sample of 16-bit PCM. Sound Effects returns `pcm_*` at this depth only. */
const BYTES_PER_SAMPLE = 2;

/** Half a frame of slack — the API returns whole frames, never a fractional one. */
const DURATION_TOLERANCE_SECONDS = 0.01;

/** "Must be at least 0.5 and at most 30" — the sound-generation reference. */
export const SFX_MAX_DURATION_SECONDS = 30;

/**
 * ☠️ LOOP MODE ROUNDS THE RETURNED DURATION UP TO THE NEXT 0.75s MULTIPLE.
 *
 * Measured three times for three, on the live API: 1s came back 1.5s, 2s came
 * back 2.25s, 30s came back 30.000s exactly. The "1.5x" the #1214 probe recorded
 * is real but is not a multiplier — it is what quantising 1s up to 1.5s looks
 * like from a single sample. 2s -> 2.25s is 1.125x, which no multiplier explains.
 *
 * ⚠️ 30s SURVIVES BY ARITHMETIC, NOT BY CLASS. 30 = 40 x 0.75 exactly, so beds
 * are untouched — but a 10s clip would come back 10.5s, and anything that ever
 * asks loop mode for a non-multiple gets more audio than it requested. Billing is
 * on the REQUESTED seconds, so the surplus is free; what it costs is the length
 * of an unrepeatable master, which `outputSpecFor`'s numbers and #1138's bundle
 * arithmetic both assume they know.
 *
 * Exported so the catalog's durations can be held to it by test rather than by
 * anyone remembering this paragraph.
 */
export const LOOP_DURATION_QUANTUM_SECONDS = 0.75;

/**
 * What loop mode would actually return for a request of `requestedSeconds`.
 *
 * ⚠️ No floating-point epsilon here, and none is needed: 0.75 is 3/4, which IEEE
 * 754 represents exactly, so dividing an exact multiple of it by it is exact and
 * `Math.ceil` cannot overshoot. (An epsilon was written in on the assumption that
 * 30 / 0.75 lands at 40.00000000000001. It does not — it is exactly 40 — and the
 * guard was unreachable by construction, which is how the mutation test found it.)
 */
export function loopReturnedSeconds(requestedSeconds) {
  const quanta = Math.ceil(requestedSeconds / LOOP_DURATION_QUANTUM_SECONDS);
  return quanta * LOOP_DURATION_QUANTUM_SECONDS;
}

/**
 * The duration to actually ask this clip for, given the one you had in mind.
 *
 * ☠️ THE CATALOG'S DURATIONS ARE NOT THE ONLY DURATIONS ASKED FOR. `preflight`
 * grades every prompt at 4s, and 4 is not a multiple of 0.75 — so once beds render
 * `loop: true`, a bed asked for 4s comes back at 4.5s and the grader is measuring
 * material half a second longer than it believes. Billing is on the requested
 * seconds so the surplus is free; what it costs is an instrument that no longer
 * knows the shape of its own input.
 *
 * ⚠️ The answer is to ask for the honoured length, NOT to grade beds with
 * `loop: false`. A bed graded in a different render mode from the one it is
 * clearing for spend is grading the wrong material — which is the whole reason
 * #1347 had to be settled before Round B rather than after it.
 */
export function requestSecondsFor(clip, seconds) {
  return clip.loop ? loopReturnedSeconds(seconds) : seconds;
}

/**
 * Every reading a raw PCM buffer admits, and which of them honours the request.
 *
 * The point is not to guess: it is to state the two candidate durations side by
 * side so the byte count alone can rule one out. At a 30s request, "45s stereo"
 * and "90s mono" are both arithmetically available and only one of them is under
 * the API's own 30s cap.
 */
export function describeReturn({ bytes, requestedSeconds, sampleRate }) {
  const perChannelSecond = sampleRate * BYTES_PER_SAMPLE;
  const secondsIfMono = bytes / perChannelSecond;
  const secondsIfStereo = bytes / (perChannelSecond * 2);
  const honoured = (seconds) => Math.abs(seconds - requestedSeconds) <= DURATION_TOLERANCE_SECONDS;

  return {
    bytes,
    requestedSeconds,
    secondsIfMono,
    secondsIfStereo,
    /** How far the shipping reading (stereo — #1159) is from what was asked for. */
    durationRatioIfStereo: secondsIfStereo / requestedSeconds,
    honouredAsStereo: honoured(secondsIfStereo),
    honouredAsMono: honoured(secondsIfMono),
    /** Above the API's documented ceiling, so a reading that lands here is not real. */
    monoExceedsApiCap: secondsIfMono > SFX_MAX_DURATION_SECONDS,
  };
}

/**
 * Zero crossings per second, averaged over channels.
 *
 * ☠️ THIS IS THE ONLY THING THAT SEPARATES THE TWO READINGS. Correlation does not:
 * `SHARED_TAIL` asks for no wide stereo, so a genuine stereo bed is near-mono
 * anyway, and a mono stream misread as stereo puts *adjacent* samples of
 * low-frequency material in the two channels, which is also near-perfectly
 * correlated. Rate does. Reading a mono stream as stereo is decimation by two at
 * an unchanged assumed sample rate — the same crossings over half the assumed
 * duration — so crossings per second come back exactly doubled while every level
 * measurement stays put.
 *
 * Compared against a control rendered from the same prompt at the same duration,
 * because the absolute figure is a property of the material and only the ratio is
 * a property of the reading.
 */
export function zeroCrossingsPerSecond(samples, channels, sampleRate) {
  const frames = samples.length / channels;
  if (frames < 2) return 0;
  let crossings = 0;
  for (let c = 0; c < channels; c++) {
    let previous = samples[c];
    for (let f = 1; f < frames; f++) {
      const current = samples[f * channels + c];
      if ((previous < 0 && current >= 0) || (previous >= 0 && current < 0)) crossings += 1;
      previous = current;
    }
  }
  return crossings / channels / (frames / sampleRate);
}

/** Ratios closer to these than to each other decide the reading; anything else does not. */
const STEREO_RATIO = 1;
const MONO_MISREAD_RATIO = 2;
const RATIO_TOLERANCE = 0.25;

/**
 * Which reading the crossing rates support — or that they support neither.
 *
 * ⚠️ `unclear` is a real outcome and must stay one. The material is stochastic and
 * seedless, so probe and control are different draws of the same prompt; a ratio
 * between the two hypotheses means the measurement did not separate them and the
 * ear has to, which is why both readings are written out as playable files
 * whatever this returns.
 */
export function channelReading({ probeZcr, controlZcr }) {
  if (!Number.isFinite(probeZcr) || !Number.isFinite(controlZcr) || controlZcr <= 0) {
    return { reading: "unclear", ratio: null };
  }
  const ratio = probeZcr / controlZcr;
  if (Math.abs(ratio - STEREO_RATIO) <= RATIO_TOLERANCE) return { reading: "stereo", ratio };
  if (Math.abs(ratio - MONO_MISREAD_RATIO) <= RATIO_TOLERANCE)
    return { reading: "mono-misread-as-stereo", ratio };
  return { reading: "unclear", ratio };
}

/**
 * What the pass would be charged, both ways round.
 *
 * ⚠️ #1320's lesson, one question earlier: quote the case that can surprise you.
 * If loop mode returns 1.5x the seconds asked for and bills on what it returns,
 * every bed costs half again as much as `plan` says — so the probe reads the live
 * balance either side of the call and the two hypotheses are printed against the
 * measured delta rather than assumed.
 */
export function creditHypotheses({ requestedSeconds, returnedSeconds, creditsPerSecond }) {
  return {
    ifChargedOnRequested: requestedSeconds * creditsPerSecond,
    ifChargedOnReturned: returnedSeconds * creditsPerSecond,
  };
}

/**
 * Which hypothesis a measured cost matches, if either.
 *
 * ⚠️ The parameter is `credits`, not `spent`: it is fed whatever `costReading`
 * chose — normally the `character-cost` header, and only otherwise a balance
 * delta. Calling it "spent" invited the reading that this matches against the
 * balance, which is the weaker instrument and not usually the one talking.
 *
 * A non-finite number in means neither instrument spoke (the recorded key lacks
 * `user_read` and `probe-results.json` carries the 401), so this has to report
 * "unknown" rather than silently pick the cheaper story.
 */
export function creditVerdict({ credits, hypotheses, tolerance = 1 }) {
  if (!Number.isFinite(credits)) return "unknown — no cost reading available";
  const near = (value) => Math.abs(credits - value) <= tolerance;
  if (near(hypotheses.ifChargedOnRequested) && near(hypotheses.ifChargedOnReturned))
    return "requested and returned agree — this call cannot separate them";
  if (near(hypotheses.ifChargedOnRequested)) return "charged on the REQUESTED seconds";
  if (near(hypotheses.ifChargedOnReturned)) return "charged on the RETURNED seconds";
  return `matches neither hypothesis (${credits} credits)`;
}
