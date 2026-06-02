export function trimAndFilterEmpty(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}
