"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, withAlpha, type Theme } from "@/src/features/widgets/palette";
import type { TodayWidgetPayload, TodayStatItem } from "@/src/features/widgets/snapshot-types";
import { squareGrid } from "@/src/features/widgets/widget-size";
import { OPEN_PATH } from "@/src/features/widgets/click-actions";

export function TodayWidgetView({
  payload,
  statKeys,
  width,
  height,
  theme,
  opacity,
}: {
  payload: TodayWidgetPayload | null;
  statKeys: string[];
  width: number;
  height: number;
  theme: Theme;
  opacity: number;
}) {
  const c = PALETTE[theme];
  const bg = withAlpha(c.bg, opacity);
  const card = withAlpha(c.card, opacity);
  if (!payload) {
    return (
      <FlexWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderRadius: 20,
        }}
      >
        <TextWidget text="Selftend" style={{ fontSize: 13, fontWeight: "600", color: c.fg }} />
      </FlexWidget>
    );
  }
  const selected: TodayStatItem[] =
    statKeys.length > 0
      ? statKeys
          .map((k) => payload.items.find((i) => i.key === k))
          .filter((x): x is TodayStatItem => x !== undefined)
      : payload.items;

  const { columns, rows, tile } = squareGrid(width, height, selected.length);
  const visible = selected.slice(0, columns * rows);
  const grid: (TodayStatItem | null)[][] = [];
  for (let i = 0; i < visible.length; i += columns) {
    const row: (TodayStatItem | null)[] = visible.slice(i, i + columns);
    while (row.length < columns) row.push(null);
    grid.push(row);
  }

  return (
    <FlexWidget
      clickAction={OPEN_PATH}
      clickActionData={{ path: payload.homePath }}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 5,
        backgroundColor: bg,
        borderRadius: 20,
      }}
    >
      {grid.map((row, r) => (
        <FlexWidget key={r} style={{ height: tile, flexDirection: "row", width: "match_parent" }}>
          {row.map((item, i) =>
            item ? (
              <FlexWidget
                key={i}
                clickAction={OPEN_PATH}
                clickActionData={{ path: item.path }}
                style={{
                  flex: 1,
                  height: "match_parent",
                  margin: 3,
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingHorizontal: 8,
                  backgroundColor: card,
                  borderRadius: 14,
                }}
              >
                <TextWidget
                  text={`${item.emoji} ${item.value}`}
                  style={{ fontSize: 15, fontWeight: "700", color: c.fg }}
                />
                <TextWidget
                  text={item.label}
                  style={{ fontSize: 9, color: c.muted, marginTop: 2 }}
                />
              </FlexWidget>
            ) : (
              <FlexWidget key={i} style={{ flex: 1, margin: 3 }} />
            ),
          )}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}
