"use no memo";

import { FlexWidget } from "react-native-android-widget";
import {
  CardFrame,
  ReplicaHeader,
  BodyText,
  OutlineButton,
} from "@/src/features/widgets/cards/kit";
import { sizeTier } from "@/src/features/widgets/widget-size";
import type { CardPayload } from "@/src/features/widgets/snapshot-types";
import type { Theme, TintName } from "@/src/features/widgets/palette";

export interface CardViewProps {
  payload: CardPayload;
  icon: string;
  tint: TintName;
  width: number;
  height: number;
  theme: Theme;
  opacity: number;
}

const nothing = <FlexWidget style={{ width: 0, height: 0 }} />;

export function ShortcutCard({
  payload,
  icon,
  tint,
  width,
  height,
  theme,
  opacity,
}: CardViewProps) {
  if (payload.kind !== "shortcut") return nothing;
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
      {expanded ? <BodyText theme={theme} text={payload.description} /> : nothing}
      <FlexWidget style={{ flexDirection: "row", marginTop: 12 }}>
        <OutlineButton theme={theme} cta={payload.cta} />
      </FlexWidget>
    </CardFrame>
  );
}
