import type { DistortionDefinition } from "@/src/features/cbt/types";

export const distortionDefinitions: DistortionDefinition[] = [
  {
    key: "all-or-nothing",
    title: "All-or-nothing thinking",
    shortDescription: "Seeing the situation in extremes instead of noticing the middle ground.",
    reflectionPrompt: "What would a more balanced version of this situation sound like?",
  },
  {
    key: "catastrophizing",
    title: "Catastrophizing",
    shortDescription: "Jumping quickly to the worst-case outcome and treating it as likely.",
    reflectionPrompt: "What is difficult here, and what is only a fear about the future?",
  },
  {
    key: "mind-reading",
    title: "Mind reading",
    shortDescription: "Assuming you know what other people think without enough evidence.",
    reflectionPrompt: "What facts do I have, and what am I filling in myself?",
  },
  {
    key: "fortune-telling",
    title: "Fortune telling",
    shortDescription: "Treating a prediction as if it is already proven.",
    reflectionPrompt: "What other outcome is also plausible right now?",
  },
  {
    key: "overgeneralization",
    title: "Overgeneralization",
    shortDescription: "Using one event as proof that the same pattern will always repeat.",
    reflectionPrompt: "Is this one moment, or is it truly evidence for every situation?",
  },
  {
    key: "should-statements",
    title: "Should statements",
    shortDescription: "Using rigid rules that leave little room for context or humanity.",
    reflectionPrompt: "What would become kinder and more realistic if I changed should to prefer?",
  },
  {
    key: "emotional-reasoning",
    title: "Emotional reasoning",
    shortDescription: "Treating a feeling as proof that a conclusion must be true.",
    reflectionPrompt: "What do I feel, and what do I actually know?",
  },
  {
    key: "discounting-the-positive",
    title: "Discounting the positive",
    shortDescription: "Dismissing helpful evidence because it feels too small to count.",
    reflectionPrompt: "What positive detail am I brushing aside too quickly?",
  },
  {
    key: "labeling",
    title: "Labeling",
    shortDescription: "Reducing yourself or someone else to a harsh global label.",
    reflectionPrompt: "How can I describe the moment without turning it into an identity?",
  },
  {
    key: "personalization",
    title: "Personalization",
    shortDescription: "Taking on more blame or responsibility than the facts justify.",
    reflectionPrompt: "What part is mine, and what part is not actually under my control?",
  },
];

export const distortionLookup = Object.fromEntries(
  distortionDefinitions.map((distortion) => [distortion.key, distortion]),
);
