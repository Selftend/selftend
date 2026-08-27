/**
 * What the audition puts in front of an ear, and how a pick is recorded (#1346).
 *
 * ☠️ WHY THIS FILE EXISTS. `render` writes headerless raw PCM, so the output of
 * an unrepeatable pass is unplayable until something converts it. The conversion
 * itself needs ffmpeg, but the two decisions that can get the audition *wrong*
 * are pure: which takes are shown, and whether a pick still stands. Both are
 * exercised here for free.
 *
 * The load-bearing case is the same one #1320 guards: a take of a prompt the
 * catalog has since rewritten is not this pass's candidate. Showing one puts a
 * sound nobody asked for in front of the ear that is choosing; counting one as a
 * pick silently ships the old take's decision.
 */
import {
  DEFAULT_REPEATS,
  STATUS,
  choiceRow,
  currentChoices,
  outstanding,
  planAudition,
  previewName,
  renderIndexHtml,
  statusOf,
  takesForSlot,
} from "../scripts/audio/audition-plan.mjs";

const PROMPT = "a dense continuous wash of rain, heard close";
const OLD_PROMPT = "steady rainfall. No thunder, no wind, no sudden events.";

/** A row as `render` appends it after #1320: graded, with an attempt index. */
function graded(
  attempt: number,
  {
    dbtp,
    accepted,
    prompt = PROMPT,
    candidate = 1,
    clip = "rain",
  }: {
    dbtp: number;
    accepted: boolean;
    prompt?: string;
    candidate?: number;
    clip?: string;
  },
) {
  return {
    clip,
    klass: "beds",
    candidate,
    attempt,
    prompt,
    dbtp,
    lufs: dbtp - 16,
    accepted,
    rejectedFor: accepted ? null : "silent",
    file: `${clip}-c0${candidate}-a0${attempt}.pcm`,
  };
}

/** A row as the failed Round B left it: no attempt index, no measurement. */
function legacy(prompt = OLD_PROMPT) {
  return { clip: "rain", klass: "beds", candidate: 1, file: "rain-c01.pcm", prompt };
}

const CLIPS = [
  { id: "rain", klass: "beds", candidates: 2, text: "rain" },
  { id: "night", klass: "beds", candidates: 1, text: "night" },
];
const promptFor = (clip: { id: string }) => (clip.id === "rain" ? PROMPT : "a warm summer night");

