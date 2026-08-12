import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { groundingLookup } from "@/src/constants/grounding";
import type { MindfulnessSession } from "@/src/features/mindfulness/types";

export function GroundingSessionRow({
  session,
  when,
}: {
  session: MindfulnessSession;
  when: string;
}) {
  const { t } = useTranslation("cbt");
  const fallbackTotal = groundingLookup[session.exerciseName]?.steps.length ?? 1;
  const total = session.stepsTotal ?? fallbackTotal;
  const completed = session.stepsCompleted ?? total;

  return (
    <View className="flex-row items-center gap-4 px-1 py-3">
      <Text className="flex-1 text-sm font-medium" numberOfLines={1}>
        {t(`grounding.techniques.${session.exerciseName}.title`)}
      </Text>
      <Text variant="muted" className="shrink-0 text-xs tabular-nums">
        {t("grounding.stepsReached", { completed, total })}
      </Text>
      <Text variant="muted" className="shrink-0 text-xs tabular-nums">
        {when}
      </Text>
    </View>
  );
}
