import { router, useLocalSearchParams } from "expo-router";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { distortionLookup } from "@/src/constants/distortions";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import { DetailRow } from "@/src/components/app/detail-row";
import { ErrorState, ScreenLoading } from "@/src/components/app/screen-state";
import { ChipRun, StaticChip } from "@/src/components/app/selectable-chip";
import { BeforeAfterPair } from "@/src/features/cbt/before-after-pair";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { getRecordTitle, getTitleThought } from "@/src/features/cbt/record-title";
import { resolveHotThought } from "@/src/features/cbt/thought-record-form";
import { useInlineWriteError } from "@/src/lib/use-inline-write-error";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatTimestamp } from "@/src/utils/date";
import { ScreenHeader } from "@/src/components/app/screen-header";

/**
 * A saved thought record, shown as a record of what the user wrote (#1384).
 *
 * Only FILLED rows render - a partial record reads short instead of listing
 * what it does not hold, so there is no "not filled" placeholder anywhere. A
 * record with nothing filled is a heading and a timestamp, which this screen
 * treats as a legitimate state, not an error.
 *
 * The belief pair leads because it is the point of the exercise; the pair
 * renders only when BOTH numbers exist (the completion screen's gate), and a
 * lone number falls back to a plain row so nothing the user rated goes
 * invisible. No sentence interprets any number (#1227): the pair already is
 * the observation, which is also why the old intensity-shift line is gone.
 *
 * The destructive action says "Delete", not "Archive": habits ships a real
 * archive with a Restore action, so the same word cannot mean *retrievable*
 * there and *gone forever* here (#1228). The mutation underneath still stamps
 * `archived_at` - vocabulary and component only.
 */
