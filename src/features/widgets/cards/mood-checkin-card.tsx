"use no memo";

import { FlexWidget } from "react-native-android-widget";
import { CardFrame, ReplicaHeader, BodyText, MoodFacesRow } from "@/src/features/widgets/cards/kit";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function MoodCheckinCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "mood-checkin") return nothing;
  const expanded = sizeTier(width, height) === "expanded";
  return (
    <CardFrame theme={theme} opacity={opacity}>
      <ReplicaHeader theme={theme} icon={icon} tint={tint} title={payload.title} />
      <MoodFacesRow theme={theme} selectedScore={payload.today?.score ?? null} />
      {expanded ? (
        <BodyText theme={theme} text={payload.today?.summary ?? payload.emptyPrompt} />
      ) : (
        nothing
      )}
    </CardFrame>
  );
}
