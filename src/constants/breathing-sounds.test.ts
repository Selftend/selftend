/**
 * The bundled audio catalog, and what happens to a preference that outlived its sound.
 *
 * ☠️ WHY THIS FILE EXISTS. The breath-texture lane was retired on 2026-08-30 while three
 * of its ids were already persisted in `user_preferences.breath_sound_id`. Removing a
 * lane does not remove the stored value, and shipped store clients live forever, so the
 * only question that matters is what an account holding `wind` gets now. Left unhandled
 * it fails twice over — silence from the runner AND "None" in the picker while the
 * database says otherwise — so the mapping is deliberate and asserted.
 */
import {
  AMBIENT_SOUNDS,
  BREATH_SOUNDS,
  RETIRED_BREATH_SOUND_IDS,
  ambientSoundLookup,
  breathSoundLookup,
  resolveBreathSoundId,
} from "@/src/constants/breathing-sounds";

describe("the retired breath textures", () => {
  it("names the three that were removed", () => {
    expect([...RETIRED_BREATH_SOUND_IDS].sort()).toEqual(["ocean-swell", "soft-breath", "wind"]);
  });

  it("resolves every one of them to silence", () => {
    // `none` is the honest destination: a bed is not a breath texture, so there is
    // nothing to migrate to, and reassigning someone to `guided` would start talking.
    for (const id of RETIRED_BREATH_SOUND_IDS) expect(resolveBreathSoundId(id)).toBe("none");
  });

  it("leaves a live id alone", () => {
    expect(resolveBreathSoundId("guided")).toBe("guided");
    expect(resolveBreathSoundId("none")).toBe("none");
  });

  it("resolves to an id the catalog actually has", () => {
    // ⚠️ The point of the mapping is that the result is LOOKUP-ABLE. Pointing at
    // another id that does not exist would move the bug rather than fix it.
    for (const id of RETIRED_BREATH_SOUND_IDS) {
      expect(breathSoundLookup[resolveBreathSoundId(id)]).toBeDefined();
    }
  });

  it("keeps them out of the catalog", () => {
    const ids = BREATH_SOUNDS.map((s) => s.id);
    for (const id of RETIRED_BREATH_SOUND_IDS) expect(ids).not.toContain(id);
  });
});

describe("the breath lane", () => {
  it("is silence and the two guided voices, and nothing else", () => {
    // ⚠️ `guided-male` was added 2026-08-30. #1136 decided two voices and the ship
    // plan always counted EIGHT voice files, but the app wired four — the male half
    // was rendered and budgeted and unreachable.
    expect(BREATH_SOUNDS.map((s) => s.id)).toEqual(["none", "guided", "guided-male"]);
  });

  it("gives each voice its own MEASURED intro length", () => {
    // ☠️ A single hardcoded 3300 stood here. The female intro is 2.662s and the male
    // 4.557s, so one shared value cut the male off more than a second early. #1136
    // requires these come from the measured duration of the CHOSEN clip.
    const ms = Object.fromEntries(
      BREATH_SOUNDS.filter((s) => s.introAsset).map((s) => [s.id, s.introMs]),
    );
    expect(ms).toEqual({ guided: 2662, "guided-male": 4557 });
    // The two differ by well over a second — which is the whole reason one number
    // could not serve both.
    expect(Math.abs((ms["guided-male"] ?? 0) - (ms.guided ?? 0))).toBeGreaterThan(1000);
  });

  it("gives both voices a full set of cues and a distinct label", () => {
    const voices = BREATH_SOUNDS.filter((s) => s.id.startsWith("guided"));
    expect(voices).toHaveLength(2);
    for (const v of voices) {
      expect(v.loop).toBe(false);
      for (const a of [v.inhaleAsset, v.exhaleAsset, v.holdAsset, v.introAsset]) {
        expect(a).toBeTruthy();
      }
    }
    expect(voices[0].labelKey).not.toBe(voices[1].labelKey);
    // ☠️ WHAT THIS CANNOT CHECK: that the two voices point at DIFFERENT FILES. Jest
    // mocks `require()` of an asset to the number 1 for every file, so a copy-paste
    // that gave the male voice the female clips is indistinguishable here — every
    // assertion above would still pass. The real guard is the web export, which
    // resolves and hashes each path separately (verified 2026-08-30: eight distinct
    // guide_* files in dist), plus the differing introMs asserted above.
  });

  it("still fires the guided cue once per phase rather than looping it", () => {
    // ⚠️ `loop: false` is what makes it a CUE. The looped-texture behaviour it is
    // contrasted with no longer has a catalog entry, so this is the only thing
    // holding the distinction.
    expect(breathSoundLookup["guided"].loop).toBe(false);
    expect(breathSoundLookup["guided"].holdAsset).toBeTruthy();
  });
});

describe("the ambient lane", () => {
  it("carries the nine beds #1130 settled on, plus silence", () => {
    expect(AMBIENT_SOUNDS.map((s) => s.id)).toEqual([
      "none",
      "rain",
      "ocean",
      "stream",
      "forest",
      "night",
      "fire",
      "brown-noise",
      "pink-noise",
      "white-noise",
    ]);
  });

  it("gives every bed but silence a real asset", () => {
    for (const bed of AMBIENT_SOUNDS) {
      if (bed.id === "none") expect(bed.asset).toBeNull();
      else expect(bed.asset).toBeTruthy();
    }
  });

  it("gives every entry a distinct label key, so no two rows read the same", () => {
    const keys = AMBIENT_SOUNDS.map((s) => s.labelKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is reachable by id from the lookup", () => {
    for (const bed of AMBIENT_SOUNDS) expect(ambientSoundLookup[bed.id]).toBe(bed);
  });
});
