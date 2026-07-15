import type { RoutineToolRecords, SteppableToolId } from "@/src/features/routines/derive";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useHabitLogs } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { lastNDayKeys } from "@/src/utils/date";

// The 7-day strip (#49) derives status for the last 7 local days, so every
// referenced tool's records must cover that whole window, not just "today".
// Habits solved this for its own strip with a date-based `sinceDate` window;
// habit logs mirror that exactly. The other repositories only expose newest-N
// list queries, so their windows widen by count instead: 100 rows spans 7 days
// even at a heavy ~14 records/day per tool (thought records already fetch 500).
const RECENT_LIST_LIMIT = 100;

/** Oldest day the 7-day derivation window can reach, as a local date key. */
export function stripWindowStartKey(): string {
  return lastNDayKeys(7)[0];
}

// Feeds deriveRoutine with the already-fetched tool records it reads. Each
// underlying feature query is enabled only when some routine step actually
// references its tool (the hooks disable themselves on a null userId - the
// same gating the habit editor uses), so a mood-and-journal routine costs two
// fetches, not eight.
export function useRoutineToolRecords(
  userId: string | null,
  toolIds: readonly SteppableToolId[],
): RoutineToolRecords {
  const wants = (tool: SteppableToolId) => (toolIds.includes(tool) ? userId : null);

  // Mood rides the canonical 200-row history window (shared with the CBT and
  // progress screens' cache entry) instead of the 30-row recent list, which a
  // frequent check-in user could fill inside 7 days.
  const { data: moodLogs } = useMoodHistory(wants("mood"));
  const { data: journalEntries } = useJournalEntries(wants("journal"), RECENT_LIST_LIMIT);
  const { data: gratitudeEntries } = useGratitudeEntries(wants("gratitude"), RECENT_LIST_LIMIT);
  const { data: sleepLogs } = useSleepLogs(wants("sleep"), RECENT_LIST_LIMIT);
  const { data: thoughtRecords } = useThoughtRecords(wants("cbt"));
  // Breathing and grounding share the mindfulness-session store; one fetch
  // serves both step kinds (deriveRoutine disambiguates by exercise name).
  const { data: mindfulnessSessions } = useMindfulnessSessions(
    toolIds.includes("breathing") || toolIds.includes("grounding") ? userId : null,
    RECENT_LIST_LIMIT,
  );
  const { data: meditationSessions } = useMeditationSessions(
    wants("meditation"),
    RECENT_LIST_LIMIT,
  );
  // Habit logs support a date window natively - the same approach the habits
  // home strip uses - so fetch exactly the strip's 7 local days.
  const { data: habitLogs } = useHabitLogs(wants("habits"), { sinceDate: stripWindowStartKey() });

  return {
    moodLogs,
    journalEntries,
    gratitudeEntries,
    sleepLogs,
    thoughtRecords,
    mindfulnessSessions,
    meditationSessions,
    habitLogs,
  };
}
