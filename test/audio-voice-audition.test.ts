/**
 * The voice half of Round B's audition (#1210).
 *
 * ☠️ WHY THIS FILE EXISTS. `audition.mjs` builds its clip list from
 * `clipsForRound`, which filters `SFX_CLIPS` — so the eight voice cues were never
 * in it. `build` could not produce a playable voice preview, `choose` threw on a
 * `guide_*` id, and `status` counted 11 clips of 21 and printed "Every clip in
 * round B has a pick" with the whole voice half untouched. That is #1317's
 * "11 clips read as 19" one subsystem later, and it lands on the class #1210 calls
 * its own FIRST task: #1136 routed the voice pick into the render session on the
 * stated criterion that the pair is auditioned **on the shipping words**, not on
 * the library's demo reel. There was no instrument for that criterion at all.
 *
 * ☠️ A voice take is NOT graded by level. #1320's usable/silent thresholds exist
 * for the seedless Sound Effects model's silent tail; TTS takes a seed, returns a
 * consistent level and is re-renderable. What supersedes a voice take instead is
 * the pair (voiceId, text) — the same shape as the SFX prompt rule, and the reason
 * a shortlisted voice can be auditioned and then swapped without a stale pick
 * silently surviving the swap.
 */
import {
  STATUS,
  choiceKey,
  choiceRow,
  currentChoices,
  outstanding,
  planVoiceAudition,
  previewName,
  renderIndexHtml,
  statusOfVoice,
  voiceIdentity,
  voiceRowsBySlot,
  voiceSlots,
} from "../scripts/audio/audition-plan.mjs";
import {
  TTS_CANDIDATE_SEEDS,
  VOICES as CATALOG_VOICES,
  VOICE_CUES as CATALOG_CUES,
  resolveVoices,
  voiceSlotSpec,
} from "../scripts/audio/catalog.mjs";

const FEMALE = "21m00Tcm4TlvDq8ikWAM";
const MALE = "pNInz6obpgDQGcFmaJgB";
const INHALE = "Breathe in";
const INTRO = "Find a comfortable position, and let your shoulders soften.";

const VOICES = [
  { id: "guided", axis: "female", voiceId: FEMALE },
  { id: "guided-male", axis: "male", voiceId: MALE },
];
const CUES = [
  { id: "guide_inhale", text: INHALE },
  { id: "guide_intro", text: INTRO },
];

/** A row as `render-voices` appends it: no attempt index, no measurement, a seed. */
function voiceRow({
  clip = "guide_inhale",
  voice = "guided",
  voiceId = FEMALE,
  text = INHALE,
  candidate = 1,
  seed = 1130,
}: Partial<{
  clip: string;
  voice: string;
  voiceId: string;
  text: string;
  candidate: number;
  seed: number;
}> = {}) {
  return {
    clip,
    klass: "voice",
    voice,
    axis: voice === "guided" ? "female" : "male",
    voiceId,
    candidate,
    file: `${clip}-${voice}-c0${candidate}.wav`,
    text,
    seed,
    outputFormat: "wav_44100",
  };
}

const slotsFor = (voices = VOICES, cues = CUES) => voiceSlots({ voices, cues, candidates: 2 });

describe("voiceSlots", () => {
  it("is one unit per cue per voice", () => {
    // Both voices ship (#1136: the male voice is purely additive, no migration),
    // so a pick is owed for each one of each cue.
    expect(slotsFor()).toHaveLength(4);
    expect(slotsFor().map((slot) => slot.id)).toEqual([
      "guide_inhale|guided",
      "guide_inhale|guided-male",
      "guide_intro|guided",
      "guide_intro|guided-male",
    ]);
  });

  it("orders cue-major, so the matched pair is heard back to back on the same words", () => {
    // #1136's criterion is a MATCHED female/male pair auditioned on the shipping
    // words. Grouping by voice instead would put the two halves of that comparison
    // four players apart.
    const ids = slotsFor().map((slot) => `${slot.clipId}:${slot.voice}`);
    expect(ids.slice(0, 2)).toEqual(["guide_inhale:guided", "guide_inhale:guided-male"]);
  });

  it("carries the voice id, so a take can be graded against the voice actually chosen", () => {
    expect(slotsFor()[0]).toMatchObject({ voiceId: FEMALE, klass: "voice", candidates: 2 });
  });

  it("covers the whole shipping voice set — 8 units, 16 takes, not 4 clips", () => {
    // ☠️ The count that was wrong. #1210 ships 21 clips: 5 beds + 6 texture files
    // + 2 bells + **8 voice** (2 voices x 4 cues). The audition saw 11 of them.
    const shipping = voiceSlots({
      voices: CATALOG_VOICES,
      cues: CATALOG_CUES,
      candidates: TTS_CANDIDATE_SEEDS.length,
    });
    expect(shipping).toHaveLength(8);
    expect(shipping.reduce((n, slot) => n + slot.candidates, 0)).toBe(16);
  });
});

