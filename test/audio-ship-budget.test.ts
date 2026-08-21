/**
 * The shipping set and #1210's budget acceptance check.
 *
 * Pure functions only — no ffmpeg, no key, no rendered byte. The CLI half lives in
 * `audio-ship-budget-cli.test.ts`, because on this map the CLI is where the bugs
 * have actually been (`manifest --check` exited 0 against 65 gaps while every pure
 * test passed).
 */

import {
  SHIP_BUDGET_BYTES,
  SHIP_FILE_COUNT,
  budgetVerdict,
  bytesForSeconds,
  plausibleFloorBytes,
  referenceClipFor,
  predictShipping,
  shipFileName,
  shippingUnits,
  surveyShipping,
} from "../scripts/audio/ship-plan.mjs";
import {
  SFX_CLIPS,
  VOICES,
  VOICE_CUES,
  clipsForRound,
  voiceSlotSpec,
} from "../scripts/audio/catalog.mjs";

/**
 * Derived from the module, never hand-written. ⚠️ A local shape plus an
 * `as Unit[]` cast would keep compiling after `shippingUnits` changed shape — the
 * cast silences exactly the drift these tests exist to catch.
 */
type Unit = ReturnType<typeof shippingUnits>[number];

/** The lengths the four cues take to say, measured off the clips shipping today. */
const VOICE_SECONDS: Record<string, number> = {
  guide_intro: 3.08,
  guide_inhale: 0.939637,
  guide_hold: 0.630023,
  guide_exhale: 0.789705,
};

const withVoiceSeconds = (unit: Unit) => VOICE_SECONDS[unit.clip] ?? null;

const fileFor = (units: Unit[], id: string) => units.find((unit) => unit.id === id)!.file;

/**
 * A complete set at realistic sizes, for the survey's happy path.
 *
 * ⚠️ Each file weighs what its unit is predicted to weigh, rather than a uniform
 * token number. A flat 1 KB per file used to do, and stopped doing the moment a
 * present file had to be big enough to BE that unit — 1 KB is a truncated 30s bed.
 * A fixture that cannot pass the gate it is the happy path for is not a happy path.
 */
const completeSet = (units: Unit[], bytes?: number) =>
  units.map((unit) => ({
    name: unit.file,
    bytes: bytes ?? predictShipping([unit], withVoiceSeconds).totalBytes,
  }));

describe("the budget ceiling", () => {
  it("is 4 MiB, the unit #1138 decided in", () => {
    expect(SHIP_BUDGET_BYTES).toBe(4194304);
  });

  /**
   * ☠️ The whole check turns on this. Read as decimal megabytes the ceiling would
   * be 4,000,000 and the set would have 194 KB less headroom than it does — on a
   * set already at ~80% of the limit. #1138's own "2.854 MB" for the sixteen files
   * that total 2,992,420 bytes is what settles it: that is MiB, not MB.
   */
  it("is not decimal megabytes", () => {
    expect(SHIP_BUDGET_BYTES).not.toBe(4_000_000);
    expect(2992420 / SHIP_BUDGET_BYTES).toBeCloseTo(0.713, 3);
  });

  /**
   * ⚠️ The comparison lives in one function on purpose. It was inlined in both
   * `predictShipping` and `surveyShipping` for one commit, and mutation-testing
   * found that only the survey's copy had a boundary test — flipping the
   * prediction's `>` to `>=` changed the verdict on an exactly-full set and nothing
   * failed. Both now spread this, so the boundary is asserted once and holds for
   * both.
   */
  it("counts a set exactly on the ceiling as under it", () => {
    expect(budgetVerdict(SHIP_BUDGET_BYTES).over).toBe(false);
    expect(budgetVerdict(SHIP_BUDGET_BYTES).headroomBytes).toBe(0);
    expect(budgetVerdict(SHIP_BUDGET_BYTES + 1).over).toBe(true);
    expect(budgetVerdict(SHIP_BUDGET_BYTES - 1).over).toBe(false);
  });

  it("is the same verdict wherever it is asked", () => {
    const units: Unit[] = shippingUnits();
    const predicted = predictShipping(units, withVoiceSeconds);
    const surveyed = surveyShipping(units, [{ name: "x.m4a", bytes: predicted.totalBytes }]);

    expect(surveyed.over).toBe(predicted.over);
    expect(surveyed.headroomBytes).toBe(predicted.headroomBytes);
    expect(surveyed.budgetBytes).toBe(predicted.budgetBytes);
  });
});

