"use no memo";

import { FlexWidget } from "react-native-android-widget";
import { CardFrame, ReplicaHeader, StatTiles, GhostButton } from "@/src/features/widgets/cards/kit";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function StatTilesCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "stat-tiles") return nothing;
  const expanded = sizeTier(width, height) === "expanded";
  return (
    <CardFrame theme={theme} opacity={opacity}>
      <ReplicaHeader theme={theme} icon={icon} tint={tint} title={payload.title} />
      {expanded ? <StatTiles theme={theme} tiles={payload.tiles} /> : nothing}
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 12,
          width: "match_parent",
        }}
      >
        <GhostButton theme={theme} cta={payload.openCta} />
      </FlexWidget>
    </CardFrame>
  );
}
