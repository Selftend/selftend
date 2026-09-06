import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import {
  buildThoughtRecordInput,
  defaultValues,
  hasAnyThought,
} from "@/src/features/cbt/thought-record-form";
import { useThoughtRecordIntroDismissed } from "@/src/features/cbt/use-thought-record-intro-dismissed";
import { consumeThoughtRecordSeed } from "@/src/stores/thought-record-seed-store";
import { useFormDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { announceMessage } from "@/src/lib/accessibility";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

export function useThoughtRecordEditor() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null;
  // Seeded by the check-in "Go deeper" handoff (#739) and, since #1980, by the
  // DBT emotion record's "Look at the whole picture" door. Emotions are the one
  // field all three forms share an id space for; the DBT hand-off adds the
  // situation, which the check-in has no equivalent of and leaves empty. Read
  // once per mount and cleared on read, so leaving the form and coming back
  // starts empty rather than re-applying a stale prefill.
  const [seed] = useState(consumeThoughtRecordSeed);
  const draftMode = recordId ? "edit" : "create";
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const [submitError, setSubmitError] = useState("");

  const storedDraftValues = useCbtDraftStore(
    selectWizardDraftValues<ThoughtRecordFormSchema>(draftMode, recordId),
  );

  const { data: existingRecord, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const saveMutation = useSaveThoughtRecord(user?.id ?? null);
  const {
    dismissed: introDismissed,
    dismiss: dismissIntro,
    hydrated: introHydrated,
  } = useThoughtRecordIntroDismissed();

  const form = useForm<ThoughtRecordFormSchema>({
    // A live draft outranks the handoff: unsaved work the user typed here beats a
    // prefill they can re-pick in one step. Only a fresh create takes the seed.
    defaultValues:
      storedDraftValues ??
      (recordId === null && (seed.emotions.length > 0 || seed.situation.length > 0)
        ? {
            ...defaultValues,
            ...(seed.emotions.length > 0 ? { emotions: seed.emotions } : {}),
            ...(seed.situation.length > 0 ? { situation: seed.situation } : {}),
          }
        : defaultValues),
    resolver: zodResolver(thoughtRecordFormSchema),
  });
  const {
    formState: { errors },
    getValues,
    reset,
  } = form;

  useEffect(() => {
    if (!existingRecord || storedDraftValues) {
      return;
    }
    reset({
      nats: existingRecord.nats,
      balancedThought: existingRecord.balancedThought,
      beliefAfter: existingRecord.beliefAfter,
      distortions: existingRecord.distortions,
      emotionIntensityAfter: existingRecord.emotionIntensityAfter,
      emotionIntensityBefore: existingRecord.emotionIntensityBefore,
      emotions: existingRecord.emotions,
      evidenceAgainst: existingRecord.evidenceAgainst,
      evidenceFor: existingRecord.evidenceFor,
      outcomeNotes: existingRecord.outcomeNotes,
      situation: existingRecord.situation,
    });
  }, [existingRecord, reset, storedDraftValues]);

  const draft = useFormDraft({
    useDraftStore: useCbtDraftStore,
    draftMode,
    entityId: recordId,
    form,
    onSave: (values) => {
      setSubmitError("");
      // One Date, so the instant and the offset describe the same moment:
      // `occurrenceTimeFromDate` resolves the offset AT that instant, which is
      // what makes the pair survive a DST change instead of pairing an instant
      // with an offset that was never in force at it (#330).
      const input = buildThoughtRecordInput(values, {
        recordId,
        occurrence: occurrenceTimeFromDate(new Date(loggedAtForSelectedDate(selectedDate))),
      });
      return saveMutation.mutateAsync({ input, recordId: recordId ?? undefined });
    },
    onSaved: (saved) =>
      router.replace(
        (recordId
          ? `/modules/cbt/history/${saved.id}`
          : `/modules/cbt/saved/${saved.id}`) as Parameters<typeof router.replace>[0],
      ),
    onError: setSubmitError,
    toastLabels: {
      saved: t("common:feedback.saved"),
      problem: t("common:feedback.problem"),
      invalid: t("common:feedback.invalid"),
      invalidMoved: t("common:feedback.invalidMoved"),
      fallbackError: t("common:feedback.wentWrong"),
    },
  });

  const [natsError, setNatsError] = useState("");
  const natsInputRef = useRef<TextInput>(null);

  // The one gate left in the whole form, enforced AT the save rather than by a
  // disabled button or a step that will not advance: a record is about a
  // thought, so a record with none is not yet a record. Everything else saves
  // blank on purpose - a partial record is still worth keeping (#1381).
  const handleSave = async () => {
    if (!hasAnyThought(getValues("nats"))) {
      const message = t("record.natsRequired");
      setNatsError(message);
      announceMessage(message);
      // Focusing also scrolls the field into view on web (shared Textarea behavior).
      natsInputRef.current?.focus();
      return;
    }
    setNatsError("");
    await draft.handleSave();
  };

  // Wait for the persisted draft to rehydrate before mounting the form, exactly
  // like the edit-mode data gate - otherwise the column would flash empty.
  const isBootLoading = !draft.hydrated || (!!recordId && isLoading);

  return {
    form,
    errors,
    getValues,
    recordId,
    submitError,
    natsError,
    clearNatsError: () => setNatsError(""),
    natsInputRef,
    intro: { hydrated: introHydrated, dismissed: introDismissed, dismiss: dismissIntro },
    isBootLoading,
    isPending: draft.isPending,
    clearDraft: draft.clearDraft,
    handleSave,
  };
}
