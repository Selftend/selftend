import { Platform } from "react-native";

import { useWidgetSnapshotSync } from "@/src/features/widgets/use-widget-snapshot-sync";

/** Renders nothing; keeps the Android widget snapshot in sync while mounted.
 *  Inert off Android (null userId disables the data queries and the sync effect). */
export function WidgetSnapshotSync({ userId }: { userId: string | null }) {
  useWidgetSnapshotSync(Platform.OS === "android" ? userId : null);
  return null;
}
