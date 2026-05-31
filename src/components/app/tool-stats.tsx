import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

export interface ToolStatItem {
  /** Bold, accent-colored value, e.g. "12", "7.5h", "Stage 3". */
  value: string;
  /** Muted trailing label, e.g. "entries". Pass "" to render the value alone. */
  label: string;
}

interface ToolStatsProps {
  items: ToolStatItem[];
  /** Tailwind text-color class for the bold values, e.g. "text-be". Must be a literal used elsewhere. */
  accentClassName: string;
  /** Optional data line under the stats (e.g. "LAST · 5/31/2026"). Uppercase, accent-tinted. */
  subline?: string;
  /** Optional "Inspired by …" credit, rendered as the last line under the stats. */
  credit?: string;
}

export function ToolStats({ items, accentClassName, subline, credit }: ToolStatsProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item, i) => (
          <Text key={i} variant="muted" className="text-[13px]">
            <Text className={`text-[13px] font-bold ${accentClassName}`}>{item.value}</Text>
            {item.label ? ` ${item.label}` : ""}
          </Text>
        ))}
      </View>
      {subline ? (
        <Text className={`text-[11px] font-bold uppercase tracking-[0.14em] ${accentClassName}`}>
          {subline}
        </Text>
      ) : null}
      {credit ? (
        <Text variant="eyebrow" tint="primary" className="mt-0.5">
          {credit}
        </Text>
      ) : null}
    </View>
  );
}
