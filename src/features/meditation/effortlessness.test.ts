import { activeEffortlessnessWindow } from "@/src/features/meditation/effortlessness";

describe("activeEffortlessnessWindow", () => {
  it("returns null before the one-third mark", () => {
    expect(activeEffortlessnessWindow(10, 600)).toBeNull();
    expect(activeEffortlessnessWindow(150, 600)).toBeNull();
  });

  it("returns the first window around the one-third mark", () => {
    // 1/3 of 600 = 200. Window ±15s -> 185–215.
    expect(activeEffortlessnessWindow(195, 600)).toBe(0);
    expect(activeEffortlessnessWindow(200, 600)).toBe(0);
    expect(activeEffortlessnessWindow(215, 600)).toBe(0);
  });

  it("returns null between the two prompt windows", () => {
    expect(activeEffortlessnessWindow(300, 600)).toBeNull();
    expect(activeEffortlessnessWindow(360, 600)).toBeNull();
  });

  it("returns the second window around the two-thirds mark", () => {
    // 2/3 of 600 = 400. Window ±15s -> 385–415.
    expect(activeEffortlessnessWindow(390, 600)).toBe(1);
    expect(activeEffortlessnessWindow(400, 600)).toBe(1);
    expect(activeEffortlessnessWindow(415, 600)).toBe(1);
  });

  it("returns null past the second window", () => {
    expect(activeEffortlessnessWindow(420, 600)).toBeNull();
    expect(activeEffortlessnessWindow(599, 600)).toBeNull();
  });

  it("returns null for sits shorter than three minutes", () => {
    expect(activeEffortlessnessWindow(60, 120)).toBeNull();
  });
});
