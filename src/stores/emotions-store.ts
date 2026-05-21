import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export interface CustomEmotion {
  id: string;
  name: string;
  emoji: string;
}

const STORAGE_KEY = "selftend:custom-emotions";
const OVERRIDES_KEY = "selftend:emotion-overrides";

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
      customEmotions: stored ? (JSON.parse(stored) as CustomEmotion[]) : [],
      emojiOverrides: overrides ? (JSON.parse(overrides) as Record<string, string>) : {},
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
