//
// Stored thought-record emotions/distortions are slugs ("anxious",
// "mind-reading"). These map them back to the localized labels the form
// showed; unknown values (legacy free-text emotions) pass through unchanged.
type Translate = (key: string, fallback: string) => string;

export function formatEmotionLabels(slugs: readonly string[], translate: Translate): string {
  return slugs.map((slug) => translate(`emotions.${slug}`, slug)).join(", ");
}

export function formatDistortionLabels(slugs: readonly string[], translate: Translate): string {
  return slugs.map((slug) => translate(`distortions.${slug}.title`, slug)).join(", ");
}
