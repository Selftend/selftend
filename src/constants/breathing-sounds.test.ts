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
  it("is silence and the guided voice, and nothing else", () => {
    expect(BREATH_SOUNDS.map((s) => s.id)).toEqual(["none", "guided"]);
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
