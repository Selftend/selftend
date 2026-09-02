import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import type { SteppableToolId } from "@/src/features/routines/derive";

/**
 * The numbered preview of a starter routine's steps - one row per tool, in
 * the order the routine will run them. Shared by every surface that offers
 * the starter routine (the onboarding wizard, the routines-screen empty state
 * and the second-action offer card) so the three read as one thing.
 *
 * Callers own any heading above the list (the routine name, an input); this
 * is only the rows.
 */
export function StarterStepList({ steps }: { steps: readonly SteppableToolId[] }) {
  const { t } = useTranslation("routines");
  return (
    <View className="gap-2">
      {steps.map((toolId, index) => (
        <View key={toolId} testID="starter-step-row" className="flex-row items-center gap-3">
          <View className="size-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <Text className="text-xs font-semibold text-primary">{index + 1}</Text>
          </View>
          <Text className="text-sm">{t(`tools.${toolId}`)}</Text>
        </View>
      ))}
    </View>
  );
}
