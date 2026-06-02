import type { CbtProgramView } from "@/src/features/cbt/derive-cbt-program";
import { ProgramCard } from "./program-card";

interface CbtProgramCardProps {
  program: CbtProgramView;
  isPending?: boolean;
  onStart: () => void;
  onAdvance: () => void;
  onAbandon?: () => void;
  onDismissStart?: () => void;
}

export function CbtProgramCard(props: CbtProgramCardProps) {
  return <ProgramCard {...props} ns="cbt" tint="primary" helpKey="program" />;
}
