import { View } from "react-native";

import { cn } from "@/lib/utils";

export function ProgressBar({ progress, className }: { progress: number; className?: string }) {
  return (
    <View className={cn("overflow-hidden rounded-full bg-muted", className)}>
      <View
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </View>
  );
}
