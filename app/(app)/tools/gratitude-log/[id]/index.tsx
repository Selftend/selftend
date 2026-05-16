import { Redirect, useLocalSearchParams } from "expo-router";

export default function GratitudeDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/modules/gratitude/entries/${id}`} />;
}
