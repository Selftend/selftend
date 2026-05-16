import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { RadioGroup, RadioGroupItem } from "@/src/components/react-native-reusables/radio-group";
import { Text } from "@/src/components/react-native-reusables/text";
import type { PlanConcern, PlanRoutine, PlanTool } from "@/src/features/plan/generate-plan";
import { TOOL_DEFS, generatePlan } from "@/src/features/plan/generate-plan";
import { useSavePlanItem } from "@/src/features/plan/queries";
import type { CarePlanItemInput } from "@/src/features/plan/types";
import { useSession } from "@/src/providers/session-provider";
import { usePlanWizardStore } from "@/src/stores/plan-wizard-store";
import { useToastStore } from "@/src/stores/toast-store";

const CONCERNS: { id: PlanConcern; labelKey: string }[] = [
  { id: "anxiety", labelKey: "plan.wizard.concernAnxiety" },
  { id: "stress", labelKey: "plan.wizard.concernStress" },
  { id: "low_mood", labelKey: "plan.wizard.concernLowMood" },
  { id: "sleep", labelKey: "plan.wizard.concernSleep" },
  { id: "negative_thoughts", labelKey: "plan.wizard.concernNegativeThoughts" },
  { id: "self_compassion", labelKey: "plan.wizard.concernSelfCompassion" },
  { id: "emotional_regulation", labelKey: "plan.wizard.concernEmotionalRegulation" },
];

const TOOLS: { id: PlanTool; labelKey: string }[] = [
  { id: "mood", labelKey: "plan.wizard.toolMood" },
  { id: "cbt", labelKey: "plan.wizard.toolCbt" },
  { id: "breathing", labelKey: "plan.wizard.toolBreathing" },
  { id: "meditation", labelKey: "plan.wizard.toolMeditation" },
  { id: "gratitude", labelKey: "plan.wizard.toolGratitude" },
  { id: "journal", labelKey: "plan.wizard.toolJournal" },
  { id: "habits", labelKey: "plan.wizard.toolHabits" },
];

const ROUTINES: { id: PlanRoutine; labelKey: string; descKey: string }[] = [
  { id: "light", labelKey: "plan.wizard.routineLight", descKey: "plan.wizard.routineLightDesc" },
  {
    id: "standard",
    labelKey: "plan.wizard.routineStandard",
    descKey: "plan.wizard.routineStandardDesc",
  },
  {
    id: "custom",
    labelKey: "plan.wizard.routineCustom",
    descKey: "plan.wizard.routineCustomDesc",
  },
];

