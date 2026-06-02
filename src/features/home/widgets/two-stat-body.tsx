import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

// Shared two-column numeric-stat body for the home "week / sit-time" widgets. Each widget
// keeps its own data calc, i18n keys, and (per the hero-stat no-hide rule) its own
// empty-state branch - this renders only the populated two-stat row.
export function TwoStatBody({ stats }: { stats: { value: number; label: string }[] }) {
  return (
    <View className="flex-row gap-6">
      {stats.map((stat) => (
        <View key={stat.label} className="gap-0.5">
          <Text className="text-base font-semibold">{stat.value}</Text>
          <Text variant="muted" className="text-[11px]">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