describe("voiceIdentity", () => {
  it("separates two voices saying the same words", () => {
    expect(voiceIdentity({ voiceId: FEMALE, text: INHALE })).not.toBe(
      voiceIdentity({ voiceId: MALE, text: INHALE }),
    );
  });

  it("separates two scripts in the same voice", () => {
    expect(voiceIdentity({ voiceId: FEMALE, text: INHALE })).not.toBe(
      voiceIdentity({ voiceId: FEMALE, text: INTRO }),
    );
  });

  it("names the gap when no voice has been chosen yet, rather than reading as a match", () => {
    // ⚠️ The catalog ships `voiceId: null` on both voices — #1136 deliberately
    // routed the pick to the render session. A null must not compare equal to a
    // rendered take's real id, or an unpicked voice reads as settled.
    const unset = voiceIdentity({ voiceId: null, text: INHALE });
    expect(unset).not.toBe(voiceIdentity({ voiceId: FEMALE, text: INHALE }));
    expect(unset).toMatch(/no voice/i);
  });
});

describe("statusOfVoice", () => {
  const identity = voiceIdentity({ voiceId: FEMALE, text: INHALE });

  it("accepts a take of the cue and the voice the catalog names today", () => {
    expect(statusOfVoice(voiceRow(), identity)).toBe(STATUS.accepted);
  });

  it("supersedes a take rendered by a voice that is no longer the pick", () => {
    // The whole point of auditioning a shortlist on the shipping words: takes of
    // the voice that lost must not sit among the winner's candidates.
    expect(statusOfVoice(voiceRow({ voiceId: MALE }), identity)).toBe(STATUS.superseded);
  });

  it("supersedes a take of wording since rewritten, the way an SFX prompt does", () => {
    expect(statusOfVoice(voiceRow({ text: "Get ready" }), identity)).toBe(STATUS.superseded);
  });

  it("never rejects a take for level, because TTS has no silent-tail problem", () => {
    // ☠️ #1320's gate is for the seedless Sound Effects model. Importing it here
    // would invent a rule no ticket decided, on the one class that is re-renderable.
    const statuses = [voiceRow(), voiceRow({ candidate: 2 })].map((row) =>
      statusOfVoice(row, identity),
    );
    expect(statuses).not.toContain(STATUS.rejected);
  });
});

describe("voiceRowsBySlot", () => {
  it("keys on cue, voice AND candidate, so two voices of one cue never merge", () => {
    // ☠️ `rowsBySlot` keys on `clip|candidate` — with two voices saying the same
    // cue that collapses the male take onto the female slot.
    const history = voiceRowsBySlot([
      voiceRow(),
      voiceRow({ voice: "guided-male", voiceId: MALE }),
    ]);
    expect(history.get("guide_inhale|guided|1")).toHaveLength(1);
    expect(history.get("guide_inhale|guided-male|1")).toHaveLength(1);
  });

  it("ignores sound-effect rows sharing the manifest file", () => {
    // Both halves of Round B append to one `manifest.jsonl`.
    const history = voiceRowsBySlot([{ clip: "rain", klass: "beds", candidate: 1, attempt: 1 }]);
    expect(history.size).toBe(0);
  });
});

