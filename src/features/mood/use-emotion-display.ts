import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { useEmotionPreferences } from "@/src/features/mood/emotion-preferences-queries";
import type { EmotionPreference } from "@/src/features/mood/emotion-preferences-repository";
import { useSession } from "@/src/providers/session-provider";

export interface EmotionDisplay {
  id: string;
  name: string;
  emoji: string;
  isCustom: boolean;
}

export function useEmotionDisplay() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: prefs, isLoading } = useEmotionPreferences(userId);

  // Map every preference row by its emotionId for O(1) lookups.
  const prefByEmotionId = useMemo(() => {
    const map = new Map<string, EmotionPreference>();
    for (const pref of prefs ?? []) {
      map.set(pref.emotionId, pref);
    }
    return map;
  }, [prefs]);

  const resolveEmotion = useCallback(
    (id: string): EmotionDisplay => {
      const pref = prefByEmotionId.get(id);

      if (pref?.isCustom) {
        return {
          id,
          name: pref.name ?? id,
          emoji: pref.emoji ?? "💭",
          isCustom: true,
        };
      }

      const builtin = DEFAULT_EMOTIONS.find((e) => e.id === id);
      if (builtin) {
        const tKey = `emotions.${id}`;
        const translated = t(tKey);
        const builtinName = translated === tKey ? id : translated;
        return {
          id,
          name: pref?.name ?? builtinName,
          emoji: pref?.emoji ?? builtin.emoji,
          isCustom: false,
        };
      }

      // Legacy data: capitalized strings stored before the id-based system
      const legacyId = id.toLowerCase();
      const legacyBuiltin = DEFAULT_EMOTIONS.find((e) => e.id === legacyId);
      if (legacyBuiltin) {
        const tKey = `emotions.${legacyId}`;
        const translated = t(tKey);
        const legacyPref = prefByEmotionId.get(legacyId);
        return {
          id,
          name: pref?.name ?? (translated === tKey ? id : translated),
          emoji: pref?.emoji ?? legacyPref?.emoji ?? legacyBuiltin.emoji,
          isCustom: false,
        };
      }

      return { id, name: pref?.name ?? id, emoji: pref?.emoji ?? "💭", isCustom: false };
    },
    [prefByEmotionId, t],
  );

  // The list is now derived ONLY from the persisted rows (DB is authoritative),
  // not from DEFAULT_EMOTIONS. While the query is loading, `prefs` is undefined
  // and this is empty — consumers show a spinner instead of flashing the
  // constants list (defaults are seeded as real rows on first use).
  const allEmotions = useMemo<EmotionDisplay[]>(() => {
    const visible = (prefs ?? []).filter((p) => !p.removed);

    // Stable sort by the persisted position ascending (Array.prototype.sort is
    // stable in modern JS, so rows sharing a position keep their relative order).
    return [...visible]
      .sort((a, b) => a.position - b.position)
      .map((p) => resolveEmotion(p.emotionId));
  }, [prefs, resolveEmotion]);

  return { resolveEmotion, allEmotions, isLoading };
}
