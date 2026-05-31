import { renderHook } from "@testing-library/react-native";

import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import type { EmotionPreference } from "@/src/features/mood/emotion-preferences-repository";
import { useEmotionPreferences } from "@/src/features/mood/emotion-preferences-queries";
import { useEmotionDisplay } from "@/src/features/mood/use-emotion-display";

// Mock the DB-backed preferences query
jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: jest.fn(),
}));

// Mock the session — userId is needed to enable the query (mocked anyway)
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// Mock i18n — make t() return the key unchanged so we can assert on i18n key
// fallback. `t` is a stable reference (as real react-i18next is per-language) so
// the memoized allEmotions can be asserted as referentially stable.
const stableT = (key: string) => key; // returns key unchanged — fallback case
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: stableT }),
}));

const mockUseEmotionPreferences = useEmotionPreferences as jest.MockedFunction<
  typeof useEmotionPreferences
>;

// Build a full EmotionPreference row with sensible defaults.
function pref(
  overrides: Partial<EmotionPreference> & Pick<EmotionPreference, "emotionId">,
): EmotionPreference {
  return {
    id: `id-${overrides.emotionId}`,
    userId: "user-1",
    name: null,
    emoji: null,
    position: 0,
    removed: false,
    isCustom: false,
    ...overrides,
  };
}

// Helper to set the preferences the mocked query returns.
function setPrefs(rows: EmotionPreference[] = []) {
  mockUseEmotionPreferences.mockReturnValue({ data: rows, isLoading: false } as ReturnType<
    typeof useEmotionPreferences
  >);
}

// Helper to simulate the query still loading (no data yet).
function setLoading() {
  mockUseEmotionPreferences.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<
    typeof useEmotionPreferences
  >);
}

// Seed a full set of default emotion rows (mirrors what listOrSeed produces).
function seededDefaults(): EmotionPreference[] {
  return DEFAULT_EMOTIONS.map((e, i) => pref({ emotionId: e.id, position: i }));
}

