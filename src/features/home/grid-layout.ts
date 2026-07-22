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
