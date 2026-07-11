import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import { selectDisplayThought } from "./select-display-thought";

interface RecentThoughtRecordProps {
  record: ThoughtRecord | null;
}

export function RecentThoughtRecord({ record }: RecentThoughtRecordProps) {
  const { t } = useTranslation("cbt");

  if (!record) {
    return null;
  }

  const { natText, balancedThought } = selectDisplayThought(record);

  return (
    <View className="gap-3">
      <Text variant="h3">{t("dashboard.recentThought")}</Text>
      <AccessibleCardLink
        title={natText}
        description={balancedThought}
        onPress={() =>
          router.push(`/modules/cbt/history/${record.id}` as Parameters<typeof router.push>[0])
        }
      />
    </View>
  );
}
