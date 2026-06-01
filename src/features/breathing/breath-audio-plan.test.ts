import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";

describe("breathClipFor", () => {
  const soft = breathSoundLookup["soft-breath"];
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
