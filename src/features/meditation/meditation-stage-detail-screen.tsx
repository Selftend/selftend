import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { getStage } from "@/src/features/meditation/stages";
import {
  useMeditationProgramState,
  useUpsertMeditationProgramState,
} from "@/src/features/meditation/queries";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSession } from "@/src/providers/session-provider";

export default function MeditationStageDetailScreen() {
  const { t } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const params = useLocalSearchParams<{ n: string }>();
  const stageNumber = Math.max(1, Math.min(10, Number(params.n) || 1));
  const stage = getStage(stageNumber);

  const { data: programState } = useMeditationProgramState(userId);
  const upsertProgramState = useUpsertMeditationProgramState(userId);

  const isCurrent = programState?.currentStage === stage.number;

  function handleSwitch() {
    upsertProgramState.mutate({ currentStage: stage.number });
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <ScreenHeader title={t(stage.titleKey)} titleVariant="h2" />

          <Card>
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.stages.goalLabel")}</CardTitle>
              <Text variant="muted">{t(stage.goalKey)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.stages.obstaclesLabel")}</CardTitle>
              <Text variant="muted">{t(stage.obstaclesKey)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.stages.skillsLabel")}</CardTitle>
              <Text variant="muted">{t(stage.skillsKey)}</Text>
            </CardContent>
          </Card>

          {/* The one callout on the screen. Decorative emphasis, so it takes
              the room hue through the tint token layer rather than `primary`. */}
          <Card>
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.stages.masteryLabel")}</CardTitle>
              <Text variant="muted">{t(stage.masteryKey)}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="gap-2 pt-6">
              <CardTitle>{t("module.stages.promptsLabel")}</CardTitle>
              {stage.reflectionPromptKeys.map((key) => (
                <Text key={key} variant="muted" className="text-sm">
                  • {t(key)}
                </Text>
              ))}
            </CardContent>
          </Card>

          <View className="gap-3">
            {!isCurrent ? (
              <Button onPress={handleSwitch} disabled={upsertProgramState.isPending}>
                <Text>{t("module.stages.switchTo")}</Text>
              </Button>
            ) : (
              <Button variant="outline" onPress={() => router.back()}>
                <Text>{t("module.home.startSit")}</Text>
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
