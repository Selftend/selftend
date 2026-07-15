import type { RoutineToolRecords, SteppableToolId } from "@/src/features/routines/derive";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useHabitLogs } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";

// Feeds deriveRoutine with the already-fetched tool records it reads. Each
// underlying feature query is enabled only when some routine step actually
// references its tool (the hooks disable themselves on a null userId - the
// same gating the habit editor uses), so a mood-and-journal routine costs two
// fetches, not eight. The default recent-list windows comfortably cover
// "today", which is all the day-status derivation looks at.
export function useRoutineToolRecords(
  userId: string | null,
  toolIds: readonly SteppableToolId[],
): RoutineToolRecords {
  const wants = (tool: SteppableToolId) => (toolIds.includes(tool) ? userId : null);

  const { data: moodLogs } = useMoodLogs(wants("mood"));
  const { data: journalEntries } = useJournalEntries(wants("journal"));
  const { data: gratitudeEntries } = useGratitudeEntries(wants("gratitude"));
  const { data: sleepLogs } = useSleepLogs(wants("sleep"));
  const { data: thoughtRecords } = useThoughtRecords(wants("cbt"));
  // Breathing and grounding share the mindfulness-session store; one fetch
  // serves both step kinds (deriveRoutine disambiguates by exercise name).
  const { data: mindfulnessSessions } = useMindfulnessSessions(
    toolIds.includes("breathing") || toolIds.includes("grounding") ? userId : null,
  );
  const { data: meditationSessions } = useMeditationSessions(wants("meditation"));
  const { data: habitLogs } = useHabitLogs(wants("habits"));

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
