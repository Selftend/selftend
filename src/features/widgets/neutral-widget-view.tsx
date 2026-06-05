"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, type Theme } from "@/src/features/widgets/palette";
import { OPEN_PATH, OPEN_APP_PATH } from "@/src/features/widgets/click-actions";

export function NeutralWidgetView({
  label,
  emoji,
  theme,
}: {
  label: string;
  emoji: string;
  theme: Theme;
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: OPEN_APP_PATH }}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      <TextWidget text={emoji} style={{ fontSize: 16, marginRight: 8 }} />
      <TextWidget text={label} style={{ fontSize: 13, fontWeight: "600", color: c.fg }} />
    </FlexWidget>
  );
}
