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
 * unusable for ~1,881 credits. Wording cannot fix a distribution; measuring each
 * draw and drawing again can.
 */

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
 */
export function classifyTake(dbtp) {
  if (!Number.isFinite(dbtp)) return { accepted: false, rejectedFor: "silent" };
  if (dbtp < SILENT_DBTP) return { accepted: false, rejectedFor: "silent" };
  if (dbtp < USABLE_DBTP) return { accepted: false, rejectedFor: "quiet" };
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
