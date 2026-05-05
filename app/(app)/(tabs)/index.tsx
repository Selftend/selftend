import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { formatTimestamp } from "@/src/utils/date";

export default function HomeScreen() {
  const { t } = useTranslation("settings");
  const { user } = useSession();
  const { data } = useThoughtRecords(user?.id ?? null);
  const latestRecord = data?.[0];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("home.title")}</Text>
            <Text variant="muted">{t("home.description")}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("home.scopeBoundary")}</CardTitle>
              <CardDescription>{t("home.scopeBoundaryDescription")}</CardDescription>
            </CardHeader>
          </Card>

          <Pressable onPress={() => router.push("/cbt")}>
            <Card>
              <CardHeader>
                <CardTitle>{t("home.cbtSection")}</CardTitle>
                <CardDescription>{t("home.cbtSectionDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/cbt/history")}>
            <Card>
              <CardHeader>
                <CardTitle>{t("home.thoughtHistory")}</CardTitle>
                <CardDescription>{t("home.thoughtHistoryDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push("/(app)/(tabs)/settings")}>
            <Card>
              <CardHeader>
                <CardTitle>{t("home.settingsAndSupport")}</CardTitle>
                <CardDescription>{t("home.settingsAndSupportDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <View className="gap-2">
            <Text variant="h3">{t("home.recentActivity")}</Text>
            {latestRecord ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("home.lastUpdated", { timestamp: formatTimestamp(latestRecord.updatedAt) })}
                  </CardTitle>
                  <CardDescription>{latestRecord.automaticThought}</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("home.noRecords")}</CardTitle>
                  <CardDescription>{t("home.noRecordsDescription")}</CardDescription>
                </CardHeader>
              </Card>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
