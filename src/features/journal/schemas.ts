import { z } from "zod";

export const JOURNAL_TITLE_MAX = 120;
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

export type JournalEntrySchema = z.infer<typeof journalEntrySchema>;
