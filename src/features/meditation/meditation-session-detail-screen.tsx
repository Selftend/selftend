import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useMeditationSession } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatAtOffset } from "@/src/utils/date";
import { useRoomStyle } from "@/src/lib/use-room-style";

export default function MeditationSessionDetailScreen() {
  const { t } = useTranslation("meditation");
  const roomStyle = useRoomStyle("iris");
  const { user } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const { data: session, isLoading } = useMeditationSession(user?.id ?? null, params.id ?? null);

  // All three returns take the pour: without it the room drops out while the
  // session loads and again when it is missing - the defect the grounding flow
  // shipped and had to fix (#317).
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background" style={roomStyle}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="gap-3 p-6">
          <ScreenHeader title={t("module.sessionDetail.notFound")} titleVariant="h2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("module.sessionDetail.title")} />
            <Text variant="muted">
              {t("module.sessionDetail.completedAt", {
                date: formatAtOffset(session.completedAt, session.completedOffsetMinutes),
              })}
            </Text>
          </View>

          <Card>
            <CardContent className="gap-2 pt-6">
              <Text>{t("module.sessionDetail.stage", { stage: session.stageAtSession })}</Text>
              <Text>{t("module.sessionDetail.duration", { count: session.durationMinutes })}</Text>
              {session.techniqueUsed ? (
                <Text>
                  {t("module.sessionDetail.technique", {
                    name: t(`module.session.technique.${session.techniqueUsed}`),
                  })}
                </Text>
              ) : null}
              {session.mindWanderingEpisodes !== null ? (
                <Text>
                  {t("module.sessionDetail.mindWandering", {
                    count: session.mindWanderingEpisodes,
                  })}
                </Text>
              ) : null}
              {session.dullnessLevel ? (
                <Text>{t("module.sessionDetail.dullness", { level: session.dullnessLevel })}</Text>
              ) : null}
              {session.distractionLevel ? (
                <Text>
                  {t("module.sessionDetail.distraction", { level: session.distractionLevel })}
                </Text>
              ) : null}
              {session.moodAfter !== null ? (
                <Text>{t("module.sessionDetail.mood", { score: session.moodAfter })}</Text>
              ) : null}
            </CardContent>
          </Card>

          {session.reflection ? (
            <Card>
              <CardContent className="gap-2 pt-6">
                <CardTitle aria-level={2}>{t("module.sessionDetail.reflection")}</CardTitle>
                <Text variant="muted">{session.reflection}</Text>
              </CardContent>
            </Card>
          ) : null}

          {session.obstacleTags.length > 0 ? (
            <Card>
              <CardContent className="gap-2 pt-6">
                <CardTitle aria-level={2}>{t("module.sessionDetail.obstacles")}</CardTitle>
                <View className="flex-row flex-wrap gap-2">
                  {session.obstacleTags.map((tag) => (
                    <View key={tag} className="rounded-full bg-muted px-3 py-1">
                      <Text variant="muted" className="text-xs">
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
