import { useState } from "react";
import { useWatch } from "react-hook-form";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { HelpButton } from "@/src/components/app/help-button";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { backWithFallback } from "@/src/lib/back-with-fallback";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { useThoughtRecordEditor } from "@/src/features/cbt/use-thought-record-editor";
import {
  filledThoughtRecordParts,
  THOUGHT_RECORD_PARTS,
} from "@/src/features/cbt/thought-record-steps";
import { BalancedThoughtStep } from "@/src/features/cbt/steps/balanced-thought-step";
import { DistortionsStep } from "@/src/features/cbt/steps/distortions-step";
import { EmotionsStep } from "@/src/features/cbt/steps/emotions-step";
import { EvidenceStep } from "@/src/features/cbt/steps/evidence-step";
import { HotThoughtStep } from "@/src/features/cbt/steps/hot-thought-step";
import { NatsStep } from "@/src/features/cbt/steps/nats-step";
import { OutcomeStep } from "@/src/features/cbt/steps/outcome-step";
import { SituationStep } from "@/src/features/cbt/steps/situation-step";

/**
 * The thought record, as ONE SCROLLING COLUMN (#1381).
 *
 * This screen used to be an eight-step wizard that validated every step
 * transition and hid how much was left behind a bare counter. It is now a
 * column with a sticky, read-only rail that NAMES its six parts - Situation,
 * Thoughts, Feelings, Patterns, Evidence, Balanced - so a user can see the
 * whole of what is being asked before answering any of it, answer the last
 * part first, and save a partial record: an unfinished thought is still worth
 * keeping.
 *
 * Patterns sit BEFORE evidence, unlike the wizard: naming the pattern is what
 * makes the evidence findable. Nothing the wizard captured is dropped - the
 * NATs list, the hot-thought choice, both emotion intensities, the belief
 * re-rating and the outcome notes all remain, grouped under the six stops.
 *
 * The only validation left at the gate is "at least one thought", enforced at
 * save with an inline message and focus - never a disabled button (the length
 * caps still complain inline through the resolver, also at save).
 */
export default function ThoughtRecordEditorScreen() {
  const { t } = useTranslation("cbt");
  const { t: tc } = useTranslation("common");
  const [discardOpen, setDiscardOpen] = useState(false);
  const {
    form,
    errors,
    recordId,
    submitError,
    natsError,
    clearNatsError,
    natsInputRef,
    intro,
    isBootLoading,
    isPending,
    clearDraft,
    handleSave,
  } = useThoughtRecordEditor();
  const { control } = form;

  // The rail derives from LIVE form values, not the debounced draft capture -
  // a segment that lights a beat after typing would read as broken. Watched as
  // named fields so each arrives with its own type.
  const [
    situation,
    nats,
    emotions,
    emotionIntensityBefore,
    distortions,
    evidenceFor,
    evidenceAgainst,
    balancedThought,
    beliefAfter,
    emotionIntensityAfter,
    outcomeNotes,
  ] = useWatch({
    control,
    name: [
      "situation",
      "nats",
      "emotions",
      "emotionIntensityBefore",
      "distortions",
      "evidenceFor",
      "evidenceAgainst",
      "balancedThought",
      "beliefAfter",
      "emotionIntensityAfter",
      "outcomeNotes",
    ],
  });
  const filled = filledThoughtRecordParts({
    situation,
    nats,
    emotions,
    emotionIntensityBefore,
    distortions,
    evidenceFor,
    evidenceAgainst,
    balancedThought,
    beliefAfter,
    emotionIntensityAfter,
    outcomeNotes,
  });
  const filledCount = THOUGHT_RECORD_PARTS.filter((part) => filled[part]).length;
  const stops = THOUGHT_RECORD_PARTS.map((part) => ({
    label: t(`record.parts.${part}`),
    filled: filled[part],
  }));

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
    <MobileFormScreen
      stickyHeader={
        <ProgressSegments
          stops={stops}
          // Counted, not interpolated flat: Bulgarian agrees the verb with the
          // number, so a single string is wrong at exactly one value (#1380).
          note={t("record.railNote", {
            count: filledCount,
            total: THOUGHT_RECORD_PARTS.length,
          })}
        />
      }
      footer={
        <View className="gap-2">
          <Button disabled={isPending} onPress={() => setDiscardOpen(true)} variant="ghost">
            <Text className="text-destructive">{tc("draft.discardAction")}</Text>
          </Button>
          <View className="flex-row gap-3">
            <View className="flex-1">
              {/*
               * A labelled exit over the autosave that is already happening -
               * every keystroke lands in the persisted draft store - not a new
               * mechanism. backWithFallback because a deep-linked/refreshed
               * page has no back stack, and a button that no-ops there reads
               * as broken (#475).
               */}
              <Button
                disabled={isPending}
                onPress={() => backWithFallback("/modules/cbt")}
                variant="ghost"
              >
                <Text>{t("record.finishLater")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button disabled={isPending} onPress={() => void handleSave()}>
                <SubmitButtonContent
                  pending={isPending}
                  idleLabel={t("record.saveRecord")}
                  pendingLabel={t("record.saving")}
                />
              </Button>
            </View>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader
            title={recordId ? t("record.editTitle") : t("record.newTitle")}
            right={
              <View className="flex-row items-center gap-3">
                <AddToHomeButton widgetId="cbt-open-record" />
                <HelpButton helpKey="thoughtRecords" />
              </View>
            }
          />
          <Text variant="muted">
            {recordId ? t("record.editDescription") : t("record.newDescription")}
          </Text>
        </View>

        <CrisisSupportBar />

        {submitError ? (
          <Card {...politeLiveRegionProps()}>
            <CardHeader>
              <CardTitle>{t("record.saveProblem")}</CardTitle>
              <CardDescription>{submitError}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        <ConfirmDialog
          visible={discardOpen}
          isPending={false}
          title={tc("draft.discardTitle")}
          message={tc("draft.discardMessage")}
          confirmLabel={tc("draft.discardConfirm")}
          cancelLabel={tc("cancel")}
          onCancel={() => setDiscardOpen(false)}
          onConfirm={() => {
            clearDraft();
            setDiscardOpen(false);
            // Deep-linked/refreshed pages have no back stack - router.back()
            // alone no-ops there and the discarded form just sits on screen,
            // reading as if discard failed (#475).
            backWithFallback("/modules/cbt");
          }}
        />

        {/* Part 1: Situation */}
        <SituationStep
          control={control}
          errors={errors}
          showIntro={!recordId && intro.hydrated && !intro.dismissed}
          onDismissIntro={intro.dismiss}
        />

        {/* Part 2: Thoughts - the NATs list, and the hot-thought choice once
            there are two to choose between */}
        <NatsStep
          control={control}
          errors={errors}
          natsError={natsError}
          onClearNatsError={clearNatsError}
          inputRef={natsInputRef}
        />
        <HotThoughtStep control={control} />

        {/* Part 3: Feelings */}
        <EmotionsStep control={control} errors={errors} />

        {/* Part 4: Patterns - BEFORE evidence: naming the pattern is what
            makes the evidence findable (#1224) */}
        <DistortionsStep control={control} errors={errors} />

        {/* Part 5: Evidence */}
        <EvidenceStep control={control} errors={errors} />

        {/* Part 6: Balanced - the balanced thought, the hot thought re-rated,
            intensity after, and outcome notes */}
        <BalancedThoughtStep control={control} errors={errors} />
        <OutcomeStep control={control} errors={errors} />
      </View>
    </MobileFormScreen>
  );
}
