import { seedEmotionsForThoughtRecord } from "@/src/features/mood/thought-record-handoff";

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
