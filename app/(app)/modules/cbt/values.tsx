import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { HelpButton } from "@/src/components/app/help-button";
import { personalValuesList } from "@/src/constants/personal-values-list";
import { useValuesProfile, useSaveValuesProfile } from "@/src/features/values/queries";
import type { PersonalValue, ValueTier } from "@/src/features/values/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const TIERS: ValueTier[] = [1, 2, 3];
const MAX_PRIORITIES = 6;

export default function ValuesScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((s) => s.showToast);
  const { data: profile, isLoading } = useValuesProfile(user?.id ?? null);
  const saveMutation = useSaveValuesProfile(user?.id ?? null);

  const [selections, setSelections] = useState<PersonalValue[]>(
    () => profile?.personalValues ?? [],
  );
  const [priorities, setPriorities] = useState<string[]>(() => profile?.priorityValues ?? []);

  // Sync initial load into local state once.
  const [initialised, setInitialised] = useState(false);
  if (profile && !initialised) {
    setSelections(profile.personalValues);
    setPriorities(profile.priorityValues);
    setInitialised(true);
  }

  const getTier = (key: string): ValueTier | null => {
    return selections.find((s) => s.key === key)?.tier ?? null;
  };

  const setTier = (key: string, tier: ValueTier | null) => {
    if (tier === null) {
      setSelections((prev) => prev.filter((s) => s.key !== key));
      setPriorities((prev) => prev.filter((k) => k !== key));
      return;
    }
    setSelections((prev) => {
      const without = prev.filter((s) => s.key !== key);
      return [...without, { key, tier }];
    });
    // A value only qualifies as a priority while it is Highly Important (tier 1).
    if (tier !== 1) {
      setPriorities((prev) => prev.filter((k) => k !== key));
    }
  };

  const tier1Keys = selections.filter((s) => s.tier === 1).map((s) => s.key);
  const candidates = tier1Keys.filter((k) => !priorities.includes(k));
  const hasPriority = priorities.length > 0;
  const prioritiesFull = priorities.length >= MAX_PRIORITIES;

  const addPriority = (key: string) => {
    setPriorities((prev) =>
      prev.length >= MAX_PRIORITIES || prev.includes(key) ? prev : [...prev, key],
    );
  };

  const removePriority = (key: string) => {
    setPriorities((prev) => prev.filter((k) => k !== key));
  };

  const movePriority = (index: number, dir: -1 | 1) => {
    setPriorities((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasPriority) return;
    try {
      await saveMutation.mutateAsync({ personalValues: selections, priorityValues: priorities });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch {
      showToast({
        title: t("common:feedback.problem"),
        description: t("values.saveError"),
        tone: "error",
      });
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
            <ScreenHeader title={t("values.title")} right={<HelpButton helpKey="values" />} />
            <Text variant="muted">{t("values.description")}</Text>
          </View>

          <View className="gap-2">
            <Text variant="h2">{t("values.prioritiesTitle")}</Text>
            <Text variant="muted">{t("values.prioritiesHint")}</Text>

            {priorities.length === 0 ? (
              <Text variant="muted">{t("values.prioritiesEmpty")}</Text>
            ) : (
              priorities.map((key, index) => (
                <Card key={key}>
                  <CardHeader>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-primary font-semibold">{index + 1}</Text>
                      <CardTitle className="flex-1">{t(`personalValues.${key}.label`)}</CardTitle>
                    </View>
                    <View className="flex-row gap-4 mt-2">
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                        accessibilityLabel={`${t(`personalValues.${key}.label`)} — ${t("values.priorityMoveUp")}`}
                        accessibilityState={{ disabled: index === 0 }}
                        disabled={index === 0}
                        onPress={() => movePriority(index, -1)}
                        className={index === 0 ? "opacity-40" : ""}
                      >
                        <Text className="text-primary">↑ {t("values.priorityMoveUp")}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                        accessibilityLabel={`${t(`personalValues.${key}.label`)} — ${t("values.priorityMoveDown")}`}
                        accessibilityState={{ disabled: index === priorities.length - 1 }}
                        disabled={index === priorities.length - 1}
                        onPress={() => movePriority(index, 1)}
                        className={index === priorities.length - 1 ? "opacity-40" : ""}
                      >
                        <Text className="text-primary">↓ {t("values.priorityMoveDown")}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                        accessibilityLabel={`${t(`personalValues.${key}.label`)} — ${t("values.priorityRemove")}`}
                        onPress={() => removePriority(key)}
                      >
                        <Text variant="muted">{t("values.priorityRemove")}</Text>
                      </Pressable>
                    </View>
                  </CardHeader>
                </Card>
              ))
            )}

            {candidates.length > 0 && !prioritiesFull ? (
              <View className="gap-2">
                <Text variant="muted">{t("values.candidatesTitle")}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {candidates.map((key) => (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                      accessibilityLabel={`${t(`personalValues.${key}.label`)} — ${t("values.priorityAdd")}`}
                      onPress={() => addPriority(key)}
                      className="rounded-full border border-primary px-3 py-1"
                    >
                      <Text className="text-primary text-sm">
                        + {t(`personalValues.${key}.label`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {prioritiesFull ? <Text variant="muted">{t("values.priorityFull")}</Text> : null}
          </View>

          <Text variant="h2">{t("values.allValues")}</Text>

          {personalValuesList.map((def) => {
            const currentTier = getTier(def.key);
            const label = t(`personalValues.${def.key}.label`);
            return (
              <Card key={def.key}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>{t(`personalValues.${def.key}.description`)}</CardDescription>
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

          {!hasPriority ? <Text variant="muted">{t("values.priorityRequired")}</Text> : null}

          <Button
            disabled={!hasPriority || saveMutation.isPending}
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
