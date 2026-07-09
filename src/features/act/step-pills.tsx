import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { NARROW_STEP_INDICATOR_BREAKPOINT } from "@/src/constants/layout";
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
  const { t } = useTranslation("navigation");
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_STEP_INDICATOR_BREAKPOINT;
  const [stepsOpen, setStepsOpen] = useState(false);
  const showStepList = !isNarrow || stepsOpen;
  const stepIndex = steps.indexOf(current);
  const summary = t("wizard.stepSummary", {
    current: stepIndex + 1,
    total: steps.length,
    name: getLabel(current),
  });

  return (
    <View className="gap-2">
      {isNarrow ? (
        <Button
          accessibilityLabel={`${summary}. ${t(stepsOpen ? "wizard.hideSteps" : "wizard.showAllSteps")}`}
          accessibilityState={{ expanded: stepsOpen }}
          className="justify-between"
          onPress={() => setStepsOpen((open) => !open)}
          variant="outline"
        >
          <Text className="flex-1 text-left font-medium" numberOfLines={1}>
            {summary}
          </Text>
          <Icon
            className="text-muted-foreground"
            name={stepsOpen ? "expand-less" : "expand-more"}
          />
        </Button>
      ) : null}

      {showStepList ? (
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
      ) : null}
    </View>
  );
}
