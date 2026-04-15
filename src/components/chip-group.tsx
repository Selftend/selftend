import { Pressable, Text, View } from "react-native";

import { classNames } from "@/src/utils/class-names";

interface ChipGroupProps {
  onToggle: (value: string) => void;
  options: string[];
  selected: string[];
}

export function ChipGroup({ onToggle, options, selected }: ChipGroupProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            className={classNames(
              "rounded-full border px-4 py-2",
              isSelected ? "border-pine bg-pine" : "border-pine/15 bg-white",
            )}
            onPress={() => onToggle(option)}
          >
            <Text className={classNames("text-sm font-medium", isSelected ? "text-white" : "text-ink")}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
