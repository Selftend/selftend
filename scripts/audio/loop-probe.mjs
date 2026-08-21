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

/** What loop mode would actually return for a request of `requestedSeconds`. */
export function loopReturnedSeconds(requestedSeconds) {
  const quanta = requestedSeconds / LOOP_DURATION_QUANTUM_SECONDS;
  // ☠️ Rounded before the ceiling, deliberately. 30 / 0.75 is 40.00000000000001 in
  // binary floating point, and a bare `Math.ceil` turns that into 41 quanta —
  // reporting the one duration that is known to be honoured exactly as a
  // half-second stretch. The epsilon is the arithmetic, not a fudge.
  const whole =
    Math.abs(quanta - Math.round(quanta)) < 1e-9 ? Math.round(quanta) : Math.ceil(quanta);
  return whole * LOOP_DURATION_QUANTUM_SECONDS;
}

/** The response header that says what a generation actually cost. */
export const CHARGED_CREDITS_HEADER = "character-cost";

/**
 * ☠️☠️ WHAT A CALL ACTUALLY COST, off the response itself.
 *
 * `character-cost` is a response header: exact, immediate, and free to read. It
 * answered #1347's billing question — requested seconds, no loop-mode premium —
 * even though the key on hand lacked `user_read` and 401'd on the balance
 * endpoint entirely. Prefer it over a balance delta everywhere cost is reported
 * (#1359); `costReading` is where that preference lives.
 *
 * Takes anything header-shaped: a `Headers`, a `Map`, or the plain object
 * `allHeaders()` produces. `fetch` lower-cases header names but a stub or a
 * replayed recording need not, so the lookup is case-insensitive — a missed
 * header degrades silently to the lagging instrument, which is the failure this
 * whole function exists to prevent.
 */
export function chargedCredits(headers) {
  if (!headers) return null;
  const entries =
    typeof headers.entries === "function" ? [...headers.entries()] : Object.entries(headers);
  const hit = entries.find(([name]) => String(name).toLowerCase() === CHARGED_CREDITS_HEADER);
  if (!hit) return null;
  const raw = String(hit[1]).trim();
  const value = Number(raw);
  // ☠️ null, never NaN. A NaN reaches a manifest row as `null` anyway but poisons
  // any total it is summed into, silently erasing every other take's real cost.
  // `Number("")` is 0, so an empty header has to be caught before the conversion.
  return raw !== "" && Number.isFinite(value) ? value : null;
}

/**
 * Which cost instrument to believe, and say so out loud.
 *
 * ☠️ THE BALANCE LAGS AND IS NOT A COST INSTRUMENT. Across a 22-credit call
 * `/user/subscription` did not move at all — 38,893 before, 38,893 after — and
 * then reconciled exactly by the end of the session. A delta read straight after
 * a call can therefore report ZERO for a call that spent real, unrepeatable
 * credits. It stays as the fallback for a response with no header, and every
 * reading names the instrument it came from so a surprising number can be
 * attributed rather than argued with.
 */
export function costReading({ charged, spent }) {
  if (Number.isFinite(charged)) {
    return {
      credits: charged,
      source: `${CHARGED_CREDITS_HEADER} header`,
      exact: true,
      // The lag is evidence about the instrument, so it is reported rather than
      // dropped — a disagreement here is the expected behaviour, not a fault.
      note: Number.isFinite(spent) && spent !== charged ? `balance delta says ${spent}` : null,
    };
  }
  if (Number.isFinite(spent)) {
    return { credits: spent, source: "balance delta (lags)", exact: false, note: null };
  }
  return { credits: NaN, source: "unavailable", exact: false, note: null };
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
 * Which hypothesis the measured spend matches, if either.
 *
 * Fed the figure `costReading` chose — the `character-cost` header where there is
 * one, the balance delta otherwise. A non-finite number in means neither
 * instrument spoke (the recorded key lacks `user_read` and `probe-results.json`
 * carries the 401), so this has to report "unknown" rather than silently pick the
 * cheaper story.
 */
export function creditVerdict({ spent, hypotheses, tolerance = 1 }) {
  if (!Number.isFinite(spent)) return "unknown — no cost reading available";
  const near = (value) => Math.abs(spent - value) <= tolerance;
  if (near(hypotheses.ifChargedOnRequested) && near(hypotheses.ifChargedOnReturned))
    return "requested and returned agree — this call cannot separate them";
  if (near(hypotheses.ifChargedOnRequested)) return "charged on the REQUESTED seconds";
  if (near(hypotheses.ifChargedOnReturned)) return "charged on the RETURNED seconds";
  return `matches neither hypothesis (${spent} credits)`;
}
