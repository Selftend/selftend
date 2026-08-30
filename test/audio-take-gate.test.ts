/**
 * The render pass's level gate and re-roll bookkeeping (#1320).
 *
 * ☠️ WHY THIS FILE EXISTS. The bug it guards cost ~1,881 credits and 20 of 27
 * unreproducible masters: `render` wrote whatever the API returned without
 * looking at a byte of it. The fix is only as good as its resume logic, and the
 * resume logic is the one part of the pass that can be exercised for free —
 * everything below is a pure function of manifest rows, no API and no ffmpeg.
 *
 * The load-bearing case is `superseded`: all 27 of those masters are still on
 * disk under names the pass would otherwise consider "already done", and #1316
 * rewrote every prompt that produced them. A resume keyed on the file rather
 * than the prompt renders nothing at all.
 */
import {
  CLIPPED_DBTP,
  MAX_ATTEMPTS,
  SILENT_DBTP,
  USABLE_DBTP,
  maxCrestDb,
  attemptFile,
  classifyTake,
  planSlot,
  rowsBySlot,
  slotKey,
} from "../scripts/audio/take-gate.mjs";

const PROMPT = "a dense continuous wash of rain, heard close";
const OLD_PROMPT = "steady rainfall. No thunder, no wind, no sudden events.";

/** A row as `render` appends it: graded, with an attempt index. */
function graded(
  attempt: number,
  { dbtp, accepted, prompt = PROMPT }: { dbtp: number | null; accepted: boolean; prompt?: string },
) {
  return { clip: "rain", candidate: 1, attempt, prompt, dbtp, accepted };
}

/** A row as the failed Round B left it: no attempt index, no measurement. */
function legacy(prompt = OLD_PROMPT) {
  return { clip: "rain", candidate: 1, file: "rain-c01.pcm", prompt };
}

describe("classifyTake", () => {
  it("accepts a healthy take", () => {
    expect(classifyTake(-4.2)).toEqual({ accepted: true, rejectedFor: null });
  });

  it("rejects the measured level of a real dud master as silent", () => {
    // night-c01.pcm from the failed pass measures exactly this.
    expect(classifyTake(-46)).toEqual({ accepted: false, rejectedFor: "silent" });
  });

  it("rejects an audible but too-quiet take as quiet, not silent", () => {
    expect(classifyTake(-20)).toEqual({ accepted: false, rejectedFor: "quiet" });
  });

  it("treats a non-finite level as silent rather than letting NaN decide", () => {
    // ☠️ ffmpeg's loudnorm prints "-inf" for a digitally silent file and
    // Number() turns that into NaN. Verified against a real silent .pcm.
    expect(classifyTake(NaN)).toEqual({ accepted: false, rejectedFor: "silent" });
    expect(classifyTake(-Infinity)).toEqual({ accepted: false, rejectedFor: "silent" });
  });

  it("rejects a clipped take even though it is the loudest thing the API can return", () => {
    // ☠️ THE GATE HAD A FLOOR AND NO CEILING (#1130). All three of Round B's
    // `brown-noise` takes came back at 0.0 dBTP with thousands of samples pinned
    // at full scale and were graded `ok`, because every rule above only asked
    // whether a take was loud ENOUGH. Gain reduction cannot unflatten a clip.
    expect(classifyTake(0)).toEqual({ accepted: false, rejectedFor: "clipped" });
    expect(classifyTake(CLIPPED_DBTP).rejectedFor).toBe("clipped");
    expect(classifyTake(CLIPPED_DBTP - 0.01).accepted).toBe(true);
  });

  it("rejects a take that cannot reach its target under the ceiling", () => {
    // ☠️ THE GATE MEASURED PEAK WHILE THE SPEC WAS LOUDNESS (#1130). A bed
    // targets -20 LUFS under a -3 dBTP ceiling, so 17 dB of crest is all that
    // fits. -4 dBTP against -25 LUFS is 21 dB of crest: the take is comfortably
    // loud at the peak and still cannot be gained to target.
    expect(classifyTake(-4, { lufs: -25, targetLufs: -20 })).toEqual({
      accepted: false,
      rejectedFor: "ceiling-bound",
    });
  });

  it("accepts the same peak when the loudness behind it is real", () => {
    // The other half: peak alone decides nothing, which is the whole point.
    expect(classifyTake(-4, { lufs: -18, targetLufs: -20 }).accepted).toBe(true);
  });

  it("treats a take sitting exactly on the ceiling as reachable, not bound", () => {
    // Mirrors `normalisationGain`'s own slack. A gate and a normaliser that
    // disagree by a rounding error is a ceiling with two answers.
    expect(classifyTake(-3, { lufs: -20, targetLufs: -20 }).accepted).toBe(true);
    expect(classifyTake(-3, { lufs: -20.02, targetLufs: -20 }).rejectedFor).toBe("ceiling-bound");
  });

  it("lets the quieter bell target buy more crest, because the arithmetic says so", () => {
    // The temple block ships at -23, so it may be 20 dB peaky where a bed may be
    // 17. The budget is derived from the spec rather than being a second constant.
    expect(maxCrestDb(-23)).toBe(20);
    expect(classifyTake(-4, { lufs: -23.5, targetLufs: -23 }).accepted).toBe(true);
    expect(classifyTake(-4, { lufs: -25, targetLufs: -23 }).rejectedFor).toBe("ceiling-bound");
  });

  it("falls back to the level verdicts when no target is supplied", () => {
    // ⚠️ Documented, not endorsed: a caller with only a peak still gets an
    // answer, and that answer is exactly the old gate. Every caller that can
    // reach a spec passes one.
    expect(classifyTake(-4).accepted).toBe(true);
    expect(classifyTake(-4, { lufs: -40 }).accepted).toBe(true);
  });

  it("does not invent a crest from an unmeasurable loudness", () => {
    // A silent take is already caught above; NaN arithmetic must not reject a
    // healthy one on the way past.
    expect(classifyTake(-4, { lufs: NaN, targetLufs: -20 }).accepted).toBe(true);
  });

  it("puts the thresholds themselves on the generous side", () => {
    expect(classifyTake(USABLE_DBTP).accepted).toBe(true);
    expect(classifyTake(USABLE_DBTP - 0.01).rejectedFor).toBe("quiet");
    expect(classifyTake(SILENT_DBTP).rejectedFor).toBe("quiet");
    expect(classifyTake(SILENT_DBTP - 0.01).rejectedFor).toBe("silent");
  });
});

