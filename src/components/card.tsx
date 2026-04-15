import type { PropsWithChildren } from "react";
import { View } from "react-native";

import { classNames } from "@/src/utils/class-names";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <View className={classNames("rounded-3xl border border-black/5 bg-white p-5 shadow-card", className)}>
      {children}
    </View>
  );
}