describe("shippingUnits", () => {
  it("is the twenty-one files #1210 and #1138 both count", () => {
    expect(shippingUnits()).toHaveLength(SHIP_FILE_COUNT);
    expect(SHIP_FILE_COUNT).toBe(21);
  });

  /**
   * ☠️ THE GUARD THAT MATTERS. "What units are there" has been re-derived per
   * subsystem and got it wrong twice — eleven clips of nineteen (#1317), and a
   * status meter that called the set settled with the voice half untouched
   * (#1393). This is a third derivation, of a different question (the whole ship,
   * not one round), so it is tied back to the two sources that already answer it
   * and cannot drift from them in silence.
   */
  it("is exactly both rounds' sound effects plus every cue in every voice", () => {
    const units: Unit[] = shippingUnits();
    const sfxIds = units.filter((unit) => !unit.voice).map((unit) => unit.clip);
    const fromRounds = [...clipsForRound("A"), ...clipsForRound("B")].map(
      (clip: { id: string }) => clip.id,
    );

    expect([...sfxIds].sort()).toEqual([...fromRounds].sort());
    expect(sfxIds).toHaveLength(SFX_CLIPS.length);

    const spec = voiceSlotSpec("B");
    const voiceUnits = units.filter((unit) => unit.voice);
    expect(voiceUnits).toHaveLength(spec.cues.length * spec.voices.length);
  });

  it("gives every cue one unit per voice, and they are distinct files", () => {
    const units: Unit[] = shippingUnits();
    for (const cue of VOICE_CUES as { id: string }[]) {
      const mine = units.filter((unit) => unit.clip === cue.id);
      expect(mine.map((unit) => unit.voice).sort()).toEqual(
        (VOICES as { id: string }[]).map((voice) => voice.id).sort(),
      );
      expect(new Set(mine.map((unit) => unit.file)).size).toBe(mine.length);
    }
  });

  it("gives the whole set distinct filenames", () => {
    const units: Unit[] = shippingUnits();
    expect(new Set(units.map((unit) => unit.file)).size).toBe(units.length);
  });

  it("carries each unit's own output spec, not one class's", () => {
    const units: Unit[] = shippingUnits();
    const bed = units.find((unit) => unit.clip === "rain")!;
    const texture = units.find((unit) => unit.clip === "wind_inhale")!;
    const voice = units.find((unit) => unit.clip === "guide_hold")!;

    expect(bed).toMatchObject({ bitrate: "128k", channels: 2, seconds: 30 });
    expect(texture).toMatchObject({ bitrate: "96k", channels: 1, seconds: 10 });
    expect(voice).toMatchObject({ bitrate: "64k", channels: 1, klass: "voice" });
  });

  /** How long a cue takes to say comes back from TTS; nobody decided it. */
  it("leaves a voice cue's length unknown rather than zero", () => {
    const units: Unit[] = shippingUnits();
    for (const unit of units.filter((u) => u.voice)) {
      expect(unit.seconds).toBeNull();
    }
  });
});

describe("shipFileName", () => {
  /** ☠️ The collision this file exists to stop. */
  it("keeps the two voices apart", () => {
    expect(shipFileName({ clip: "guide_inhale", voice: "guided" })).toBe("guide_inhale.guided.m4a");
    expect(shipFileName({ clip: "guide_inhale", voice: "guided-male" })).toBe(
      "guide_inhale.guided-male.m4a",
    );
    expect(shipFileName({ clip: "guide_inhale", voice: "guided" })).not.toBe(
      shipFileName({ clip: "guide_inhale", voice: "guided-male" }),
    );
  });

  it("refuses to name a voice cue without its voice", () => {
    expect(() => shipFileName({ clip: "guide_intro" })).toThrow(/ships once per voice/);
  });

  it("refuses a voice on a sound effect", () => {
    expect(() => shipFileName({ clip: "rain", voice: "guided" })).toThrow(/has no voice/);
  });

  it("names a sound effect after itself", () => {
    expect(shipFileName({ clip: "rain" })).toBe("rain.m4a");
    expect(shipFileName({ clip: "meditation-bell" })).toBe("meditation-bell.m4a");
  });
});

