import { useBreathingSessions } from "@/src/features/breathing/queries";
import { SessionLogWidget } from "@/src/features/home/widgets/session-log-widget";

export function BreathingLogWidget({ userId }: { userId: string }) {
  const { data: sessions } = useBreathingSessions(userId);
  return (
    <SessionLogWidget
      sessions={sessions}
      accentBgClass="bg-aqua/10"
      accentTextClass="text-aqua"
      i18nPrefix="home.widgets.breathingLog"
      route="/tools/breathing"
    />
  );
}
