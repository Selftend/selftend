import AsyncStorage from "@react-native-async-storage/async-storage";

import { useThemeStore } from "@/src/stores/theme-store";

const STORAGE_KEY = "selftend:theme";

describe("theme store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ preference: "system" });
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
});