export default function ThoughtRecordDetailScreen() {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === "string" ? id : null;
  const { user } = useSession();
  const { data, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const archiveMutation = useArchiveThoughtRecord(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);
  const deleteError = useInlineWriteError(t("detail.deleteError"));

  // `DeleteEntryButton` keeps its confirmation OPEN when the delete rejects, so
  // the failure lands in the dialog's own error slot AND in the card below the
  // header, which is what survives once the dialog closes. The toast fires too:
  // on web it is visible immediately, and it costs nothing where a native modal
  // covers it (#1364).
  const handleDelete = async () => {
    if (!recordId) {
      return;
    }
    deleteError.onStart();
    try {
      await archiveMutation.mutateAsync(recordId);
    } catch (error) {
      deleteError.onError();
      showToast({
        title: t("detail.deleteProblem"),
        description: t("detail.deleteError"),
        tone: "error",
      });
      // Rethrown on purpose: `DeleteEntryButton` closes its confirmation only
      // when `onConfirm` RESOLVES, and a closed dialog has nowhere to show this.
      throw error;
    }
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/history" as Parameters<typeof router.replace>[0]);
  };

  if (isLoading) {
    return (
      <ScreenLoading title={t("detail.loading")} description={t("detail.loadingDescription")} />
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.notFound")} />
            <ErrorState
              title={t("detail.notFoundLabel")}
              description={t("detail.notFoundDescription")}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // The heading is the record's own words, through the same fallback chain the
  // history list uses. The headline thought is excluded from the thoughts row -
  // it already reads as the H1.
  const titleNat = getTitleThought(data.nats);
  const otherNats = data.nats.filter((nat) => nat !== titleNat && nat.text.trim());

  // The belief-before is the hot thought's own rating, exactly as the
  // completion screen and the module home's stat resolve it.
  const beliefBefore = resolveHotThought(data.nats)?.beliefRating ?? null;
  const showBeliefPair = beliefBefore !== null && data.beliefAfter !== null;
  const trimmedSituation = data.situation.trim();
  const trimmedBalanced = data.balancedThought.trim();
  const trimmedOutcome = data.outcomeNotes.trim();

  const renderEvidence = (label: string, items: string[]) =>
    items.length > 0 ? (
      <DetailRow label={label}>
        <View className="gap-1">
          {items.map((item, index) => (
            <Text key={`${item}-${index}`} className="text-sm leading-relaxed">
              - {item}
            </Text>
          ))}
        </View>
      </DetailRow>
    ) : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={getRecordTitle(data, t("history.untitledRecord"))} />
            <Text variant="muted">
              {t("detail.updated", { timestamp: formatTimestamp(data.updatedAt) })}
            </Text>
          </View>

          {deleteError.message ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("detail.deleteProblem")}</CardTitle>
                <CardDescription>{deleteError.message}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {showBeliefPair ? (
            <View className="py-2">
              <BeforeAfterPair
                beforeLabel={t("saved.beliefBefore")}
                beforeValue={beliefBefore}
                afterLabel={t("saved.beliefAfter")}
                afterValue={data.beliefAfter}
              />
            </View>
          ) : null}

          <View>
            {!showBeliefPair && (beliefBefore !== null || data.beliefAfter !== null) ? (
              <DetailRow label={t("record.beliefRating")}>
                <View className="gap-1">
                  {beliefBefore !== null ? (
                    <Text className="text-sm leading-relaxed">
                      {t("saved.beliefBefore")}: {beliefBefore}
                    </Text>
                  ) : null}
                  {data.beliefAfter !== null ? (
                    <Text className="text-sm leading-relaxed">
                      {t("saved.beliefAfter")}: {data.beliefAfter}
                    </Text>
                  ) : null}
                </View>
              </DetailRow>
            ) : null}

            {trimmedSituation ? (
              <DetailRow label={t("record.situation")}>
                <Text className="text-sm leading-relaxed">{trimmedSituation}</Text>
              </DetailRow>
            ) : null}

            {otherNats.length > 0 ? (
              <DetailRow label={t("record.nats")}>
                <View className="gap-3">
                  {otherNats.map((nat, index) => (
                    <View key={`${nat.text}-${index}`} className="gap-0.5">
                      <Text className="text-sm leading-relaxed">{nat.text}</Text>
                      {nat.beliefRating !== null ? (
                        <Text variant="muted" className="text-xs">
                          {t("record.beliefRating")}: {nat.beliefRating}%
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </DetailRow>
            ) : null}

            {data.emotions.length > 0 ? (
              <DetailRow label={t("record.emotions")}>
                <ChipRun>
                  {data.emotions.map((slug) => (
                    <StaticChip key={slug} label={t(`emotions.${slug}`, { defaultValue: slug })} />
                  ))}
                </ChipRun>
              </DetailRow>
            ) : null}

            {data.emotionIntensityBefore !== null || data.emotionIntensityAfter !== null ? (
              <DetailRow label={t("detail.intensity")}>
                <View className="gap-1">
                  {data.emotionIntensityBefore !== null ? (
                    <Text className="text-sm leading-relaxed">
                      {t("saved.intensityBefore")}: {data.emotionIntensityBefore}
                    </Text>
                  ) : null}
                  {data.emotionIntensityAfter !== null ? (
                    <Text className="text-sm leading-relaxed">
                      {t("saved.intensityAfter")}: {data.emotionIntensityAfter}
                    </Text>
                  ) : null}
                </View>
              </DetailRow>
            ) : null}

            {data.distortions.length > 0 ? (
              <DetailRow label={t("record.patterns")}>
                <ChipRun>
                  {data.distortions.map((distortionKey) => (
                    <StaticChip
                      key={distortionKey}
                      label={t(`distortions.${distortionKey}.title`, {
                        defaultValue: distortionLookup[distortionKey]?.title ?? distortionKey,
                      })}
                    />
                  ))}
                </ChipRun>
              </DetailRow>
            ) : null}

            {renderEvidence(t("record.evidenceFor"), data.evidenceFor)}
            {renderEvidence(t("record.evidenceAgainst"), data.evidenceAgainst)}

            {trimmedBalanced ? (
              <DetailRow label={t("record.balancedThought")}>
                <Text className="text-sm leading-relaxed">{trimmedBalanced}</Text>
              </DetailRow>
            ) : null}

            {trimmedOutcome ? (
              <DetailRow label={t("record.outcomeNotes")}>
                <Text className="text-sm leading-relaxed">{trimmedOutcome}</Text>
              </DetailRow>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              pushWithOrigin({
                pathname: "/tools/breathing/session",
                params: { pattern: "box-breathing" },
              })
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("breathing.nudgeTitle")}</CardTitle>
                <CardDescription>{t("breathing.nudgeDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Text className="text-primary text-sm font-medium">
                  {t("breathing.nudgeButton")} →
                </Text>
              </CardContent>
            </Card>
          </Pressable>
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background p-4">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              onPress={() =>
                pushWithOrigin({ pathname: "/modules/cbt/new", params: { recordId: data.id } })
              }
              variant="secondary"
            >
              <Text>{t("detail.editButton")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <DeleteEntryButton
              error={deleteError.message ?? undefined}
              label={t("common:delete")}
              title={t("detail.deleteConfirmTitle")}
              message={t("detail.deleteConfirmMessage")}
              onOpen={deleteError.onStart}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
