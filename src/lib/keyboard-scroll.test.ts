import { computeKeyboardScrollDelta } from "@/src/lib/keyboard-scroll";

describe("computeKeyboardScrollDelta", () => {
  // Typical phone: viewport visible above the keyboard spans 80..500.
  const visible = { visibleTop: 80, visibleBottom: 500 };

  it("returns 0 when the input is fully visible", () => {
    expect(computeKeyboardScrollDelta({ inputTop: 200, inputBottom: 260, ...visible })).toBe(0);
  });

  it("scrolls down so an input hidden behind the keyboard lands on the visible bottom", () => {
    // Input bottom is 140px past the visible bottom.
    expect(computeKeyboardScrollDelta({ inputTop: 580, inputBottom: 640, ...visible })).toBe(140);
  });

  it("scrolls up (negative) when the input sits above the visible top", () => {
    expect(computeKeyboardScrollDelta({ inputTop: 20, inputBottom: 60, ...visible })).toBe(-60);
  });

  it("caps the scroll so a tall input keeps its top visible", () => {
    // Bottom-aligning would need +400, but that would push the top (300)
    // above the visible top (80): cap at 300 - 80 = 220.
    expect(computeKeyboardScrollDelta({ inputTop: 300, inputBottom: 900, ...visible })).toBe(220);
  });

  it("does not move an input that already spans the whole visible area", () => {
    expect(computeKeyboardScrollDelta({ inputTop: 40, inputBottom: 700, ...visible })).toBe(0);
  });

  it("returns 0 for a degenerate (keyboard covers everything) viewport", () => {
    expect(
      computeKeyboardScrollDelta({
        inputTop: 100,
        inputBottom: 140,
        visibleTop: 500,
        visibleBottom: 500,
      }),
    ).toBe(0);
  });
});
