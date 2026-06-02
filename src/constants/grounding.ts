interface GroundingTechnique {
  slug: string;
}

export const groundingTechniques: GroundingTechnique[] = [
  { slug: "54321" },
  { slug: "cold-water" },
  { slug: "feet-floor" },
];

export const groundingLookup = Object.fromEntries(groundingTechniques.map((t) => [t.slug, t]));
export const groundingSlugs = groundingTechniques.map((t) => t.slug);
