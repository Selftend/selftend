import {
  answeredCount,
  asQuestionList,
  firstAnswer,
  gratitudeAnswers,
} from "@/src/features/gratitude/questions";

describe("gratitude question helpers", () => {
  it("asQuestionList keeps only strings, else empty array", () => {
    expect(asQuestionList(["a", "b"])).toEqual(["a", "b"]);
    expect(asQuestionList(["a", 1, null, "b"])).toEqual(["a", "b"]);
    expect(asQuestionList("nope")).toEqual([]);
    expect(asQuestionList(undefined)).toEqual([]);
  });

  it("gratitudeAnswers zips items with questions and drops empty slots", () => {
    const items = ["laughed", "", "  ", "better"];
    const questions = ["Q1", "Q2", "Q3", "Q4", "Q5"];
    expect(gratitudeAnswers(items, questions)).toEqual([
      { question: "Q1", text: "laughed" },
      { question: "Q4", text: "better" },
    ]);
  });

  it("gratitudeAnswers falls back to an empty question when none is defined", () => {
    expect(gratitudeAnswers(["x"], [])).toEqual([{ question: "", text: "x" }]);
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
