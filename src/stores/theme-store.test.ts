import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeStore } from "@/src/stores/theme-store";

const STORAGE_KEY = "selftend:theme";

describe("theme store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ preference: "system", hydrated: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to system when nothing is stored", async () => {
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("hydrates a previously persisted preference", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "dark");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("ignores garbage values in storage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "neon");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("system");
  });

  it("persists the preference when setPreference is called", async () => {
    useThemeStore.getState().setPreference("light");

    expect(useThemeStore.getState().preference).toBe("light");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("settles on the default when nothing is stored", async () => {
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("settles even when the stored value is garbage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "neon");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("settles as soon as the user makes a choice", () => {
    useThemeStore.getState().setPreference("dark");

    expect(useThemeStore.getState().hydrated).toBe(true);
  });

  it("leaves a settled preference alone when hydrate runs again", async () => {
    useThemeStore.getState().setPreference("dark");
    await AsyncStorage.setItem(STORAGE_KEY, "light");

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().preference).toBe("dark");
  });

  it("discards a storage read that lands after the user has chosen", async () => {
    // The reproduced race: a consumer mounts and starts hydrate(), the user picks a
    // theme while that read is still in flight, and the older on-disk value resolves
    // last. The choice must win regardless of arrival order.
    let releaseRead: (value: string) => void = () => {};
    jest.spyOn(AsyncStorage, "getItem").mockReturnValue(
      new Promise<string>((resolve) => {
        releaseRead = resolve;
      }),
    );

    const hydrating = useThemeStore.getState().hydrate();
    useThemeStore.getState().setPreference("dark");
    releaseRead("light");
    await hydrating;

    expect(useThemeStore.getState().preference).toBe("dark");
    expect(useThemeStore.getState().hydrated).toBe(true);
  });
});
