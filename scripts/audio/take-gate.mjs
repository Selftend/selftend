/**
 * The level gate and the re-roll bookkeeping for the render pass (#1320).
 *
 * Kept apart from `render.mjs` because this is the only part of the pass that
 * can be exercised without spending credits: everything here is a pure function
 * of the manifest rows already on disk, so `test/audio-take-gate.test.ts` can
 * drive the resume, re-roll and exhaustion paths directly.
 *
 * ☠️ WHY A GATE EXISTS AT ALL. Sound Effects is seedless and stochastic. Measured
 * on #1316 over three takes per prompt, the run-to-run spread on a FIXED prompt
 * was 16-26 dB - larger than the +15..+22 dB that rewriting the prompt bought.
 * Good prompts still throw silent takes. Round B drew 27 times from that
 * distribution with nothing looking at the bytes, and 20 masters came back
 * unusable for ~6,270 credits - a spend recorded as 1,881 until #1359 corrected
 * the rate. Wording cannot fix a distribution; measuring each draw and drawing
 * again can.
 */
import { TRUE_PEAK_CEILING_DBTP } from "./catalog.mjs";

/**
 * The same two thresholds `preflight` grades with, so a prompt faces one bar.
 *
 * Measured on #1316: silent takes land at -40..-47 dBTP, healthy ones at -1..-6.
 * The gap between -30 and -12 is empty in every take measured so far, which is
 * why one threshold can separate "the model produced nothing" from "the model
 * produced something" without a judgement call.
 */
export const SILENT_DBTP = -30;
export const USABLE_DBTP = -12;

/**
 * The upper bound. ☠️ THE GATE HAD A FLOOR AND NO CEILING (#1130).
 *
 * `brown-noise` came back from Round B hard-clipped at source — all three takes
 * at 0.0 dBTP with 5,050 / 18,701 / 18 samples pinned at full scale against
 * `rain`'s control of 2 — and was graded `ok`, because every rule above only
 * asked whether a take was loud ENOUGH. Gain reduction cannot unflatten a
 * clipped peak, so a clipped master is unusable no matter what the normaliser
 * does to it afterwards; it has to be re-rolled, which means it has to be
 * rejected here.
 *
 * -0.1 rather than 0.0: true peak is an inter-sample estimate, so genuine
 * full-scale material reads slightly over while undamaged audio has no reason
 * to sit in the last tenth of a dB.
 */
export const CLIPPED_DBTP = -0.1;

/**
 * How peaky a take may be and still reach its loudness target.
 *
 * ☠️ THE GATE MEASURED PEAK WHILE THE SPEC WAS LOUDNESS (#1130). Everything
 * above grades `dBTP`; #1138 ships on `-20 LUFS-I inside <= -3 dBTP`. Sparse,
 * peaky material clears the peak bar and then *cannot be gained to the target
 * without breaching the ceiling* — `normalisationGain` sets `ceilingBound` and
 * stops, and nothing rejected it. Round B accepted 10 such takes out of 22 and
 * produced a set spanning 9.57 LU, worse than the 7.5 LU spread #1138 exists to
 * fix.
 *
 * Normalisation is a single arithmetic gain (no limiter, see
 * `normalisationGain`), so it moves loudness and peak together and the whole
 * question reduces to one number: a take fits iff its crest factor
 * `dBTP - LUFS` is no larger than the distance between the ceiling and the
 * target. Beds and textures at -20 allow 17 dB, the -23 temple block 20 dB,
 * voice at -16 allows 13 dB.
 */
export function maxCrestDb(targetLufs) {
  return TRUE_PEAK_CEILING_DBTP - targetLufs;
}

/**
 * How many times one candidate slot may be re-drawn before the run gives up.
 *
 * ⚠️ THE BOUND IS THE SAFETY PROPERTY. An unbounded re-roll against a broken
 * prompt is unbounded spend, and a broken prompt is exactly the case that would
 * trigger it. Four is chosen against the measured pass rates: a coin-flip prompt
 * clears in four draws ~94% of the time, and four is also the most a single slot
 * can ever cost - so the worst case is a knowable multiple of the plan, printed
 * before the `--go` gate rather than discovered on the invoice.
 */
export const MAX_ATTEMPTS = 4;

