import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { HOME_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";

/**
 * "Looking back" (#1835) - the record over time, across tools. It computes
 * nothing (#1840): no cross-tool scalar, no trend, no comparison.
 *
 * The 30-day mood trend that used to open this screen is gone. It was the one
 * tool's chart standing in for every tool's record, and the map that removed it
 * (#1826) also removed the frame it carried - `noMoodData` read "Log a mood to
 * start your trend", an imperative wrapped around a debt the user does not owe.
 * The screen states what is there and stops.
 *
 * The time view and the recovery-plan door land next (#1906, #1905); this file
 * is deliberately small in between.
 */
export default function ProgressScreen() {
  const { t } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Column on the padded box, not inside it - see `layout.ts` (#1721). */}
      <ScrollView contentContainerClassName={cn("grow p-6", HOME_COLUMN)}>
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("progress.title")} />
            <Text variant="muted">{t("progress.description")}</Text>
          </View>

          {/*
            One pinned prompt (#1665). Four questions used to rotate by
            `new Date().getDay() % 4` - the card's only sentence changed daily
            on a rule nobody could see, which is a schedule, not a library
            (the same mechanism #765 removed from habits home). Content may
            vary only in a fixed order the user advances themselves.
          */}
          <Card>
            <CardHeader>
              <CardTitle>{t("progress.reflectionTitle")}</CardTitle>
              <CardDescription>{t("progress.reflectionDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text className="italic text-muted-foreground">{t("progress.prompt")}</Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
