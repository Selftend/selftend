import { ProgramWidget } from "@/src/features/home/widgets/program-widget";

export function ActProgrammeWidget({ userId }: { userId: string }) {
  return <ProgramWidget module="act" userId={userId} />;
}
