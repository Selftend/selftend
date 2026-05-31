export function parseBodyChips(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function toggleBodyChip(value: string, label: string): string {
  const list = parseBodyChips(value);
  const next = list.includes(label) ? list.filter((l) => l !== label) : [...list, label];
  return next.join(", ");
}
