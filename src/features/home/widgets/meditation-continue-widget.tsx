import { router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useMeditationProgramState } from "@/src/features/meditation/queries";

const TOTAL_STAGES = 10;

export function MeditationContinueWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { data: program } = useMeditationProgramState(userId);

  const stage = program?.currentStage ?? 1;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-iris/10">
            <Icon name="play-arrow" className="size-5 text-iris" />
          </View>
          <Text className="text-sm font-semibold">
            {t("home.widgets.meditationContinue.title")}
          </Text>
        </View>
        <Text className="text-sm font-medium">
          {t("home.widgets.meditationContinue.stage", { stage, total: TOTAL_STAGES })}
        </Text>
        <Button
          size="sm"
          variant="ghost"
          className="self-end"
          onPress={() => router.push("/tools/meditation")}
        >
          <Text className="text-muted-foreground">
            {t("home.widgets.meditationContinue.continue")}
          </Text>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}
