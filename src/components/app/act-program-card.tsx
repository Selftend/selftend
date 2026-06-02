import type { ActProgramView } from "@/src/features/act/derive-act-program";
import { ProgramCard } from "./program-card";

interface ActProgramCardProps {
  program: ActProgramView;
  isPending?: boolean;
  onStart: () => void;
  onAdvance: () => void;
  onAbandon?: () => void;
  onDismissStart?: () => void;
}

export function ActProgramCard(props: ActProgramCardProps) {
  return <ProgramCard {...props} ns="act" tint="act" helpKey="actProgram" />;
}