/**
 * Grade one measured take.
 *
 * ☠️ `measure()` returns a NON-FINITE dbtp for a digitally silent file - ffmpeg's
 * loudnorm prints `-inf`, which `Number()` turns into NaN. `NaN >= USABLE_DBTP`
 * is false, so the naive comparison happens to reject it, but only by accident
 * and it would serialise into the manifest as a bare `null` with no reason
 * attached. The worst possible take must be classified deliberately, not by luck.
 *
 * `lufs`/`targetLufs` are optional so a caller holding only a peak still gets the
 * three level verdicts. ⚠️ Optional, NOT absent: omitting them restores exactly
 * the gate that let Round B through, so every caller that can reach a spec must
 * pass one. `preflight` and `render` both do, which is what keeps a prompt facing
 * one bar rather than two.
 */
export function classifyTake(dbtp, { lufs, targetLufs } = {}) {
  if (!Number.isFinite(dbtp)) return { accepted: false, rejectedFor: "silent" };
  if (dbtp < SILENT_DBTP) return { accepted: false, rejectedFor: "silent" };
  if (dbtp < USABLE_DBTP) return { accepted: false, rejectedFor: "quiet" };
  if (dbtp >= CLIPPED_DBTP) return { accepted: false, rejectedFor: "clipped" };
  // Only when both numbers are real. A take with no measurable loudness is
  // already rejected as silent above, and deriving a crest from a NaN would
  // reject healthy audio for an arithmetic accident.
  if (Number.isFinite(lufs) && Number.isFinite(targetLufs)) {
    // The 1e-9 mirrors `normalisationGain`'s own slack so the gate and the
    // normaliser agree on the boundary instead of disagreeing by a rounding
    // error: a take sitting exactly on the ceiling is reachable, not bound.
    if (dbtp - lufs > maxCrestDb(targetLufs) + 1e-9) {
      return { accepted: false, rejectedFor: "ceiling-bound" };
    }
  }
  return { accepted: true, rejectedFor: null };
}

/**
 * What still has to happen for one candidate slot, given its manifest history.
 *
 * A slot is finished when a take generated FROM THE CURRENT PROMPT passed the
 * gate. Anything recorded against a different prompt is evidence about a sound
 * that is no longer being asked for, so it neither finishes the slot nor counts
 * against the attempt bound - it is left on disk, untouched, and reported.
 *
 * ☠️ THIS IS WHY THE PROMPT IS COMPARED AND NOT JUST THE FILENAME. All 27 of
 * Round B's masters are still on disk under the names this pass would write, and
 * #1316 rewrote every one of the thirteen prompts that produced them (two were
 * re-concepted into a different sound entirely). A resume keyed on "does the file
 * exist" would skip all 27 and render nothing at all; one keyed on "does an
 * accepted take of THIS prompt exist" re-rolls them and keeps the old bytes.
 *
 * @param rows manifest rows for this clip+candidate, in append order
 * @param prompt the prompt the current catalog composes for this clip
 */
export function planSlot({ rows, prompt, maxAttempts = MAX_ATTEMPTS }) {
  let accepted = null;
  let spent = 0;
  let superseded = 0;
  let highestAttempt = 0;

  for (const row of rows) {
    if (Number.isFinite(row.attempt)) highestAttempt = Math.max(highestAttempt, row.attempt);

    // Rows written before the gate existed carry no measurement, so they are not
    // evidence either way - they are exactly the 27 the failed pass left behind.
    const graded = Number.isFinite(row.attempt) && "dbtp" in row;
    if (!graded || row.prompt !== prompt) {
      superseded += 1;
      continue;
    }

    spent += 1;
    if (row.accepted) accepted = row;
  }

  return {
    accepted,
    spent,
    superseded,
    nextIndex: highestAttempt + 1,
    remaining: accepted ? 0 : Math.max(0, maxAttempts - spent),
  };
}

/** The filename for one attempt. Monotonic per slot, so it never collides. */
export function attemptFile(clipId, candidate, attempt) {
  return `${clipId}-c${String(candidate).padStart(2, "0")}-a${String(attempt).padStart(2, "0")}.pcm`;
}

/** Group manifest rows by clip and candidate, so `planSlot` gets just its own. */
export function rowsBySlot(rows) {
  const bySlot = new Map();
  for (const row of rows) {
    const key = `${row.clip}|${row.candidate}`;
    if (!bySlot.has(key)) bySlot.set(key, []);
    bySlot.get(key).push(row);
  }
  return bySlot;
}

export function slotKey(clipId, candidate) {
  return `${clipId}|${candidate}`;
}
