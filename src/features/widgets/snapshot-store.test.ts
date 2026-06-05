import AsyncStorage from "@react-native-async-storage/async-storage";
import { readSnapshot, writeSnapshot, SNAPSHOT_KEY } from "@/src/features/widgets/snapshot-store";
import { buildSignedOutSnapshot } from "@/src/features/widgets/snapshot-builder";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("snapshot store", () => {
  it("round-trips a snapshot", async () => {
    const snap = buildSignedOutSnapshot("en", "2026-06-05", "system");
    await writeSnapshot(snap);
    expect(await AsyncStorage.getItem(SNAPSHOT_KEY)).not.toBeNull();
    expect(await readSnapshot()).toEqual(snap);
  });

  it("returns null when nothing is stored", async () => {
    expect(await readSnapshot()).toBeNull();
  });

  it("returns null on malformed JSON instead of throwing", async () => {
    await AsyncStorage.setItem(SNAPSHOT_KEY, "{not json");
    expect(await readSnapshot()).toBeNull();
  });

  it("ignores a snapshot with a different schemaVersion", async () => {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ schemaVersion: 999 }));
    expect(await readSnapshot()).toBeNull();
  });
});
