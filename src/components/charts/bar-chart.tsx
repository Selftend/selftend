import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { cn } from "@/lib/utils";
import { Text } from "@/src/components/react-native-reusables/text";

export interface BarChartBar {
  key?: string | number;
  /** Raw value; null renders an empty column (labels only, no bar). */
  value: number | null;
  /** Label under the bar. */
  label?: string;
  /** Label above the bar. */
  topLabel?: string;
  /** NativeWind fill class for this bar; overrides the chart-level tint. */
  tintClass?: string;
  /** Fill with the chart's highlightTintClass instead of tintClass. */
  highlighted?: boolean;
}

interface BarChartProps {
  bars: BarChartBar[];
  /** Fixed scale cap: heights = clamped value / max. Omit to normalize against max(1, largest value). */
  max?: number;
  /** Height of the bar area in px. */
  barAreaHeight?: number;
  /** Height floor in px for non-null values. */
  minBarHeight?: number;
  /** Distinct stub height in px for value === 0; without it the regular floor applies. */
  zeroHeight?: number;
  /** Default NativeWind fill class for bars. */
  tintClass?: string;
  /** Fill class for bars flagged highlighted. */
  highlightTintClass?: string;
  /**
   * Two-stop vertical gradient fill replacing class tints, always token-derived
   * (e.g. tintStripeColors). Gradient bars keep their own shape: a rounded-t-md
   * clip with a 4px fill radius.
   */
  gradient?: [string, string];
  /** Bar shape class; replaces (not merges with) the default "rounded-md". */
  barClassName?: string;
  /** Extra classes for the under-bar labels. */
  labelClassName?: string;
  /** Cap column width so a few bars keep a natural size instead of filling the row. */
  maxBarWidth?: number;
  /** Extra classes for each column (e.g. a different bar-to-label gap). */
  columnClassName?: string;
  /** Extra classes for the row. */
  className?: string;
}

export function BarChart({
  bars,
  max,
  barAreaHeight = 64,
  minBarHeight = 4,
  zeroHeight,
  tintClass,
  highlightTintClass,
  gradient,
  barClassName,
  labelClassName,
  maxBarWidth,
  columnClassName,
  className,
}: BarChartProps) {
  if (bars.length === 0) return null;

  const values = bars.map((b) => b.value).filter((v): v is number => v !== null);
  const denominator = max ?? Math.max(1, ...values);

  const barHeight = (value: number | null): number => {
    if (value === null) return 0;
    if (value === 0 && zeroHeight !== undefined) return zeroHeight;
    return Math.max(minBarHeight, (Math.min(value, denominator) / denominator) * barAreaHeight);
  };

  return (
    <View className={cn("flex-row items-end gap-2", className)}>
      {bars.map((bar, i) => {
        const height = barHeight(bar.value);
        const fill =
          bar.tintClass ?? (bar.highlighted ? (highlightTintClass ?? tintClass) : tintClass);
        return (
          <View
            key={bar.key ?? i}
            className={cn("flex-1 items-center gap-1", columnClassName)}
            style={maxBarWidth !== undefined ? { maxWidth: maxBarWidth } : undefined}
          >
            {bar.topLabel !== undefined ? (
              <Text variant="muted" className="text-[10px] font-semibold">
                {bar.topLabel}
              </Text>
            ) : null}
            <View
              className={cn("w-full justify-end", gradient ? "overflow-hidden rounded-t-md" : null)}
              style={{ height: barAreaHeight }}
            >
              {gradient ? (
                <LinearGradient
                  testID="bar-chart-bar"
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ height, borderRadius: 4 }}
                />
              ) : (
                <View
                  testID="bar-chart-bar"
                  className={cn("w-full", barClassName ?? "rounded-md", fill)}
                  style={{ height }}
                />
              )}
            </View>
            {bar.label !== undefined ? (
              <Text variant="muted" className={cn("text-[10px]", labelClassName)}>
                {bar.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
