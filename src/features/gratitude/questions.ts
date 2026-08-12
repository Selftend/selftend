// i18n keys holding the fixed, ordered question labels. Slot index i ↔ question i.
export const GRATITUDE_TODAY_QUESTIONS_KEY = "editor.todayQuestions";
export const GRATITUDE_LIFE_QUESTIONS_KEY = "editor.lifeQuestions";

/** Coerce an i18n `returnObjects` value into a clean string array. */
export function asQuestionList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Number of answered (non-blank) slots. */
export function answeredCount(items: string[]): number {
  return items.filter((text) => text.trim().length > 0).length;
}

/** First answered (non-blank) slot text, or undefined. */
export function firstAnswer(items: string[]): string | undefined {
  return items.find((text) => text.trim().length > 0);
}
