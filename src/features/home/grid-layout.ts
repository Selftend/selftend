export const GAP = 12;
export const MIN_WIDGET_WIDTH = 280;
export const MAX_COLUMNS = 3;

export function computeColumns(gridWidth: number) {
  if (gridWidth <= 0) return 1;
  return Math.max(
    1,
    Math.min(MAX_COLUMNS, Math.floor((gridWidth + GAP) / (MIN_WIDGET_WIDTH + GAP))),
  );
}

// Floored so a full row can never exceed the grid width: fractional cell
// widths get snapped to 1/64px by the browser, and a row computed to exactly
// fill the grid can round up past it and wrap its last cell onto a new line.
export function computeCellWidth(gridWidth: number, numColumns: number) {
  return Math.floor((gridWidth - (numColumns - 1) * GAP) / numColumns);
}
