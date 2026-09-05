import { useEffect, useMemo, useRef, useState } from "react";
import { View, type TextInput } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import { backWithFallback } from "@/src/lib/back-with-fallback";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import {
  EMOTION_RECORD_PARTS,
  emptyEmotionRecordValues,
  filledEmotionRecordParts,
  type EmotionRecordPart,
  type EmotionRecordPartValues,
} from "@/src/features/dbt/emotion-record-parts";
import { useSaveEmotionRecord } from "@/src/features/dbt/queries";
import { selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { useDbtEmotionRecordDraftStore } from "@/src/stores/dbt-emotion-record-draft-store";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/emotions/new` - one feeling, walked from what happened to what
 * came after (spec §3.3.1, design `1c`).
 *
 * ☠️ **A column, not a wizard.** A person recalling an episode does not recall
 * it in order - the part they can answer first is often what they did, or how
 * it landed afterwards. Every part is on screen at once, fillable in any order,
 * and validated only at save. The thought record learned this (#1381) and this
 * form inherits its rail.
 *
 * ☠️ **No rating of any kind.** No intensity, no before-and-after, nothing that
 * yields a number - because nothing in the app would read one, and a number
 * nobody reads is a score the person is invited to compare themselves against.
 * No portrait fields either: the book's "what shape, what sound, how strong"
 * belongs to a once-only journal exercise, not to a record kept over weeks.
 *
 * The cap line sits under the crisis bar as plain copy - *If right now feels
 * too heavy, this can wait* - with no gate and no question behind it (S2).
 *
 * It keeps a **persisted draft**, unlike the wise mind check-in and unlike the
 * sessions: this is a form written over minutes, so losing it to an
 * interruption is the trap. Sign-out clears it from memory and from disk.
 */
export default function DbtEmotionRecordNewScreen() {
  const { t } = useTranslation("dbt");
  // ☠️ Subscribed by SELECTOR, never as a whole store. Reading the store object
  // itself gives a new identity on every write, so an effect keyed on it would
  // re-run after every keystroke - and a hydrate effect keyed that way loops
  // forever. Store actions are defined once, so their references are stable.
  const draftHydrated = useDbtEmotionRecordDraftStore((state) => state.hydrated);
  const storedValues = useDbtEmotionRecordDraftStore(
    selectWizardDraftValues<EmotionRecordPartValues>("create", null),
  );
  const hydrateDraft = useDbtEmotionRecordDraftStore((state) => state.hydrate);

  useEffect(() => {
    hydrateDraft("create");
  }, [hydrateDraft]);

  // ☠️ The form does not mount until the persisted draft has been read back.
  // Seeding it afterwards would mean writing state from an effect, which both
  // the lint rule and the thought record's own shape forbid - and it would let
  // one render happen with the wrong values, which is what a person typing
  // into a half-restored form would experience as their words disappearing.
  if (!draftHydrated) return <ScreenLoading title={t("emotions.newTitle")} />;

  return <EmotionRecordForm initialValues={storedValues ?? emptyEmotionRecordValues()} />;
}

function EmotionRecordForm({ initialValues }: { initialValues: EmotionRecordPartValues }) {
  const { t } = useTranslation("dbt");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveEmotionRecord(user?.id ?? null);

  const setDraftValues = useDbtEmotionRecordDraftStore((state) => state.setValues);
  const resetDraft = useDbtEmotionRecordDraftStore((state) => state.reset);
  const clearPersistedDraft = useDbtEmotionRecordDraftStore((state) => state.clearPersisted);

  const [values, setValues] = useState<EmotionRecordPartValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const whatHappenedRef = useRef<TextInput>(null);

  function update(patch: Partial<EmotionRecordPartValues>) {
    setError(null);
    setValues((prev) => {
      const next = { ...prev, ...patch };
      setDraftValues(next);
      return next;
    });
  }

  const filled = useMemo(() => filledEmotionRecordParts(values), [values]);
  const filledCount = EMOTION_RECORD_PARTS.filter((part) => filled[part]).length;
  const stops = EMOTION_RECORD_PARTS.map((part) => ({
    label: t(`emotions.parts.${part}`),
    filled: filled[part],
  }));

  const save = useSingleFlight(async () => {
    if (!values.whatHappened.trim()) {
      setError(t("emotions.errors.whatHappened"));
      whatHappenedRef.current?.focus();
      return;
    }
    if (values.primaryEmotions.length === 0) {
      setError(t("emotions.errors.primary"));
      return;
    }
    try {
      // The instant and its offset come from ONE call, so they cannot describe
      // two different moments across a clock change.
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        whatHappened: values.whatHappened,
        meaning: values.meaning,
        primaryEmotions: values.primaryEmotions,
        secondaryEmotions: values.secondaryEmotions,
        bodySensations: values.bodySensations,
        urges: values.urges,
        didAndSaid: values.didAndSaid,
        afterwards: values.afterwards,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
      resetDraft();
      clearPersistedDraft();
      showToast({
        // The save states the record and stops - the first line of what
        // happened, and nothing about streaks, totals or coming back.
        title: t("emotions.saved"),
        description: values.whatHappened.trim().split("\n")[0],
        tone: "success",
      });
      router.replace("/modules/dbt/emotions");
    } catch {
      showToast({ title: t("emotions.saveError"), tone: "error" });
    }
  });

  function discard() {
    resetDraft();
    clearPersistedDraft();
    setValues(emptyEmotionRecordValues());
    setDiscardOpen(false);
    backWithFallback("/modules/dbt/emotions");
  }

  return (
    <>
      <ConfirmDialog
        visible={discardOpen}
        isPending={saveMutation.isPending}
        title={tc("draft.discardTitle")}
        message={tc("draft.discardMessage")}
        confirmLabel={tc("draft.discardAction")}
        cancelLabel={tc("draft.keepAction")}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={discard}
      />
      <MobileFormScreen
        stickyHeader={
          <ProgressSegments
            stops={stops}
            // Counted, not interpolated flat: Bulgarian agrees the verb with
            // the number, so one string is wrong at exactly one value (#1380).
            note={t("emotions.railNote", {
              count: filledCount,
              total: EMOTION_RECORD_PARTS.length,
            })}
          />
        }
        footer={
          <View className="gap-2">
            <Button
              disabled={saveMutation.isPending}
              onPress={() => setDiscardOpen(true)}
              variant="ghost"
            >
              <Text className="text-destructive">{tc("draft.discardAction")}</Text>
            </Button>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  disabled={saveMutation.isPending}
                  onPress={() => backWithFallback("/modules/dbt/emotions")}
                  variant="ghost"
                >
                  <Text>{t("emotions.finishLater")}</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button disabled={saveMutation.isPending} onPress={() => void save()}>
                  <SubmitButtonContent
                    pending={saveMutation.isPending}
                    idleLabel={t("emotions.save")}
                    pendingLabel={t("emotions.saving")}
                  />
                </Button>
              </View>
            </View>
          </View>
        }
      >
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("emotions.newTitle")} />
            <Text variant="muted">{t("emotions.newDescription")}</Text>
          </View>

          <CrisisSupportBar />

          {/* Plain copy directly beneath the bar. Not a gate, not a question,
              not a branch on anything the person has entered (S2) - the book's
              "wait if overwhelmingly sad", said once and left alone. */}
          <Text variant="muted" className="text-[13px]">
            {t("emotions.capLine")}
          </Text>

          <PartBlock index={1} part="whatHappened" hint={t("emotions.hints.whatHappened")}>
            <Textarea
              ref={whatHappenedRef}
              value={values.whatHappened}
              onChangeText={(whatHappened) => update({ whatHappened })}
              accessibilityLabel={t("emotions.parts.whatHappened")}
              maxLength={4000}
            />
          </PartBlock>

          <PartBlock index={2} part="meaning" hint={t("emotions.hints.meaning")}>
            <Textarea
              value={values.meaning}
              onChangeText={(meaning) => update({ meaning })}
              accessibilityLabel={t("emotions.parts.meaning")}
              maxLength={4000}
            />
          </PartBlock>

          <PartBlock index={3} part="feelings" hint={t("emotions.hints.feelings")}>
            <EmotionPicker
              label={t("emotions.primaryLabel")}
              hint={t("emotions.primaryHint")}
              selected={values.primaryEmotions}
              onChange={(primaryEmotions) => update({ primaryEmotions })}
            />
            <EmotionPicker
              label={t("emotions.secondaryLabel")}
              hint={t("emotions.secondaryHint")}
              selected={values.secondaryEmotions}
              onChange={(secondaryEmotions) => update({ secondaryEmotions })}
            />
            <View className="gap-1.5">
              <Label>{t("emotions.bodyLabel")}</Label>
              <Text variant="muted" className="text-[12.5px]">
                {t("emotions.bodyHint")}
              </Text>
              <Textarea
                value={values.bodySensations}
                onChangeText={(bodySensations) => update({ bodySensations })}
                accessibilityLabel={t("emotions.bodyLabel")}
                maxLength={4000}
              />
            </View>
          </PartBlock>

          <PartBlock index={4} part="urges" hint={t("emotions.hints.urges")}>
            <Textarea
              value={values.urges}
              onChangeText={(urges) => update({ urges })}
              accessibilityLabel={t("emotions.parts.urges")}
              maxLength={4000}
            />
          </PartBlock>

          <PartBlock index={5} part="didAndSaid" hint={t("emotions.hints.didAndSaid")}>
            <Textarea
              value={values.didAndSaid}
              onChangeText={(didAndSaid) => update({ didAndSaid })}
              accessibilityLabel={t("emotions.parts.didAndSaid")}
              maxLength={4000}
            />
          </PartBlock>

          <PartBlock index={6} part="afterwards" hint={t("emotions.hints.afterwards")}>
            <Textarea
              value={values.afterwards}
              onChangeText={(afterwards) => update({ afterwards })}
              accessibilityLabel={t("emotions.parts.afterwards")}
              maxLength={4000}
            />
          </PartBlock>

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}
        </View>
      </MobileFormScreen>
    </>
  );
}

function PartBlock({
  index,
  part,
  hint,
  children,
}: {
  index: number;
  part: EmotionRecordPart;
  hint: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("dbt");
  return (
    <View className="gap-2">
      <View className="gap-1">
        <Text variant="h2" className="text-[17px] font-bold tracking-tight">
          {index}. {t(`emotions.parts.${part}`)}
        </Text>
        <Text variant="muted" className="text-[13px] leading-snug">
          {hint}
        </Text>
      </View>
      {children}
    </View>
  );
}

/**
 * The check-in's own emotion list, used as-is. The ids stored are the check-in's
 * ids, which is what lets the thought-record hand-off carry them across.
 */
function EmotionPicker({
  label,
  hint,
  selected,
  onChange,
}: {
  label: string;
  hint: string;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation("dbt");
  const { t: tCbt } = useTranslation("cbt");

  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <Text variant="muted" className="text-[12.5px]">
        {hint}
      </Text>
      {EMOTION_GROUPS.map((group) => (
        <View key={group.valence} className="gap-1.5">
          <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {group.valence === "difficult"
              ? tCbt("emotions.groupDifficult")
              : tCbt("emotions.groupPleasant")}
          </Text>
          <View className="gap-1.5">
            {group.ids.map((id) => {
              const checked = selected.includes(id);
              const emotionLabel = tCbt(`emotions.${id.toLowerCase()}`);
              const toggle = () =>
                onChange(checked ? selected.filter((item) => item !== id) : [...selected, id]);
              return (
                <View key={id} className="flex-row items-center gap-3">
                  <Checkbox
                    accessibilityLabel={`${label}: ${emotionLabel}`}
                    checked={checked}
                    onCheckedChange={toggle}
                  />
                  <Label onPress={toggle}>{emotionLabel}</Label>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {selected.length === 0 ? (
        <Text variant="muted" className="text-[12px]">
          {t("emotions.noneChosen")}
        </Text>
      ) : null}
    </View>
  );
}
