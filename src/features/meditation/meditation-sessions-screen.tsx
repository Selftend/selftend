import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";

export default function MeditationSessionsScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data: sessions } = useMeditationSessions(user?.id ?? null, 100);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("module.sessions.title")} />
            <Text variant="muted">{t("module.sessions.subtitle")}</Text>
          </View>

          {!sessions || sessions.length === 0 ? (
            <Text variant="muted">{t("module.sessions.empty")}</Text>
          ) : (
            <View className="gap-2">
              {sessions.map((s) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/tools/meditation/sessions/[id]",
                      params: { id: s.id },
                    })
                  }
                  className="rounded-lg border border-border bg-card p-3 active:bg-accent/40"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="gap-0.5">
                      <Text className="font-semibold">
                        {t("module.sessions.durationLabel", { count: s.durationMinutes })}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(s.completedAt).toLocaleString()}
                      </Text>
                    </View>
                    <View className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-xs font-semibold text-primary">
                        {t("module.sessions.stageBadge", { stage: s.stageAtSession })}
                      </Text>
                    </View>
                  </View>
                  {s.reflection ? (
                    <Text variant="muted" className="mt-2 text-sm" numberOfLines={2}>
                      {s.reflection}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
