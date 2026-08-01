import { useGroundingSessions } from "@/src/features/grounding/queries";
import { SessionLogWidget } from "@/src/features/home/widgets/session-log-widget";
import { CHROME_MARK, CHROME_WASH } from "@/src/lib/theme/chrome";

export function GroundingLogWidget({ userId }: { userId: string }) {
  const { data: sessions } = useGroundingSessions(userId);
  return (
    <SessionLogWidget
      sessions={sessions}
      accentBgClass={CHROME_WASH}
      accentTextClass={CHROME_MARK}
      i18nPrefix="home.widgets.groundingLog"
      route="/tools/grounding"
    />
  );
}
