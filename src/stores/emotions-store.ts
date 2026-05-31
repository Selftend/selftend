import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface CustomEmotion {
  id: string;
  name: string;
  emoji: string;
}

const STORAGE_KEY = "selftend:custom-emotions";
const OVERRIDES_KEY = "selftend:emotion-overrides";

// Guards against malformed AsyncStorage values: a corrupt OR wrong-shaped entry falls
// back to the default instead of throwing out of hydrate() (or crashing a later mutator
// that assumes the shape). Each key is parsed independently so one bad value never
// discards the other's valid data.
function safeParse<T>(raw: string | null, fallback: T, isValid: (value: unknown) => boolean): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

const isRecord = (value: unknown): boolean =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface EmotionsState {
  customEmotions: CustomEmotion[];
  /** emoji overrides for built-in emotion IDs */
  emojiOverrides: Record<string, string>;
  hydrate: () => Promise<void>;
  addEmotion: (emotion: CustomEmotion) => void;
  updateCustomEmotion: (id: string, updates: Partial<Omit<CustomEmotion, "id">>) => void;
  removeCustomEmotion: (id: string) => void;
  setEmojiOverride: (id: string, emoji: string) => void;
}

export const useEmotionsStore = create<EmotionsState>((set, get) => ({
  customEmotions: [],
  emojiOverrides: {},
  hydrate: async () => {
    const [stored, overrides] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(OVERRIDES_KEY),
    ]);
    set({
      customEmotions: safeParse<CustomEmotion[]>(stored, [], Array.isArray),
      emojiOverrides: safeParse<Record<string, string>>(overrides, {}, isRecord),
    });
  },
  addEmotion: (emotion) => {
    const next = [...get().customEmotions, emotion];
    set({ customEmotions: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  updateCustomEmotion: (id, updates) => {
    const next = get().customEmotions.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ customEmotions: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  removeCustomEmotion: (id) => {
    const next = get().customEmotions.filter((e) => e.id !== id);
    set({ customEmotions: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
  setEmojiOverride: (id, emoji) => {
    const next = { ...get().emojiOverrides, [id]: emoji };
    set({ emojiOverrides: next });
    void AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  },
}));