describe("bytesForSeconds", () => {
  it("is bitrate times seconds over eight", () => {
    expect(bytesForSeconds(30, "128k")).toBe(480000);
    expect(bytesForSeconds(10, "96k")).toBe(120000);
    expect(bytesForSeconds(1, "64k")).toBe(8000);
  });

  it("refuses a bitrate it cannot read rather than silently weighing nothing", () => {
    expect(() => bytesForSeconds(30, "")).toThrow(/unreadable bitrate/);
    expect(() => bytesForSeconds(30, "k")).toThrow(/unreadable bitrate/);
  });
});

describe("predictShipping", () => {
  /**
   * #1138 published 3.21 MB for this set. Reproducing it from the catalog is what
   * says the model behind the ceiling and the model behind this check are the same
   * one — if they ever diverge, the check is measuring against a number that was
   * decided about something else.
   */
  it("reproduces the 3.21 MB #1138 published", () => {
    const predicted = predictShipping(shippingUnits(), withVoiceSeconds);
    expect(predicted.totalBytes / 1024 / 1024).toBeCloseTo(3.2, 1);
    expect(predicted.complete).toBe(true);
    expect(predicted.over).toBe(false);
  });

  it("leaves the set real headroom, and says how much", () => {
    const predicted = predictShipping(shippingUnits(), withVoiceSeconds);
    expect(predicted.headroomBytes).toBe(SHIP_BUDGET_BYTES - predicted.totalBytes);
    expect(predicted.headroomBytes).toBeGreaterThan(0);
    expect(predicted.budgetBytes).toBe(SHIP_BUDGET_BYTES);
  });

  /** ☠️ An unknown length must not weigh zero and pass by being absent. */
  it("reports unknown lengths instead of counting them as nothing", () => {
    const predicted = predictShipping(shippingUnits());
    expect(predicted.unknown).toHaveLength(8);
    expect(predicted.complete).toBe(false);
    for (const row of predicted.unknown) {
      expect(row.bytes).toBeNull();
    }
  });

  it("calls a set over budget when it is", () => {
    const units: Unit[] = shippingUnits().map((unit: Unit) => ({ ...unit, seconds: 600 }));
    const predicted = predictShipping(units);
    expect(predicted.over).toBe(true);
    expect(predicted.headroomBytes).toBeLessThan(0);
  });
});

