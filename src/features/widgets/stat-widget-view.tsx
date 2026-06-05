"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, type Theme } from "@/src/features/widgets/palette";
import type { StatPayload } from "@/src/features/widgets/snapshot-types";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

export function StatWidgetView({ payload, theme }: { payload: StatPayload; theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: payload.open.path }}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        padding: 12,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
          <TextWidget text={payload.emoji} style={{ fontSize: 16, marginRight: 6 }} />
          <TextWidget
            text={payload.title}
            style={{ fontSize: 13, fontWeight: "600", color: c.fg }}
          />
        </FlexWidget>
        {payload.badge ? (
          <TextWidget
            text={payload.badge}
            style={{
              fontSize: 10,
              fontWeight: "600",
              color: c.accent,
              backgroundColor: c.chip,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          />
        ) : (
          <FlexWidget style={{ width: 0, height: 0 }} />
        )}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "row", marginTop: 10, width: "match_parent" }}>
        {payload.stats.map((s, i) => (
          <FlexWidget
            key={i}
            style={{
              flex: 1,
              marginRight: i === 0 ? 8 : 0,
              paddingVertical: 8,
              paddingHorizontal: 10,
              backgroundColor: c.card,
              borderRadius: 14,
            }}
          >
            <TextWidget text={s.value} style={{ fontSize: 22, fontWeight: "700", color: c.fg }} />
            <TextWidget text={s.label} style={{ fontSize: 10, color: c.muted, marginTop: 2 }} />
          </FlexWidget>
        ))}
      </FlexWidget>
      {payload.cta ? (
        <FlexWidget
          clickAction={OPEN_PATH}
          clickActionData={{ path: payload.cta.path }}
          style={{
            marginTop: 10,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
            paddingHorizontal: 14,
            backgroundColor: c.accent,
            borderRadius: 12,
          }}
        >
          <TextWidget
            text={payload.cta.label}
            style={{ fontSize: 12, fontWeight: "600", color: "#FFFFFF" }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ width: 0, height: 0 }} />
      )}
    </FlexWidget>
  );
}
