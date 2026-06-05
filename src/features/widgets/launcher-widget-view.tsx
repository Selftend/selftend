"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, type Theme } from "@/src/features/widgets/palette";
import type { LauncherPayload } from "@/src/features/widgets/snapshot-types";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

export function LauncherWidgetView({ payload, theme }: { payload: LauncherPayload; theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      {payload.chips.map((chip, i) => (
        <FlexWidget
          key={i}
          clickAction={OPEN_PATH}
          clickActionData={{ path: chip.path }}
          style={{
            flex: 1,
            marginHorizontal: 4,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.chip,
            borderRadius: 14,
          }}
        >
          <TextWidget text={chip.label} style={{ fontSize: 14, fontWeight: "600", color: c.fg }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
