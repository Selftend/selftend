"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, withAlpha, type Theme } from "@/src/features/widgets/palette";
import { OPEN_PATH, OPEN_APP_PATH } from "@/src/features/widgets/click-actions";

export function SignedOutCard({
  title,
  cta,
  theme,
  opacity,
}: {
  title: string;
  cta: string;
  theme: Theme;
  opacity: number;
}) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: OPEN_APP_PATH }}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: withAlpha(c.card, opacity),
        borderRadius: 12,
      }}
    >
      <TextWidget text={title} style={{ fontSize: 14, fontWeight: "600", color: c.fg }} />
      <TextWidget text={cta} style={{ fontSize: 12, color: c.muted, marginTop: 4 }} />
    </FlexWidget>
  );
}
