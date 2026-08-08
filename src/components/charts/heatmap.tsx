import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { useThemePalette } from "@/src/lib/theme-palette";

export interface HeatmapCellDatum {
  key: string;
  /** Fill color; null renders a neutral hairline cell (a quiet "no data" state). */
  color: string | null;
  accessibilityLabel: string;
}

export interface HeatmapColumn {
  key: string;
  /** Sparse label above the column (e.g. a short month name). */
  monthLabel: string | null;
  /** Fixed-length column; null slots render as invisible spacers. */
  cells: (HeatmapCellDatum | null)[];
}

interface HeatmapProps {
  columns: HeatmapColumn[];
  /** Cell edge in px (cells are square). */
  cellSize?: number;
  /** Highlighted cell (e.g. the current callout target). */
  selectedKey?: string | null;
  onCellPress?: (key: string) => void;
}

const CELL_GAP = 3;

/**
 * GitHub-style columns-of-squares grid in a horizontal scroller anchored at the
 * newest (right-hand) column. Purely presentational: colors, labels, and press
 * semantics come from the caller.
 */
export function Heatmap({ columns, cellSize = 12, selectedKey, onCellPress }: HeatmapProps) {
  const theme = useThemePalette();
  const scrollRef = useRef<ScrollView>(null);
  if (columns.length === 0) return null;

  const hairline = theme.border;
  const selectedBorder = theme.foreground;
  const columnSpan = cellSize + CELL_GAP;

  // A labelled column starts a segment that stretches to the next label, so month
  // names get room to render without widening their 1-cell column.
  const labelSegments: { key: string; width: number; label: string | null }[] = [];
  for (const column of columns) {
    const last = labelSegments[labelSegments.length - 1];
    if (column.monthLabel !== null || !last) {
      labelSegments.push({ key: column.key, width: columnSpan, label: column.monthLabel });
    } else {
      last.width += columnSpan;
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Anchor at the newest column (content grows leftward into the past).
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
    >
      <View style={{ gap: CELL_GAP }}>
        <View style={{ flexDirection: "row" }}>
          {labelSegments.map((segment) => (
            <Text
              key={segment.key}
              variant="muted"
              numberOfLines={1}
              style={{ fontSize: 9, lineHeight: 12, width: segment.width }}
            >
              {segment.label ?? ""}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: CELL_GAP }}>
          {columns.map((column) => (
            <View key={column.key} style={{ gap: CELL_GAP }}>
              {column.cells.map((cell, i) => {
                if (cell === null) {
                  return <View key={`pad-${i}`} style={{ width: cellSize, height: cellSize }} />;
                }
                const selected = cell.key === selectedKey;
                // Every in-range cell carries the hairline, filled or not (#717).
                // It used to mark only the empty ones, which inverted presence:
                // an unlogged day got an outline while a logged day at the
                // bottom of the ramp got a ~1.26:1 wash and nothing else, so a
                // blank day read as more present than the user's worst logged
                // one. With the hairline uniform it is grid structure, the fill
                // alone encodes presence, and a logged cell can never render
                // fainter than an empty one. Null slots (out of range) stay
                // borderless above, so "no entry" and "not a day" still differ.
                const style = {
                  width: cellSize,
                  height: cellSize,
                  borderRadius: 3,
                  backgroundColor: cell.color ?? "transparent",
                  borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                  borderColor: selected ? selectedBorder : hairline,
                };
                if (!onCellPress) {
                  return (
                    <View
                      key={cell.key}
                      accessible
                      accessibilityLabel={cell.accessibilityLabel}
                      style={style}
                    />
                  );
                }
                return (
                  <Pressable
                    key={cell.key}
                    accessibilityRole="button"
                    accessibilityLabel={cell.accessibilityLabel}
                    onPress={() => onCellPress(cell.key)}
                    style={style}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
