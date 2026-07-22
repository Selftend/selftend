import {
  GAP,
  MAX_COLUMNS,
  MIN_WIDGET_WIDTH,
  computeCellWidth,
  computeColumns,
} from "./grid-layout";

// Browsers snap CSS lengths to 1/64px, rounding to nearest. A fractional cell
// width can round UP, so a row computed to exactly fill the grid can overflow
// by a sub-pixel and wrap the last cell onto the next line (the intermittent
// 2-column dashboard bug). This models the worst-case snap of one cell.
function snapUp(value: number) {
  return Math.ceil(value * 64) / 64;
}

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

describe("computeCellWidth", () => {
  it("never lets a full row overflow the grid, even after sub-pixel rounding", () => {
    // Sweep fractional grid widths (onLayout reports fractional px on web).
    for (let gridWidth = MIN_WIDGET_WIDTH; gridWidth < 1900; gridWidth += 0.7) {
      const columns = computeColumns(gridWidth);
      const cellWidth = computeCellWidth(gridWidth, columns);
      const rowWidth = snapUp(cellWidth) * columns + GAP * (columns - 1);
      expect(rowWidth).toBeLessThanOrEqual(gridWidth);
    }
  });

  it("keeps cells within a pixel or two of an exact fill", () => {
    for (const gridWidth of [900, 1338.4, 1722, 1745.6]) {
      const columns = computeColumns(gridWidth);
      const cellWidth = computeCellWidth(gridWidth, columns);
      const exact = (gridWidth - (columns - 1) * GAP) / columns;
      expect(cellWidth).toBeGreaterThan(exact - 2);
      expect(cellWidth).toBeLessThanOrEqual(exact);
    }
  });
});
