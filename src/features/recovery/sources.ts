/**
 * Structural view of the cross-feature record sources the recovery screen
 * aggregates. Kept intentionally minimal (only the fields the stats / timeline /
 * active-strategy logic reads) so the pure derivation functions are decoupled
 * from the full domain types and trivially unit-testable with tiny fixtures.
 * The real query return types are assignable to these shapes.
 */
export interface RecoverySources {
  goals?: readonly { createdAt: string; status: string }[];
  activities?: readonly { createdAt: string; completedAt: string | null }[];
  thoughtRecords?: readonly { createdAt: string }[];
  valuesProfile?: { updatedAt: string; personalValues: readonly unknown[] } | null;
  beliefs?: readonly { createdAt: string }[];
  hierarchies?: readonly { createdAt: string }[];
  exposureItems?: readonly { completedAt: string | null }[];
  moodLogs?: readonly { loggedAt: string }[];
  worries?: readonly { createdAt: string }[];
  mindfulnessSessions?: readonly { completedAt: string | null }[];
  tasks?: readonly { createdAt: string }[];
  angerLogs?: readonly { createdAt: string }[];
  selfCareLogs?: readonly { createdAt: string }[];
}
