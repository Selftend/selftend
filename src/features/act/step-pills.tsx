import { Pressable, View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

interface StepPillsProps<TStep extends string> {
  steps: readonly TStep[];
  current: TStep;
  onSelect: (step: TStep) => void;
  getLabel: (step: TStep) => string;
}

export function StepPills<TStep extends string>({
  steps,
  current,
  onSelect,
  getLabel,
}: StepPillsProps<TStep>) {
  const stepIndex = steps.indexOf(current);
  return (
    <View className="flex-row flex-wrap gap-2">
      {steps.map((s, index) => {
        const isActive = current === s;
        const isPast = index < stepIndex;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive, disabled: index > stepIndex }}
            disabled={index > stepIndex}
            onPress={() => {
              if (index <= stepIndex) onSelect(s);
            }}
            className={cn(
              "rounded-full border px-3 py-1",
              isActive
                ? "border-act bg-act"
                : isPast
                  ? "border-act/40 bg-act/10"
                  : "border-border bg-card opacity-40",
            )}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                isActive ? "text-white" : isPast ? "text-act" : "text-muted-foreground",
              )}
            >
              {index + 1}. {getLabel(s)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
