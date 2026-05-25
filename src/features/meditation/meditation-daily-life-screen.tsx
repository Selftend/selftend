import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { MeditationDailyLifeCard } from "@/src/features/meditation/meditation-daily-life-card";
import { useStagePracticeNotes } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";

const STAGE = 10;

export default function MeditationDailyLifeScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data: notes } = useStagePracticeNotes(user?.id ?? null, STAGE);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("module.dailyLife.archiveTitle")} />
            <Text variant="muted">{t("module.dailyLife.archiveSubtitle")}</Text>
          </View>

          <MeditationDailyLifeCard />

          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("module.dailyLife.allEntries")}
            </Text>
            {(notes ?? []).length === 0 ? (
              <Text variant="muted">{t("module.dailyLife.empty")}</Text>
            ) : (
              <View className="gap-3">
                {(notes ?? []).map((note) => (
                  <View key={note.id} className="gap-1 rounded-lg border border-border bg-card p-3">
                    <Text className="text-xs text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleString()}
                    </Text>
                    <Text className="text-sm">{note.note}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
