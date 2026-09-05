import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "src", "features");

const PAGE_READS = [
  ["mood/repository.ts", "listMoodLogsPage"],
  ["habits/repository.ts", "listHabitLogsPage"],
  ["meditation/repository.ts", "listMeditationSessionsPage"],
  ["mindfulness/repository.ts", "listMindfulnessSessionsExcludingNamesPage"],
  ["journal/repository.ts", "listJournalEntriesPage"],
  // ACT's eight archive reads (#1517). Every ACT row is encrypted, so an offset page is
  // not merely slower here — ADR-0001 prices a read at `rows returned x encrypted
  // columns`, and `.range()` re-decrypts everything it skips.
  ["act/repository/defusion.ts", "listDefusionLogsPage"],
  ["act/repository/expansion.ts", "listExpansionLogsPage"],
  ["act/repository/connection.ts", "listConnectionLogsPage"],
  ["act/repository/observing-self.ts", "listObservingSelfSessionsPage"],
  ["act/repository/choice-points.ts", "listChoicePointsPage"],
  ["act/repository/urge-surf.ts", "listUrgeSurfLogsPage"],
  ["act/repository/bulls-eye.ts", "listBullsEyeSnapshotsPage"],
  ["act/repository/committed-action.ts", "listCommittedActionArchivePage"],
  // DBT's five record archives (#1980 spec §6): every row is encrypted, so the same
  // ADR-0001 pricing applies; sessions have no list and no page read.
  ["dbt/repository/wise-mind.ts", "listWiseMindCheckinsPage"],
  ["dbt/repository/judgements.ts", "listJudgementsPage"],
  ["dbt/repository/emotion-records.ts", "listEmotionRecordsPage"],
  ["dbt/repository/opposite-action.ts", "listOppositeActionPlansPage"],
  ["dbt/repository/scripts.ts", "listScriptsPage"],
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
