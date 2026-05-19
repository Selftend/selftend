import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { RadioGroup, RadioGroupItem } from "@/src/components/react-native-reusables/radio-group";
import { Text } from "@/src/components/react-native-reusables/text";
import type { PlanTool } from "@/src/features/plan/generate-plan";
import { TOOL_DEFS } from "@/src/features/plan/generate-plan";
import { useAllPlanItems, useSavePlanItem } from "@/src/features/plan/queries";
import type { PlanFrequency } from "@/src/features/plan/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const TOOL_OPTIONS: { id: PlanTool; labelKey: string }[] = [
  { id: "mood", labelKey: "plan.wizard.toolMood" },
  { id: "cbt", labelKey: "plan.wizard.toolCbt" },
  { id: "breathing", labelKey: "plan.wizard.toolBreathing" },
  { id: "meditation", labelKey: "plan.wizard.toolMeditation" },
  { id: "gratitude", labelKey: "plan.wizard.toolGratitude" },
  { id: "journal", labelKey: "plan.wizard.toolJournal" },
  { id: "habits", labelKey: "plan.wizard.toolHabits" },
];

const FREQUENCY_OPTIONS: { id: PlanFrequency; labelKey: string }[] = [
  { id: "daily", labelKey: "plan.frequency.daily" },
  { id: "weekly", labelKey: "plan.frequency.weekly" },
  { id: "as_needed", labelKey: "plan.frequency.as_needed" },
];

interface PlanItemFormScreenProps {
  mode: "create" | "edit";
  itemId?: string | null;
}

export function PlanItemFormScreen({ mode, itemId = null }: PlanItemFormScreenProps) {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const { data: allItems } = useAllPlanItems(mode === "edit" ? (user?.id ?? null) : null);
  const existingItem = itemId ? (allItems?.find((item) => item.id === itemId) ?? null) : null;

  const saveMutation = useSavePlanItem(user?.id ?? null);

  const [title, setTitle] = useState("");
  const [selectedTool, setSelectedTool] = useState<PlanTool>("mood");
  const [frequency, setFrequency] = useState<PlanFrequency>("daily");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.title);
      setSelectedTool((existingItem.toolId as PlanTool) ?? "mood");
      setFrequency(existingItem.frequency);
      setDescription(existingItem.description ?? "");
    }
  }, [existingItem]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("plan.form.errorTitle"));
      return;
    }
    setIsSaving(true);
    setError("");
    const def = TOOL_DEFS[selectedTool];
    try {
      await saveMutation.mutateAsync({
        input: {
          title: trimmedTitle,
          description: description.trim() || undefined,
          toolId: selectedTool,
          route: def.route,
          frequency,
          reminderEnabled: false,
          order: existingItem?.order ?? 99,
          active: existingItem?.active ?? true,
        },
        id: itemId ?? undefined,
      });
      showToast({
        title: mode === "create" ? t("plan.form.created") : t("plan.form.updated"),
        tone: "success",
      });
      router.back();
    } catch {
      setError(t("plan.form.errorSave"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h2">
              {mode === "create" ? t("plan.form.titleCreate") : t("plan.form.titleEdit")}
            </Text>
          </View>

          {/* Title */}
          <View className="gap-2">
            <Label>{t("plan.form.nameLabel")}</Label>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder={t("plan.form.namePlaceholder")}
            />
          </View>

          {/* Description */}
          <View className="gap-2">
            <Label>{t("plan.form.descriptionLabel")}</Label>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t("plan.form.descriptionPlaceholder")}
            />
          </View>

          {/* Tool */}
          <View className="gap-2">
            <Label>{t("plan.form.toolLabel")}</Label>
            <RadioGroup
              value={selectedTool}
              onValueChange={(v) => setSelectedTool(v as PlanTool)}
              className="gap-2"
            >
              {TOOL_OPTIONS.map(({ id, labelKey }) => (
                <Card key={id}>
                  <CardContent className="flex-row items-center gap-4 pb-3 pt-3">
                    <RadioGroupItem value={id} accessibilityLabel={t(labelKey)} />
                    <Label onPress={() => setSelectedTool(id)} className="flex-1">
                      {t(labelKey)}
                    </Label>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </View>

          {/* Frequency */}
          <View className="gap-2">
            <Label>{t("plan.form.frequencyLabel")}</Label>
            <RadioGroup
              value={frequency}
              onValueChange={(v) => setFrequency(v as PlanFrequency)}
              className="gap-2"
            >
              {FREQUENCY_OPTIONS.map(({ id, labelKey }) => (
                <Card key={id}>
                  <CardContent className="flex-row items-center gap-4 pb-3 pt-3">
                    <RadioGroupItem value={id} accessibilityLabel={t(labelKey)} />
                    <Label onPress={() => setFrequency(id)} className="flex-1">
                      {t(labelKey)}
                    </Label>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          </View>

          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <View className="gap-3">
            <Button onPress={handleSave} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{mode === "create" ? t("plan.form.save") : t("plan.form.update")}</Text>
            </Button>
            <Button variant="ghost" onPress={() => router.back()}>
              <Text>{t("plan.form.cancel")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
