"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, type Theme } from "@/src/features/widgets/palette";
import type { PromptPayload } from "@/src/features/widgets/snapshot-types";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

export function PromptWidgetView({ payload, theme }: { payload: PromptPayload; theme: Theme }) {
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
      <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
        <TextWidget text={payload.emoji} style={{ fontSize: 16, marginRight: 6 }} />
        <TextWidget text={payload.title} style={{ fontSize: 13, fontWeight: "600", color: c.fg }} />
      </FlexWidget>
      <TextWidget text={payload.body} style={{ fontSize: 13, color: c.muted, marginTop: 8 }} />
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
