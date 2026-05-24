import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardHeader, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { BackButton } from "@/src/components/app/back-button";
import { HelpButton } from "@/src/components/app/help-button";
import { personalValuesList } from "@/src/constants/personal-values-list";
import { useValuesProfile, useSaveValuesProfile } from "@/src/features/values/queries";
import type { PersonalValue, ValueTier } from "@/src/features/values/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const TIERS: ValueTier[] = [1, 2, 3];

export default function ValuesScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((s) => s.showToast);
  const { data: profile, isLoading } = useValuesProfile(user?.id ?? null);
  const saveMutation = useSaveValuesProfile(user?.id ?? null);

  const [selections, setSelections] = useState<PersonalValue[]>(
    () => profile?.personalValues ?? [],
  );

  // Sync initial load into local state once
  const [initialised, setInitialised] = useState(false);
  if (profile && !initialised) {
    setSelections(profile.personalValues);
    setInitialised(true);
  }

  const getTier = (key: string): ValueTier | null => {
    return (selections.find((s) => s.key === key)?.tier as ValueTier) ?? null;
  };

  const setTier = (key: string, tier: ValueTier | null) => {
    if (tier === null) {
      setSelections((prev) => prev.filter((s) => s.key !== key));
    } else {
      setSelections((prev) => {
        const without = prev.filter((s) => s.key !== key);
        return [...without, { key, tier }];
      });
    }
  };

  const topValues = selections.filter((s) => s.tier === 1);
  const hasTopValue = topValues.length > 0;

  const handleSave = async () => {
    if (!hasTopValue) return;
    try {
      await saveMutation.mutateAsync({ personalValues: selections });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("values.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1" className="flex-1">
                {t("values.title")}
              </Text>
              <HelpButton helpKey="values" />
            </View>
            <Text variant="muted">{t("values.description")}</Text>
          </View>

          {topValues.length > 0 ? (
            <View className="gap-2">
              <Text variant="h2">{t("values.topValuesTitle")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {topValues.map((v) => (
                  <View key={v.key} className="rounded-full bg-primary px-3 py-1">
                    <Text className="text-primary-foreground text-sm">
                      {t(`personalValues.${v.key}`)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text variant="muted">{t("values.topValuesEmpty")}</Text>
          )}

          <Text variant="h2">{t("values.allValues")}</Text>

          {personalValuesList.map((def) => {
            const currentTier = getTier(def.key);
            const label = t(`personalValues.${def.key}`);
            return (
              <Card key={def.key}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <View className="flex-row gap-2 mt-2">
                    {TIERS.map((tier) => (
                      <Pressable
                        key={tier}
                        accessibilityRole="button"
                        accessibilityLabel={`${label} — ${t(`values.tier${tier}`)}`}
                        accessibilityState={{ selected: currentTier === tier }}
                        onPress={() => setTier(def.key, currentTier === tier ? null : tier)}
                        className="flex-1"
                      >
                        <View
                          className={`rounded-md border px-2 py-1 items-center ${
                            currentTier === tier ? "bg-primary border-primary" : "border-border"
                          }`}
                        >
                          <Text
                            className={`text-xs ${
                              currentTier === tier ? "text-primary-foreground" : "text-foreground"
                            }`}
                          >
                            {t(`values.tier${tier}`)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </CardHeader>
              </Card>
            );
          })}

          {!hasTopValue ? <Text variant="muted">{t("values.tierRequired")}</Text> : null}

          <Button
            disabled={!hasTopValue || saveMutation.isPending}
            onPress={() => void handleSave()}
          >
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{saveMutation.isPending ? t("values.saving") : t("values.save")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
