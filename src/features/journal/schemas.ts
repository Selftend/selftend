import { z } from "zod";

// Mirror the server-trusted DB CHECK constraint (journal_entries_title_len <= 300,
// migration 20260570_freetext_length_checks.sql) so the client cap never diverges from
// the only enforced limit; the DB is the source of truth for write bounds.
export const JOURNAL_TITLE_MAX = 300;
export const JOURNAL_BODY_MAX = 20000;

export const journalEntrySchema = z.object({
  title: z.string().max(JOURNAL_TITLE_MAX),
  body: z
    .string()
    .min(1)
    .max(JOURNAL_BODY_MAX)
    .refine((value) => value.trim().length > 0, {
      message: "Body cannot be empty",
    }),
});
