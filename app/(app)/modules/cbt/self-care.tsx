import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { useSelfCareLog, useUpsertSelfCareLog } from "@/src/features/self-care/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { useSelectedDate } from "@/src/stores/selected-date-store";
import { BackButton } from "@/src/components/app/back-button";
import { HelpButton } from "@/src/components/app/help-button";

interface FormState {
  exerciseDone: boolean;
  exerciseMinutes: string;
  exerciseType: string;
  mealsStructured: number | null;
  emotionalEating: boolean;
  socialConnectionMade: boolean;
  socialNotes: string;
  meaningfulActivity: string;
}

const emptyForm: FormState = {
  exerciseDone: false,
  exerciseMinutes: "",
  exerciseType: "",
  mealsStructured: null,
  emotionalEating: false,
  socialConnectionMade: false,
  socialNotes: "",
  meaningfulActivity: "",
};

export default function SelfCareScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { selectedDate } = useSelectedDate();
  const { data: existing, isLoading } = useSelfCareLog(user?.id ?? null, selectedDate);
  const upsertMutation = useUpsertSelfCareLog(user?.id ?? null);

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (existing) {
      setForm({
        exerciseDone: existing.exerciseDone,
        exerciseMinutes: existing.exerciseMinutes !== null ? String(existing.exerciseMinutes) : "",
        exerciseType: existing.exerciseType,
        mealsStructured: existing.mealsStructured,
        emotionalEating: existing.emotionalEating,
        socialConnectionMade: existing.socialConnectionMade,
        socialNotes: existing.socialNotes,
        meaningfulActivity: existing.meaningfulActivity,
      });
    } else {
      // No log for the selected day — clear the form so a previous day's
      // answers can't be carried over (and accidentally saved) onto this date.
      setForm(emptyForm);
    }
  }, [existing]);

  const handleSave = async () => {
    try {
      const minutes = form.exerciseMinutes.length > 0 ? parseInt(form.exerciseMinutes, 10) : null;
      await upsertMutation.mutateAsync({
        logDate: selectedDate,
        exerciseDone: form.exerciseDone,
        exerciseMinutes: Number.isFinite(minutes ?? NaN) ? minutes : null,
        exerciseType: form.exerciseType,
        mealsStructured: form.mealsStructured,
        emotionalEating: form.emotionalEating,
        socialConnectionMade: form.socialConnectionMade,
        socialNotes: form.socialNotes,
        meaningfulActivity: form.meaningfulActivity,
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
              <Text variant="h1" className="flex-1">
                {t("selfCare.title")}
              </Text>
              <HelpButton helpKey="selfCare" />
            </View>
            <Text variant="muted">{t("selfCare.description", { date: selectedDate })}</Text>
          </View>

          {/* Sleep link */}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("selfCare.sleepLinkTitle")}
            accessibilityHint={t("selfCare.sleepLinkDesc")}
            onPress={() => router.push("/tools/sleep")}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
          >
            <Icon name="bedtime" className="size-6 text-foreground" />
            <View className="flex-1">
              <Text className="text-sm font-semibold">{t("selfCare.sleepLinkTitle")}</Text>
              <Text variant="muted" className="text-xs">
                {t("selfCare.sleepLinkDesc")}
              </Text>
            </View>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Pressable>

          {/* Gratitude link */}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("selfCare.gratitudeLinkTitle")}
            accessibilityHint={t("selfCare.gratitudeLinkDesc")}
            onPress={() => router.push("/tools/gratitude-log")}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4 active:bg-accent/40"
          >
            <Icon name="favorite" className="size-6 text-foreground" />
            <View className="flex-1">
              <Text className="text-sm font-semibold">{t("selfCare.gratitudeLinkTitle")}</Text>
              <Text variant="muted" className="text-xs">
                {t("selfCare.gratitudeLinkDesc")}
              </Text>
            </View>
            <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
          </Pressable>

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

          <Button disabled={upsertMutation.isPending} onPress={() => void handleSave()}>
            {upsertMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{existing ? t("selfCare.update") : t("selfCare.save")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
