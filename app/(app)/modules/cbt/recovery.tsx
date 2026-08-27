import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { resolveActiveStrategyKeys } from "@/src/features/recovery/active-strategies";
import { ChallengeDraftEditor } from "@/src/features/recovery/components/challenge-draft-editor";
import { ChallengePlanList } from "@/src/features/recovery/components/challenge-plan-list";
import { PersonalSloganCard } from "@/src/features/recovery/components/personal-slogan-card";
import { RecoveryExportCard } from "@/src/features/recovery/components/recovery-export-card";
import { RecoverySaveFooter } from "@/src/features/recovery/components/recovery-save-footer";
import { RecoveryStatsCard } from "@/src/features/recovery/components/recovery-stats-card";
import { RecoveryTimelineCard } from "@/src/features/recovery/components/recovery-timeline-card";
import { StrategyNotesCard } from "@/src/features/recovery/components/strategy-notes-card";
import { StringListEditor } from "@/src/features/recovery/components/string-list-editor";
import { buildRecoveryPlanExport } from "@/src/features/recovery/export";
import { sanitizeRecoveryValues } from "@/src/features/recovery/form-values";
import { computeRecoveryStats } from "@/src/features/recovery/stats";
import { buildTimeline } from "@/src/features/recovery/timeline";
import { useChallengeEditor } from "@/src/features/recovery/use-challenge-editor";
import { useRecoveryExport } from "@/src/features/recovery/use-recovery-export";
import { useRecoveryPlanForm } from "@/src/features/recovery/use-recovery-plan-form";
import { useRecoverySources } from "@/src/features/recovery/use-recovery-sources";
import { useSession } from "@/src/providers/session-provider";

export default function RecoveryScreen() {
  const { t, i18n } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const {
    sources,
    preferences,
    recoveryPlan,
    isRecoveryLoading,
    challengePlans,
    upsertRecoveryMutation,
    saveChallengeMutation,
    deleteChallengeMutation,
  } = useRecoverySources(userId);

  const {
    control,
    getValues,
    isSubmitting,
    recoveryKeysField,
    maintenanceCommitmentsField,
    strategyIntegrationNotes,
    updateStrategyNote,
    handleSaveRecoveryPlan,
  } = useRecoveryPlanForm({ recoveryPlan, upsertRecoveryMutation });

  const {
    challengeDraft,
    startEditingChallenge,
    startNewChallenge,
    cancelChallenge,
    updateChallengeDescription,
    handleSaveChallenge,
    handleDeleteChallenge,
    updateCopingStep,
    addCopingStep,
    removeCopingStep,
  } = useChallengeEditor({
    getValues,
    upsertRecoveryMutation,
    saveChallengeMutation,
    deleteChallengeMutation,
  });

  const activeStrategyKeys = resolveActiveStrategyKeys(preferences, sources);

  const recoveryStats = computeRecoveryStats(sources);

  const timelineItems = buildTimeline(sources, recoveryPlan);

  const { isExporting, handleExportRecoveryPlan } = useRecoveryExport(() =>
    buildRecoveryPlanExport({
      challengePlans: challengePlans ?? [],
      lang: i18n.language,
      recoveryValues: sanitizeRecoveryValues(getValues()),
      stats: recoveryStats,
      t,
      timelineItems,
    }),
  );

  if (isRecoveryLoading) {
    return <ScreenLoading title={t("recovery.loading")} />;
  }

  return (
    <MobileFormScreen
      footer={
        <RecoverySaveFooter
          isSaving={isSubmitting || upsertRecoveryMutation.isPending}
          hasPlan={Boolean(recoveryPlan)}
          onSave={handleSaveRecoveryPlan}
        />
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("recovery.title")} />
          <Text variant="muted">{t("recovery.description")}</Text>
        </View>

        <RecoveryStatsCard stats={recoveryStats} />

        <RecoveryTimelineCard items={timelineItems} lang={i18n.language} />

        <RecoveryExportCard isExporting={isExporting} onExport={handleExportRecoveryPlan} />

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.recoveryKeys")}</CardTitle>
            <CardDescription>{t("recovery.recoveryKeysHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <StringListEditor
              label={t("recovery.recoveryKeys")}
              hint={t("recovery.recoveryKeysHint")}
              fieldName="recoveryKeys"
              items={recoveryKeysField.items}
              onUpdate={recoveryKeysField.update}
              onAppend={recoveryKeysField.append}
              onRemove={recoveryKeysField.remove}
              addLabel={t("recovery.addKey")}
              removeLabel={t("recovery.removeKey")}
              placeholder={t("recovery.keyPlaceholder")}
            />
          </CardContent>
        </Card>

        <PersonalSloganCard control={control} />

        <StrategyNotesCard
          strategyKeys={activeStrategyKeys}
          notes={strategyIntegrationNotes}
          onChangeNote={updateStrategyNote}
        />

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.challengePlans")}</CardTitle>
            <CardDescription>{t("recovery.challengePlansHint")}</CardDescription>
          </CardHeader>
          <CardContent className="gap-4">
            <ChallengePlanList
              plans={challengePlans ?? []}
              onEdit={startEditingChallenge}
              onDelete={handleDeleteChallenge}
              isDeleting={deleteChallengeMutation.isPending}
            />

            {challengeDraft ? (
              <ChallengeDraftEditor
                draft={challengeDraft}
                onChangeDescription={updateChallengeDescription}
                onUpdateCoping={updateCopingStep}
                onAddCoping={addCopingStep}
                onRemoveCoping={removeCopingStep}
                onSave={handleSaveChallenge}
                onCancel={cancelChallenge}
                isSaving={saveChallengeMutation.isPending || upsertRecoveryMutation.isPending}
              />
            ) : null}

            {!challengeDraft ? (
              <Button onPress={startNewChallenge} size="sm" variant="outline">
                <Text>{t("recovery.addChallenge")}</Text>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recovery.maintenanceCommitments")}</CardTitle>
            <CardDescription>{t("recovery.maintenanceCommitmentsHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <StringListEditor
              label={t("recovery.maintenanceCommitments")}
              hint={t("recovery.maintenanceCommitmentsHint")}
              fieldName="maintenanceCommitments"
              items={maintenanceCommitmentsField.items}
              onUpdate={maintenanceCommitmentsField.update}
              onAppend={maintenanceCommitmentsField.append}
              onRemove={maintenanceCommitmentsField.remove}
              addLabel={t("recovery.addCommitment")}
              removeLabel={t("recovery.removeCommitment")}
              placeholder={t("recovery.commitmentPlaceholder")}
            />
          </CardContent>
        </Card>
      </View>
    </MobileFormScreen>
  );
}
