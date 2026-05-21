import { useTranslation } from "react-i18next";

import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { useEmotionsStore } from "@/src/stores/emotions-store";

export interface EmotionDisplay {
  id: string;
  name: string;
  emoji: string;
  isCustom: boolean;
}

export function useEmotionDisplay() {
  const { t } = useTranslation("cbt");
  const customEmotions = useEmotionsStore((s) => s.customEmotions);
  const emojiOverrides = useEmotionsStore((s) => s.emojiOverrides);

  function resolveEmotion(id: string): EmotionDisplay {
    const override = emojiOverrides[id];
    const custom = customEmotions.find((e) => e.id === id);
    if (custom) {
      return { id, name: custom.name, emoji: override ?? custom.emoji, isCustom: true };
    }
    const builtin = DEFAULT_EMOTIONS.find((e) => e.id === id);
    if (builtin) {
      const tKey = `emotions.${id}`;
      const translated = t(tKey);
      return {
        id,
        name: translated === tKey ? id : translated,
        emoji: override ?? builtin.emoji,
        isCustom: false,
      };
    }
    // Legacy data: capitalized strings stored before the id-based system
    const legacyId = id.toLowerCase();
    const legacyBuiltin = DEFAULT_EMOTIONS.find((e) => e.id === legacyId);
    if (legacyBuiltin) {
      const tKey = `emotions.${legacyId}`;
      const translated = t(tKey);
      return {
        id,
        name: translated === tKey ? id : translated,
        emoji: emojiOverrides[legacyId] ?? legacyBuiltin.emoji,
        isCustom: false,
      };
    }
    return { id, name: id, emoji: "💭", isCustom: false };
  }

  const allEmotions: EmotionDisplay[] = [
    ...DEFAULT_EMOTIONS.map((e) => resolveEmotion(e.id)),
    ...customEmotions.map((e) => resolveEmotion(e.id)),
  ];

  return { resolveEmotion, allEmotions };
}
