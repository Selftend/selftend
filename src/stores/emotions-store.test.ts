import AsyncStorage from "@react-native-async-storage/async-storage";

import { useEmotionsStore } from "@/src/stores/emotions-store";

const STORAGE_KEY = "selftend:custom-emotions";
const OVERRIDES_KEY = "selftend:emotion-overrides";

const INITIAL_STATE = {
  customEmotions: [] as { id: string; name: string; emoji: string }[],
  emojiOverrides: {} as Record<string, string>,
};

describe("useEmotionsStore", () => {
  beforeEach(() => {
    useEmotionsStore.setState(INITIAL_STATE);
    // Clear the mock storage between tests
    (AsyncStorage as unknown as { clear: () => void }).clear();
    jest.clearAllMocks();
  });

  // addEmotion
  it("addEmotion appends the emotion to customEmotions", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });

    expect(useEmotionsStore.getState().customEmotions).toEqual([
      { id: "e1", name: "Calm", emoji: "😌" },
    ]);
  });

  it("addEmotion writes the updated list to AsyncStorage", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([{ id: "e1", name: "Calm", emoji: "😌" }]),
    );
  });

  // updateCustomEmotion
  it("updateCustomEmotion merges updates into the matching emotion", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });
    useEmotionsStore.getState().updateCustomEmotion("e1", { name: "Serene" });

    expect(useEmotionsStore.getState().customEmotions[0]).toMatchObject({
      id: "e1",
      name: "Serene",
      emoji: "😌",
    });
  });

  it("updateCustomEmotion writes the updated list to AsyncStorage", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });
    jest.clearAllMocks();
    useEmotionsStore.getState().updateCustomEmotion("e1", { emoji: "🌿" });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([{ id: "e1", name: "Calm", emoji: "🌿" }]),
    );
  });

  // removeCustomEmotion
  it("removeCustomEmotion removes the emotion from state", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });
    useEmotionsStore.getState().addEmotion({ id: "e2", name: "Joy", emoji: "😄" });
    useEmotionsStore.getState().removeCustomEmotion("e1");

    expect(useEmotionsStore.getState().customEmotions).toEqual([
      { id: "e2", name: "Joy", emoji: "😄" },
    ]);
  });

  it("removeCustomEmotion writes the updated list to AsyncStorage", () => {
    useEmotionsStore.getState().addEmotion({ id: "e1", name: "Calm", emoji: "😌" });
    jest.clearAllMocks();
    useEmotionsStore.getState().removeCustomEmotion("e1");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([]));
  });

  // setEmojiOverride
  it("setEmojiOverride adds an emoji override for the given id", () => {
    useEmotionsStore.getState().setEmojiOverride("happy", "🎉");

    expect(useEmotionsStore.getState().emojiOverrides).toEqual({ happy: "🎉" });
  });

  it("setEmojiOverride writes the updated overrides to AsyncStorage", () => {
    useEmotionsStore.getState().setEmojiOverride("happy", "🎉");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      OVERRIDES_KEY,
      JSON.stringify({ happy: "🎉" }),
    );
  });

  it("setEmojiOverride merges with existing overrides", () => {
    useEmotionsStore.getState().setEmojiOverride("happy", "🎉");
    useEmotionsStore.getState().setEmojiOverride("sad", "😢");

    expect(useEmotionsStore.getState().emojiOverrides).toEqual({ happy: "🎉", sad: "😢" });
  });

  // hydrate
  it("hydrate parses customEmotions from AsyncStorage", async () => {
    const emotions = [{ id: "e1", name: "Peace", emoji: "🕊️" }];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(emotions));

    await useEmotionsStore.getState().hydrate();

    expect(useEmotionsStore.getState().customEmotions).toEqual(emotions);
  });

  it("hydrate parses emojiOverrides from AsyncStorage", async () => {
    const overrides = { happy: "😊" };
    await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));

    await useEmotionsStore.getState().hydrate();

    expect(useEmotionsStore.getState().emojiOverrides).toEqual(overrides);
  });

  it("hydrate yields empty defaults when customEmotions key is null", async () => {
    await useEmotionsStore.getState().hydrate();

    expect(useEmotionsStore.getState().customEmotions).toEqual([]);
  });

  it("hydrate yields empty defaults when emojiOverrides key is null", async () => {
    await useEmotionsStore.getState().hydrate();

    expect(useEmotionsStore.getState().emojiOverrides).toEqual({});
  });

  it("hydrate handles malformed customEmotions JSON gracefully by throwing (documents actual behavior)", async () => {
    // The store does not guard against JSON.parse errors — a malformed value will throw.
    // This test documents the actual behavior: hydrate rejects.
    await AsyncStorage.setItem(STORAGE_KEY, "not-json{{{");

    await expect(useEmotionsStore.getState().hydrate()).rejects.toThrow();
  });
});
