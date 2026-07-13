import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { HelpButton } from "@/src/components/app/help-button";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { useThoughtRecordEditor } from "@/src/features/cbt/use-thought-record-editor";
import { BalancedThoughtStep } from "@/src/features/cbt/steps/balanced-thought-step";
import { DistortionsStep } from "@/src/features/cbt/steps/distortions-step";
import { EmotionsStep } from "@/src/features/cbt/steps/emotions-step";
import { EvidenceStep } from "@/src/features/cbt/steps/evidence-step";
import { HotThoughtStep } from "@/src/features/cbt/steps/hot-thought-step";
import { NatsStep } from "@/src/features/cbt/steps/nats-step";
import { OutcomeStep } from "@/src/features/cbt/steps/outcome-step";
import { SituationStep } from "@/src/features/cbt/steps/situation-step";

export default function ThoughtRecordEditorScreen() {
  const { t } = useTranslation("cbt");
  const { t: tc } = useTranslation("common");
  const [discardOpen, setDiscardOpen] = useState(false);
  const {
    form,
    errors,
    getValues,
    steps,
    currentStep,
    wizard,
    recordId,
    submitError,
    natsError,
    clearNatsError,
    intro,
    isBootLoading,
    handlePrimary,
  } = useThoughtRecordEditor();
  const { control } = form;

  if (isBootLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.loading")} description={t("detail.loadingDescription")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <WizardScreen
      title={recordId ? t("record.editTitle") : t("record.newTitle")}
      description={recordId ? t("record.editDescription") : t("record.newDescription")}
      titleAction={
        <View className="flex-row items-center gap-3">
          <AddToHomeButton widgetId="cbt-open-record" />
          <HelpButton helpKey="thoughtRecords" />
        </View>
      }
      steps={steps}
      stepIndex={wizard.stepIndex}
      numberedSteps
      onJumpToStep={wizard.goToStep}
      onBack={wizard.previousStep}
      onPrimary={() => void handlePrimary()}
      primaryLabel={wizard.isLastStep ? t("record.saveRecord") : t("record.continue")}
      pendingLabel={t("record.saving")}
      backLabel={t("record.back")}
      discardLabel={tc("draft.discardAction")}
      onDiscard={() => setDiscardOpen(true)}
      isPending={wizard.isPending}
      headerSlot={
        <>
          <CrisisSupportBar />
          {submitError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("record.saveProblem")}</CardTitle>
                <CardDescription>{submitError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </>
      }
    >
      {currentStep.key === "situation" ? (
        <SituationStep
          control={control}
          errors={errors}
          showIntro={!recordId && intro.hydrated && !intro.dismissed}
          onDismissIntro={intro.dismiss}
        />
      ) : null}

      {currentStep.key === "nats" ? (
        <NatsStep
          control={control}
          errors={errors}
          natsError={natsError}
          onClearNatsError={clearNatsError}
        />
      ) : null}

      {currentStep.key === "hotThought" ? <HotThoughtStep control={control} /> : null}

      {currentStep.key === "emotions" ? <EmotionsStep control={control} errors={errors} /> : null}

      {currentStep.key === "evidence" ? <EvidenceStep control={control} errors={errors} /> : null}

      {currentStep.key === "distortions" ? (
        <DistortionsStep control={control} errors={errors} />
      ) : null}

      {currentStep.key === "balancedThought" ? (
        <BalancedThoughtStep control={control} errors={errors} getValues={getValues} />
      ) : null}

      {currentStep.key === "outcome" ? <OutcomeStep control={control} errors={errors} /> : null}

      <ConfirmDialog
        visible={discardOpen}
        isPending={false}
        title={tc("draft.discardTitle")}
        message={tc("draft.discardMessage")}
        confirmLabel={tc("draft.discardConfirm")}
        cancelLabel={tc("cancel")}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          wizard.clearDraft();
          setDiscardOpen(false);
          router.back();
        }}
      />
    </WizardScreen>
  );
}