describe("planVoiceAudition", () => {
  it("puts every rendered take of the current voice in front of the ear", () => {
    const { entries, missing } = planVoiceAudition({
      slots: slotsFor([VOICES[0]], [CUES[0]]),
      history: voiceRowsBySlot([voiceRow(), voiceRow({ candidate: 2, seed: 1210 })]),
    });
    expect(entries.map((e) => e.candidate)).toEqual([1, 2]);
    expect(missing).toEqual([]);
  });

  it("reports a slot with no take instead of silently shipping 4 clips of 8", () => {
    // ☠️ The failure this whole file exists for: a missing voice slot that says
    // nothing reads as a finished pass.
    const { entries, missing } = planVoiceAudition({ slots: slotsFor(), history: new Map() });
    expect(entries).toEqual([]);
    expect(missing).toHaveLength(8);
    expect(missing[0]).toMatchObject({ clipId: "guide_inhale", voice: "guided", candidate: 1 });
  });

  it("hides a take of a voice that lost the shortlist unless --all is passed", () => {
    const history = voiceRowsBySlot([voiceRow({ voiceId: "an-older-shortlisted-voice" })]);
    const slots = slotsFor([VOICES[0]], [CUES[0]]);
    expect(planVoiceAudition({ slots, history }).entries).toEqual([]);
    const widened = planVoiceAudition({ slots, history, all: true });
    expect(widened.entries.map((e) => e.status)).toEqual([STATUS.superseded]);
  });

  it("carries the seed, which is the one thing that makes this class re-renderable", () => {
    const { entries } = planVoiceAudition({
      slots: slotsFor([VOICES[0]], [CUES[0]]),
      history: voiceRowsBySlot([voiceRow({ seed: 1210 })]),
    });
    expect(entries[0]).toMatchObject({ seed: 1210, klass: "voice", voice: "guided" });
  });

  it("gives a superseded entry the take's OWN identity, not the slot's", () => {
    // ☠️ The same trap #1346 hit on the sound-effect side: recording the current
    // identity on every entry makes a stale pick read as settled.
    const { entries } = planVoiceAudition({
      slots: slotsFor([VOICES[0]], [CUES[0]]),
      history: voiceRowsBySlot([voiceRow({ voiceId: MALE })]),
      all: true,
    });
    expect(entries[0].prompt).toBe(voiceIdentity({ voiceId: MALE, text: INHALE }));
    expect(entries[0].currentPrompt).toBe(voiceIdentity({ voiceId: FEMALE, text: INHALE }));
  });

  it("gives each entry the unit id a pick is recorded under", () => {
    const { entries } = planVoiceAudition({
      slots: slotsFor([VOICES[0]], [CUES[0]]),
      history: voiceRowsBySlot([voiceRow()]),
    });
    expect(entries[0].unitId).toBe("guide_inhale|guided");
  });
});

describe("previewName for a voice take", () => {
  it("separates two voices of one cue, which would otherwise overwrite each other", () => {
    // ☠️ Without the voice in the name both write `guide_inhale-c01.m4a`, and the
    // second silently replaces the first — a comparison against itself.
    const female = previewName({
      clipId: "guide_inhale",
      voice: "guided",
      candidate: 1,
      attempt: null,
    });
    const male = previewName({
      clipId: "guide_inhale",
      voice: "guided-male",
      candidate: 1,
      attempt: null,
    });
    expect(female).not.toBe(male);
    expect(female).toBe("guide_inhale-guided-c01.m4a");
  });

  it("leaves a sound-effect preview name unchanged", () => {
    expect(previewName({ clipId: "rain", candidate: 2, attempt: 3 })).toBe("rain-c02-a03.m4a");
  });
});

describe("recording a voice pick", () => {
  const at = "2026-08-21T10:00:00.000Z";

  it("keys the choice on cue AND voice, so picking one voice does not settle the other", () => {
    const choices = currentChoices([
      choiceRow({
        clipId: "guide_inhale",
        voice: "guided",
        candidate: 1,
        file: "guide_inhale-guided-c01.wav",
        prompt: voiceIdentity({ voiceId: FEMALE, text: INHALE }),
        at,
      }),
    ]);
    expect(choices.get("guide_inhale|guided")).toBeDefined();
    expect(choices.get("guide_inhale|guided-male")).toBeUndefined();
  });

  it("leaves a sound-effect choice row byte-identical, so choices already on disk still read", () => {
    // `choices.jsonl` is append-only and may already hold picks. A new field on an
    // SFX row would make an old file and a new one two shapes of the same record.
    expect(
      choiceRow({ clipId: "rain", candidate: 2, file: "rain-c02-a01.pcm", prompt: "p", at }),
    ).toEqual({
      record: "chosen",
      clip: "rain",
      candidate: 2,
      file: "rain-c02-a01.pcm",
      prompt: "p",
      note: null,
      at,
    });
  });

  it("keys a voiceless row on the clip alone", () => {
    expect(choiceKey({ clip: "rain" })).toBe("rain");
    expect(choiceKey({ clip: "guide_inhale", voice: "guided" })).toBe("guide_inhale|guided");
  });
});

