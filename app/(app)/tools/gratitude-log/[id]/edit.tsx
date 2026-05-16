import { Redirect, useLocalSearchParams } from "expo-router";

export default function GratitudeEditRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/modules/gratitude/entries/${id}/edit`} />;
}
