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
  // `.nullish()`, so an ABSENT key is as acceptable as an explicit null. Two
  // reasons, and the range check is preserved either way:
  //
  // 1. Nothing in this form is required, deliberately, so that legacy records
  //    with blank fields stay saveable - and this field must not become the
  //    first exception.
  // 2. This is the first field added to the schema since the wizard gained a
  //    persisted draft. `use-wizard-draft` resets a draft up to 24h old straight
  //    back into the form with no shape migration, so a draft written by the
  //    previous build arrives with no `beliefAfter` key at all. Required-but-
  //    nullable would fail the outcome step's trigger() with an issue that step
  //    does not render - a dead Save button and no visible reason.
  //
  // NOT `.nullable().default(null)`, which would also tolerate the absent key
  // but makes zod's input type differ from its output type, collapsing useForm's
  // generic inference and breaking `Control<...>` in all eight step components.
  // `.nullish()` keeps input and output identical.
  //
  // The undefined arm stops at the repository, which coalesces to an explicit
  // null so that clearing a rating on an edit reaches the column as null rather
  // than being omitted from the payload and leaving the old value standing.
  beliefAfter: z.number().min(0).max(100).nullish(),
});

export type ThoughtRecordFormSchema = z.infer<typeof thoughtRecordFormSchema>;
