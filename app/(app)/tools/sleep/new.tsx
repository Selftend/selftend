import { SleepLogScreen } from "@/src/features/sleep/sleep-log-screen";

export default function NewSleepLogRoute() {
  return <SleepLogScreen fallbackHref="/tools/sleep" mode="create" />;
}
