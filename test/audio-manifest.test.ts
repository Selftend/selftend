/**
 * The repo-side manifest (#1210).
 *
 * ☠️ WHY THIS FILE EXISTS. #1210's definition of done asks for "the `scripts/`
 * manifest written with each clip's prompt, parameters, TTS seed where one exists,
 * chosen candidate, and the Drive path" — the repo-side half of the split #1141
 * decided: prompts and decisions in the repo, masters in Drive. It had no writer.
 * `manifest.jsonl` and `choices.jsonl` both live inside `audio-masters/`, which is
 * gitignored, so the artifact the split promises was not in the repo at all; and
 * no row in either file has ever had a field for where a master was archived.
 * `render` prints an instruction to archive every take and nothing recorded that
 * it happened.
 *
 * The two properties worth pinning are both "does it lie about being finished":
 * the round is 19 units and not 11, and an unarchived take is a gap rather than a
 * silence.
 */
import {
  DRIVE_ROOT,
  archiveRow,
  buildManifest,
  currentArchives,
  drivePath,
  takeKey,
} from "../scripts/audio/manifest.mjs";
import { voiceIdentity } from "../scripts/audio/audition-plan.mjs";

const FEMALE = "21m00Tcm4TlvDq8ikWAM";
const MALE = "pNInz6obpgDQGcFmaJgB";
const RAIN = "Steady, even rainfall.";
const INHALE = "Breathe in";

const CLIPS = [
  { id: "rain", klass: "beds", text: RAIN, candidates: 2 },
  { id: "forest", klass: "beds", text: "A dense wash of leaves.", candidates: 2 },
];
const SLOTS = [
  {
    id: "guide_inhale|guided",
    clipId: "guide_inhale",
    klass: "voice",
    voice: "guided",
    axis: "female",
    voiceId: FEMALE,
    text: INHALE,
    candidates: 2,
  },
  {
    id: "guide_inhale|guided-male",
    clipId: "guide_inhale",
    klass: "voice",
    voice: "guided-male",
    axis: "male",
    voiceId: MALE,
    text: INHALE,
    candidates: 2,
  },
];

/** The prompt is the clip's own text here — the real `composePrompt` is #1316's. */
const promptFor = (clip: { text: string }) => clip.text;

/** A sound-effect row as `render` appends it once #1320 graded it. */
function sfxRow(over: Record<string, unknown> = {}) {
  return {
    clip: "rain",
    klass: "beds",
    candidate: 1,
    attempt: 1,
    file: "rain-c01-a01.pcm",
    prompt: RAIN,
    model: "eleven_text_to_sound_v2",
    outputFormat: "pcm_48000",
    durationSeconds: 30,
    promptInfluence: 0.6,
    loop: true,
    loudnessTarget: "-20 LUFS-I, <= -3 dBTP",
    seed: null,
    bytes: 5_760_000,
    dbtp: -4.2,
    accepted: true,
    creditsCharged: 330,
    ...over,
  };
}

/** A voice row as `render-voices` appends it: no attempt, no measurement, a seed. */
function voiceRow(over: Record<string, unknown> = {}) {
  return {
    clip: "guide_inhale",
    klass: "voice",
    voice: "guided",
    axis: "female",
    voiceId: FEMALE,
    candidate: 1,
    file: "guide_inhale-guided-c01.mp3",
    text: INHALE,
    model: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_192",
    seed: 1130,
    bytes: 24_000,
    ...over,
  };
}

function chosen(over: Record<string, unknown> = {}) {
  return {
    record: "chosen",
    clip: "rain",
    candidate: 1,
    file: "rain-c01-a01.pcm",
    prompt: RAIN,
    note: null,
    at: "2026-08-21T12:00:00.000Z",
    ...over,
  };
}

function build(over: Record<string, unknown> = {}) {
  return buildManifest({
    round: "B",
    clips: CLIPS,
    slots: SLOTS,
    promptFor,
    identityFor: voiceIdentity,
    rows: [],
    choices: new Map(),
    archives: new Map(),
    at: "2026-08-21T12:00:00.000Z",
    ...over,
  });
}

describe("drivePath", () => {
  it("puts a take under its class folder at the layout #1141 accepted", () => {
    expect(drivePath("beds", "rain-c01-a01.pcm")).toBe(`${DRIVE_ROOT}/beds/rain-c01-a01.pcm`);
    expect(drivePath("voice", "guide_inhale-guided-c01.mp3")).toBe(
      `${DRIVE_ROOT}/voice/guide_inhale-guided-c01.mp3`,
    );
  });

  it("refuses a class that is not one of the four folders", () => {
    // A typo would record a path in a folder nobody will look in, for a master
    // that cannot be re-made. Better to fail than to invent a fifth folder.
    expect(() => drivePath("ambient", "x.pcm")).toThrow(/ambient/);
  });
});

