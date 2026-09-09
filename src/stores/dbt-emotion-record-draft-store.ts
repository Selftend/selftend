import type { EmotionRecordPartValues } from "@/src/features/dbt/emotion-record-parts";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

/**
 * The emotion record's persisted draft.
 *
 * This is the one DBT form that keeps one. The wise mind check-in deliberately
 * does not - a half-asked question is not worth keeping - and the sessions
 * deliberately do not, because Stop means nothing was saved. The emotion record
 * is different in kind: it is written over minutes, across six parts, about an
 * episode the person is working to recall, and losing it to an interruption is
 * the trap the draft store exists for.
 *
 * It registers itself with the draft-store registry, so the values - which are
 * health data - are cleared from memory AND from disk on sign-out.
 */
export const useDbtEmotionRecordDraftStore =
  createWizardDraftStore<EmotionRecordPartValues>("dbt-emotion-record");
