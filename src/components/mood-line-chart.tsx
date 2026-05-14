import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";

interface MoodPoint {
  day: string;
  score: number;
}

interface MoodLineChartProps {
  data: MoodPoint[];
  height?: number;
  width?: number;
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 24 };
const MIN_SCORE = 1;
const MAX_SCORE = 10;

export function MoodLineChart({ data, height = 160, width = 300 }: MoodLineChartProps) {
  if (data.length === 0) return null;

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;
  const yScale = (score: number) =>
    chartHeight - ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * chartHeight;

  const points = data.map((d, i) => ({
    x: PADDING.left + i * xStep,
    y: PADDING.top + yScale(d.score),
    day: d.day,
    score: d.score,
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLines = [2, 4, 6, 8, 10];

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
              stroke="#e5e7eb"
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
              fill="#9ca3af"
              textAnchor="end"
            >
              {val}
            </SvgText>
          );
        })}

        <Polyline
          points={polylinePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
        ))}

        {points.map((p, i) => (
          <SvgText
            key={`day-${i}`}
            x={p.x}
            y={height - 4}
            fontSize={9}
            fill="#9ca3af"
            textAnchor="middle"
          >
            {p.day}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
