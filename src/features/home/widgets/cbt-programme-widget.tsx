import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useCbtProgram } from "@/src/features/cbt/use-cbt-program";

export function CbtProgrammeWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("cbt");
  const { program } = useCbtProgram(userId);

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon name="school" className="size-5 text-primary" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.cbtProgramme.title")}</Text>
        </View>
        {program.status === "in_progress" && program.phase ? (
          <View className="gap-0.5">
            <Text className="text-sm font-medium" numberOfLines={1}>
              {tc(program.phase.themeLabelKey)}
            </Text>
            <Text variant="muted" className="text-xs">
              {tc("program.phaseProgress", {
                current: program.phaseIndex + 1,
                total: program.totalPhases,
              })}
            </Text>
          </View>
        ) : program.status === "graduated" ? (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtProgramme.complete")}
          </Text>
        ) : (
          <Text variant="muted" className="text-xs">
            {t("home.widgets.cbtProgramme.notStarted")}
          </Text>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/modules/cbt")}
        >
          <Text className="text-muted-foreground">{t("home.widgets.cbtProgramme.open")}</Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}
