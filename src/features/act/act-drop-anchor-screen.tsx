import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { useSaveConnectionLog } from "@/src/features/act/queries";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";

export default function ActDropAnchorScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveConnectionLog(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  async function handleLog() {
    if (!user) return;
    try {
      await saveMutation.mutateAsync({
        technique: "dropAnchor",
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch {
      // error is surfaced via saveMutation.isError
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("act:dropAnchor.title")} />
            <Text variant="muted">{t("act:dropAnchor.intro")}</Text>
          </View>

          <View className="gap-4">
            <Card className="border-act/30 bg-act/5">
              <CardHeader>
                <CardTitle className="text-act">A</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t("act:dropAnchor.acknowledge")}
                </Text>
              </CardContent>
            </Card>

            <Card className="border-act/30 bg-act/5">
              <CardHeader>
                <CardTitle className="text-act">C</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t("act:dropAnchor.connect")}
                </Text>
              </CardContent>
            </Card>

            <Card className="border-act/30 bg-act/5">
              <CardHeader>
                <CardTitle className="text-act">E</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t("act:dropAnchor.engage")}
                </Text>
              </CardContent>
            </Card>
          </View>

          {saveMutation.isError ? (
            <Text variant="muted" className="text-destructive">
              {t("act:connection.saveProblem")}
            </Text>
          ) : null}

          <Button disabled={saveMutation.isPending} onPress={() => void handleLog()}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{t("act:dropAnchor.logCta")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
