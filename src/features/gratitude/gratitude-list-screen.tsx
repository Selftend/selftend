import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { EmptyState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { GratitudeEntryCard } from "@/src/features/gratitude/gratitude-entry-card";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useSession } from "@/src/providers/session-provider";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function GratitudeListScreen() {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const { data: entries } = useGratitudeEntries(user?.id ?? null, 50);

  const list = (entries ?? []).filter((entry) => toLocalDateKey(entry.loggedAt) === selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          <Button onPress={() => router.push("/tools/gratitude-log/new")} className="self-start">
            <Icon name="add" className="size-4 text-primary-foreground" />
            <Text>{t("cta.new")}</Text>
          </Button>

          {list.length === 0 ? (
            <EmptyState
              icon="favorite"
              title={t("list.empty.title")}
              description={t("list.empty.description")}
              action={{
                label: t("list.empty.cta"),
                onPress: () => router.push("/tools/gratitude-log/new"),
              }}
            />
          ) : (
            <View className="gap-3">
              <Text variant="h3">{t("list.recent")}</Text>
              <View className="gap-3">
                {list.map((entry) => (
                  <GratitudeEntryCard key={entry.id} entry={entry} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
