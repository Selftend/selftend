import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ScreenHeader } from "@/src/components/app/screen-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { useUpsertValueEntry, useValueEntryByDomain } from "@/src/features/act/queries";
import { StepPills } from "@/src/features/act/step-pills";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * ☠️ The last step used to be "ratings", plural, and asked TWO questions: how
 * important this domain is, and how aligned the user's life is with it. The second one
 * is the check-in's question, asked and answered on the values screen with a history
 * behind it - this form wrote a rival answer into a second column that the values row
 * then preferred, so saving a check-in left the number above it unmoved (#1379). The
 * alignment control is gone; `current_alignment_rating` stays on the table, read only
 * where a domain has no check-in, and is no longer written from here.
 */
type Step = "value" | "current" | "desired" | "barriers" | "importance";
const STEP_ORDER: Step[] = ["value", "current", "desired", "barriers", "importance"];

export default function ActValueDomainScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const { domain: rawDomain } = useLocalSearchParams<{ domain: string }>();
  const domain = ACT_LIFE_DOMAINS.includes(rawDomain as ACTLifeDomain)
    ? (rawDomain as ACTLifeDomain)
    : null;

  const { data: existing, isLoading } = useValueEntryByDomain(user?.id ?? null, domain);
  const upsertMutation = useUpsertValueEntry(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [step, setStep] = useState<Step>("value");
  const [valueStatement, setValueStatement] = useState("");
  const [currentActionsNote, setCurrentActionsNote] = useState("");
  const [desiredActionsNote, setDesiredActionsNote] = useState("");
  const [barriers, setBarriers] = useState("");
  const [importanceRating, setImportanceRating] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  // Prefill exactly once from the loaded entry (render-time adjustment);
  // later refetches must not clobber in-progress edits.
  if (existing && !prefilled) {
    setValueStatement(existing.valueStatement ?? "");
    setCurrentActionsNote(existing.currentActionsNote ?? "");
    setDesiredActionsNote(existing.desiredActionsNote ?? "");
    setBarriers(existing.barriers ?? "");
    setImportanceRating(existing.importanceRating ?? null);
    setPrefilled(true);
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  }

  // Deliberately NOT wrapped in useSingleFlight: upsertValueEntry merges on the
  // (user_id, life_domain) unique index, so a rapid double-press is idempotent.
  async function handleSave() {
    if (!user || !domain) return;
    setSubmitError("");
    try {
      await upsertMutation.mutateAsync({
        lifeDomain: domain,
        valueStatement: valueStatement.trim(),
        currentActionsNote: currentActionsNote.trim(),
        desiredActionsNote: desiredActionsNote.trim(),
        barriers: barriers.trim(),
        importanceRating,
        // `currentAlignmentRating` is deliberately absent, not null: the repository
        // only writes the keys it is given, so omitting it leaves whatever this domain
        // already had intact rather than blanking a number the row may still read.
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.back();
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setSubmitError(t("act:values.saveProblem"));
    }
  }

  if (!domain) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text variant="muted">{t("act:values.saveProblem")}</Text>
      </SafeAreaView>
    );
  }

  if (isLoading && !prefilled) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <LoadingState title={t(`act:values.${domain}`)} />
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          {stepIndex > 0 ? (
            <View className="flex-1">
              <Button onPress={goBack} variant="ghost">
                <Text>{t("act:values.back")}</Text>
              </Button>
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              disabled={upsertMutation.isPending}
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {upsertMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {upsertMutation.isPending
                  ? t("act:values.saving")
                  : isLastStep
                    ? t("act:values.saveLog")
                    : t("act:values.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t(`act:values.${domain}`)} />
          <Text variant="muted">{t("act:values.domainSubtitle")}</Text>
        </View>

        <CrisisSupportBar />

        {/* Step pills */}
        <StepPills
          steps={STEP_ORDER}
          current={step}
          onSelect={setStep}
          getLabel={(s) => t(`act:values.steps.${s}`)}
        />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:values.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Value statement */}
        {step === "value" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.valueStatementLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.valueStatementHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.valueStatementLabel")}
              onChangeText={setValueStatement}
              placeholder={t("act:values.valueStatementPlaceholder")}
              value={valueStatement}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 2: Current actions */}
        {step === "current" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.currentActionsLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.currentActionsHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.currentActionsLabel")}
              onChangeText={setCurrentActionsNote}
              placeholder={t("act:values.currentActionsPlaceholder")}
              value={currentActionsNote}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 3: Desired actions */}
        {step === "desired" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.desiredActionsLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.desiredActionsHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.desiredActionsLabel")}
              onChangeText={setDesiredActionsNote}
              placeholder={t("act:values.desiredActionsPlaceholder")}
              value={desiredActionsNote}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 4: Barriers */}
        {step === "barriers" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.barriersLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.barriersHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:values.barriersLabel")}
              onChangeText={setBarriers}
              placeholder={t("act:values.barriersPlaceholder")}
              value={barriers}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 5: Importance */}
        {step === "importance" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:values.importanceRatingLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:values.importanceRatingHint")}
              </Text>
            </View>
            <NumberRating
              min={1}
              max={10}
              step={1}
              value={importanceRating}
              onChange={setImportanceRating}
            />
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
