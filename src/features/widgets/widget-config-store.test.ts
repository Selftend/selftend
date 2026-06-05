import AsyncStorage from "@react-native-async-storage/async-storage";
import { readConfig, writeConfig } from "@/src/features/widgets/widget-config-store";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("widget-config-store", () => {
  it("round-trips a full config object", async () => {
    const cfg = {
      shortcuts: [{ label: "Mood", emoji: "🙂", path: "/tools/mood-tracker/new" }],
      statKeys: ["mood", "sleep"],
      theme: "dark" as const,
      opacity: 0.5,
    };
    await writeConfig(1, cfg);
    expect(await readConfig(1)).toEqual(cfg);
    expect(await readConfig(99)).toBeNull();
  });
  it("migrates a legacy bare-array config", async () => {
    await AsyncStorage.setItem(
      "selftend.widgets.config.2",
      JSON.stringify([{ label: "M", emoji: "🙂", path: "/p" }]),
    );
    const c = await readConfig(2);
    expect(c?.shortcuts).toHaveLength(1);
    expect(c?.theme).toBe("app");
    expect(c?.opacity).toBe(1);
  });
  it("returns null on malformed data", async () => {
    await AsyncStorage.setItem("selftend.widgets.config.3", "{bad");
    expect(await readConfig(3)).toBeNull();
  });
});
