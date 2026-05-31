import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

export interface StatItem {
  value: string;
  label: string;
}

interface StatRowProps {
  items: StatItem[];
  /** Tailwind text-color class for the bold numbers, e.g. "text-be". */
  accentClassName: string;
  subline?: string;
}

export function StatRow({ items, accentClassName, subline }: StatRowProps) {
  return (
    <View className="gap-1.5">
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {items.map((item) => (
          <Text key={item.label} variant="muted" className="text-[13px]">
            <Text className={`text-[13px] font-bold ${accentClassName}`}>{item.value}</Text>{" "}
            {item.label}
          </Text>
        ))}
      </View>
      {subline ? (
        <Text className="text-[11px] font-bold uppercase tracking-[0.14em] text-be/80">
          {subline}
        </Text>
      ) : null}
    </View>
  );
}
