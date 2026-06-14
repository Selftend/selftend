import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Snapshot } from "@/src/features/widgets/snapshot-types";

// DATA-PROTECTION NOTE (non-sensitive derived data by design)
// The snapshot written here contains ONLY pre-computed display values:
//   - mood: today's mood emoji + a pre-localized aggregate glance label (e.g. "7-day 3.8 · 12 logs")
//   - today: per-tool counts/flags (e.g. habits done/total, sleep 7-night average hours, ✓/-)
// Raw user-entered text (journal body, gratitude item text, sleep notes, etc.) is present in the
// intermediate WidgetData object used by the builder, but the builder functions in snapshot-builder.ts
// only extract counts and numeric aggregates - no raw text ever reaches a WidgetPayload field.
// AsyncStorage is OS-sandboxed (other apps cannot read it) but is not encrypted at rest.
// Storing only derived/aggregate display data is intentional so no sensitive user content is
// exposed at the OS storage layer or in Android widget rendering.
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
