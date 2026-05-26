import { median } from "./median";

describe("median", () => {
  it("returns null for an empty list", () => {
    expect(median([])).toBeNull();
  });

  it("returns the middle value for odd-length lists", () => {
    expect(median([10, 20, 5])).toBe(10);
  });

  it("returns the rounded mean of the two middle values for even-length lists", () => {
    expect(median([10, 20, 5, 15])).toBe(13);
  });
});
