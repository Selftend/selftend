import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useAngerLogs, useSaveAngerLog } from "@/src/features/anger/queries";
import { angerLogFormSchema, type AngerLogFormSchema } from "@/src/features/anger/schemas";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

const defaultValues: AngerLogFormSchema = {
  triggerText: "",
  interpretation: "",
  arousalLevel: 5,
  urge: "",
  behaviorChosen: "",
  consequence: "",
  timeOutTaken: false,
  alternativeInterpretation: "",
  outcomeRating: null,
  notes: "",
};

export default function NewAngerLogScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { selectedDate } = useSelectedDate();
  const { data: existingLogs } = useAngerLogs(user?.id ?? null);
  const isFirstTime = (existingLogs?.length ?? 0) === 0;
  const saveMutation = useSaveAngerLog(user?.id ?? null);

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
    watch,
  } = useForm<AngerLogFormSchema>({
    defaultValues,
    resolver: zodResolver(angerLogFormSchema),
  });

  const arousal = watch("arousalLevel");
  const outcome = watch("outcomeRating");
  const timeOut = watch("timeOutTaken");

  const handleSave = handleSubmit(async (values) => {
    try {
      await saveMutation.mutateAsync({
        ...values,
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/modules/cbt/anger" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("anger.saveError");
      showToast({ title: t("common:feedback.problem"), description: message, tone: "error" });
    }
  });

  return (
    <MobileFormScreen
      footer={
        <Button disabled={isSubmitting || saveMutation.isPending} onPress={() => void handleSave()}>
          {isSubmitting || saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>
            {isSubmitting || saveMutation.isPending ? t("anger.saving") : t("anger.save")}
          </Text>
        </Button>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("anger.newTitle")} />
          <Text variant="muted">{t("anger.newDescription")}</Text>
        </View>

        {isFirstTime ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("anger.psychoeducationTitle")}</CardTitle>
              <CardDescription>{t("anger.psychoeducationDescription")}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <Controller
          control={control}
          name="triggerText"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.trigger")}</Label>
              <Text variant="muted">{t("anger.triggerHint")}</Text>
              <Textarea
                accessibilityLabel={t("anger.trigger")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.triggerPlaceholder")}
                value={value}
              />
              {errors.triggerText?.message ? (
                <Text className="text-sm text-destructive">{errors.triggerText.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="interpretation"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.interpretation")}</Label>
              <Text variant="muted">{t("anger.interpretationHint")}</Text>
              <Textarea
                accessibilityLabel={t("anger.interpretation")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.interpretationPlaceholder")}
                value={value}
              />
            </View>
          )}
        />

        <View className="gap-2">
          <Label>{t("anger.arousalLevel")}</Label>
          <Text variant="muted">{t("anger.arousalLevelHint")}</Text>
          <NumberRating value={arousal} onChange={(n) => setValue("arousalLevel", n)} />
        </View>

        <Controller
          control={control}
          name="urge"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.urge")}</Label>
              <Text variant="muted">{t("anger.urgeHint")}</Text>
              <Input
                accessibilityLabel={t("anger.urge")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.urgePlaceholder")}
                value={value}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="behaviorChosen"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.behaviorChosen")}</Label>
              <Text variant="muted">{t("anger.behaviorChosenHint")}</Text>
              <Input
                accessibilityLabel={t("anger.behaviorChosen")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.behaviorChosenPlaceholder")}
                value={value}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="consequence"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.consequence")}</Label>
              <Text variant="muted">{t("anger.consequenceHint")}</Text>
              <Input
                accessibilityLabel={t("anger.consequence")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.consequencePlaceholder")}
                value={value}
              />
            </View>
          )}
        />

        <View className="flex-row items-center gap-3">
          <Checkbox
            accessibilityLabel={t("anger.timeOutTaken")}
            checked={timeOut}
            onCheckedChange={(checked) => setValue("timeOutTaken", Boolean(checked))}
          />
          <Label onPress={() => setValue("timeOutTaken", !timeOut)}>
            {t("anger.timeOutTaken")}
          </Label>
        </View>

        <Controller
          control={control}
          name="alternativeInterpretation"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.alternativeInterpretation")}</Label>
              <Text variant="muted">{t("anger.alternativeInterpretationHint")}</Text>
              <Textarea
                accessibilityLabel={t("anger.alternativeInterpretation")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.alternativeInterpretationPlaceholder")}
                value={value}
              />
            </View>
          )}
        />

        <View className="gap-2">
          <Label>{t("anger.outcomeRating")}</Label>
          <Text variant="muted">{t("anger.outcomeRatingHint")}</Text>
          <NumberRating value={outcome} onChange={(n) => setValue("outcomeRating", n)} />
        </View>

        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("anger.notes")}</Label>
              <Textarea
                accessibilityLabel={t("anger.notes")}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("anger.notesPlaceholder")}
                value={value}
              />
            </View>
          )}
        />
      </View>
    </MobileFormScreen>
  );
}
