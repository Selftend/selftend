"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE } from "@/src/features/widgets/palette";
import { CardFrame, ReplicaHeader, BodyText, GhostButton } from "@/src/features/widgets/cards/kit";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function CommittedActionsCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "committed-actions") return nothing;
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
      ) : payload.actions.length > 0 ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          {payload.actions.map((a) => (
            <FlexWidget
              key={a.path}
              clickAction={OPEN_PATH}
              clickActionData={{ path: a.path }}
              style={{
                flexDirection: "column",
                width: "match_parent",
                marginTop: 8,
                padding: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <TextWidget
                text={a.title}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 12, fontWeight: "500", color: c.fg }}
              />
              {a.steps ? (
                <TextWidget text={a.steps} style={{ fontSize: 11, color: c.muted, marginTop: 2 }} />
              ) : (
                nothing
              )}
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <BodyText theme={theme} text={payload.emptyText} />
      )}
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
