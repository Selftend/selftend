import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";

export type HabitsLearnSlug =
  | "compounding"
  | "systems-over-goals"
  | "habit-loop"
  | "make-obvious"
  | "make-attractive"
  | "make-easy"
  | "make-satisfying"
  | "two-minute-rule"
  | "never-miss-twice"
  | "identity";

export interface HabitsLearnCard {
  slug: HabitsLearnSlug;
  icon: MaterialIconName;
  tone: "primary" | "be" | "act" | "amber" | "emerald" | "violet" | "rose";
}

/**
 * Order is the home-screen carousel cycle. Title/body live in the habits i18n
 * namespace under `learn.cards.<slug>.{title,short,body}` so both languages stay
 * in sync.
 */
export const HABITS_LEARN_CARDS: HabitsLearnCard[] = [
  { slug: "compounding", icon: "trending-up", tone: "primary" },
  { slug: "systems-over-goals", icon: "schema", tone: "be" },
  { slug: "habit-loop", icon: "loop", tone: "act" },
  { slug: "make-obvious", icon: "visibility", tone: "emerald" },
  { slug: "make-attractive", icon: "favorite-border", tone: "rose" },
  { slug: "make-easy", icon: "bolt", tone: "amber" },
  { slug: "make-satisfying", icon: "emoji-events", tone: "violet" },
  { slug: "two-minute-rule", icon: "schedule", tone: "amber" },
  { slug: "never-miss-twice", icon: "event-repeat", tone: "primary" },
  { slug: "identity", icon: "badge", tone: "act" },
];

export function findLearnCard(slug: string): HabitsLearnCard | null {
  return HABITS_LEARN_CARDS.find((card) => card.slug === slug) ?? null;
}
