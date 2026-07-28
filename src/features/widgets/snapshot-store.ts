import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Snapshot } from "@/src/features/widgets/snapshot-types";

// DATA-PROTECTION NOTE (non-sensitive derived data by design)
// The snapshot holds pre-computed display values and the short user-entered titles the in-app
// cards themselves display (activity name, committed-action titles, defusion technique) - never
// long-form content (journal bodies, gratitude items, notes). AsyncStorage remains OS-sandboxed
// (other apps cannot read it) but is not encrypted at rest.
// Raw user-entered text (journal body, gratitude item text, sleep notes, etc.) is present in the
// intermediate WidgetData object used by the builder, but the builder functions in snapshot-builder.ts
// only extract counts, numeric aggregates, and those short titles - no long-form text ever reaches
// a CardPayload field.
// Storing only derived/aggregate display data (plus short titles) is intentional so no sensitive
// user content is exposed at the OS storage layer or in Android widget rendering.
export const SNAPSHOT_KEY = "selftend.widgets.snapshot.v1";
// v3: the `habits-today` payload's discriminant changed from "habits" to
// "activities" (#330). A stale v2 snapshot would still parse but no card would match
// its kind, so the widget would render blank until the next sync - bumping discards it
// outright instead, which is what this version exists for.
const SCHEMA_VERSION = 3;

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
