"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";
import { PALETTE, withAlpha, type Theme } from "@/src/features/widgets/palette";
import type { ResolvedShortcut } from "@/src/features/widgets/widget-config-store";
import { squareGrid, labelsFit } from "@/src/features/widgets/widget-size";
import { OPEN_PATH, OPEN_APP_PATH } from "@/src/features/widgets/click-actions";

export function ShortcutsWidgetView({
  shortcuts,
  width,
  height,
  theme,
  opacity,
}: {
  shortcuts: ResolvedShortcut[] | null;
  width: number;
  height: number;
  theme: Theme;
  opacity: number;
}) {
  const c = PALETTE[theme];
  const bg = withAlpha(c.bg, opacity);
  const chip = withAlpha(c.chip, opacity);
  if (!shortcuts || shortcuts.length === 0) {
    return (
      <FlexWidget
        clickAction={OPEN_PATH}
        clickActionData={{ path: OPEN_APP_PATH }}
        style={{
          height: "match_parent",
          width: "match_parent",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          borderRadius: 20,
        }}
      >
        <TextWidget text="⚙" style={{ fontSize: 20, color: c.fg }} />
      </FlexWidget>
    );
  }
  const { columns, rows, tile } = squareGrid(width, height, shortcuts.length);
  const showLabels = labelsFit(width, columns);
  const visible = shortcuts.slice(0, columns * rows);
  const grid: (ResolvedShortcut | null)[][] = [];
  for (let i = 0; i < visible.length; i += columns) {
    const row: (ResolvedShortcut | null)[] = visible.slice(i, i + columns);
    while (row.length < columns) row.push(null);
    grid.push(row);
  }

  return (
    <FlexWidget
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
          {row.map((s, i) =>
            s ? (
              <FlexWidget
                key={i}
                clickAction={OPEN_PATH}
                clickActionData={{ path: s.path }}
                style={{
                  flex: 1,
                  height: "match_parent",
                  margin: 3,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: chip,
                  borderRadius: 14,
                }}
              >
                <TextWidget text={s.emoji} style={{ fontSize: 20 }} />
                {showLabels ? (
                  <TextWidget text={s.label} style={{ fontSize: 9, color: c.fg, marginTop: 2 }} />
                ) : (
                  <FlexWidget style={{ width: 0, height: 0 }} />
                )}
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
