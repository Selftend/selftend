import { Platform } from "react-native";

import { useWidgetSnapshotSync } from "@/src/features/widgets/use-widget-snapshot-sync";
import type { UserPreferences } from "@/src/features/modules/types";

/** Renders nothing; keeps the Android widget snapshot in sync while mounted.
 *  Inert off Android (null userId disables the data queries and the sync effect). */
export function WidgetSnapshotSync({
  userId,
  preferences,
}: {
  userId: string | null;
  preferences: UserPreferences | null | undefined;
}) {
  useWidgetSnapshotSync(Platform.OS === "android" ? userId : null, preferences);
  return null;
}