describe("surveyShipping", () => {
  it("passes a complete set that fits", () => {
    const units: Unit[] = shippingUnits();
    const survey = surveyShipping(units, completeSet(units));
    expect(survey.complete).toBe(true);
    expect(survey.gaps).toEqual([]);
    expect(survey.totalBytes).toBe(predictShipping(units, withVoiceSeconds).totalBytes);
  });

  /**
   * ☠️ The failure the collision would have produced: twenty files, one voice
   * missing, and a count that a human eyeballing the folder reads as "nearly all
   * there".
   */
  it("names the missing half of the voice set", () => {
    const units: Unit[] = shippingUnits();
    const male = units.filter((unit) => unit.voice === "guided-male").map((unit) => unit.file);
    const survey = surveyShipping(
      units,
      completeSet(units).filter((file) => !male.includes(file.name)),
    );

    expect(survey.complete).toBe(false);
    expect(survey.missing).toHaveLength(4);
    expect(survey.gaps.filter((gap: { kind: string }) => gap.kind === "missing")).toHaveLength(4);
    expect(survey.gaps.map((gap: { file?: string }) => gap.file).sort()).toEqual(male.sort());
  });

  it("reports a file no unit claims", () => {
    const units: Unit[] = shippingUnits();
    const survey = surveyShipping(units, [...completeSet(units), { name: "stray.m4a", bytes: 10 }]);

    expect(survey.complete).toBe(false);
    expect(survey.unexpected).toHaveLength(1);
    expect(survey.gaps).toContainEqual(
      expect.objectContaining({ kind: "unexpected", file: "stray.m4a" }),
    );
    // ☠️ Counted against the ceiling regardless — bytes in the folder are bytes.
    expect(survey.totalBytes).toBe(predictShipping(units, withVoiceSeconds).totalBytes + 10);
  });

  it("fails a complete set that is over the ceiling", () => {
    const units: Unit[] = shippingUnits();
    const survey = surveyShipping(units, completeSet(units, SHIP_BUDGET_BYTES));

    expect(survey.missing).toHaveLength(0);
    expect(survey.over).toBe(true);
    expect(survey.complete).toBe(false);
    expect(survey.gaps).toContainEqual(expect.objectContaining({ kind: "over-budget" }));
  });

  /** A set exactly on the ceiling fits — the rule is "under", inclusive of equal. */
  it("allows a set that lands exactly on the ceiling", () => {
    const units: Unit[] = shippingUnits();
    // Padded to the ceiling exactly, not divided into it — 4 MiB over 21 files is not
    // a whole number of bytes, and a rounding artifact would test the float, not the
    // rule. Every file still weighs at least what its unit must.
    const files = completeSet(units);
    const spare = SHIP_BUDGET_BYTES - files.reduce((sum, file) => sum + file.bytes, 0);
    expect(spare).toBeGreaterThan(0);
    files[0].bytes += spare;
    const survey = surveyShipping(units, files);

    expect(survey.totalBytes).toBe(SHIP_BUDGET_BYTES);
    expect(survey.over).toBe(false);
    expect(survey.complete).toBe(true);
  });

  /**
   * ☠️ THE ONE `/code-review` FOUND BY RUNNING IT. Twenty-one files named exactly
   * right, all zero bytes, reported "21/21 files · complete and fits" and exited 0 —
   * because presence was only "a name matched". A pass that produced twenty-one
   * failed encodes read as the finished set, in the one artifact where that would be
   * permanent.
   */
  it("refuses a set of correctly-named empty files", () => {
    const units: Unit[] = shippingUnits();
    const survey = surveyShipping(units, completeSet(units, 0));

    expect(survey.missing).toHaveLength(0);
    expect(survey.undersized).toHaveLength(SHIP_FILE_COUNT);
    expect(survey.complete).toBe(false);
    expect(survey.gaps.every((gap: { kind: string }) => gap.kind === "undersized")).toBe(true);
    expect(survey.gaps[0].detail).toMatch(/empty/);
  });

  it("refuses a sound effect truncated well under its own length", () => {
    const units: Unit[] = shippingUnits();
    const rain = units.find((unit) => unit.clip === "rain")!;
    // A 30s bed at 128k is 480,000 bytes; 1 KB of it is a failed encode.
    const survey = surveyShipping(
      units,
      completeSet(units, 480_000).map((file) =>
        file.name === rain.file ? { ...file, bytes: 1000 } : file,
      ),
    );

    expect(survey.undersized.map((row: { clip: string }) => row.clip)).toEqual(["rain"]);
    expect(survey.complete).toBe(false);
  });

  /** ⚠️ The floor is loose on purpose — it catches truncation, it does not grade. */
  it("accepts a file that is merely smaller than predicted", () => {
    const units: Unit[] = shippingUnits();
    const rain = units.find((unit) => unit.clip === "rain")!;
    const survey = surveyShipping(
      units,
      completeSet(units, 480_000).map((file) =>
        file.name === rain.file ? { ...file, bytes: 480_000 * 0.8 } : file,
      ),
    );

    expect(survey.undersized).toHaveLength(0);
  });

  /**
   * A voice cue gets no floor beyond "not empty": the only length available is an
   * estimate off a different rendering of the same words, too soft to fail a file on.
   */
  it("holds a voice cue only to being non-empty", () => {
    const units: Unit[] = shippingUnits();
    const cue = units.find((unit) => unit.voice === "guided-male")!;
    expect(plausibleFloorBytes(cue)).toBe(0);

    const tiny = surveyShipping(
      units,
      completeSet(units, 480_000).map((file) =>
        file.name === cue.file ? { ...file, bytes: 1 } : file,
      ),
    );
    expect(tiny.undersized).toHaveLength(0);

    const empty = surveyShipping(
      units,
      completeSet(units, 480_000).map((file) =>
        file.name === cue.file ? { ...file, bytes: 0 } : file,
      ),
    );
    expect(empty.undersized.map((row: { id: string }) => row.id)).toEqual([cue.id]);
  });

  it("finds nothing at all when the pass has not run", () => {
    const units: Unit[] = shippingUnits();
    const survey = surveyShipping(units, []);

    expect(survey.missing).toHaveLength(SHIP_FILE_COUNT);
    expect(survey.complete).toBe(false);
    expect(survey.totalBytes).toBe(0);
  });

  /** A unit named right but weighing nothing is present; the level gates are elsewhere. */
  it("counts a present file's bytes onto its unit", () => {
    const units: Unit[] = shippingUnits();
    const rain = fileFor(units, "rain");
    const survey = surveyShipping(
      units,
      completeSet(units).map((file) => (file.name === rain ? { ...file, bytes: 480000 } : file)),
    );

    expect(survey.rows.find((row: { file: string }) => row.file === rain)).toMatchObject({
      present: true,
      bytes: 480000,
    });
  });
});
