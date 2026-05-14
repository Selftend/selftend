import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";
import { NumberRating } from "@/src/components/number-rating";
import { LoadingState } from "@/src/components/screen-state";
import { useActivity, useSaveActivity } from "@/src/features/activities/queries";
import { activityFormSchema, type ActivityFormSchema } from "@/src/features/activities/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useActivityDraftStore } from "@/src/stores/activity-draft-store";
import { useToastStore } from "@/src/stores/toast-store";

const defaultValues: ActivityFormSchema = {
  activityName: "",
  category: "pleasure",
  scheduledAt: null,
  moodBefore: null,
  notes: "",
};

export default function NewActivityScreen() {
  const { t } = useTranslation("cbt");
  const { activityId: rawActivityId } = useLocalSearchParams<{ activityId?: string }>();
  const activityId = useMemo(
    () =>
      typeof rawActivityId === "string" && rawActivityId.length > 0 ? rawActivityId : null,
    [rawActivityId],
  );
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const storedDraft = useActivityDraftStore((state) =>
    state.activityId === activityId ? state.values : null,
  );
  const hydrateDraft = useActivityDraftStore((state) => state.hydrate);
  const resetDraft = useActivityDraftStore((state) => state.reset);
  const setDraftValues = useActivityDraftStore((state) => state.setValues);

  const { data: existing, isLoading } = useActivity(user?.id ?? null, activityId);
  const saveMutation = useSaveActivity(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    watch,
  } = useForm<ActivityFormSchema>({
    defaultValues: storedDraft ?? defaultValues,
    resolver: zodResolver(activityFormSchema),
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    hydrateDraft(activityId);
  }, [activityId, hydrateDraft]);

  useEffect(() => {
    if (!existing || storedDraft) return;
    reset({
      activityName: existing.activityName,
      category: existing.category,
      scheduledAt: existing.scheduledAt,
      moodBefore: existing.moodBefore,
      notes: existing.notes,
    });
  }, [existing, reset, storedDraft]);

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    try {
      const saved = await saveMutation.mutateAsync({
        input: values,
        activityId: activityId ?? undefined,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/cbt/activities/${saved.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("activities.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  if (activityId && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("activities.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <Button disabled={isSubmitting || saveMutation.isPending} onPress={() => void handleSave()}>
          {isSubmitting || saveMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : null}
          <Text>
            {isSubmitting || saveMutation.isPending
              ? t("activities.saving")
              : t("activities.save")}
          </Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <Text variant="h1">
            {activityId ? t("activities.editTitle") : t("activities.newTitle")}
          </Text>
          <Text variant="muted">
            {activityId ? t("activities.editDescription") : t("activities.newDescription")}
          </Text>
        </View>

        <Controller
          control={control}
          name="activityName"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("activities.nameLabel")}</Label>
              <Input
                accessibilityLabel={t("activities.nameLabel")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("activities.namePlaceholder")}
                value={value}
              />
              {errors.activityName?.message ? (
                <Text className="text-sm text-destructive">{errors.activityName.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange } }) => (
            <View className="gap-2">
              <Label>{t("activities.categoryLabel")}</Label>
              <Text variant="muted">{t("activities.categoryHint")}</Text>
              <View className="flex-row gap-3">
                {(["pleasure", "mastery"] as const).map((cat) => (
                  <View key={cat} className="flex-1">
                    <Button
                      onPress={() => onChange(cat)}
                      variant={selectedCategory === cat ? "default" : "outline"}
                    >
                      <Text>{t(`activities.category.${cat}`)}</Text>
                    </Button>
                  </View>
                ))}
              </View>
            </View>
          )}
        />

        <Controller
          control={control}
          name="scheduledAt"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("activities.scheduledAt")}</Label>
              <Text variant="muted">{t("activities.scheduledAtHint")}</Text>
              <Input
                accessibilityLabel={t("activities.scheduledAt")}
                onChangeText={(text) => onChange(text.length > 0 ? text : null)}
                placeholder="YYYY-MM-DD HH:MM"
                value={value ?? ""}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="moodBefore"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("activities.moodBefore")}</Label>
              <Text variant="muted">{t("activities.moodBeforeHint")}</Text>
              <NumberRating value={value} onChange={onChange} />
            </View>
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("activities.notes")}</Label>
              <Textarea
                accessibilityLabel={t("activities.notes")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("activities.notesPlaceholder")}
                value={value}
              />
            </View>
          )}
        />
      </View>
    </MobileFormScreen>
  );
}
