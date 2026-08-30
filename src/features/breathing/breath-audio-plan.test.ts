import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";

describe("breathClipFor", () => {
  // ☠️ A local fixture, not a catalog entry. `soft-breath` was the looped texture
  // this branch was written against, and the whole texture lane was retired on
  // 2026-08-30 (owner: background beds only). `breathClipFor`'s CONTRACT is
  // unchanged — it still has to handle a sound with inhale/exhale assets and no
  // hold cue — so the branch keeps its coverage from a literal instead of from an
  // id that no longer exists.
  const soft = {
    id: "retired-texture",
    labelKey: "x",
    inhaleAsset: 101,
    exhaleAsset: 102,
  };
  const none = breathSoundLookup["none"];
  const guided = breathSoundLookup["guided"];

  it("returns the inhale clip on inhale", () => {
    expect(breathClipFor("inhale", soft)).toBe(soft.inhaleAsset);
  });

  it("returns the exhale clip on exhale", () => {
    expect(breathClipFor("exhale", soft)).toBe(soft.exhaleAsset);
  });

  it("returns null on holds for a looped texture (no hold cue)", () => {
    expect(breathClipFor("hold", soft)).toBeNull();
    expect(breathClipFor("holdOut", soft)).toBeNull();
  });

  it("returns the hold cue on holds for a guided voice sound", () => {
    expect(breathClipFor("hold", guided)).toBe(guided.holdAsset);
    expect(breathClipFor("holdOut", guided)).toBe(guided.holdAsset);
    expect(breathClipFor("inhale", guided)).toBe(guided.inhaleAsset);
  });

  it("returns null when the sound is 'none'", () => {
    expect(breathClipFor("inhale", none)).toBeNull();
  });

  it("returns null when the phase label is null", () => {
    expect(breathClipFor(null, soft)).toBeNull();
  });
});
