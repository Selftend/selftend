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
  useValueEntries,
} from "@/src/features/act/queries";
import { countSince } from "@/src/features/act/program-definition";

interface UseActEntryCountSinceResult {
  data: number;
  isLoading: boolean;
}

// There's no single ACT table - each practice (defusion, expansion, connection, observing
// self, values, bulls-eye, committed action, action steps, urge surfing, choice points) has
// its own. Rather than adding a parallel set of per-table Supabase count queries, this reuses
// the same list hooks the ACT program view already fans out (see use-act-program.ts) and sums
// countSince across them for the Progress screen's "last 30 days" stat.
//
// The six list hooks that accept a `limit` are asked for COUNT_LIMIT rows (matching
// listThoughtRecords' 500 cap) instead of their default 30, so a user with many entries of one
// practice type in the 30-day window isn't undercounted. This reuses the existing list
// endpoints - no new queries.
//
// All six put the limit in their query key, so this 500-row fetch is a distinct cache entry
// from the default-30 one the list screens and `use-act-program.ts` read (#1516). Until then
// `useChoicePoints` and `useObservingSelfSessions` omitted it and shared one entry with their
// default-30 callers, so whichever mounted first decided how many rows BOTH saw - the count
// here and the ACT programme's summary counts each varied with navigation order. The rule is
// asserted for all six in `queries/queries.test.tsx`; don't reintroduce a limit-less list key.
const COUNT_LIMIT = 500;

export function useActEntryCountSince(
  userId: string | null,
  sinceIso: string,
): UseActEntryCountSinceResult {
  const since = new Date(sinceIso).getTime();

  const choicePoints = useChoicePoints(userId, COUNT_LIMIT);
  const defusionLogs = useDefusionLogs(userId, COUNT_LIMIT);
  const expansionLogs = useExpansionLogs(userId, COUNT_LIMIT);
  const urgeSurfLogs = useUrgeSurfLogs(userId, COUNT_LIMIT);
  const connectionLogs = useConnectionLogs(userId, COUNT_LIMIT);
  const observingSessions = useObservingSelfSessions(userId, COUNT_LIMIT);
  const valueEntries = useValueEntries(userId);
  const bullsEye = useBullsEyeSnapshots(userId);
  const committedActions = useCommittedActions(userId);
  const actionSteps = useAllActionSteps(userId);

  const data =
    countSince(choicePoints.data ?? [], since) +
    countSince(defusionLogs.data ?? [], since) +
    countSince(expansionLogs.data ?? [], since) +
    countSince(urgeSurfLogs.data ?? [], since) +
    countSince(connectionLogs.data ?? [], since) +
    countSince(observingSessions.data ?? [], since) +
    countSince(valueEntries.data ?? [], since) +
    countSince(bullsEye.data ?? [], since) +
    countSince(committedActions.data ?? [], since) +
    countSince(actionSteps.data ?? [], since);

  const isLoading =
    choicePoints.isLoading ||
    defusionLogs.isLoading ||
    expansionLogs.isLoading ||
    urgeSurfLogs.isLoading ||
    connectionLogs.isLoading ||
    observingSessions.isLoading ||
    valueEntries.isLoading ||
    bullsEye.isLoading ||
    committedActions.isLoading ||
    actionSteps.isLoading;

  return { data, isLoading };
}
