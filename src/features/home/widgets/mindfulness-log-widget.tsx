import { useMindfulnessSessions } from "@/src/features/mindfulness/queries";
import { SessionLogWidget } from "@/src/features/home/widgets/session-log-widget";

export function MindfulnessLogWidget({ userId }: { userId: string }) {
  const { data: sessions } = useMindfulnessSessions(userId);
  return (
    <SessionLogWidget
      sessions={sessions}
      accentBgClass="bg-mist/10"
      accentTextClass="text-mist"
      i18nPrefix="home.widgets.mindfulnessLog"
      route="/tools/mindfulness"
    />
  );
}
