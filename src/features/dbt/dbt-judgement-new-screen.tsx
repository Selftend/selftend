import { useRef, useState } from "react";
import { ScrollView, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { cn } from "@/lib/utils";
import { useSaveJudgement } from "@/src/features/dbt/queries";
import type { JudgementValence } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/judgements/new` - a quick capture: three fields, one tap to
 * save (spec §3.2.2).
 *
 * Short on purpose. A judgement is caught in the second it happens, and a form
 * that takes a minute is a form that catches nothing - which is why this one
 * keeps no draft, has no steps and needs only its first field.
 *
 * **The mark folds the beginner's-mind record in.** A glowing judgement is a
 * trap in the same way a harsh one is - it sets up the fall when the person or
 * the plan turns out to be ordinary - so *Positive* is a valence on the same
 * record rather than a second tool.
 *
 * **No _where_ field.** The book keeps one to spot patterns across places, and
 * this module builds no pattern view (decision 7). A location column with
 * nothing reading it is a health fact stored for its own sake (S3).
 *
 * ⚠️ UI spelling is **Judgement**, everywhere, in every locale's English.
 */
export default function DbtJudgementNewScreen() {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveJudgement(user?.id ?? null);

  const [judgement, setJudgement] = useState("");
  const [restatement, setRestatement] = useState("");
  const [valence, setValence] = useState<JudgementValence>("negative");
  const [error, setError] = useState<string | null>(null);
  const judgementRef = useRef<TextInput>(null);

  const save = useSingleFlight(async () => {
    if (!judgement.trim()) {
      setError(t("judgements.errors.judgement"));
      judgementRef.current?.focus();
      return;
    }
    try {
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        judgement,
        restatement,
        valence,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
      showToast({ title: t("judgements.saved"), description: judgement.trim(), tone: "success" });
      router.replace("/modules/dbt/judgements");
    } catch {
      showToast({ title: t("judgements.saveError"), tone: "error" });
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar leading="close" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "grow gap-6")}>
          <View className="gap-2">
            <Text variant="h1" className="text-[24px] font-bold leading-tight tracking-tight">
              {t("judgements.newTitle")}
            </Text>
            <Text variant="muted">{t("judgements.newDescription")}</Text>
          </View>

          <CrisisSupportBar />

          <View className="gap-2">
            <Label>{t("judgements.judgementLabel")}</Label>
            <Text variant="muted" className="text-[12.5px]">
              {t("judgements.judgementHint")}
            </Text>
            <Textarea
              ref={judgementRef}
              value={judgement}
              onChangeText={(value) => {
                setError(null);
                setJudgement(value);
              }}
              accessibilityLabel={t("judgements.judgementLabel")}
              maxLength={300}
            />
          </View>

          <View className="gap-2">
            <Label>{t("judgements.markLabel")}</Label>
            <SegmentedControl
              accessibilityLabel={t("judgements.markLabel")}
              value={valence}
              onChange={setValence}
              options={[
                { value: "negative", label: t("judgements.valence.negative") },
                { value: "positive", label: t("judgements.valence.positive") },
              ]}
            />
            <Text variant="muted" className="text-[12.5px]">
              {t("judgements.markHint")}
            </Text>
          </View>

          <View className="gap-2">
            <Label>{t("judgements.restatementLabel")}</Label>
            <Text variant="muted" className="text-[12.5px]">
              {t("judgements.restatementHint")}
            </Text>
            <Textarea
              value={restatement}
              onChangeText={setRestatement}
              accessibilityLabel={t("judgements.restatementLabel")}
              maxLength={300}
            />
          </View>

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}

          <View className="grow" />

          <Button disabled={saveMutation.isPending} onPress={() => void save()}>
            <SubmitButtonContent
              pending={saveMutation.isPending}
              idleLabel={t("judgements.save")}
              pendingLabel={t("judgements.saving")}
            />
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
