import { useId } from "react";
import { View } from "react-native";
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

import { THEME } from "@/lib/theme";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { hueGradient, hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

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
  hue: ExerciseHue;
  height?: number;
  width?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 24 };

// Past this many points, per-point dots disappear and x labels collapse to the
// first/last labelled points — the line and area stay legible at any density.
const DENSE_POINT_LIMIT = 31;

export function LineChart({ points, domain, hue, height = 160, width = 300 }: LineChartProps) {
  const scheme = useAppColorScheme();
  const gradientId = useId();
  if (points.length === 0) return null;

  const isDark = scheme === "dark";
  const lineColor = hueHsl(hue, isDark, 1);
  const [fadeFrom, fadeTo] = hueGradient(hue, isDark);
  const gridColor = THEME[scheme].border;
  const labelColor = THEME[scheme].mutedForeground;

  const [min, max] = domain;
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const yScale = (value: number) => chartHeight - ((value - min) / (max - min)) * chartHeight;

  const dense = points.length > DENSE_POINT_LIMIT;

  const plotted = points.map((p) => ({
    x: PADDING.left + p.offset * chartWidth,
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
  const visibleLabels = dense
    ? labelled.filter((_, i) => i === 0 || i === labelled.length - 1)
    : labelled;

  return (
    <View>
      <Svg height={height} width={width}>
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
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}
        {gridValues.map((value) => {
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
    </View>
  );
}