describe("archive attestations", () => {
  it("records the Drive path alongside when it was archived", () => {
    const row = archiveRow({ klass: "beds", file: "rain-c01-a01.pcm", at: "2026-08-21T13:00:00Z" });
    expect(row).toMatchObject({
      record: "archived",
      klass: "beds",
      file: "rain-c01-a01.pcm",
      path: `${DRIVE_ROOT}/beds/rain-c01-a01.pcm`,
      at: "2026-08-21T13:00:00Z",
    });
  });

  it("is keyed on class and file, last attestation winning", () => {
    const first = archiveRow({
      klass: "beds",
      file: "rain-c01-a01.pcm",
      at: "2026-08-21T13:00:00Z",
    });
    const again = archiveRow({
      klass: "beds",
      file: "rain-c01-a01.pcm",
      at: "2026-08-21T14:00:00Z",
      note: "re-uploaded",
    });
    const live = currentArchives([first, again, { record: "chosen", clip: "rain" }]);
    expect(live.size).toBe(1);
    expect(live.get(takeKey({ klass: "beds", file: "rain-c01-a01.pcm" }))?.note).toBe(
      "re-uploaded",
    );
  });
});

describe("buildManifest", () => {
  it("counts BOTH halves of the round, not the sound effects alone", () => {
    // ☠️ The bug that has now bitten three subsystems: `clipsForRound` filters
    // SFX_CLIPS, so a round-B list built from it alone is 11 units of 19. A
    // manifest that omits the voice cues would call a half-done pass finished.
    const doc = build();
    expect(doc.totals.units).toBe(CLIPS.length + SLOTS.length);
    expect(doc.units.map((unit) => unit.id)).toEqual([
      "rain",
      "forest",
      "guide_inhale|guided",
      "guide_inhale|guided-male",
    ]);
  });

  it("carries each take's parameters and its seed where one exists", () => {
    const doc = build({ rows: [sfxRow(), voiceRow()] });
    const bed = doc.units.find((unit) => unit.id === "rain");
    expect(bed?.takes[0]).toMatchObject({
      file: "rain-c01-a01.pcm",
      prompt: RAIN,
      model: "eleven_text_to_sound_v2",
      durationSeconds: 30,
      promptInfluence: 0.6,
      loop: true,
      // Sound Effects has none — which is the whole reason the masters are the
      // source and this record exists at all.
      seed: null,
      dbtp: -4.2,
      creditsCharged: 330,
    });
    const voice = doc.units.find((unit) => unit.id === "guide_inhale|guided");
    expect(voice?.takes[0]).toMatchObject({ seed: 1130, voiceId: FEMALE, text: INHALE });
  });

  it("records the chosen candidate against the take it came from", () => {
    const doc = build({
      rows: [sfxRow()],
      choices: new Map([["rain", chosen({ note: "least eventful" })]]),
    });
    const bed = doc.units.find((unit) => unit.id === "rain");
    expect(bed?.chosen).toMatchObject({
      candidate: 1,
      file: "rain-c01-a01.pcm",
      note: "least eventful",
    });
    expect(doc.totals.chosen).toBe(1);
  });

  it("treats a pick made against a rewritten prompt as unsettled", () => {
    // Same rule `outstanding` applies: a pick names a sound that is no longer
    // being asked for, and calling it settled is how a rewritten prompt ships the
    // old take's decision.
    const doc = build({
      rows: [sfxRow({ prompt: "an older wording" })],
      choices: new Map([["rain", chosen({ prompt: "an older wording" })]]),
    });
    expect(doc.gaps.map((gap) => gap.kind)).toContain("stale-pick");
    expect(doc.units.find((unit) => unit.id === "rain")?.chosen?.superseded).toBe(true);
  });

  it("names a take that has never been archived, rejects included", () => {
    // #1141: EVERY candidate is archived, not just the winners — a rejected take
    // is exactly as unreproducible as a chosen one.
    const doc = build({
      rows: [
        sfxRow(),
        sfxRow({ candidate: 2, file: "rain-c02-a01.pcm", dbtp: -41, accepted: false }),
      ],
    });
    const unarchived = doc.gaps.filter((gap) => gap.kind === "unarchived");
    expect(unarchived).toHaveLength(2);
    expect(unarchived.map((gap) => gap.file)).toContain("rain-c02-a01.pcm");
    expect(doc.totals.archived).toBe(0);
  });

  it("clears the archive gap once the take is attested, and carries the path", () => {
    const row = sfxRow();
    const doc = build({
      rows: [row],
      archives: currentArchives([
        archiveRow({ klass: "beds", file: row.file, at: "2026-08-21T13:00:00Z" }),
      ]),
    });
    expect(doc.gaps.filter((gap) => gap.kind === "unarchived")).toHaveLength(0);
    expect(doc.units[0].takes[0]).toMatchObject({
      drivePath: `${DRIVE_ROOT}/beds/rain-c01-a01.pcm`,
      archivedAt: "2026-08-21T13:00:00Z",
    });
    expect(doc.totals.archived).toBe(1);
  });

  it("is never complete while any unit is unpicked or any take unarchived", () => {
    expect(build().complete).toBe(false);

    const rows = [
      sfxRow(),
      sfxRow({ clip: "forest", file: "forest-c01-a01.pcm", prompt: CLIPS[1].text }),
      voiceRow(),
      voiceRow({ voice: "guided-male", voiceId: MALE, file: "guide_inhale-guided-male-c01.mp3" }),
    ];
    const archives = currentArchives(
      rows.map((row) =>
        archiveRow({ klass: row.klass, file: row.file, at: "2026-08-21T13:00:00Z" }),
      ),
    );
    const choices = new Map([
      ["rain", chosen()],
      ["forest", chosen({ clip: "forest", file: "forest-c01-a01.pcm", prompt: CLIPS[1].text })],
      [
        "guide_inhale|guided",
        chosen({
          clip: "guide_inhale",
          voice: "guided",
          file: "guide_inhale-guided-c01.mp3",
          prompt: voiceIdentity({ voiceId: FEMALE, text: INHALE }),
        }),
      ],
    ]);

    // Three of four picked and everything archived is still not done — the male
    // voice is owed its own pick (#1136 ships both voices).
    const partial = build({ rows, archives, choices });
    expect(partial.complete).toBe(false);
    expect(partial.gaps.map((gap) => gap.unit)).toContain("guide_inhale|guided-male");

    choices.set(
      "guide_inhale|guided-male",
      chosen({
        clip: "guide_inhale",
        voice: "guided-male",
        file: "guide_inhale-guided-male-c01.mp3",
        prompt: voiceIdentity({ voiceId: MALE, text: INHALE }),
      }),
    );
    const full = build({ rows, archives, choices });
    expect(full.gaps).toEqual([]);
    expect(full.complete).toBe(true);
  });

  it("never lets an estimated cost stand in for a charged one", () => {
    // ☠️ What a take cost is the response's `character-cost` header (#1359); the
    // estimate is what the plan guessed. The 27 takes already on disk carry only
    // the guess, so summing the two together would report a spend as measured
    // that was never measured — on a pass that cannot be re-run to check.
    const doc = build({
      rows: [
        sfxRow(),
        sfxRow({
          candidate: 2,
          file: "rain-c02-a01.pcm",
          creditsCharged: undefined,
          creditsEstimate: 99,
        }),
      ],
    });
    expect(doc.totals.credits).toEqual({ charged: 330, estimated: 99 });
  });

  it("reports a unit with no take at all rather than skipping it", () => {
    const doc = build({ rows: [sfxRow()] });
    const missing = doc.gaps.filter((gap) => gap.kind === "no-take").map((gap) => gap.unit);
    expect(missing).toEqual(["forest", "guide_inhale|guided", "guide_inhale|guided-male"]);
  });

  it("keeps a take whose unit has left the catalog instead of dropping it", () => {
    // A voice swapped out, or a clip renamed, orphans real takes that were really
    // paid for. Silently omitting them from the record of an unrepeatable spend is
    // the one thing this artifact exists to prevent.
    const orphan = voiceRow({ voice: "retired", file: "guide_inhale-retired-c01.mp3" });
    const doc = build({ rows: [orphan] });
    expect(doc.orphanTakes.map((take) => take.file)).toEqual(["guide_inhale-retired-c01.mp3"]);
    expect(doc.gaps.map((gap) => gap.kind)).toContain("orphan-take");
    // And it still owes an archive, because it cost the same credits.
    expect(doc.gaps.filter((gap) => gap.kind === "unarchived")).toHaveLength(1);
  });
});
