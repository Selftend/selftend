import type { DbtProgramView } from "@/src/features/dbt/derive-dbt-program";
import { ProgramCard } from "./program-card";

interface DbtProgramCardProps {
  program: DbtProgramView;
  isPending?: boolean;
  onStart: () => void;
  onAdvance: () => void;
  onAbandon?: () => void;
  onDismissStart?: () => void;
}

/**
 * The DBT programme card - `ProgramCard` with this module's namespace and help
 * key, exactly as `ActProgramCard` is.
 *
 * ⚠️ The presentation is NOT forked. `program-card.tsx` and
 * `program-graduation.tsx` are already parameterised by namespace, so the three
 * modules share one card and one graduation; only the derivations differ, and
 * those differ because their signals do.
 */
export function DbtProgramCard(props: DbtProgramCardProps) {
  return <ProgramCard {...props} ns="dbt" helpKey="dbtProgram" />;
}