describe("the audition page, with both voices on it", () => {
  const card = (voice: string, file: string) => ({
    unitId: `guide_inhale|${voice}`,
    clipId: "guide_inhale",
    klass: "voice",
    voice,
    candidate: 1,
    attempt: null,
    file,
    status: STATUS.accepted,
    dbtp: null,
    lufs: null,
    seed: 1130,
    prompt: voiceIdentity({ voiceId: voice === "guided" ? FEMALE : MALE, text: INHALE }),
    currentPrompt: voiceIdentity({ voiceId: voice === "guided" ? FEMALE : MALE, text: INHALE }),
    preview: `guide_inhale-${voice}-c01.m4a`,
    loopPreview: null,
    post: { lufs: -16.0, dbtp: -3.1 },
    gain: 1.2,
    ceilingBound: false,
    seam: null,
    edges: { silent: false, leadMs: 0.4, tailMs: 12, peakDbfs: -3.1, floorDbfs: -60 },
    durationSeconds: 0.82,
    sizeKb: 9.4,
    error: null,
  });
  const page = (choices = new Map()) =>
    renderIndexHtml({
      round: "B",
      repeats: 10,
      results: [card("guided", "a.wav"), card("guided-male", "b.wav")],
      choices,
    });

  it("puts the matched pair in one section, so they are heard against each other", () => {
    // #1136's criterion is a matched female/male pair on the SHIPPING WORDS.
    expect(page().match(/<section>/g)).toHaveLength(1);
    expect(page()).toContain("guide_inhale-guided-c01.m4a");
    expect(page()).toContain("guide_inhale-guided-male-c01.m4a");
  });

  it("marks only the voice that was picked, not the whole cue", () => {
    // ☠️ The choice used to be looked up once per section by clip id, which would
    // paint the male take with the female's pick.
    const choices = currentChoices([
      choiceRow({
        clipId: "guide_inhale",
        voice: "guided",
        candidate: 1,
        file: "a.wav",
        prompt: voiceIdentity({ voiceId: FEMALE, text: INHALE }),
        at: "2026-08-21T10:00:00.000Z",
      }),
    ]);
    // The class on a CARD, not the stylesheet rule that also names it.
    expect(page(choices).match(/class="cand is-chosen"/g)).toHaveLength(1);
    expect(page(choices).match(/tag chosen/g)).toHaveLength(1);
  });

  it("carries --voice into the command it tells you to run", () => {
    // Without it the printed command throws, because the cue is ambiguous.
    expect(page()).toContain("choose guide_inhale 1 --round B --voice guided-male");
  });

  it("shows the lead-in, which is the acceptance check this class has always failed", () => {
    // #1138 measured the shipped guide_* clips at 3.2-36.2 ms while every bed,
    // texture and bell measures 0.0. The number belongs beside the player.
    expect(page()).toContain("lead");
    expect(page()).toContain("0.40 ms");
  });

  it("shows the measured length, which is where introMs comes from", () => {
    // ⚠️ #1136 corrected #1134: `introMs` is per-sound data read from the rendered
    // clip, never a hardcoded constant.
    expect(page()).toContain("0.820 s");
  });

  it("shows the seed, the one thing that makes a voice cue re-renderable", () => {
    expect(page()).toContain("1130");
  });

  it("does not show a seam row for a clip that never loops", () => {
    // ☠️ Only beds loop (#1137). A seam figure on a voice cue invites a judgement
    // about a join the app never plays.
    expect(page()).not.toContain("<dt>seam</dt>");
  });
});

