"use no memo";

import { FlexWidget, IconWidget, TextWidget, type HexColor } from "react-native-android-widget";

import { OPEN_PATH } from "@/src/features/widgets/click-actions";
import {
  BodyText,
  CardFrame,
  GhostButton,
  MATERIAL_FONT,
  OutlineButton,
  ReplicaHeader,
} from "@/src/features/widgets/cards/kit";
import { PALETTE, TINTS } from "@/src/features/widgets/palette";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function ProgrammeCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "programme") return nothing;
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

      {payload.state === "in-progress" && expanded ? (
        <FlexWidget style={{ flexDirection: "column", width: "match_parent" }}>
          {payload.goals.map((goal) => (
            <FlexWidget
              key={goal.path}
              clickAction={OPEN_PATH}
              clickActionData={{ path: goal.path }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "match_parent",
                marginTop: 7,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <IconWidget
                font={MATERIAL_FONT}
                icon={goal.done ? "check_circle" : "circle"}
                size={goal.done ? 16 : 9}
                style={{
                  color: (goal.done ? TINTS[theme].act : TINTS[theme][tint]) as HexColor,
                  marginRight: 7,
                }}
              />
              <TextWidget
                text={goal.label}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 12, fontWeight: "500", color: c.fg }}
              />
              <IconWidget
                font={MATERIAL_FONT}
                icon="chevron_right"
                size={16}
                style={{ color: c.muted }}
              />
            </FlexWidget>
          ))}
          {payload.moreGoalsLabel ? (
            <TextWidget
              text={payload.moreGoalsLabel}
              clickAction={OPEN_PATH}
              clickActionData={{ path: payload.programmeCta.path }}
              style={{
                fontSize: 11,
                fontWeight: "500",
                color: TINTS[theme][tint] as HexColor,
                marginTop: 5,
              }}
            />
          ) : (
            nothing
          )}
        </FlexWidget>
      ) : payload.message && expanded ? (
        <BodyText theme={theme} text={payload.message} />
      ) : (
        nothing
      )}

      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: payload.state === "in-progress" ? "flex-end" : "flex-start",
          marginTop: 8,
          width: "match_parent",
        }}
      >
        {payload.state === "in-progress" ? (
          <GhostButton theme={theme} cta={payload.programmeCta} />
        ) : (
          <OutlineButton theme={theme} cta={payload.programmeCta} />
        )}
      </FlexWidget>
    </CardFrame>
  );
}
