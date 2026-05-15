import { Redirect } from "expo-router";

export default function HistoryRedirectScreen() {
  return (
    <Redirect href={"/modules/cbt/history" as React.ComponentProps<typeof Redirect>["href"]} />
  );
}
