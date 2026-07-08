import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_CONFIG,
  readConfig,
  writeConfig,
} from "@/src/features/widgets/widget-config-store";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("widget-config-store", () => {
  it("round-trips a full config object", async () => {
    const cfg = {
      theme: "dark" as const,
      opacity: 0.5,
      cardId: "mood-checkin" as const,
    };
    await writeConfig(1, cfg);
    expect(await readConfig(1)).toEqual(cfg);
    expect(await readConfig(99)).toBeNull();
  });
  it("migrates a legacy bare-array config to the default config", async () => {
    await AsyncStorage.setItem(
      "selftend.widgets.config.2",
      JSON.stringify([{ label: "M", emoji: "🙂", path: "/p" }]),
    );
    const c = await readConfig(2);
    expect(c).toEqual(DEFAULT_CONFIG);
  });
  it("returns null on malformed data", async () => {
    await AsyncStorage.setItem("selftend.widgets.config.3", "{bad");
    expect(await readConfig(3)).toBeNull();
  });
  it("defaults cardId to mood-checkin", () => {
    expect(DEFAULT_CONFIG.cardId).toBe("mood-checkin");
  });
  it("round-trips cardId and falls back when missing", async () => {
    await writeConfig(7, { ...DEFAULT_CONFIG, cardId: "sleep-latest" });
    expect((await readConfig(7))?.cardId).toBe("sleep-latest");
    await AsyncStorage.setItem("selftend.widgets.config.8", JSON.stringify({ theme: "dark" }));
    expect((await readConfig(8))?.cardId).toBe("mood-checkin");
  });
});
