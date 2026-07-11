import type { RecoverySources } from "@/src/features/recovery/sources";
import { isStrategyKey, strategyKeys, type StrategyKey } from "@/src/features/cbt/strategies";

/**
 * Resolve which strategy keys get an integration-notes field, via the fallback
 * chain: configured preferences win; otherwise infer from which record sources
 * have data; otherwise fall back to all strategy keys.
 */
export function resolveActiveStrategyKeys(
  preferences: { activeStrategies: string[] } | null | undefined,
  sources: RecoverySources,
): StrategyKey[] {
  const configured = preferences?.activeStrategies.filter(isStrategyKey) ?? [];
  if (configured.length > 0) {
    return configured;
  }

  const {
    activities,
    angerLogs,
    beliefs,
    goals,
    hierarchies,
    mindfulnessSessions,
    selfCareLogs,
    tasks,
    thoughtRecords,
    valuesProfile,
    worries,
  } = sources;

  const recordBacked: StrategyKey[] = [];
  if ((goals?.length ?? 0) > 0) recordBacked.push("goals");
  if ((activities?.length ?? 0) > 0) recordBacked.push("activities");
  if ((thoughtRecords?.length ?? 0) > 0) recordBacked.push("thoughts");
  if (valuesProfile != null && valuesProfile.personalValues.length > 0) recordBacked.push("values");
  if ((beliefs?.length ?? 0) > 0) recordBacked.push("beliefs");
  if ((hierarchies?.length ?? 0) > 0) recordBacked.push("exposure");
  if ((worries?.length ?? 0) > 0) recordBacked.push("worry");
  if ((mindfulnessSessions?.length ?? 0) > 0) recordBacked.push("mindfulness");
  if ((tasks?.length ?? 0) > 0) recordBacked.push("tasks");
  if ((angerLogs?.length ?? 0) > 0) recordBacked.push("anger");
  if ((selfCareLogs?.length ?? 0) > 0) recordBacked.push("selfCare");

  return recordBacked.length > 0 ? recordBacked : [...strategyKeys];
}
