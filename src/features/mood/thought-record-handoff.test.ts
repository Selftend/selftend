import {
  parseSeededEmotionsParam,
  seedEmotionsForThoughtRecord,
} from "@/src/features/mood/thought-record-handoff";

describe("seedEmotionsForThoughtRecord", () => {
  it("keeps builtin ids in the order the user picked them", () => {
    expect(seedEmotionsForThoughtRecord(["anxious", "grateful", "sad"])).toEqual([
      "anxious",
      "grateful",
      "sad",
    ]);
  });

  it("drops custom emotions - the thought-record step cannot render or uncheck them", () => {
    expect(seedEmotionsForThoughtRecord(["anxious", "b3a1-custom-id", "sad"])).toEqual([
      "anxious",
      "sad",
    ]);
  });

  it("lowercases legacy capitalised ids that land on a builtin", () => {
    expect(seedEmotionsForThoughtRecord(["Anxious", "Grateful"])).toEqual(["anxious", "grateful"]);
  });

  it("dedupes when a legacy id and its modern form are both present", () => {
    expect(seedEmotionsForThoughtRecord(["anxious", "Anxious"])).toEqual(["anxious"]);
  });

  it("returns nothing for an empty selection", () => {
    expect(seedEmotionsForThoughtRecord([])).toEqual([]);
  });
});

describe("parseSeededEmotionsParam", () => {
  it("splits the comma-separated param", () => {
    expect(parseSeededEmotionsParam("anxious,sad")).toEqual(["anxious", "sad"]);
  });

  it("takes the first value when expo-router hands back an array", () => {
    expect(parseSeededEmotionsParam(["anxious,sad", "happy"])).toEqual(["anxious", "sad"]);
  });

  it("filters unknown ids out of a hand-edited URL", () => {
    expect(parseSeededEmotionsParam("anxious,not-an-emotion")).toEqual(["anxious"]);
  });

  it("returns nothing when the param is absent or empty", () => {
    expect(parseSeededEmotionsParam(undefined)).toEqual([]);
    expect(parseSeededEmotionsParam("")).toEqual([]);
  });
});
