"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, withAlpha, type Theme } from "@/src/features/widgets/palette";
import type { MoodWidgetPayload } from "@/src/features/widgets/snapshot-types";
import { sizeTier } from "@/src/features/widgets/widget-size";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

const FACES = ["😭", "🙁", "😐", "😊", "😁"];

export function MoodWidgetView({
  payload,
  width,
  height,
  theme,
  opacity,
}: {
  payload: MoodWidgetPayload | null;
  width: number;
  height: number;
  theme: Theme;
  opacity: number;
}) {
  const c = PALETTE[theme];
  const expanded = sizeTier(width, height) === "expanded";
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        padding: 8,
        backgroundColor: withAlpha(c.bg, opacity),
        borderRadius: 20,
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          width: "match_parent",
        }}
      >
        {FACES.map((face, i) => (
          <TextWidget
            key={i}
            text={face}
            clickAction={OPEN_PATH}
            clickActionData={{ path: `/tools/mood-tracker/new?score=${i + 1}` }}
            style={{ fontSize: 30, paddingHorizontal: 4 }}
          />
        ))}
      </FlexWidget>
      {expanded && payload ? (
        <TextWidget
          text={payload.glanceLabel}
          style={{
            fontSize: 11,
            color: c.muted,
            marginTop: 4,
            marginBottom: 2,
            textAlign: "center",
          }}
        />
      ) : (
        <FlexWidget style={{ width: 0, height: 0 }} />
      )}
    </FlexWidget>
  );
}
