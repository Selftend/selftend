import { ActivityIndicator } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";

export function SubmitButtonContent({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <>
      {pending ? <ActivityIndicator color="#ffffff" /> : null}
      <Text>{pending ? pendingLabel : idleLabel}</Text>
    </>
  );
}
