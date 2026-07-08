"use no memo";

import { FlexWidget } from "react-native-android-widget";
import {
  CardFrame,
  ReplicaHeader,
  BodyText,
  TwoStat,
  OutlineButton,
  GhostButton,
} from "@/src/features/widgets/cards/kit";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function StatsCard({ payload, icon, tint, width, height, theme, opacity }: CardViewProps) {
  if (payload.kind !== "stats") return nothing;
  const expanded = sizeTier(width, height) === "expanded";
  return (
    <CardFrame theme={theme} opacity={opacity}>
      <ReplicaHeader
        theme={theme}
        icon={icon}
        tint={tint}
        title={payload.title}
        pill={payload.today ? { text: payload.today.badge, tone: "primary" } : null}
      />
      {expanded ? (
        payload.stats ? (
          <TwoStat theme={theme} stats={payload.stats} />
        ) : (
          <BodyText theme={theme} text={payload.emptyText ?? ""} />
        )
      ) : (
        nothing
      )}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: payload.primaryCta ? "space-between" : "flex-end",
          marginTop: 12,
          width: "match_parent",
        }}
      >
        {payload.primaryCta ? <OutlineButton theme={theme} cta={payload.primaryCta} /> : nothing}
        <GhostButton theme={theme} cta={payload.openCta} />
      </FlexWidget>
    </CardFrame>
  );
}
