import { GAP, MAX_COLUMNS, MIN_WIDGET_WIDTH, computeColumns } from "./grid-layout";

describe("computeColumns", () => {
  it("returns 1 for zero or negative widths", () => {
    expect(computeColumns(0)).toBe(1);
    expect(computeColumns(-10)).toBe(1);
  });

  it("returns 1 below the two-column threshold", () => {
    expect(computeColumns(MIN_WIDGET_WIDTH)).toBe(1);
    expect(computeColumns(MIN_WIDGET_WIDTH * 2 + GAP - 1)).toBe(1);
  });

  it("returns 2 once two min-width widgets plus a gap fit", () => {
    expect(computeColumns(MIN_WIDGET_WIDTH * 2 + GAP)).toBe(2);
  });

  it("caps at MAX_COLUMNS on very wide grids", () => {
    expect(computeColumns(5000)).toBe(MAX_COLUMNS);
  });
});
