export type EmotionValence = "pleasant" | "difficult";

interface EmotionOption {
  id: string;
  emoji: string;
  valence: EmotionValence;
}

export const DEFAULT_EMOTIONS: EmotionOption[] = [
  { id: "happy", emoji: "😊", valence: "pleasant" },
  { id: "excited", emoji: "🤩", valence: "pleasant" },
  { id: "loved", emoji: "🥰", valence: "pleasant" },
  { id: "inspired", emoji: "💡", valence: "pleasant" },
  { id: "proud", emoji: "💪", valence: "pleasant" },
  { id: "playful", emoji: "😄", valence: "pleasant" },
  { id: "grateful", emoji: "🙏", valence: "pleasant" },
  { id: "hopeful", emoji: "🌟", valence: "pleasant" },
  { id: "relaxed", emoji: "😌", valence: "pleasant" },
  { id: "content", emoji: "☺️", valence: "pleasant" },
  { id: "anxious", emoji: "😰", valence: "difficult" },
  { id: "sad", emoji: "😢", valence: "difficult" },
  { id: "angry", emoji: "😡", valence: "difficult" },
  { id: "ashamed", emoji: "😳", valence: "difficult" },
  { id: "guilty", emoji: "😔", valence: "difficult" },
  { id: "overwhelmed", emoji: "😵", valence: "difficult" },
  { id: "frustrated", emoji: "😤", valence: "difficult" },
  { id: "lonely", emoji: "🫂", valence: "difficult" },
  { id: "fearful", emoji: "😨", valence: "difficult" },
  { id: "hopeless", emoji: "😞", valence: "difficult" },
  { id: "numb", emoji: "😶", valence: "difficult" },
  { id: "irritated", emoji: "😒", valence: "difficult" },
];

/** Legacy export for backward-compat with code that imported the old string array. */
export const emotionOptions = DEFAULT_EMOTIONS.map((e) => e.id);

interface EmotionGroup {
  valence: EmotionValence;
  ids: string[];
}

/**
 * Ordered grouping for UI surfaces (e.g. the thought-record emotions step) that want to
 * present difficult feelings before pleasant ones, without touching the check-in tool's
 * flat `DEFAULT_EMOTIONS`/`emotionOptions` order.
 */
export const EMOTION_GROUPS: EmotionGroup[] = [
  {
    valence: "difficult",
    ids: DEFAULT_EMOTIONS.filter((e) => e.valence === "difficult").map((e) => e.id),
  },
  {
    valence: "pleasant",
    ids: DEFAULT_EMOTIONS.filter((e) => e.valence === "pleasant").map((e) => e.id),
  },
];