describe("useEmotionDisplay — resolveEmotion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("a custom preference wins over the builtin for the same id", () => {
    setPrefs([pref({ emotionId: "happy", name: "My Happy", emoji: "🎉", isCustom: true })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");
    expect(resolved).toMatchObject({ id: "happy", name: "My Happy", emoji: "🎉", isCustom: true });
  });

  it("a custom preference falls back to 💭 when emoji is null", () => {
    setPrefs([pref({ emotionId: "myemotion", name: "My Emotion", isCustom: true })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("myemotion");
    expect(resolved.emoji).toBe("💭");
    expect(resolved.isCustom).toBe(true);
  });

  it("builtin uses the emoji override when a preference supplies one", () => {
    setPrefs([pref({ emotionId: "anxious", emoji: "😱" })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("anxious");
    expect(resolved.emoji).toBe("😱");
    expect(resolved.isCustom).toBe(false);
  });

  it("builtin uses i18n key, falling back to id when translation equals the key", () => {
    // Our mock t() returns the key unchanged, so name should fall back to id
    setPrefs();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");
    // t("emotions.happy") === "emotions.happy" (key unchanged) => name falls back to id "happy"
    expect(resolved.name).toBe("happy");
    expect(resolved.isCustom).toBe(false);
    expect(resolved.emoji).toBe("😊");
  });

  it("a built-in default uses its default emoji when no preference exists", () => {
    setPrefs();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("anxious");
    expect(resolved.emoji).toBe("😰");
    expect(resolved.isCustom).toBe(false);
  });

  it("a legacy uppercased id resolves via lowercase lookup", () => {
    setPrefs();
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("Happy");
    // Should resolve via legacy path: legacyId = "happy" which is in DEFAULT_EMOTIONS
    expect(resolved.id).toBe("Happy");
    expect(resolved.isCustom).toBe(false);
    // emoji should be from the lowercase builtin
    expect(resolved.emoji).toBe("😊");
  });

  it("unknown id returns the fallback emoji 💭", () => {
    setPrefs();
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

describe("useEmotionDisplay — allEmotions (rows-authoritative)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("derives the list ONLY from the DB rows, not from DEFAULT_EMOTIONS", () => {
    // Only two seeded rows exist; the list must contain exactly those, never the
    // full DEFAULT_EMOTIONS constant.
    setPrefs([pref({ emotionId: "happy", position: 0 }), pref({ emotionId: "sad", position: 1 })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids).toEqual(["happy", "sad"]);
    expect(ids).toHaveLength(2);
    expect(ids.length).toBeLessThan(DEFAULT_EMOTIONS.length);
  });

  it("is empty and isLoading is true while the query is pending (no constants flash)", () => {
    setLoading();
    const { result } = renderHook(() => useEmotionDisplay());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.allEmotions).toEqual([]);
  });

  it("isLoading is false once rows have loaded", () => {
    setPrefs(seededDefaults());
    const { result } = renderHook(() => useEmotionDisplay());

    expect(result.current.isLoading).toBe(false);
  });

  it("renders the full seeded set of defaults when all are present as rows", () => {
    setPrefs(seededDefaults());
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids).toEqual(DEFAULT_EMOTIONS.map((e) => e.id));
  });

  it("sorts rows by persisted position ascending", () => {
    setPrefs([
      pref({ emotionId: "sad", position: 2 }),
      pref({ emotionId: "happy", position: 0 }),
      pref({ emotionId: "angry", position: 1 }),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids).toEqual(["happy", "angry", "sad"]);
  });

  it("a custom preference row is present in allEmotions", () => {
    setPrefs([
      pref({ emotionId: "happy", position: 0 }),
      pref({ emotionId: "c1", name: "C1", emoji: "1️⃣", isCustom: true, position: 1 }),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());
    const found = result.current.allEmotions.find((e) => e.id === "c1");

    expect(found).toMatchObject({ id: "c1", name: "C1", emoji: "1️⃣", isCustom: true });
  });

  it("a custom row sorts by its position alongside built-in rows", () => {
    setPrefs([
      pref({ emotionId: "happy", position: 0 }),
      pref({ emotionId: "cust1", name: "Custom 1", emoji: "⭐", isCustom: true, position: 1 }),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids).toEqual(["happy", "cust1"]);
  });

  it("a newly added custom (highest position) lands last", () => {
    setPrefs([
      ...seededDefaults(),
      pref({
        emotionId: "newcust",
        name: "New",
        emoji: "✨",
        isCustom: true,
        position: DEFAULT_EMOTIONS.length,
      }),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids[ids.length - 1]).toBe("newcust");
  });

  it("a removed row is absent from allEmotions", () => {
    setPrefs([
      pref({ emotionId: "happy", position: 0 }),
      pref({ emotionId: "sad", position: 1, removed: true }),
      pref({ emotionId: "angry", position: 2, removed: true }),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());
    const ids = result.current.allEmotions.map((e) => e.id);

    expect(ids).toContain("happy");
    expect(ids).not.toContain("sad");
    expect(ids).not.toContain("angry");
  });

  it("allEmotions length drops by the number of removed rows", () => {
    setPrefs([
      pref({ emotionId: "sad", position: 0, removed: true }),
      pref({ emotionId: "angry", position: 1, removed: true }),
      ...DEFAULT_EMOTIONS.filter((e) => e.id !== "sad" && e.id !== "angry").map((e, i) =>
        pref({ emotionId: e.id, position: i + 2 }),
      ),
    ]);
    const { result } = renderHook(() => useEmotionDisplay());

    expect(result.current.allEmotions).toHaveLength(DEFAULT_EMOTIONS.length - 2);
  });

  it("resolveEmotion still falls back to constants for an id with no row", () => {
    // The list is rows-authoritative, but resolveEmotion must keep resolving
    // logged emotion ids that are not in the current rows (e.g. a removed
    // default still shown on an old entry).
    setPrefs([pref({ emotionId: "happy", position: 0 })]);
    const { result } = renderHook(() => useEmotionDisplay());

    // "anxious" has no row, but is a built-in default — resolve via the fallback.
    const resolved = result.current.resolveEmotion("anxious");
    expect(resolved.emoji).toBe("😰");
    expect(resolved.isCustom).toBe(false);
  });

  it("returns a stable allEmotions reference across re-renders with unchanged prefs", () => {
    setPrefs(seededDefaults());
    const { result, rerender } = renderHook(() => useEmotionDisplay());
    const first = result.current.allEmotions;
    rerender({});
    expect(result.current.allEmotions).toBe(first);
  });
});

describe("useEmotionDisplay — name overrides", () => {
  beforeEach(() => jest.clearAllMocks());

  it("a built-in with a name preference shows the overridden name", () => {
    setPrefs([pref({ emotionId: "happy", name: "Joyful" })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");

    expect(resolved.name).toBe("Joyful");
    expect(resolved.isCustom).toBe(false);
  });

  it("a name preference takes precedence over the i18n translation for a built-in", () => {
    // Our mock t() returns key unchanged (e.g. "emotions.happy"),
    // so a name override should win over that fallback
    setPrefs([pref({ emotionId: "happy", name: "My Happy Label" })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const resolved = result.current.resolveEmotion("happy");

    expect(resolved.name).toBe("My Happy Label");
  });

  it("allEmotions shows the overridden name for a built-in in the list", () => {
    setPrefs([pref({ emotionId: "happy", name: "Joyful" })]);
    const { result } = renderHook(() => useEmotionDisplay());
    const happyInList = result.current.allEmotions.find((e) => e.id === "happy");

    expect(happyInList?.name).toBe("Joyful");
  });
});
