import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { useSelfCareLog, useUpsertSelfCareLog } from "@/src/features/self-care/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { BackButton } from "@/src/components/app/back-button";

interface FormState {
  sleepHours: string;
  sleepQuality: number | null;
  exerciseDone: boolean;
  exerciseMinutes: string;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
  gratitude: string[];
}

const emptyForm: FormState = {
  sleepHours: "",
  sleepQuality: null,
  exerciseDone: false,
  exerciseMinutes: "",
  exerciseType: "",
  mealsStructured: null,
  emotionalEating: false,
  socialConnectionMade: false,
  socialNotes: "",
  meaningfulActivity: "",
  gratitude: ["", "", ""],
};

export default function SelfCareScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: existing, isLoading } = useSelfCareLog(user?.id ?? null, today);
  const upsertMutation = useUpsertSelfCareLog(user?.id ?? null);

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (existing) {
      setForm({
        sleepHours: existing.sleepHours !== null ? String(existing.sleepHours) : "",
        sleepQuality: existing.sleepQuality,
        exerciseDone: existing.exerciseDone,
        exerciseMinutes: existing.exerciseMinutes !== null ? String(existing.exerciseMinutes) : "",
        exerciseType: existing.exerciseType,
        mealsStructured: existing.mealsStructured,
        emotionalEating: existing.emotionalEating,
        socialConnectionMade: existing.socialConnectionMade,
        socialNotes: existing.socialNotes,
        meaningfulActivity: existing.meaningfulActivity,
        gratitude:
          existing.gratitude.length >= 3
            ? existing.gratitude.slice(0, 3)
            : [...existing.gratitude, ...Array(3 - existing.gratitude.length).fill("")],
      });
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      const sleep = form.sleepHours.length > 0 ? parseFloat(form.sleepHours) : null;
      const minutes = form.exerciseMinutes.length > 0 ? parseInt(form.exerciseMinutes, 10) : null;
      await upsertMutation.mutateAsync({
        logDate: today,
        sleepHours: Number.isFinite(sleep ?? NaN) ? sleep : null,
        sleepQuality: form.sleepQuality,
        exerciseDone: form.exerciseDone,
        exerciseMinutes: Number.isFinite(minutes ?? NaN) ? minutes : null,
        exerciseType: form.exerciseType,
        mealsStructured: form.mealsStructured,
        emotionalEating: form.emotionalEating,
        socialConnectionMade: form.socialConnectionMade,
        socialNotes: form.socialNotes,
        meaningfulActivity: form.meaningfulActivity,
        gratitude: form.gratitude,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("selfCare.loading")} />
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
              <Text variant="h1">{t("selfCare.title")}</Text>
            </View>
            <Text variant="muted">{t("selfCare.description", { date: today })}</Text>
          </View>

          {/* Sleep */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selfCare.sleep")}</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label>{t("selfCare.sleepHours")}</Label>
                <Input
                  accessibilityLabel={t("selfCare.sleepHours")}
                  keyboardType="numeric"
                  onChangeText={(text) => setForm((p) => ({ ...p, sleepHours: text }))}
                  placeholder="7.5"
                  value={form.sleepHours}
                />
              </View>
              <View className="gap-2">
                <Label>{t("selfCare.sleepQuality")}</Label>
                <NumberRating
                  max={5}
                  value={form.sleepQuality}
                  onChange={(n) => setForm((p) => ({ ...p, sleepQuality: n }))}
                />
              </View>
            </CardContent>
          </Card>

          {/* Exercise */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selfCare.exercise")}</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center gap-3">
                <Checkbox
                  accessibilityLabel={t("selfCare.exerciseDone")}
                  checked={form.exerciseDone}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, exerciseDone: Boolean(c) }))}
                />
                <Label onPress={() => setForm((p) => ({ ...p, exerciseDone: !p.exerciseDone }))}>
                  {t("selfCare.exerciseDone")}
                </Label>
              </View>

              {form.exerciseDone ? (
                <>
                  <View className="gap-2">
                    <Label>{t("selfCare.exerciseMinutes")}</Label>
                    <Input
                      accessibilityLabel={t("selfCare.exerciseMinutes")}
                      keyboardType="numeric"
                      onChangeText={(text) => setForm((p) => ({ ...p, exerciseMinutes: text }))}
                      placeholder="30"
                      value={form.exerciseMinutes}
                    />
                  </View>
                  <View className="gap-2">
                    <Label>{t("selfCare.exerciseType")}</Label>
                    <Input
                      accessibilityLabel={t("selfCare.exerciseType")}
                      onChangeText={(text) => setForm((p) => ({ ...p, exerciseType: text }))}
                      placeholder={t("selfCare.exerciseTypePlaceholder")}
                      value={form.exerciseType}
                    />
                  </View>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Meals */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selfCare.meals")}</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="gap-2">
                <Label>{t("selfCare.mealsStructured")}</Label>
                <Text variant="muted">{t("selfCare.mealsStructuredHint")}</Text>
                <NumberRating
                  max={5}
                  value={form.mealsStructured}
                  onChange={(n) => setForm((p) => ({ ...p, mealsStructured: n }))}
                />
              </View>
              <View className="flex-row items-center gap-3">
                <Checkbox
                  accessibilityLabel={t("selfCare.emotionalEating")}
                  checked={form.emotionalEating}
                  onCheckedChange={(c) => setForm((p) => ({ ...p, emotionalEating: Boolean(c) }))}
                />
                <Label
                  onPress={() => setForm((p) => ({ ...p, emotionalEating: !p.emotionalEating }))}
                >
                  {t("selfCare.emotionalEating")}
                </Label>
              </View>
            </CardContent>
          </Card>

          {/* Social */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selfCare.social")}</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
              <View className="flex-row items-center gap-3">
                <Checkbox
                  accessibilityLabel={t("selfCare.socialConnection")}
                  checked={form.socialConnectionMade}
                  onCheckedChange={(c) =>
                    setForm((p) => ({ ...p, socialConnectionMade: Boolean(c) }))
                  }
                />
                <Label
                  onPress={() =>
                    setForm((p) => ({
                      ...p,
                      socialConnectionMade: !p.socialConnectionMade,
                    }))
                  }
                >
                  {t("selfCare.socialConnection")}
                </Label>
              </View>
              {form.socialConnectionMade ? (
                <View className="gap-2">
                  <Label>{t("selfCare.socialNotes")}</Label>
                  <Textarea
                    accessibilityLabel={t("selfCare.socialNotes")}
                    onChangeText={(text) => setForm((p) => ({ ...p, socialNotes: text }))}
                    placeholder={t("selfCare.socialNotesPlaceholder")}
                    value={form.socialNotes}
                  />
                </View>
              ) : null}
              <View className="gap-2">
                <Label>{t("selfCare.meaningfulActivity")}</Label>
                <Input
                  accessibilityLabel={t("selfCare.meaningfulActivity")}
                  onChangeText={(text) => setForm((p) => ({ ...p, meaningfulActivity: text }))}
                  placeholder={t("selfCare.meaningfulActivityPlaceholder")}
                  value={form.meaningfulActivity}
                />
              </View>
            </CardContent>
          </Card>

          {/* Gratitude */}
          <Card>
            <CardHeader>
              <CardTitle>{t("selfCare.gratitude")}</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              {form.gratitude.map((value, index) => (
                <View key={index} className="gap-1">
                  <Label>{t("selfCare.gratitudeItem", { n: index + 1 })}</Label>
                  <Input
                    accessibilityLabel={t("selfCare.gratitudeItem", { n: index + 1 })}
                    onChangeText={(text) => {
                      const next = [...form.gratitude];
                      next[index] = text;
                      setForm((p) => ({ ...p, gratitude: next }));
                    }}
                    placeholder={t("selfCare.gratitudePlaceholder")}
                    value={value}
                  />
                </View>
              ))}
            </CardContent>
          </Card>

          <Button disabled={upsertMutation.isPending} onPress={() => void handleSave()}>
            {upsertMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{existing ? t("selfCare.update") : t("selfCare.save")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
