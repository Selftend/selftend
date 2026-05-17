import { useLocalSearchParams } from "expo-router";

import { SleepLogScreen } from "@/src/features/sleep/sleep-log-screen";

export default function EditSleepLogRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const logId = typeof id === "string" ? id : null;

  return (
    <SleepLogScreen
      fallbackHref={logId ? `/tools/sleep/${logId}` : "/tools/sleep"}
      mode="edit"
      logId={logId}
    />
  );
}