describe("auditioning a shortlist on the shipping words", () => {
  /**
   * ☠️ #1136's criterion had a chicken-and-egg in it. The pick must be made
   * "auditioned on the shipping words, not on demo reels" — but `render-voices`
   * refuses to spend until a voiceId is IN the catalog, so hearing a shortlisted
   * voice say the shipping words meant editing the decision file for each trial,
   * and every abandoned trial left a decision recorded that nobody took.
   *
   * The override renders a trial without touching the catalog. It is safe because
   * the manifest records the voiceId actually used, so `statusOfVoice` supersedes
   * every trial take the moment a different voice is written in for real.
   */
  it("renders a trial voice without the catalog recording a decision nobody took", () => {
    const resolved = resolveVoices(VOICES, ["guided=trial-voice-id"]);
    expect(resolved.find((v) => v.id === "guided")!.voiceId).toBe("trial-voice-id");
    // The caller's own array is untouched — the override is per run, not a write.
    expect(VOICES[0].voiceId).toBe(FEMALE);
  });

  it("leaves voices it was not asked about alone", () => {
    expect(resolveVoices(VOICES, ["guided=x"]).find((v) => v.id === "guided-male")!.voiceId).toBe(
      MALE,
    );
  });

  it("returns the catalog unchanged when nothing is overridden", () => {
    expect(resolveVoices(VOICES, [])).toEqual(VOICES);
  });

  it("refuses an unknown voice rather than silently rendering the catalog's", () => {
    // A typo that spends credits on the wrong voice is exactly the class of silent
    // waste this map keeps paying for.
    expect(() => resolveVoices(VOICES, ["guided-female=x"])).toThrow(/guided-female/);
  });

  it("refuses a malformed pair", () => {
    expect(() => resolveVoices(VOICES, ["guided"])).toThrow(/id=voiceId/);
  });

  it("refuses the same id for both, which is not a matched pair but one voice twice", () => {
    // ☠️ #1136's whole framing is a PURE GENDER AXIS. Two identical ids render 16
    // takes of one voice and the comparison silently compares a clip to itself.
    expect(() => resolveVoices(VOICES, ["guided=same", "guided-male=same"])).toThrow(/same/);
  });
});

describe("outstanding voice slots", () => {
  const at = "2026-08-21T10:00:00.000Z";
  const identityOf = (slot: { voiceId: string | null; text: string }) => voiceIdentity(slot);

  it("lists every unpicked cue-and-voice pair", () => {
    expect(
      outstanding({ clips: slotsFor(), promptFor: identityOf, choices: new Map() }),
    ).toHaveLength(4);
  });

  it("clears only the pair that was picked", () => {
    const choices = currentChoices([
      choiceRow({
        clipId: "guide_inhale",
        voice: "guided",
        candidate: 1,
        file: "f.wav",
        prompt: voiceIdentity({ voiceId: FEMALE, text: INHALE }),
        at,
      }),
    ]);
    expect(outstanding({ clips: slotsFor(), promptFor: identityOf, choices })).toEqual([
      "guide_inhale|guided-male",
      "guide_intro|guided",
      "guide_intro|guided-male",
    ]);
  });

  it("re-opens a pick made against a voice that has since been swapped", () => {
    // ⚠️ The case that makes auditioning a shortlist safe: a pick recorded while a
    // different voice was in the catalog names a performance nobody is asking for.
    const choices = currentChoices([
      choiceRow({
        clipId: "guide_inhale",
        voice: "guided",
        candidate: 1,
        file: "f.wav",
        prompt: voiceIdentity({ voiceId: "the-voice-that-lost", text: INHALE }),
        at,
      }),
    ]);
    expect(outstanding({ clips: slotsFor(), promptFor: identityOf, choices })).toContain(
      "guide_inhale|guided",
    );
  });
});

describe("voiceSlotSpec", () => {
  // ☠️ WHY THIS IS TESTED AT ALL. "A round is `clipsForRound` plus, if it is B,
  // the voice cues" was re-derived by every subsystem that needed it, and two of
  // them got it wrong the same way: `render --round B` produced eleven clips of
  // nineteen and said nothing (#1317), and the audition's own `status` meter would
  // have reported "every clip has a pick" with the whole voice half untouched
  // (#1393). This function is now the single answer, which makes it the one place
  // a third consumer — #1210's committed manifest — could inherit the bug from.
  // Both directions matter: too few units hides unfinished work, and too many puts
  // eight speech cues into a round that is two bells and their gate (#1159).

  it("gives round B every cue in both voices", () => {
    const spec = voiceSlotSpec("B");
    expect(spec.voices).toBe(CATALOG_VOICES);
    expect(spec.cues).toBe(CATALOG_CUES);
    expect(spec.candidates).toBe(TTS_CANDIDATE_SEEDS.length);
    expect(voiceSlots(spec)).toHaveLength(CATALOG_CUES.length * CATALOG_VOICES.length);
  });

  it("gives round A no voice at all", () => {
    expect(voiceSlots(voiceSlotSpec("A"))).toEqual([]);
  });
});
