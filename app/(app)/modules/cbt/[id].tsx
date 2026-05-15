import { Redirect, useLocalSearchParams } from "expo-router";

export default function LegacyThoughtRecordDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === "string" ? id : null;

  if (!recordId) {
    return <Redirect href="/modules/cbt/history" />;
  }

  return <Redirect href={`/modules/cbt/history/${recordId}`} />;
}
