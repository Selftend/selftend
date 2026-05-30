import { renderHook } from "@testing-library/react-native";

import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";
import { useEmotionsStore } from "@/src/stores/emotions-store";

// Mock the emotions store
jest.mock("@/src/stores/emotions-store", () => ({
  useEmotionsStore: jest.fn(),
}));

// Mock i18n — make t() return the key unchanged so we can assert on i18n key fallback
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key, // returns key unchanged — fallback case
  }),
}));

const mockUseEmotionsStore = useEmotionsStore as jest.MockedFunction<typeof useEmotionsStore>;

// Helper to set up the store mock
function setupStore({
  customEmotions = [] as { id: string; name: string; emoji: string }[],
  emojiOverrides = {} as Record<string, string>,
} = {}) {
  mockUseEmotionsStore.mockImplementation((selector: (s: any) => any) => {
    const state = { customEmotions, emojiOverrides };
    return selector(state);
  });
}

describe("useEmotionDisplay — resolveEmotion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("custom emotion wins over builtin for the same id", () => {
    setupStore({
      customEmotions: [{ id: "happy", name: "My Happy", emoji: "🎉" }],
    });
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");
    expect(resolved).toMatchObject({ id: "happy", name: "My Happy", emoji: "🎉", isCustom: true });
  });

  it("custom emotion emoji is overridden by emojiOverrides", () => {
    setupStore({
      customEmotions: [{ id: "myemotion", name: "My Emotion", emoji: "😊" }],
      emojiOverrides: { myemotion: "🔥" },
    });
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("myemotion");
    expect(resolved.emoji).toBe("🔥");
    expect(resolved.isCustom).toBe(true);
  });

  it("builtin uses emoji override when present", () => {
    setupStore({ emojiOverrides: { anxious: "😱" } });
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("anxious");
    expect(resolved.emoji).toBe("😱");
    expect(resolved.isCustom).toBe(false);
  });

  it("builtin uses i18n key, falling back to id when translation equals the key", () => {
    // Our mock t() returns the key unchanged, so name should fall back to id
    setupStore();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");
    // t("emotions.happy") === "emotions.happy" (key unchanged) => name falls back to id "happy"
    expect(resolved.name).toBe("happy");
    expect(resolved.isCustom).toBe(false);
    expect(resolved.emoji).toBe("😊");
  });

  it("a legacy uppercased id resolves via lowercase lookup", () => {
    setupStore();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("Happy");
    // Should resolve via legacy path: legacyId = "happy" which is in DEFAULT_EMOTIONS
    expect(resolved.id).toBe("Happy");
    expect(resolved.isCustom).toBe(false);
    // emoji should be from the lowercase builtin
    expect(resolved.emoji).toBe("😊");
  });

  it("unknown id returns the fallback emoji 💭", () => {
    setupStore();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("unknown-emotion-xyz");
    expect(resolved).toMatchObject({
      id: "unknown-emotion-xyz",
      name: "unknown-emotion-xyz",
      emoji: "💭",
      isCustom: false,
    });
  });
});

describe("useEmotionDisplay — allEmotions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("allEmotions includes all DEFAULT_EMOTIONS", () => {
    setupStore();
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);
    for (const defaultEmotion of DEFAULT_EMOTIONS) {
      expect(ids).toContain(defaultEmotion.id);
    }
  });

  it("allEmotions appends custom emotions after defaults", () => {
    setupStore({
      customEmotions: [{ id: "cust1", name: "Custom 1", emoji: "⭐" }],
    });
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);
    // custom should be after all defaults
    const lastDefaultIndex = DEFAULT_EMOTIONS.length - 1;
    const custIndex = ids.indexOf("cust1");
    expect(custIndex).toBeGreaterThan(lastDefaultIndex);
  });

  it("allEmotions length = defaults count + custom count", () => {
    setupStore({
      customEmotions: [
        { id: "c1", name: "C1", emoji: "1️⃣" },
        { id: "c2", name: "C2", emoji: "2️⃣" },
      ],
    });
    const { result } = renderHook(() => useEmotionDisplay());
    expect(result.current.allEmotions).toHaveLength(DEFAULT_EMOTIONS.length + 2);
  });
});