function history(rows: Record<string, unknown>[]) {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = `${row.clip}|${row.candidate}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

describe("statusOf", () => {
  it("accepts a graded take of the current prompt", () => {
    expect(statusOf(graded(1, { dbtp: -4.2, accepted: true }), PROMPT)).toBe(STATUS.accepted);
  });

  it("marks a graded take that failed the level gate as rejected", () => {
    expect(statusOf(graded(1, { dbtp: -47, accepted: false }), PROMPT)).toBe(STATUS.rejected);
  });

  it("marks a take of a rewritten prompt superseded even though it was accepted", () => {
    const row = graded(1, { dbtp: -4.2, accepted: true, prompt: OLD_PROMPT });
    expect(statusOf(row, PROMPT)).toBe(STATUS.superseded);
  });

  it("marks an ungraded pre-#1320 row superseded even when its prompt still matches", () => {
    // The 27 masters of the failed pass carry no measurement, so nothing about
    // them can be trusted as evidence of a usable take.
    expect(statusOf(legacy(PROMPT), PROMPT)).toBe(STATUS.superseded);
  });
});

describe("takesForSlot", () => {
  const rows = [
    legacy(),
    graded(1, { dbtp: -47, accepted: false }),
    graded(2, { dbtp: -3.1, accepted: true }),
  ];

  it("shows only the accepted take by default", () => {
    const takes = takesForSlot({ rows, prompt: PROMPT });
    expect(takes.map((t) => t.row.file)).toEqual(["rain-c01-a02.pcm"]);
  });

  it("shows every take under --all, accepted first", () => {
    const takes = takesForSlot({ rows, prompt: PROMPT, all: true });
    expect(takes.map((t) => t.status)).toEqual([
      STATUS.accepted,
      STATUS.superseded,
      STATUS.rejected,
    ]);
  });

  it("returns nothing when every take is of a superseded prompt", () => {
    expect(takesForSlot({ rows: [legacy(), legacy()], prompt: PROMPT })).toEqual([]);
  });
});

describe("planAudition", () => {
  it("reports a slot with no take of the current prompt instead of silently skipping it", () => {
    const { entries, missing } = planAudition({
      clips: CLIPS,
      promptFor,
      history: history([legacy(), legacy()]),
    });
    expect(entries).toEqual([]);
    expect(missing).toContainEqual({ clipId: "rain", candidate: 1, drawn: 2 });
    // Every slot of every clip is accounted for, not just the one with rows.
    expect(missing).toHaveLength(3);
  });

  it("walks clips in catalog order and candidates in order, so beds compare side by side", () => {
    const { entries } = planAudition({
      clips: CLIPS,
      promptFor,
      history: history([
        graded(1, {
          clip: "night",
          candidate: 1,
          dbtp: -5,
          accepted: true,
          prompt: promptFor({ id: "night" }),
        }),
        graded(1, { clip: "rain", candidate: 2, dbtp: -5, accepted: true }),
        graded(1, { clip: "rain", candidate: 1, dbtp: -5, accepted: true }),
      ]),
    });
    expect(entries.map((e) => `${e.clipId}:${e.candidate}`)).toEqual([
      "rain:1",
      "rain:2",
      "night:1",
    ]);
  });

  it("carries the measurement through so the page can show it beside the player", () => {
    const { entries } = planAudition({
      clips: [CLIPS[0]],
      promptFor,
      history: history([graded(1, { dbtp: -3.5, accepted: true })]),
    });
    expect(entries[0]).toMatchObject({ dbtp: -3.5, lufs: -19.5, klass: "beds", attempt: 1 });
  });

  it("gives a superseded entry the take's OWN prompt, not the catalog's", () => {
    // ☠️ The bug this guards, found by smoke-testing `choose` against the failed
    // pass's masters: the entry carried the catalog's current prompt regardless
    // of which prompt the take came from, so choosing a superseded take recorded
    // it as current and `status` reported the clip settled.
    const { entries } = planAudition({
      clips: [CLIPS[0]],
      promptFor,
      history: history([legacy()]),
      all: true,
    });
    expect(entries[0].status).toBe(STATUS.superseded);
    expect(entries[0].prompt).toBe(OLD_PROMPT);
    expect(entries[0].currentPrompt).toBe(PROMPT);
  });

  it("gives an accepted entry the same prompt either way", () => {
    const { entries } = planAudition({
      clips: [CLIPS[0]],
      promptFor,
      history: history([graded(1, { dbtp: -3.5, accepted: true })]),
    });
    expect(entries[0].prompt).toBe(PROMPT);
    expect(entries[0].currentPrompt).toBe(PROMPT);
  });
});

describe("choosing a superseded take", () => {
  it("leaves the clip outstanding, because the pick names a sound nobody is asking for", () => {
    const { entries } = planAudition({
      clips: [CLIPS[0]],
      promptFor,
      history: history([legacy()]),
      all: true,
    });
    const choices = currentChoices([
      choiceRow({
        clipId: "rain",
        candidate: 1,
        file: entries[0].file,
        prompt: entries[0].prompt,
        at: "2026-08-21T10:00:00.000Z",
      }),
    ]);
    expect(outstanding({ clips: [CLIPS[0]], promptFor, choices })).toEqual(["rain"]);
  });
});

describe("previewName", () => {
  const entry = { clipId: "rain", candidate: 2, attempt: 3 };

  it("names a preview by clip, candidate and attempt", () => {
    expect(previewName(entry)).toBe("rain-c02-a03.m4a");
  });

  it("gives the loop preview a distinct name, so it cannot overwrite the single pass", () => {
    expect(previewName(entry, { repeats: 10 })).toBe("rain-c02-a03-x10.m4a");
  });

  it("omits the attempt for a pre-#1320 row rather than writing a bare -a", () => {
    expect(previewName({ clipId: "rain", candidate: 1, attempt: null })).toBe("rain-c01.m4a");
  });
});

describe("choices", () => {
  const at = "2026-08-21T10:00:00.000Z";

  it("records the file, not just the candidate number", () => {
    // The candidate index means nothing once the masters are archived; the
    // filename is what survives to identify an unreproducible take.
    expect(
      choiceRow({ clipId: "rain", candidate: 2, file: "rain-c02-a01.pcm", prompt: PROMPT, at }),
    ).toEqual({
      record: "chosen",
      clip: "rain",
      candidate: 2,
      file: "rain-c02-a01.pcm",
      prompt: PROMPT,
      note: null,
      at,
    });
  });

  it("lets a later pick supersede an earlier one", () => {
    const choices = currentChoices([
      choiceRow({ clipId: "rain", candidate: 1, file: "a.pcm", prompt: PROMPT, at }),
      choiceRow({ clipId: "rain", candidate: 3, file: "b.pcm", prompt: PROMPT, at }),
    ]);
    expect(choices.get("rain")!.candidate).toBe(3);
  });

  it("ignores rows that are not choices, so a manifest read by mistake cannot forge a pick", () => {
    expect(currentChoices([graded(1, { dbtp: -4, accepted: true })]).size).toBe(0);
  });
});

describe("outstanding", () => {
  const at = "2026-08-21T10:00:00.000Z";

  it("lists every clip with no pick", () => {
    expect(outstanding({ clips: CLIPS, promptFor, choices: new Map() })).toEqual(["rain", "night"]);
  });

  it("clears a clip once it is picked against its current prompt", () => {
    const choices = currentChoices([
      choiceRow({ clipId: "rain", candidate: 1, file: "a.pcm", prompt: PROMPT, at }),
    ]);
    expect(outstanding({ clips: CLIPS, promptFor, choices })).toEqual(["night"]);
  });

  it("re-opens a clip whose prompt was rewritten after the pick", () => {
    // ☠️ The case that makes this function worth having: a pick recorded against
    // a prompt #1316 has since rewritten names a sound nobody is asking for.
    const choices = currentChoices([
      choiceRow({ clipId: "rain", candidate: 1, file: "a.pcm", prompt: OLD_PROMPT, at }),
    ]);
    expect(outstanding({ clips: CLIPS, promptFor, choices })).toEqual(["rain", "night"]);
  });
});

describe("renderIndexHtml", () => {
  const base = {
    clipId: "rain",
    klass: "beds",
    candidate: 1,
    attempt: 1,
    file: "rain-c01-a01.pcm",
    prompt: PROMPT,
    status: STATUS.accepted,
    dbtp: -3.5,
    lufs: -19.5,
    preview: "rain-c01-a01.m4a",
    loopPreview: "rain-c01-a01-x10.m4a",
    post: { lufs: -20.1, dbtp: -3.4 },
    gain: -0.6,
    ceilingBound: false,
    seam: { wrapStepRatio: 1.1, energyDeltaRatio: 0.9 },
    sizeKb: 480,
    error: null,
  };

  it("gives every preview a player, including the loop", () => {
    const html = renderIndexHtml({ round: "B", repeats: 10, results: [base] });
    expect(html).toContain('src="rain-c01-a01.m4a"');
    expect(html).toContain('src="rain-c01-a01-x10.m4a"');
  });

  it("uses relative sources only, so the page works opened from disk with no network", () => {
    const html = renderIndexHtml({ round: "B", repeats: 10, results: [base] });
    expect(html).not.toMatch(/src="(https?:)?\/\//);
  });

  it("says so when a take could not reach its target within the dBTP ceiling", () => {
    const html = renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [{ ...base, ceilingBound: true }],
    });
    expect(html).toContain("-3 dBTP");
  });

  it("labels a take that is below the level gate rather than showing it as a peer", () => {
    const html = renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [{ ...base, status: STATUS.rejected, rejectedFor: "quiet" }],
    });
    expect(html).toContain("quiet");
  });

  it("still renders a player-less card when post-processing failed", () => {
    const html = renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [{ ...base, preview: null, loopPreview: null, error: "ffmpeg failed" }],
    });
    expect(html).toContain("ffmpeg failed");
    expect(html).not.toContain("<audio");
  });

  it("escapes the prompt, so a stray angle bracket cannot break the page", () => {
    const html = renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [{ ...base, prompt: '<script>x</script> & "quoted"' }],
    });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>x</script>");
  });

  it("names the slots that have no take, so a gap is visible on the page not just the console", () => {
    const html = renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [base],
      missing: [{ clipId: "night", candidate: 1, drawn: 3 }],
    });
    expect(html).toContain("night");
    expect(html).toContain("No take to audition");
  });
});

describe("DEFAULT_REPEATS", () => {
  it("is the 10x listen #1137 fixed as half of the seam gate", () => {
    expect(DEFAULT_REPEATS).toBe(10);
  });
});
