import { Text, View } from "react-native";

import { Card } from "@/src/components/card";
import { classNames } from "@/src/utils/class-names";

export function NoticeCard({
  body,
  tone = "soft",
  title,
}: {
  body: string;
  tone?: "soft" | "warning";
  title: string;
}) {
  return (
    <Card className={classNames(tone === "soft" ? "bg-mist" : "bg-amber-50")}>
      <View className="gap-2">
        <Text className="text-base font-semibold text-ink">{title}</Text>
        <Text className="text-sm leading-6 text-ink/70">{body}</Text>
      </View>
    </Card>
  );
}
