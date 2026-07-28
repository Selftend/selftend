"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, withAlpha } from "@/src/features/widgets/palette";
import {
  CardFrame,
  ReplicaHeader,
  BodyText,
  OutlineButton,
  GhostButton,
} from "@/src/features/widgets/cards/kit";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardViewProps } from "@/src/features/widgets/cards/shortcut-card";

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

/**
 * Renders the scheduled-activities payload. Named `HabitsCard` until #330: the card
 * carries CBT behavioural-activation activities, not habits.
 */
export function ActivitiesCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "activities") return nothing;
  const c = PALETTE[theme];
  const expanded = sizeTier(width, height) === "expanded";
  const today = payload.today;
  const body = !expanded ? (
    nothing
  ) : today?.first ? (
    // first-incomplete row: name + its own deep link (bg-muted/50 rounded-lg)
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: today.first.path }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "match_parent",
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: withAlpha(c.mutedBg, 0.5),
      }}
    >
      <FlexWidget style={{ flex: 1 }}>
        <TextWidget
          text={today.first.name}
          truncate="END"
          maxLines={1}
          style={{ fontSize: 12, color: c.muted }}
        />
      </FlexWidget>
      <TextWidget
        text={today.first.openLabel}
        style={{ fontSize: 12, fontWeight: "500", color: c.fg, marginLeft: 12 }}
      />
    </FlexWidget>
  ) : (
    <BodyText
      theme={theme}
      text={today && today.scheduled > 0 ? payload.allDoneText : payload.hintText}
    />
  );
  return (
    <CardFrame theme={theme} opacity={opacity}>
      <ReplicaHeader
        theme={theme}
        icon={icon}
        tint={tint}
        title={payload.title}
        pill={today?.badge ? { text: today.badge, tone: "muted" } : null}
      />
      {body}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          width: "match_parent",
        }}
      >
        <OutlineButton theme={theme} cta={payload.newCta} />
        <GhostButton theme={theme} cta={payload.openCta} />
      </FlexWidget>
    </CardFrame>
  );
}
