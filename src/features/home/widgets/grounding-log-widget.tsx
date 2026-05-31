import { useGroundingSessions } from "@/src/features/grounding/queries";
import { SessionLogWidget } from "@/src/features/home/widgets/session-log-widget";

export function GroundingLogWidget({ userId }: { userId: string }) {
  const { data: sessions } = useGroundingSessions(userId);
  return (
    <SessionLogWidget
      sessions={sessions}
      accentBgClass="bg-clay/10"
      accentTextClass="text-clay"
      i18nPrefix="home.widgets.groundingLog"
      route="/tools/grounding"
    />
  );
}
