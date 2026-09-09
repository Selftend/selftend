import type { RoutineToolRecords, SteppableToolId } from "@/src/features/routines/derive";
import {
  useAllActionSteps,
  useBullsEyeSnapshots,
  useChoicePoints,
  useCommittedActions,
  useConnectionLogs,
  useDefusionLogs,
  useExpansionLogs,
  useObservingSelfSessions,
  useUrgeSurfLogs,
} from "@/src/features/act/queries";
import { useRecentCompletedActivities } from "@/src/features/activities/queries";
import { useRecentExposureSessions } from "@/src/features/exposure/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useHabitLogs } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { useMoodHistory } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import {
  useDbtSessions,
  useEmotionRecords,
  useJudgements,
  useOppositeActionPlans,
  useScripts,
  useWiseMindCheckins,
} from "@/src/features/dbt/queries";
import { lastNDayKeys } from "@/src/utils/date";

// The 7-day strip (#49) derives status for the last 7 local days, so every
// referenced tool's records must cover that whole window, not just "today".
// Habits solved this for its own strip with a date-based `sinceDate` window;
// habit logs mirror that exactly. The other repositories only expose newest-N
// list queries, so their windows widen by count instead. KNOWN BOUND: past
// ~35 records/day of one tool (or combined breathing+grounding sessions) for a
// whole week, the oldest in-window day can fall off the cap and its dot renders
// conservatively OPEN - acceptable for a calm indicator; a date-ranged fetch
// across six feature repositories is not worth that edge (review, #81). The
// rows are tiny (timestamps + short fields); 250 stays a cheap query.
const RECENT_LIST_LIMIT = 250;

/** Oldest day the 7-day derivation window can reach, as a local date key. */
export function stripWindowStartKey(): string {
  return lastNDayKeys(7)[0];
}

// Feeds deriveRoutine with the already-fetched tool records it reads. Each
// underlying feature query is enabled only when some routine step actually
// references its tool (the hooks disable themselves on a null userId - the
// same gating the habit editor uses), so a mood-and-journal routine costs two
// fetches, not twenty.
//
// ACT hooks whose query key EXCLUDES the limit (observing self, choice
// points) are called with their default limit so this hook shares one cache
// entry with useActProgram/the list screens instead of racing them with a
// differently-sized result under the same key. 30 newest rows still cover
// the 7-day strip up to ~4 logs/day of one tool - inside the KNOWN BOUND above.
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

  // CBT (#123): activities derive from COMPLETION, so ride the completed_at
  // window - the default activities list is 500 rows by scheduled_at and can
  // miss a recent completion for a heavy scheduler (PR #124 review).
  const { data: activityLogs } = useRecentCompletedActivities(
    wants("activities"),
    RECENT_LIST_LIMIT,
  );
  const { data: exposureSessions } = useRecentExposureSessions(
    wants("exposure"),
    RECENT_LIST_LIMIT,
  );

  // ACT (#123). Defusion/expansion/urge-surf keys include the limit, so a
  // wide routines window can't collide with the 30-row list screens.
  const { data: defusionLogs } = useDefusionLogs(wants("defusion"), RECENT_LIST_LIMIT);
  const { data: expansionLogs } = useExpansionLogs(wants("expansion"), RECENT_LIST_LIMIT);
  const { data: urgeSurfLogs } = useUrgeSurfLogs(wants("urgeSurf"), RECENT_LIST_LIMIT);
  // Connection and drop anchor share the connection-log store; one fetch
  // serves both step kinds (the guided drop-anchor screen saves a
  // ConnectionLog with technique "dropAnchor"). The hook's key includes the
  // limit (PR #124 review), so this wide window can't collide with the
  // default-30 program/list consumers.
  const { data: connectionLogs } = useConnectionLogs(
    toolIds.includes("connection") || toolIds.includes("dropAnchor") ? userId : null,
    RECENT_LIST_LIMIT,
  );
  const { data: observingSelfSessions } = useObservingSelfSessions(wants("observingSelf"));
  const { data: bullsEyeSnapshots } = useBullsEyeSnapshots(wants("bullsEye"));
  const { data: choicePoints } = useChoicePoints(wants("choicePoint"));
  // Committed action reads two slices: the actions themselves (created/patched
  // today) and their steps (added/ticked today) - see stepDoneOnDate.
  const { data: committedActions } = useCommittedActions(wants("committedAction"));
  const { data: actionSteps } = useAllActionSteps(wants("committedAction"));

  // DBT (#1980). Every DBT list key includes its limit, so this wide window
  // cannot collide with the 30/50-row list screens or the programme's own
  // reads - the same property the ACT hooks above rely on.
  const { data: dbtSessions } = useDbtSessions(wants("muscleRelaxation"), RECENT_LIST_LIMIT);
  const { data: dbtWiseMindCheckins } = useWiseMindCheckins(wants("wiseMind"), RECENT_LIST_LIMIT);
  const { data: dbtJudgements } = useJudgements(wants("judgement"), RECENT_LIST_LIMIT);
  const { data: dbtEmotionRecords } = useEmotionRecords(wants("emotionRecord"), RECENT_LIST_LIMIT);
  const { data: dbtOppositeActionPlans } = useOppositeActionPlans(
    wants("oppositeAction"),
    RECENT_LIST_LIMIT,
  );
  const { data: dbtScripts } = useScripts(wants("script"), RECENT_LIST_LIMIT);

  return {
    moodLogs,
    journalEntries,
    gratitudeEntries,
    sleepLogs,
    thoughtRecords,
    mindfulnessSessions,
    meditationSessions,
    habitLogs,
    activityLogs,
    exposureSessions,
    defusionLogs,
    expansionLogs,
    urgeSurfLogs,
    connectionLogs,
    observingSelfSessions,
    bullsEyeSnapshots,
    choicePoints,
    committedActions,
    actionSteps,
    dbtSessions,
    dbtWiseMindCheckins,
    dbtJudgements,
    dbtEmotionRecords,
    dbtOppositeActionPlans,
    dbtScripts,
  };
}
