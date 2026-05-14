import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { useToggleWorryResolved, useWorryEntries } from "@/src/features/worry/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function WorryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: entries, isLoading } = useWorryEntries(user?.id ?? null);
  const toggleMutation = useToggleWorryResolved(user?.id ?? null);

  const handleToggle = async (entryId: string, resolved: boolean) => {
    try {
      await toggleMutation.mutateAsync({ entryId, resolved });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1 gap-2">
              <Text variant="h1">{t("worry.title")}</Text>
              <Text variant="muted">{t("worry.description")}</Text>
            </View>
            <Button onPress={() => router.push("/cbt/worry/new")} size="sm">
              <Text>{t("worry.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("worry.loading")} />
          ) : (entries?.length ?? 0) === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("worry.empty")}</CardTitle>
                <CardDescription>{t("worry.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <View className="gap-3">
              {entries!.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <CardTitle>{entry.worryStatement}</CardTitle>
                    <CardDescription>
                      {t(`worry.category.${entry.worryCategory}`)}
                      {entry.probabilityEstimate !== null
                        ? ` · ${t("worry.probabilityLabel", { value: entry.probabilityEstimate })}`
                        : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {entry.copingStatement ? (
                      <Text variant="muted">{entry.copingStatement}</Text>
                    ) : null}
                    {entry.actionSteps.length > 0 ? (
                      <View className="gap-1 mt-2">
                        {entry.actionSteps.map((step, i) => (
                          <Text key={i} variant="muted" className="text-sm">
                            • {step}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    <View className="flex-row items-center gap-3 mt-3">
                      <Checkbox
                        accessibilityLabel={t("worry.resolved")}
                        checked={entry.resolved}
                        onCheckedChange={(checked) =>
                          void handleToggle(entry.id, Boolean(checked))
                        }
                      />
                      <Label
                        onPress={() => void handleToggle(entry.id, !entry.resolved)}
                      >
                        {t("worry.resolved")}
                      </Label>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
