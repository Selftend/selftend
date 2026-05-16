export interface GroundingTechnique {
  slug: string;
  stepCount: number;
}

export const groundingTechniques: GroundingTechnique[] = [
  { slug: "54321", stepCount: 5 },
  { slug: "cold-water", stepCount: 4 },
  { slug: "feet-floor", stepCount: 4 },
];

export const groundingLookup = Object.fromEntries(groundingTechniques.map((t) => [t.slug, t]));
export const groundingSlugs = groundingTechniques.map((t) => t.slug);
