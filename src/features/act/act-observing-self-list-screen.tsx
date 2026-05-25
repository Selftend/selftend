import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { useObservingSelfSessions } from "@/src/features/act/queries";
import { RelatedTools } from "@/src/features/act/related-tools";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function ActObservingSelfListScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data: sessions, isLoading } = useObservingSelfSessions(user?.id ?? null);

  if (isLoading) {
    return <ScreenLoading title={t("observingSelf.listTitle")} />;
  }

  const daySessions = (sessions ?? []).filter(
    (session) => toLocalDateKey(session.createdAt) === selectedDate,
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("observingSelf.listTitle")}</Text>
            </View>
            <Text variant="muted">{t("observingSelf.listSubtitle")}</Text>
          </View>

          <Button onPress={() => router.push("/modules/act/observing-self/new")}>
            <Icon name="visibility" className="size-4 text-primary-foreground" />
            <Text>{t("observingSelf.newTitle")}</Text>
          </Button>

          <RelatedTools
            tools={[
              { icon: "air", nameKey: "mindfulness", href: "/tools/mindfulness" },
              { icon: "edit-note", nameKey: "journal", href: "/tools/journal" },
            ]}
          />

          {daySessions.length === 0 ? (
            <Text variant="muted">{t("observingSelf.noLogs")}</Text>
          ) : (
            <View className="gap-2">
              {daySessions.map((session) => (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  onPress={() =>
                    router.push({
                      pathname: "/modules/act/observing-self/[id]",
                      params: { id: session.id },
                    })
                  }
                  className="rounded-lg border border-border bg-card p-4 active:bg-accent/40"
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1 gap-1">
                      <Text className="font-semibold leading-snug" numberOfLines={2}>
                        {session.whatWasObserved ||
                          t(`observingSelf.techniques.${session.techniqueUsed}`)}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {t(`observingSelf.techniques.${session.techniqueUsed}`)}
                        {session.moodAfter !== null ? `  ·  ${session.moodAfter}/10` : null}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(session.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    <Icon name="chevron-right" className="size-4 text-muted-foreground" />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
