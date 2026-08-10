import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "src", "features");

const PAGE_READS = [
  ["mood/repository.ts", "listMoodLogsPage"],
  ["habits/repository.ts", "listHabitLogsPage"],
  ["meditation/repository.ts", "listMeditationSessionsPage"],
  ["mindfulness/repository.ts", "listMindfulnessSessionsExcludingNamesPage"],
  ["journal/repository.ts", "listJournalEntriesPage"],
] as const;

function exportedFunction(file: string, name: string): string {
  const source = readFileSync(join(ROOT, file), "utf8");
  const start = source.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next < 0 ? undefined : next);
}

describe("all-history repository contract", () => {
  it.each(PAGE_READS)("%s uses a keyset in %s", (file, name) => {
    const body = exportedFunction(file, name);
    expect(body).toContain("descendingCursorFilter");
    expect(body).not.toContain(".range(");
    expect(body).not.toMatch(/\boffset\b/);
  });
});
