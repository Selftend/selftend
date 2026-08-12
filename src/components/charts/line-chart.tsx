import { useId, useRef } from "react";
import { ScrollView, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Polygon,
  Polyline,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { useAccentGradient, useAccentHsl, useThemePalette } from "@/src/lib/theme-palette";

export interface LineChartPoint {
  /** Horizontal position, 0..1 across the plot area. */
  offset: number;
  value: number;
  /** Optional x-axis label; rendering is subject to density thinning. */
  label?: string;
}

interface LineChartProps {
  points: LineChartPoint[];
  /** Inclusive y domain; gridlines and y labels sit at each integer step. */
  domain: [number, number];
  height?: number;
  width?: number;
  /**
   * Plot width in px when it exceeds `width`: the chart becomes a fixed y-axis
   * column beside a horizontal scroller anchored at the newest (right-hand)
   * edge — the heatmap's pattern (#900). Points still spread their offsets
   * over this full width, so the caller controls density by sizing it.
   */
  contentWidth?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 24 };
// In scroll mode the y-axis column owns PADDING.left; the plot keeps a small
// inset so the first dot and the line's stroke are not clipped at x=0.
const SCROLL_PLOT_INSET = 8;

// Past this many points, per-point dots disappear and x labels collapse to the
// first/last labelled points — the line and area stay legible at any density.
const DENSE_POINT_LIMIT = 31;

/**
 * The `contentWidth` at which `visibleUnits` of a `totalUnits`-unit span fill
 * the scroll viewport exactly when anchored at the newest edge. Owned by the
 * chart because only it knows its paddings: the fixed axis column takes
 * `PADDING.left` out of the scroller's viewport, and the plot keeps its own
 * insets — sizing from the raw container width would show ~10% fewer units
 * than the preset promises.
 */
export function lineChartContentWidth(width: number, visibleUnits: number, totalUnits: number) {
  const viewport = width - PADDING.left;
  // Anchored at the end, the right padding is in view; the left inset is
  // scrolled away. So `visibleUnits - 1` intervals span viewport minus that pad.
  const unitSpacing = (viewport - PADDING.right) / (visibleUnits - 1);
  return Math.round(SCROLL_PLOT_INSET + PADDING.right + unitSpacing * (totalUnits - 1));
}

export function LineChart({
  points,
  domain,
  height = 160,
  width = 300,
  contentWidth,
}: LineChartProps) {
  const accent = useAccentHsl();
  const theme = useThemePalette();
  // Above the early return: the empty-points guard sits below, and a hook after
  // it would be called conditionally.
  const [fadeFrom, fadeTo] = useAccentGradient();
  const gradientId = useId();
  const scrollRef = useRef<ScrollView>(null);
  if (points.length === 0) return null;

  const lineColor = accent(1);
  const gridColor = theme.border;
  const labelColor = theme.mutedForeground;

  const scrolling = contentWidth !== undefined && contentWidth > width;
  const plotWidth = scrolling ? contentWidth : width;
  const plotPadLeft = scrolling ? SCROLL_PLOT_INSET : PADDING.left;

  const [min, max] = domain;
  const chartWidth = plotWidth - plotPadLeft - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const yScale = (value: number) => chartHeight - ((value - min) / (max - min)) * chartHeight;

  // Density is about what is VISIBLE: in scroll mode only ~width/contentWidth
  // of the points share the viewport at once, so the estimate scales the count
  // down before comparing — a 30-day viewport over a year keeps its dots.
  const visiblePointEstimate = scrolling ? (points.length * width) / contentWidth : points.length;
  const dense = visiblePointEstimate > DENSE_POINT_LIMIT;

  const plotted = points.map((p) => ({
    x: plotPadLeft + p.offset * chartWidth,
    y: PADDING.top + yScale(p.value),
    label: p.label,
  }));
  const polylinePoints = plotted.map((p) => `${p.x},${p.y}`).join(" ");
  const baselineY = PADDING.top + yScale(min);
  const areaPoints =
    `${plotted[0].x},${baselineY} ` +
    polylinePoints +
    ` ${plotted[plotted.length - 1].x},${baselineY}`;

  const gridValues: number[] = [];
  for (let value = Math.ceil(min); value <= Math.floor(max); value++) {
    gridValues.push(value);
  }

  const labelled = plotted.filter((p) => p.label);
  // A scrolling plot keeps every label the caller placed: the caller already
  // spaced them per viewport, and collapsing to first/last would leave whole
  // viewports between them unlabelled.
  const visibleLabels =
    dense && !scrolling
      ? labelled.filter((_, i) => i === 0 || i === labelled.length - 1)
      : labelled;

  const plot = (
    <Svg height={height} width={plotWidth}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={fadeFrom} />
          <Stop offset="1" stopColor={fadeTo} />
        </LinearGradient>
      </Defs>
      {gridValues.map((value) => {
        const y = PADDING.top + yScale(value);
        return (
          <Line
            key={value}
            x1={scrolling ? 0 : PADDING.left}
            y1={y}
            x2={plotWidth - PADDING.right}
            y2={y}
            stroke={gridColor}
            strokeWidth={1}
          />
        );
      })}
      {scrolling
        ? null
        : gridValues.map((value) => {
            const y = PADDING.top + yScale(value);
            return (
              <SvgText
                key={`label-${value}`}
                x={PADDING.left - 4}
                y={y + 4}
                fontSize={9}
                fill={labelColor}
                textAnchor="end"
              >
                {value}
              </SvgText>
            );
          })}
      {plotted.length > 1 ? <Polygon points={areaPoints} fill={`url(#${gradientId})`} /> : null}
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {dense
        ? null
        : plotted.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />)}
      {visibleLabels.map((p, i) => (
        <SvgText
          key={`day-${i}`}
          x={p.x}
          y={height - 4}
          fontSize={9}
          fill={labelColor}
          textAnchor={
            visibleLabels.length > 1 && i === 0
              ? "start"
              : i === visibleLabels.length - 1
                ? "end"
                : "middle"
          }
        >
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );

  if (!scrolling) {
    return <View>{plot}</View>;
  }

  return (
    <View style={{ flexDirection: "row" }}>
      {/* The y-axis stays put while the plot pans — numbers that scroll away
          with the line would leave the visible viewport scaleless. */}
      <Svg height={height} width={PADDING.left}>
        {gridValues.map((value) => {
          const y = PADDING.top + yScale(value);
          return (
            <SvgText
              key={`axis-${value}`}
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill={labelColor}
              textAnchor="end"
            >
              {value}
            </SvgText>
          );
        })}
      </Svg>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="line-chart-scroller"
        // Anchor at the newest edge (content grows leftward into the past),
        // exactly as the heatmap's scroller does.
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        style={{ flex: 1 }}
      >
        {plot}
      </ScrollView>
    </View>
  );
}
