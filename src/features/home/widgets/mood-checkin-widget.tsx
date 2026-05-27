import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSelectedDate } from "@/src/stores/selected-date-store";

const FACES: { score: number; icon: MaterialIconName }[] = [
  { score: 1, icon: "sentiment-very-dissatisfied" },
  { score: 2, icon: "sentiment-dissatisfied" },
  { score: 3, icon: "sentiment-neutral" },
  { score: 4, icon: "sentiment-satisfied" },
  { score: 5, icon: "sentiment-very-satisfied" },
];

export function MoodCheckinWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("navigation");
  const { selectedDate: todayKey } = useSelectedDate();
  const { data: moodLogs } = useMoodLogs(userId, 30);

  const todayLogs = (moodLogs ?? []).filter((l) => l.loggedAt.startsWith(todayKey));
  const moodToday = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].moodScore : null;

  return (
    <Card className="flex-1">
      <CardContent className="gap-3 pt-4 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="size-8 items-center justify-center rounded-lg bg-be/10">
            <Icon name="mood" className="size-5 text-be" />
          </View>
          <Text className="text-sm font-semibold">{t("home.widgets.moodCheckin.title")}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          {FACES.map((face) => (
            <Pressable
              key={face.score}
              accessibilityRole="button"
              accessibilityLabel={t("home.widgets.moodCheckin.faceLabel", { score: face.score })}
              onPress={() => router.push(`/tools/mood-tracker/new?score=${face.score}`)}
              className={cn(
                "size-11 items-center justify-center rounded-full",
                moodToday === face.score ? "bg-be/20" : "bg-muted/50",
              )}
            >
              <Icon
                name={face.icon}
                className={cn(
                  "size-6",
                  moodToday === face.score ? "text-be" : "text-muted-foreground",
                )}
              />
            </Pressable>
          ))}
        </View>
      </CardContent>
    </Card>
  );
}
