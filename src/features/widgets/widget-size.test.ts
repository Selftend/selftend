import { sizeTier, gridFor, labelsFit, squareGrid } from "@/src/features/widgets/widget-size";

describe("widget-size", () => {
  it("sizeTier: expanded at >=110dp height, else compact", () => {
    expect(sizeTier(300, 70)).toBe("compact");
    expect(sizeTier(300, 110)).toBe("expanded");
    expect(sizeTier(300, 200)).toBe("expanded");
  });
  it("gridFor: columns/rows from size, clamped 1..6", () => {
    expect(gridFor(40, 40)).toEqual({ columns: 1, rows: 1 });
    expect(gridFor(320, 250)).toEqual({ columns: 4, rows: 3 });
    expect(gridFor(2000, 2000)).toEqual({ columns: 6, rows: 6 });
  });
  it("labelsFit: true only when each cell is wide enough for a label", () => {
    expect(labelsFit(320, 4)).toBe(true);
    expect(labelsFit(180, 4)).toBe(false);
  });
  it("squareGrid: square tiles, columns by width capped by count, rows by height", () => {
    expect(squareGrid(400, 250, 6)).toEqual({ columns: 5, rows: 2, tile: 80 });
    expect(squareGrid(400, 80, 6)).toEqual({ columns: 5, rows: 1, tile: 80 });
    expect(squareGrid(160, 400, 6)).toEqual({ columns: 2, rows: 3, tile: 80 });
    expect(squareGrid(80, 80, 1)).toEqual({ columns: 1, rows: 1, tile: 80 });
  });
});
