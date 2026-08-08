import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { thoughtRecordFormSchema, type ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import {
  buildThoughtRecordInput,
  defaultValues,
  hasAnyThought,
  markHotThought,
  selectHotThoughtIndex,
} from "@/src/features/cbt/thought-record-form";
import { buildThoughtRecordSteps } from "@/src/features/cbt/thought-record-steps";
import { useThoughtRecordIntroDismissed } from "@/src/features/cbt/use-thought-record-intro-dismissed";
import { consumeThoughtRecordSeed } from "@/src/stores/thought-record-seed-store";
import { useWizardDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

export function useThoughtRecordEditor() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null;
  // Seeded by the check-in "Go deeper" handoff (#739). Emotions only - the one field the
  // two forms share an id space for. Read once per mount and cleared on read, so leaving
  // the wizard and coming back starts empty rather than re-applying a stale prefill.
  const [seededEmotions] = useState(consumeThoughtRecordSeed);
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
      (recordId === null && seededEmotions.length > 0
        ? { ...defaultValues, emotions: seededEmotions }
        : defaultValues),
    resolver: zodResolver(thoughtRecordFormSchema),
  });
  const {
    formState: { errors },
    getValues,
    reset,
    setValue,
  } = form;

  useEffect(() => {
    if (!existingRecord || storedDraftValues) {
      return;
    }
    reset({
      nats: existingRecord.nats,
      balancedThought: existingRecord.balancedThought,
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

  const steps = buildThoughtRecordSteps(t);

  const wizard = useWizardDraft({
    useDraftStore: useCbtDraftStore,
    draftMode,
    entityId: recordId,
    stepFields: steps.map((s) => s.fields),
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
      fallbackError: t("detail.archiveError"),
    },
  });

  const currentStep = steps[wizard.stepIndex];

  const [natsError, setNatsError] = useState("");

  // When entering the hotThought step, auto-select the NAT with the
  // highest beliefRating (or first) if none are already marked.
  useEffect(() => {
    if (currentStep.key !== "hotThought") return;
    const nats = getValues("nats");
    if (nats.some((n) => n.isHotThought)) return;
    setValue("nats", markHotThought(nats, selectHotThoughtIndex(nats)));
  }, [currentStep.key, getValues, setValue]);

  const handlePrimary = async () => {
    if (wizard.isLastStep) {
      await wizard.handleSave();
      return;
    }
    if (currentStep.key === "nats") {
      if (!hasAnyThought(getValues("nats"))) {
        setNatsError(t("record.natsRequired"));
        return;
      }
      setNatsError("");
    }
    await wizard.handleNext();
  };

  // Wait for the persisted draft to rehydrate before mounting the form, exactly
  // like the edit-mode data gate - otherwise the wizard would flash empty.
  const isBootLoading = !wizard.hydrated || (!!recordId && isLoading);

  return {
    form,
    errors,
    getValues,
    steps,
    currentStep,
    wizard,
    recordId,
    submitError,
    natsError,
    clearNatsError: () => setNatsError(""),
    intro: { hydrated: introHydrated, dismissed: introDismissed, dismiss: dismissIntro },
    isBootLoading,
    handlePrimary,
  };
}
