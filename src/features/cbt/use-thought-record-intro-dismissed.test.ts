import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY,
  useThoughtRecordIntroDismissed,
  useThoughtRecordIntroStore,
} from "@/src/features/cbt/use-thought-record-intro-dismissed";

describe("useThoughtRecordIntroDismissed", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThoughtRecordIntroStore.setState({ dismissed: false, hydrated: false });
  });

  it("starts undismissed and hydrates from empty storage", async () => {
    const { result } = renderHook(() => useThoughtRecordIntroDismissed());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.dismissed).toBe(false);
  });

  it("hydrates dismissed=true when the flag was previously persisted", async () => {
    await AsyncStorage.setItem(THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY, "1");

    const { result } = renderHook(() => useThoughtRecordIntroDismissed());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.dismissed).toBe(true);
  });

  it("dismiss() flips dismissed immediately and persists the flag", async () => {
    const { result } = renderHook(() => useThoughtRecordIntroDismissed());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => result.current.dismiss());

    expect(result.current.dismissed).toBe(true);
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY)).toBe("1"),
    );
  });

  it("stays dismissed for a fresh hook instance once persisted", async () => {
    const first = renderHook(() => useThoughtRecordIntroDismissed());
    await waitFor(() => expect(first.result.current.hydrated).toBe(true));
    act(() => first.result.current.dismiss());
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(THOUGHT_RECORD_INTRO_DISMISSED_STORAGE_KEY)).toBe("1"),
    );

    // Simulate a fresh app session: reset in-memory state, keep storage as-is.
    act(() => useThoughtRecordIntroStore.setState({ dismissed: false, hydrated: false }));

    const second = renderHook(() => useThoughtRecordIntroDismissed());
    await waitFor(() => expect(second.result.current.hydrated).toBe(true));

    expect(second.result.current.dismissed).toBe(true);
  });

  it("still flips `hydrated` (safe passthrough) when the storage read fails", async () => {
    const spy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage unavailable"));

    const { result } = renderHook(() => useThoughtRecordIntroDismissed());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.dismissed).toBe(false);

    spy.mockRestore();
  });
});
