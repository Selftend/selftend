export interface ChallengeDraft {
  id?: string;
  challengeDescription: string;
  copingSteps: string[];
}

/** Immutably set the coping step at `index` to `value`. */
export function updateCopingStep(
  draft: ChallengeDraft,
  index: number,
  value: string,
): ChallengeDraft {
  const next = [...draft.copingSteps];
  next[index] = value;
  return { ...draft, copingSteps: next };
}

/** Immutably append an empty coping step row. */
export function addCopingStep(draft: ChallengeDraft): ChallengeDraft {
  return { ...draft, copingSteps: [...draft.copingSteps, ""] };
}

/**
 * Immutably remove the coping step at `index`, never dropping below one row
 * (an empty list collapses back to a single blank step).
 */
export function removeCopingStep(draft: ChallengeDraft, index: number): ChallengeDraft {
  const next = draft.copingSteps.filter((_, itemIndex) => itemIndex !== index);
  return { ...draft, copingSteps: next.length > 0 ? next : [""] };
}
