import { View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { useAppColorScheme } from "@/src/lib/color-scheme";

interface MoodPoint {
  day: string;
  score: number;
  offset?: number;
}

interface MoodLineChartProps {
  data: MoodPoint[];
  height?: number;
  width?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 24 };
const MIN_SCORE = 1;
const MAX_SCORE = 5;

export function MoodLineChart({ data, height = 160, width = 300 }: MoodLineChartProps) {
  const isDark = useAppColorScheme() === "dark";
  const lineColor = isDark ? "hsl(330, 62%, 72%)" : "hsl(330, 56%, 60%)";
  const fillColor = isDark ? "hsla(330, 62%, 72%, 0.14)" : "hsla(330, 56%, 60%, 0.12)";
  const gridColor = isDark ? "hsl(260, 12%, 24%)" : "hsl(260, 14%, 87%)";
  const labelColor = isDark ? "hsl(260, 12%, 72%)" : "hsl(260, 8%, 42%)";

  if (data.length === 0) return null;

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const yScale = (score: number) =>
    chartHeight - ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * chartHeight;

  const usesOffset = typeof data[0].offset === "number";

  const points = data.map((d, i) => ({
    x: usesOffset ? PADDING.left + (d.offset ?? 0) * chartWidth : PADDING.left + i * xStep,
    y: PADDING.top + yScale(d.score),
    day: d.day,
  }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const baselineY = PADDING.top + yScale(MIN_SCORE);
  const areaPoints =
    `${points[0].x},${baselineY} ` +
    polylinePoints +
    ` ${points[points.length - 1].x},${baselineY}`;
  const gridLines = [1, 2, 3, 4, 5];

  return (
    <View>
      <Svg height={height} width={width}>
        {gridLines.map((val) => {
          const y = PADDING.top + yScale(val);
          return (
            <Line
              key={val}
              x1={PADDING.left}
              y1={y}
              x2={width - PADDING.right}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}
        {gridLines.map((val) => {
          const y = PADDING.top + yScale(val);
          return (
            <SvgText
              key={`label-${val}`}
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill={labelColor}
              textAnchor="end"
            >
              {val}
            </SvgText>
          );
        })}
        {points.length > 1 ? <Polygon points={areaPoints} fill={fillColor} /> : null}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />
        ))}
        {points.map((p, i) => {
          if (usesOffset && i !== 0 && i !== points.length - 1) return null;
          const anchor = usesOffset
            ? i === 0 && points.length > 1
              ? "start"
              : i === points.length - 1
                ? "end"
                : "middle"
            : "middle";
          return (
            <SvgText
              key={`day-${i}`}
              x={p.x}
              y={height - 4}
              fontSize={9}
              fill={labelColor}
              textAnchor={anchor}
            >
              {p.day}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
