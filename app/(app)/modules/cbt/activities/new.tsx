import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { MoodScale } from "@/src/components/app/mood-scale";
import { LoadingState } from "@/src/components/app/screen-state";
import { lifeDomains, type LifeDomain } from "@/src/constants/life-domains";
import { useActivity, useSaveActivity } from "@/src/features/activities/queries";
import { activityFormSchema, type ActivityFormSchema } from "@/src/features/activities/schemas";
import { isoToScheduleInput, scheduleInputToIso } from "@/src/features/activities/schedule-format";
import type { PACECategory } from "@/src/features/activities/types";
import { useSession } from "@/src/providers/session-provider";
import { useActivityDraftStore } from "@/src/stores/activity-draft-store";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

const defaultValues: ActivityFormSchema = {
  activityName: "",
  category: "pleasure",
  paceCategory: null,
  scheduledAt: null,
  moodBefore: null,
  notes: "",
};

export default function NewActivityScreen() {
  const { t } = useTranslation("cbt");
  const { activityId: rawActivityId, domain: rawDomain } = useLocalSearchParams<{
    activityId?: string;
    domain?: string;
  }>();
  const activityId =
    typeof rawActivityId === "string" && rawActivityId.length > 0 ? rawActivityId : null;
  const valueDomain =
    typeof rawDomain === "string" && lifeDomains.includes(rawDomain as LifeDomain)
      ? (rawDomain as LifeDomain)
      : null;
  const domainLabel = valueDomain ? t(`goals.domain.${valueDomain}`) : null;
  const valueLinkedDefaults = useMemo(
    () =>
      valueDomain && domainLabel
        ? {
            ...defaultValues,
            notes: t("activities.valuePrompt", { domain: domainLabel }),
          }
        : defaultValues,
    [domainLabel, t, valueDomain],
  );
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);

  const storedDraft = useActivityDraftStore((state) =>
    state.entityId === activityId ? state.values : null,
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
    defaultValues: storedDraft ?? valueLinkedDefaults,
    resolver: zodResolver(activityFormSchema),
  });

  const selectedCategory = watch("category");
  const selectedPaceCategory = watch("paceCategory");

  useEffect(() => {
    hydrateDraft(activityId);
  }, [activityId, hydrateDraft]);

  useEffect(() => {
    if (!existing || storedDraft) return;
    reset({
      activityName: existing.activityName,
      category: existing.category,
      paceCategory: existing.paceCategory,
      // Stored as an ISO instant; show it as local "YYYY-MM-DD HH:MM" in the field.
      scheduledAt: existing.scheduledAt ? isoToScheduleInput(existing.scheduledAt) : null,
      moodBefore: existing.moodBefore,
      notes: existing.notes,
    });
  }, [existing, reset, storedDraft]);

  useEffect(() => {
    if (activityId || existing || storedDraft || !valueDomain) return;
    reset(valueLinkedDefaults);
  }, [activityId, existing, reset, storedDraft, valueDomain, valueLinkedDefaults]);

  const handleSave = handleSubmit(async (values) => {
    setDraftValues(values);
    // Normalize the free-text "YYYY-MM-DD HH:MM" (local) to an ISO instant before saving.
    const scheduledIso = scheduleInputToIso(values.scheduledAt);
    if (values.scheduledAt && scheduledIso === null) {
      showToast({
        title: t("common:feedback.problem"),
        description: t("activities.scheduledAtInvalid"),
        tone: "error",
      });
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({
        input: { ...values, scheduledAt: scheduledIso },
        activityId: activityId ?? undefined,
      });
      resetDraft();
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace(`/modules/cbt/activities/${saved.id}` as Parameters<typeof router.replace>[0]);
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
          {isSubmitting || saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>
            {isSubmitting || saveMutation.isPending ? t("activities.saving") : t("activities.save")}
          </Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={activityId ? t("activities.editTitle") : t("activities.newTitle")} />
          <Text variant="muted">
            {activityId ? t("activities.editDescription") : t("activities.newDescription")}
          </Text>
          {domainLabel ? (
            <Text variant="muted">
              {t("activities.valueLinkedDescription", { domain: domainLabel })}
            </Text>
          ) : null}
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
          name="paceCategory"
          render={({ field: { onChange } }) => (
            <View className="gap-2">
              <Label>{t("activities.paceCategory")}</Label>
              <Text variant="muted">{t("activities.paceCategoryHint")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {(["physical", "achievement", "connection", "enjoyment"] as PACECategory[]).map(
                  (cat) => (
                    <Button
                      key={cat}
                      onPress={() => onChange(selectedPaceCategory === cat ? null : cat)}
                      variant={selectedPaceCategory === cat ? "default" : "outline"}
                      className="flex-1"
                    >
                      <Text>{t(`activities.pace.${cat}`)}</Text>
                    </Button>
                  ),
                )}
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
              <MoodScale value={value} onChange={onChange} />
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
