import { z } from "zod";

import { sanitizeUserText } from "@/src/utils/sanitize-text";

interface UserTextOptions {
  min?: number;
  /** i18n message KEY for the min check (resolved via t() at render time). */
  message?: string;
  /** i18n message KEY for the max check; zod's default English otherwise. */
  maxMessage?: string;
}

/**
 * Free-text field typed by the user: trimmed, bounded, and sanitized
 * (non-breaking spaces normalized, unpaired surrogates dropped - see
 * sanitizeUserText) via .transform, so every schema built on it persists clean
 * text without each save path remembering to sanitize.
 */
export const userText = (max = 2000, options: UserTextOptions = {}) => {
  const base = z.string().trim();
  const withMin = options.min !== undefined ? base.min(options.min, options.message) : base;
  // Re-trim after sanitizing: dropping a trailing unpaired surrogate can leave
  // fresh trailing whitespace behind.
  return withMin.max(max, options.maxMessage).transform((value) => sanitizeUserText(value).trim());
};

const nonEmptyTrimmedString = (max = 2000) => userText(max, { min: 1 });

export const trimmedStringList = (max = 2000) => z.array(nonEmptyTrimmedString(max));
