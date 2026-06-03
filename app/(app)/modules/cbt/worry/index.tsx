import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
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
import { ScreenHeader } from "@/src/components/app/screen-header";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { HelpButton } from "@/src/components/app/help-button";
import { toLocalDateKey, useSelectedDate } from "@/src/stores/selected-date-store";

export default function WorryScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { selectedDate } = useSelectedDate();
  const { data: entries, isLoading } = useWorryEntries(user?.id ?? null);
  const toggleMutation = useToggleWorryResolved(user?.id ?? null);

  const filteredEntries =
    entries?.filter((e) => toLocalDateKey(e.createdAt) === selectedDate) ?? [];

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
              <ScreenHeader
                title={t("worry.title")}
                right={
                  <View className="flex-row items-center gap-3">
                    <AddToHomeButton widgetId="cbt-worry" />
                    <HelpButton helpKey="worry" />
                  </View>
                }
              />
              <Text variant="muted">{t("worry.description")}</Text>
            </View>
            <Button onPress={() => router.push("/modules/cbt/worry/new")} size="sm">
              <Text>{t("worry.new")}</Text>
            </Button>
          </View>

          {isLoading ? (
            <LoadingState title={t("worry.loading")} />
          ) : filteredEntries.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("worry.empty")}</CardTitle>
                <CardDescription>{t("worry.emptyDescription")}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <View className="gap-3">
              {filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={entry.worryStatement}
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() =>
                      router.push(
                        `/modules/cbt/worry/${entry.id}` as Parameters<typeof router.push>[0],
                      )
                    }
                  >
                    <CardHeader>
                      <CardTitle>{entry.worryStatement}</CardTitle>
                      <CardDescription>
                        {t(`worry.category.${entry.worryCategory}`)}
                        {entry.probabilityEstimate !== null
                          ? ` · ${t("worry.probabilityLabel", { value: entry.probabilityEstimate })}`
                          : ""}
                      </CardDescription>
                    </CardHeader>
                  </Pressable>
                  <CardContent>
                    {entry.copingStatement ? (
                      <Text variant="muted">{entry.copingStatement}</Text>
                    ) : null}
                    {entry.evidenceFor.length > 0 ? (
                      <View className="gap-1 mt-2">
                        <Text className="text-sm font-medium">{t("worry.evidenceFor")}</Text>
                        {entry.evidenceFor.map((item, i) => (
                          <Text key={i} variant="muted" className="text-sm">
                            • {item}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {entry.evidenceAgainst.length > 0 ? (
                      <View className="gap-1 mt-2">
                        <Text className="text-sm font-medium">{t("worry.evidenceAgainst")}</Text>
                        {entry.evidenceAgainst.map((item, i) => (
                          <Text key={i} variant="muted" className="text-sm">
                            • {item}
                          </Text>
                        ))}
                      </View>
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
                        onCheckedChange={(checked) => void handleToggle(entry.id, checked)}
                      />
                      <Label onPress={() => void handleToggle(entry.id, !entry.resolved)}>
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
