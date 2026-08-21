/**
 * The catalog's half of #1347's ruling: beds render natively looping (#1359).
 *
 * ☠️ WHY THIS FILE EXISTS. `loop` used to be ONE module constant shared by all
 * thirteen Sound Effects clips, so "make beds loop" is a one-character edit that
 * would also have flipped the two bells — one-shots, where a looping render is
 * meaningless — and the six textures, which #1137 established never loop at
 * runtime at all. The flag is per-class now, and these tests are what stops it
 * collapsing back into one value.
 *
 * ⚠️ The 0.75s quantum is the other thing worth holding. #1347 measured loop mode
 * rounding a returned duration UP to the next multiple of 0.75s — 1s came back
 * 1.5s, 2s came back 2.25s — and 30s is untouched only because 30 = 40 x 0.75
 * exactly. That is a property of the NUMBER 30, not of beds, so it has to be
 * asserted rather than remembered.
 */
import {
  BEDS,
  BELLS,
  CLASS_LOOP,
  CREDITS_PER_SECOND,
  SFX_CLIPS,
  TEXTURES,
  creditEstimate,
  outputSpecFor,
} from "../scripts/audio/catalog.mjs";
import { loopReturnedSeconds } from "../scripts/audio/loop-probe.mjs";

describe("only beds render loop: true", () => {
  it("asks the API to loop every bed", () => {
    expect(BEDS).toHaveLength(5);
    for (const bed of BEDS) expect(bed.loop).toBe(true);
  });

  it("leaves the bells one-shots", () => {
    expect(BELLS).toHaveLength(2);
    for (const bell of BELLS) expect(bell.loop).toBe(false);
  });

  it("leaves the textures non-looping, as #1137 ruled", () => {
    expect(TEXTURES).toHaveLength(6);
    for (const texture of TEXTURES) expect(texture.loop).toBe(false);
  });

  it("has exactly one loop answer per class, and beds are the only true one", () => {
    expect(CLASS_LOOP).toEqual({ bells: false, beds: true, textures: false });
    // Every clip's own flag agrees with its class's — a clip that carried its own
    // value would be a per-clip exception nobody decided.
    const byClass: Record<string, boolean> = CLASS_LOOP;
    for (const clip of SFX_CLIPS) expect(clip.loop).toBe(byClass[clip.klass]);
  });
});

describe("a looping request is a duration loop mode will honour exactly", () => {
  it("rounds a returned duration up to the next 0.75s multiple", () => {
    // The three #1347 actually measured, and the shape they establish.
    expect(loopReturnedSeconds(1)).toBeCloseTo(1.5, 6);
    expect(loopReturnedSeconds(2)).toBeCloseTo(2.25, 6);
    expect(loopReturnedSeconds(30)).toBeCloseTo(30, 6);
  });

  it("leaves an exact multiple alone rather than advancing to the next one", () => {
    expect(loopReturnedSeconds(0.75)).toBeCloseTo(0.75, 6);
    expect(loopReturnedSeconds(3)).toBeCloseTo(3, 6);
  });

  it("survives the floating-point arithmetic 30 / 0.75 invites", () => {
    // 0.1 + 0.2 territory: a naive `seconds % 0.75 === 0` reports 30s as a
    // non-multiple on some inputs and would quietly stretch every bed.
    for (const seconds of [0.75, 1.5, 6, 15, 22.5, 30]) {
      expect(loopReturnedSeconds(seconds)).toBeCloseTo(seconds, 6);
    }
  });

  it("gives every looping clip the length it asked for", () => {
    const looping = SFX_CLIPS.filter((clip) => clip.loop);
    expect(looping).toHaveLength(5);
    for (const clip of looping) {
      expect(loopReturnedSeconds(clip.durationSeconds)).toBeCloseTo(clip.durationSeconds, 6);
    }
  });

  it("would catch a bed moved to a duration loop mode stretches", () => {
    // The failure this guards: 10s — a texture's length — comes back 10.5s, so a
    // future "beds are 10s now" would ship 0.5s nobody planned or measured.
    expect(loopReturnedSeconds(10)).toBeCloseTo(10.5, 6);
  });
});

describe("a natively looping bed carries its render mode into the pipeline", () => {
  it("tells the post-processor the bed was rendered looping", () => {
    expect(outputSpecFor("brown-noise").loop).toBe(true);
  });

  it("still offers the fold length, which is now the fallback and not the path", () => {
    expect(outputSpecFor("brown-noise").foldSeconds).toBeCloseTo(0.4, 6);
  });

  it("gives a bell and a texture no fold length at all", () => {
    expect(outputSpecFor("meditation-bell").foldSeconds).toBeNull();
    expect(outputSpecFor("soft-breath_inhale").foldSeconds).toBeNull();
    expect(outputSpecFor("meditation-bell").loop).toBe(false);
  });

  it("says a voice cue neither loops nor folds", () => {
    expect(outputSpecFor("guide_intro")).toMatchObject({
      klass: "voice",
      foldSeconds: null,
      loop: false,
    });
  });
});

describe("the credit rate is the API's, not the web composer's", () => {
  it("prices a second at 11 credits", () => {
    // ☠️ MEASURED TWICE on the live API via the `character-cost` response header:
    // 330 credits for 30s, 22 for 2s. The old 3.3 came from #1159 watching the web
    // composer, which prices differently — every quote it produced was 3.3x under.
    expect(CREDITS_PER_SECOND).toBe(11);
  });

  it("quotes Round B at the number the API would actually charge", () => {
    const roundB = SFX_CLIPS.filter((clip) => clip.round === "B");
    const { seconds, credits } = creditEstimate(roundB);
    // 5 beds x 3 x 30s + 6 textures x 2 x 10s.
    expect(seconds).toBe(570);
    expect(credits).toBe(6270);
  });

  it("quotes the two bells at what Round A really cost", () => {
    const { seconds, credits } = creditEstimate(BELLS);
    expect(seconds).toBe(45);
    expect(credits).toBe(495);
  });
});
