import type { MaterialIconName } from "@/src/components/react-native-reusables/icon";
import type { ExerciseHue } from "@/src/features/mindfulness/exercise-hue";

export interface GroundingStepConfig {
  icon: MaterialIconName;
  hue: ExerciseHue;
}

export interface GroundingTechnique {
  slug: string;
  /** Icon for the intro hero tile and (non-senses) home card. */
  icon: MaterialIconName;
  /** Representative hue for intro/done/home tile. */
  hue: ExerciseHue;
  /** Drives the home meta label and the senses-only dot grid. */
  kind: "senses" | "guided";
  /** Per-step icon + hue, index-aligned with the i18n `steps`/`stepLabels` arrays. */
  steps: GroundingStepConfig[];
}

export const groundingTechniques: GroundingTechnique[] = [
  {
    slug: "54321",
    icon: "visibility",
    hue: "iris",
    kind: "senses",
    steps: [
      { icon: "visibility", hue: "iris" },
      { icon: "back-hand", hue: "clay" },
      { icon: "hearing", hue: "aqua" },
      { icon: "air", hue: "think" },
      { icon: "restaurant", hue: "be" },
    ],
  },
  {
    slug: "cold-water",
    icon: "water-drop",
    hue: "aqua",
    kind: "guided",
    steps: [
      { icon: "water-drop", hue: "aqua" },
      { icon: "pan-tool", hue: "aqua" },
      { icon: "ac-unit", hue: "aqua" },
      { icon: "spa", hue: "aqua" },
    ],
  },
  {
    slug: "feet-floor",
    icon: "directions-walk",
    hue: "clay",
    kind: "guided",
    steps: [
      { icon: "directions-walk", hue: "clay" },
      { icon: "vertical-align-bottom", hue: "clay" },
      { icon: "air", hue: "clay" },
      { icon: "graphic-eq", hue: "clay" },
    ],
  },
];

export const groundingLookup = Object.fromEntries(groundingTechniques.map((t) => [t.slug, t]));
export const groundingSlugs = groundingTechniques.map((t) => t.slug);