describe("planSlot", () => {
  it("gives a never-rendered slot the full attempt budget", () => {
    expect(planSlot({ rows: [], prompt: PROMPT })).toEqual({
      accepted: null,
      spent: 0,
      superseded: 0,
      nextIndex: 1,
      remaining: MAX_ATTEMPTS,
    });
  });

  it("does NOT let a pre-gate take from a superseded prompt finish the slot", () => {
    // The whole point: 27 files like this are on disk right now.
    const plan = planSlot({ rows: [legacy()], prompt: PROMPT });

    expect(plan.accepted).toBeNull();
    expect(plan.superseded).toBe(1);
    expect(plan.spent).toBe(0);
    expect(plan.remaining).toBe(MAX_ATTEMPTS);
    // ...and it does not claim the filename the next attempt will write.
    expect(plan.nextIndex).toBe(1);
  });

  it("does not spend budget on an UNGRADED take, even of the current prompt", () => {
    // Two different reasons a row is not evidence, and the prompt check only
    // covers one of them: a take written before the gate existed was never
    // measured, so nothing is known about it. Counting it against the bound
    // would silently buy the slot one fewer draw than it is owed.
    const plan = planSlot({ rows: [legacy(PROMPT)], prompt: PROMPT });

    expect(plan.accepted).toBeNull();
    expect(plan.spent).toBe(0);
    expect(plan.superseded).toBe(1);
    expect(plan.remaining).toBe(MAX_ATTEMPTS);
  });

  it("ignores even an ACCEPTED take when it was generated from another prompt", () => {
    const plan = planSlot({
      rows: [graded(1, { dbtp: -3, accepted: true, prompt: OLD_PROMPT })],
      prompt: PROMPT,
    });

    expect(plan.accepted).toBeNull();
    expect(plan.superseded).toBe(1);
    expect(plan.remaining).toBe(MAX_ATTEMPTS);
    // The attempt index still advances, so the re-roll can never overwrite it.
    expect(plan.nextIndex).toBe(2);
  });

  it("finishes a slot that already has an accepted take of the current prompt", () => {
    const row = graded(2, { dbtp: -5.1, accepted: true });
    const plan = planSlot({
      rows: [graded(1, { dbtp: -41, accepted: false }), row],
      prompt: PROMPT,
    });

    expect(plan.accepted).toBe(row);
    expect(plan.remaining).toBe(0);
  });

  it("counts rejected takes of the current prompt against the bound", () => {
    const plan = planSlot({
      rows: [graded(1, { dbtp: -44, accepted: false }), graded(2, { dbtp: -18, accepted: false })],
      prompt: PROMPT,
    });

    expect(plan.spent).toBe(2);
    expect(plan.nextIndex).toBe(3);
    expect(plan.remaining).toBe(MAX_ATTEMPTS - 2);
  });

  it("leaves nothing to retry once the bound is spent", () => {
    const rows = Array.from({ length: MAX_ATTEMPTS }, (_, i) =>
      graded(i + 1, { dbtp: -44, accepted: false }),
    );
    const plan = planSlot({ rows, prompt: PROMPT });

    expect(plan.accepted).toBeNull();
    expect(plan.remaining).toBe(0);
  });

  it("honours a bound tightened below what has already been spent", () => {
    const plan = planSlot({
      rows: [graded(1, { dbtp: -44, accepted: false }), graded(2, { dbtp: -44, accepted: false })],
      prompt: PROMPT,
      maxAttempts: 1,
    });

    // ⚠️ Never negative — a negative budget would read as "spend freely".
    expect(plan.remaining).toBe(0);
  });

  it("records a silent take's null level without treating it as ungraded", () => {
    const plan = planSlot({ rows: [graded(1, { dbtp: null, accepted: false })], prompt: PROMPT });

    expect(plan.spent).toBe(1);
    expect(plan.superseded).toBe(0);
  });
});

describe("attempt filenames", () => {
  it("never collides with the pre-gate names still on disk", () => {
    expect(attemptFile("rain", 1, 1)).toBe("rain-c01-a01.pcm");
    expect(attemptFile("rain", 1, 1)).not.toBe("rain-c01.pcm");
    expect(attemptFile("ocean-swell_inhale", 2, 10)).toBe("ocean-swell_inhale-c02-a10.pcm");
  });
});

describe("rowsBySlot", () => {
  it("keeps each candidate's history to itself, in append order", () => {
    const rows = [
      { clip: "rain", candidate: 1, attempt: 1 },
      { clip: "rain", candidate: 2, attempt: 1 },
      { clip: "rain", candidate: 1, attempt: 2 },
      { clip: "night", candidate: 1, attempt: 1 },
    ];
    const bySlot = rowsBySlot(rows);

    expect(bySlot.get(slotKey("rain", 1))).toEqual([rows[0], rows[2]]);
    expect(bySlot.get(slotKey("rain", 2))).toEqual([rows[1]]);
    expect(bySlot.get(slotKey("night", 1))).toEqual([rows[3]]);
  });
});
