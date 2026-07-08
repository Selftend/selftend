"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE } from "@/src/features/widgets/palette";
import { CardFrame, ReplicaHeader, BodyText, GhostButton } from "@/src/features/widgets/cards/kit";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function DefusionCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "defusion") return nothing;
  const c = PALETTE[theme];
  const expanded = sizeTier(width, height) === "expanded";
  return (
    <CardFrame theme={theme} opacity={opacity}>
      <ReplicaHeader
        theme={theme}
        icon={icon}
        tint={tint}
        title={payload.title}
        moduleLabel={payload.moduleLabel}
      />
      {!expanded ? (
        nothing
      ) : payload.technique ? (
        <FlexWidget style={{ flexDirection: "column", marginTop: 12 }}>
          <TextWidget text={payload.lastLabel} style={{ fontSize: 11, color: c.muted }} />
          <TextWidget
            text={payload.technique}
            truncate="END"
            maxLines={1}
            style={{ fontSize: 14, fontWeight: "500", color: c.fg, marginTop: 2 }}
          />
        </FlexWidget>
      ) : (
        <BodyText theme={theme} text={payload.tryItText} />
      )}
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 12,
          width: "match_parent",
        }}
      >
        <GhostButton theme={theme} cta={payload.cta} />
      </FlexWidget>
    </CardFrame>
  );
}
