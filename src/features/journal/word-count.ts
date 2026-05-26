export function countWords(body: string): number {
  const trimmed = body.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
