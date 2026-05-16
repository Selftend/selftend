import { Redirect, router, useLocalSearchParams } from "expo-router";

export default function LegacyThoughtRecordDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recordId = typeof id === "string" ? id : null;

  if (!recordId) {
    return <Redirect href={"/modules/cbt/history" as Parameters<typeof router.push>[0]} />;
  }

  return (
    <Redirect href={`/modules/cbt/history/${recordId}` as Parameters<typeof router.push>[0]} />
  );
}
