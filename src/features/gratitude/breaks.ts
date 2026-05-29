type BreakCategory = "positive-psychology" | "stoicism" | "mental-subtraction";

export interface GratitudeBreak {
  slug: string;
  category: BreakCategory;
}

export const GRATITUDE_BREAKS: GratitudeBreak[] = [
  { slug: "gratitude-letter", category: "positive-psychology" },
  { slug: "acts-of-kindness", category: "positive-psychology" },
  { slug: "i-did-it-list", category: "positive-psychology" },
  { slug: "you-get-to-choose", category: "stoicism" },
  { slug: "dont-make-things-harder", category: "stoicism" },
  { slug: "instructions-for-unhappiness", category: "stoicism" },
  { slug: "what-if-that-didnt-happen", category: "mental-subtraction" },
  { slug: "give-it-up", category: "mental-subtraction" },
];
