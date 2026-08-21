import { z } from "zod";

import { userText } from "@/src/lib/zod-fields";

const natSchema = z.object({
  text: userText(2000, { maxMessage: "record.validation.natTooLong" }),
  beliefRating: z.number().min(0).max(100).nullable(),
  isHotThought: z.boolean(),
});

// Messages are i18n KEYS (resolved in the "cbt" namespace at render time via t()),
// not literals - so validation errors follow the in-app language, not English only.
//
// Requiredness deliberately matches the pre-i18n schema: every narrative field
// accepts empty values, so legacy records with blank fields stay editable and
// saveable. (Create-mode-only requiredness is a tracked product follow-up.) The
// length caps + sanitization come from userText().
export const thoughtRecordFormSchema = z.object({
  situation: userText(4000, { maxMessage: "record.validation.situationTooLong" }),
  nats: z.array(natSchema),
  emotions: z.array(z.string()),
  emotionIntensityBefore: z.number().min(0).max(100).nullable(),
  distortions: z.array(z.string()),
  evidenceFor: z.array(userText(2000, { maxMessage: "record.validation.evidenceTooLong" })),
  evidenceAgainst: z.array(userText(2000, { maxMessage: "record.validation.evidenceTooLong" })),
  balancedThought: userText(4000, { maxMessage: "record.validation.balancedThoughtTooLong" }),
  emotionIntensityAfter: z.number().min(0).max(100).nullable(),
  outcomeNotes: userText(4000, { maxMessage: "record.validation.outcomeNotesTooLong" }),
  // How strongly the hot thought is believed AFTER working the record (#1376) -
  // the same 0-100 range as the belief rating it is compared against, and as
  // nullable as everything else here: nothing in this form is required, so a
  // legacy record with no value stays saveable.
  //
  // NULLABLE, not `.default(null)`. A default would tolerate the key being
  // absent, which is exactly the shape a wizard draft persisted by the previous
  // build has - but it also makes zod's input type differ from its output type,
  // which collapses useForm's generic inference and breaks `Control<...>` in all
  // eight step components. The absent-key case is handled where it belongs
  // instead: WIZARD_DRAFT_PERSIST_VERSION is bumped, so those drafts are dropped
  // on rehydrate rather than reaching the resolver half-shaped.
  beliefAfter: z.number().min(0).max(100).nullable(),
});

export type ThoughtRecordFormSchema = z.infer<typeof thoughtRecordFormSchema>;
