import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Snapshot } from "@/src/features/widgets/snapshot-types";

export const SNAPSHOT_KEY = "selftend.widgets.snapshot.v1";
const SCHEMA_VERSION = 1;

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function readSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (parsed?.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
