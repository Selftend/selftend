import { Text, View } from "react-native";

import { Card } from "@/src/components/card";

export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <Card className="items-start gap-2">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      <Text className="text-sm leading-6 text-ink/70">{body}</Text>
    </Card>
  );
}
