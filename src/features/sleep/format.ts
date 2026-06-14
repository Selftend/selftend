export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// One-decimal hours for averages, with the shared "-" placeholder for no data.
export function formatHours(minutes: number | null): string {
  return minutes !== null ? `${(minutes / 60).toFixed(1)}h` : "-";
}
