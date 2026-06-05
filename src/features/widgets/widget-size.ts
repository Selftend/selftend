export type SizeTier = "compact" | "expanded";

export function sizeTier(_width: number, height: number): SizeTier {
  return height >= 110 ? "expanded" : "compact";
}

const clamp1to6 = (n: number) => Math.max(1, Math.min(6, n));

export function gridFor(width: number, height: number): { columns: number; rows: number } {
  return { columns: clamp1to6(Math.floor(width / 78)), rows: clamp1to6(Math.floor(height / 78)) };
}

/** Whether shortcut buttons have room for a text label (vs emoji-only). */
export function labelsFit(width: number, columns: number): boolean {
  return columns > 0 && width / columns >= 72;
}

/** Square-tile grid: columns from width (capped by item count), rows from height, square tile px. */
export function squareGrid(
  width: number,
  height: number,
  count: number,
): { columns: number; rows: number; tile: number } {
  if (count <= 0) return { columns: 1, rows: 1, tile: 0 };
  const target = 80;
  const columns = Math.max(1, Math.min(count, Math.floor(width / target) || 1));
  const tile = Math.floor(width / columns);
  const maxRows = Math.max(1, Math.floor(height / tile));
  const rows = Math.min(maxRows, Math.ceil(count / columns));
  return { columns, rows, tile };
}
