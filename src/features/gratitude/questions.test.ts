import { answeredCount, asQuestionList, firstAnswer } from "@/src/features/gratitude/questions";

describe("gratitude question helpers", () => {
  it("asQuestionList keeps only strings, else empty array", () => {
    expect(asQuestionList(["a", "b"])).toEqual(["a", "b"]);
    expect(asQuestionList(["a", 1, null, "b"])).toEqual(["a", "b"]);
    expect(asQuestionList("nope")).toEqual([]);
    expect(asQuestionList(undefined)).toEqual([]);
  });

  it("answeredCount counts non-blank slots", () => {
    expect(answeredCount(["a", "", "  ", "b"])).toBe(2);
    expect(answeredCount(["", ""])).toBe(0);
  });

  it("firstAnswer returns the first non-blank slot or undefined", () => {
    expect(firstAnswer(["", "  ", "found", "x"])).toBe("found");
    expect(firstAnswer(["", ""])).toBeUndefined();
  });
});
