import { ProgramWidget } from "@/src/features/home/widgets/program-widget";

export function CbtProgrammeWidget({ userId }: { userId: string }) {
  return <ProgramWidget module="cbt" userId={userId} />;
}
