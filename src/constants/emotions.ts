export interface EmotionOption {
  id: string;
  emoji: string;
}

export const DEFAULT_EMOTIONS: EmotionOption[] = [
  { id: "happy", emoji: "😊" },
  { id: "excited", emoji: "🤩" },
  { id: "loved", emoji: "🥰" },
  { id: "inspired", emoji: "💡" },
  { id: "proud", emoji: "💪" },
  { id: "playful", emoji: "😄" },
  { id: "grateful", emoji: "🙏" },
  { id: "hopeful", emoji: "🌟" },
  { id: "relaxed", emoji: "😌" },
  { id: "content", emoji: "☺️" },
  { id: "anxious", emoji: "😰" },
  { id: "sad", emoji: "😢" },
  { id: "angry", emoji: "😡" },
  { id: "ashamed", emoji: "😳" },
  { id: "guilty", emoji: "😔" },
  { id: "overwhelmed", emoji: "😵" },
  { id: "frustrated", emoji: "😤" },
  { id: "lonely", emoji: "🫂" },
  { id: "fearful", emoji: "😨" },
  { id: "hopeless", emoji: "😞" },
  { id: "numb", emoji: "😶" },
  { id: "irritated", emoji: "😒" },
];

/** Legacy export for backward-compat with code that imported the old string array. */
export const emotionOptions = DEFAULT_EMOTIONS.map((e) => e.id);
