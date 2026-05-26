import { countWords } from "./word-count";

describe("countWords", () => {
  it("returns 0 for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
  });

  it("counts whitespace-separated words", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  one   two\nthree ")).toBe(3);
  });
});
