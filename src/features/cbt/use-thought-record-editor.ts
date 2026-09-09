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
import { filledThoughtRecordParts } from "@/src/features/cbt/thought-record-steps";
import { useThoughtRecordIntroDismissed } from "@/src/features/cbt/use-thought-record-intro-dismissed";
import {
  consumeThoughtRecordSeed,
  type ThoughtRecordSeed,
} from "@/src/stores/thought-record-seed-store";
import { useFormDraft, selectWizardDraftValues } from "@/src/lib/use-wizard-draft";
import { announceMessage } from "@/src/lib/accessibility";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";

/** Whether a held draft has anything the person put in it - any part lit on the rail. */
function hasThoughtRecordDraftContent(values: ThoughtRecordFormSchema): boolean {
  return Object.values(filledThoughtRecordParts(values)).some(Boolean);
}

/**
 * What a door's hand-off found on arrival - decided ONCE, at first render.
 *
 * A live draft outranks the hand-off (#2206, the owner's rule for every
 * cross-module door): unsaved work the person typed here is kept and a notice
 * says so. Content, not presence: a draft the person typed into and then emptied
 * again is not held work, and the seed takes it.
 *
 * ☠️☠️ **The seed is CONSUMED either way, and the notice says the hand-off was
 * dropped.** A hand-off lives exactly as long as the navigation that carried it;
 * keeping the beaten one "for the next fresh open" is a stored state that has to
 * answer "is this later arrival still the same intention?", and nothing in the
 * store knows. Two rounds of freshness windows failed at it - the window ran from
 * the door tap rather than from the deferral, so the deferred case expired first
 * and silently, and even re-stamped it let an unrelated hub open minutes later
 * arrive pre-filled with another episode's paragraph, which the person can save
 * into the wrong record. The person is told instead, and the door is one tap away.
 *
 * ☠️ Only sound because the screen mounts this hook AFTER the persisted draft
 * has been read back (`hydrated`): decided before that, a draft persisted in a
 * previous page load or app process would arrive a beat later, win the form
 * through the late-hydration restore, and the seed - already consumed here -
 * would be gone with no word said.
 */
function decideArrival(
  recordId: string | null,
  storedDraftValues: ThoughtRecordFormSchema | null,
): { seed: ThoughtRecordSeed | null; keptDraft: boolean } {
  // Edit never takes a seed and never consumes one: a door only ever opens the
  // create screen, so a seed reaching an edit mount was not minted for it.
  if (recordId !== null) return { seed: null, keptDraft: false };
  const seed = consumeThoughtRecordSeed();
  if (seed === null) return { seed: null, keptDraft: false };
  if (storedDraftValues && hasThoughtRecordDraftContent(storedDraftValues)) {
    return { seed: null, keptDraft: true };
  }
  return { seed, keptDraft: false };
}

/**
 * ☠️ Call only once `useCbtDraftStore` reports `hydrated` - the screen gates on
 * it before mounting this hook. See `decideArrival`.
 */
export function useThoughtRecordEditor() {
  const { t } = useTranslation("cbt");
  const { recordId: rawRecordId } = useLocalSearchParams<{ recordId?: string }>();
  const recordId = typeof rawRecordId === "string" && rawRecordId.length > 0 ? rawRecordId : null;
  const draftMode = recordId ? "edit" : "create";
  const { user } = useSession();
  const { selectedDate } = useSelectedDate();
  const showToast = useToastStore((state) => state.showToast);
  const [submitError, setSubmitError] = useState("");

  const storedDraftValues = useCbtDraftStore(
    selectWizardDraftValues<ThoughtRecordFormSchema>(draftMode, recordId),
  );

  // Seeded by the check-in "Go deeper" handoff (#739) and, since #1980, by the
  // DBT emotion record's "Look at the whole picture" door. Emotions are the one
  // field all three forms share an id space for; the DBT hand-off adds the
  // situation, which the check-in has no equivalent of and leaves empty. Read
  // once per mount and cleared on read whatever the arrival decides, so leaving
  // the form and coming back starts empty rather than re-applying a prefill.
  const [arrival] = useState(() => decideArrival(recordId, storedDraftValues));
  const seed = arrival.seed;

  // ☠️ The toast is a SECOND channel, never the only one: the screen renders
  // `HandoffNotice` off `handoffDropped` below and that line is the record. The
  // toast slot may refuse this one outright (an unread error toast already on
  // screen), drop it (a full queue) or take it away after 2.5s - and the seed is
  // consumed and unrecoverable, so a missed notice used to cost the whole
  // hand-off silently.
  const keptDraftNoticeRef = useRef(false);
  useEffect(() => {
    if (!arrival.keptDraft || keptDraftNoticeRef.current) return;
    keptDraftNoticeRef.current = true;
    showToast({
      title: t("common:handoff.keptDraft"),
      description: t("common:handoff.notCarriedOver"),
      tone: "success",
    });
  }, [arrival.keptDraft, showToast, t]);

  const { data: existingRecord, isLoading } = useThoughtRecord(user?.id ?? null, recordId);
  const saveMutation = useSaveThoughtRecord(user?.id ?? null);
  const {
    dismissed: introDismissed,
    dismiss: dismissIntro,
    hydrated: introHydrated,
  } = useThoughtRecordIntroDismissed();

  const form = useForm<ThoughtRecordFormSchema>({
    // A taken seed is one that found no held work (`decideArrival`), so it
    // outranks whatever empty draft object the store still holds. It rides
    // `defaultValues` rather than a later `reset`, on purpose: a reset fires the
    // draft capture, and an untouched seed must never become a draft (#2254).
    defaultValues: seed
      ? {
          ...defaultValues,
          ...(seed.emotions.length > 0 ? { emotions: seed.emotions } : {}),
          ...(seed.situation.length > 0 ? { situation: seed.situation } : {}),
        }
      : (storedDraftValues ?? defaultValues),
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
    /** This arrival kept a held draft and dropped the door's hand-off (#2206). */
    handoffDropped: arrival.keptDraft,
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