export function PlanWizardScreen() {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const {
    stepIndex,
    concerns,
    tools,
    routine,
    nextStep,
    previousStep,
    setConcerns,
    setTools,
    setRoutine,
    reset,
  } = usePlanWizardStore();

  const saveMutation = useSavePlanItem(user?.id ?? null);
  const [previewItems, setPreviewItems] = useState<CarePlanItemInput[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleConcern(id: PlanConcern) {
    setConcerns(concerns.includes(id) ? concerns.filter((c) => c !== id) : [...concerns, id]);
  }

  function toggleTool(id: PlanTool) {
    setTools(tools.includes(id) ? tools.filter((t) => t !== id) : [...tools, id]);
  }

  function togglePreviewItem(index: number) {
    if (!previewItems) return;
    const next = [...previewItems];
    next[index] = { ...next[index], active: !next[index].active };
    setPreviewItems(next);
  }

  function goToPreview() {
    const generated = generatePlan(concerns, tools, routine ?? "standard");
    setPreviewItems(generated);
    nextStep();
  }

  async function handleSave() {
    if (!previewItems) return;
    const toSave = previewItems.filter((item) => item.active);
    if (toSave.length === 0) {
      setError(t("plan.wizard.errorNoItems"));
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      for (let i = 0; i < toSave.length; i++) {
        await saveMutation.mutateAsync({ input: { ...toSave[i], order: i } });
      }
      reset();
      showToast({ title: t("plan.wizard.saved"), tone: "success" });
      router.replace("/(app)/plan" as Parameters<typeof router.replace>[0]);
    } catch {
      setError(t("plan.wizard.errorSave"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          {/* Step indicator */}
          <View className="flex-row gap-2">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </View>

          {stepIndex === 0 && (
            <View className="gap-6">
              <View className="gap-2">
                <Text variant="h2">{t("plan.wizard.concernsTitle")}</Text>
                <Text variant="muted">{t("plan.wizard.concernsSubtitle")}</Text>
              </View>

              <View className="gap-3">
                {CONCERNS.map(({ id, labelKey }) => {
                  const checked = concerns.includes(id);
                  const label = t(labelKey);
                  return (
                    <Card key={id}>
                      <CardContent className="flex-row items-center gap-4 pb-4 pt-4">
                        <Checkbox
                          accessibilityLabel={label}
                          checked={checked}
                          onCheckedChange={() => toggleConcern(id)}
                        />
                        <Label onPress={() => toggleConcern(id)} className="flex-1">
                          {label}
                        </Label>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>

              <View className="gap-3">
                <Button onPress={nextStep} disabled={concerns.length === 0}>
                  <Text>{t("plan.wizard.next")}</Text>
                </Button>
                <Button
                  variant="ghost"
                  onPress={() =>
                    router.replace("/(app)/plan" as Parameters<typeof router.replace>[0])
                  }
                >
                  <Text>{t("plan.wizard.skipWizard")}</Text>
                </Button>
              </View>
            </View>
          )}

          {stepIndex === 1 && (
            <View className="gap-6">
              <View className="gap-2">
                <Text variant="h2">{t("plan.wizard.toolsTitle")}</Text>
                <Text variant="muted">{t("plan.wizard.toolsSubtitle")}</Text>
              </View>

              <View className="gap-3">
                {TOOLS.map(({ id, labelKey }) => {
                  const checked = tools.includes(id);
                  const label = t(labelKey);
                  return (
                    <Card key={id}>
                      <CardContent className="flex-row items-center gap-4 pb-4 pt-4">
                        <Checkbox
                          accessibilityLabel={label}
                          checked={checked}
                          onCheckedChange={() => toggleTool(id)}
                        />
                        <Label onPress={() => toggleTool(id)} className="flex-1">
                          {label}
                        </Label>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>

              <View className="gap-3">
                <Button onPress={nextStep} disabled={tools.length === 0}>
                  <Text>{t("plan.wizard.next")}</Text>
                </Button>
                <Button variant="ghost" onPress={previousStep}>
                  <Text>{t("plan.wizard.back")}</Text>
                </Button>
              </View>
            </View>
          )}

          {stepIndex === 2 && (
            <View className="gap-6">
              <View className="gap-2">
                <Text variant="h2">{t("plan.wizard.routineTitle")}</Text>
                <Text variant="muted">{t("plan.wizard.routineSubtitle")}</Text>
              </View>

              <RadioGroup
                value={routine ?? ""}
                onValueChange={(v) => setRoutine(v as PlanRoutine)}
                className="gap-3"
              >
                {ROUTINES.map(({ id, labelKey, descKey }) => (
                  <Card key={id}>
                    <CardContent className="flex-row items-center gap-4 pb-4 pt-4">
                      <RadioGroupItem value={id} accessibilityLabel={t(labelKey)} />
                      <View className="flex-1">
                        <Label onPress={() => setRoutine(id)}>{t(labelKey)}</Label>
                        <Text variant="muted" className="text-xs">
                          {t(descKey)}
                        </Text>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>

              <View className="gap-3">
                <Button onPress={goToPreview} disabled={!routine}>
                  <Text>{t("plan.wizard.next")}</Text>
                </Button>
                <Button variant="ghost" onPress={previousStep}>
                  <Text>{t("plan.wizard.back")}</Text>
                </Button>
              </View>
            </View>
          )}

          {stepIndex === 3 && previewItems && (
            <View className="gap-6">
              <View className="gap-2">
                <Text variant="h2">{t("plan.wizard.reviewTitle")}</Text>
                <Text variant="muted">{t("plan.wizard.reviewSubtitle")}</Text>
              </View>

              <View className="gap-3">
                {previewItems.map((item, index) => {
                  const def = TOOL_DEFS[item.toolId as PlanTool];
                  const freqKey = `plan.frequency.${item.frequency}`;
                  return (
                    <Card key={`${item.toolId}-${index}`}>
                      <CardContent className="flex-row items-center gap-4 pb-4 pt-4">
                        <Checkbox
                          accessibilityLabel={item.title}
                          checked={item.active}
                          onCheckedChange={() => togglePreviewItem(index)}
                        />
                        <View className="flex-1">
                          <Label onPress={() => togglePreviewItem(index)}>{item.title}</Label>
                          <Text variant="muted" className="text-xs">
                            {t(freqKey)} · {def?.route ?? item.route}
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>

              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

              <View className="gap-3">
                <Button onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{t("plan.wizard.save")}</Text>
                </Button>
                <Button variant="ghost" onPress={previousStep}>
                  <Text>{t("plan.wizard.back")}</Text>
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
