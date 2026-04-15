import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

export function FieldShell({
  children,
  description,
  error,
  label,
}: PropsWithChildren<{ description?: string; error?: string; label: string }>) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wide text-ink/70">{label}</Text>
      {description ? <Text className="text-sm leading-5 text-ink/60">{description}</Text> : null}
      {children}
      {error ? <Text className="text-sm text-ember">{error}</Text> : null}
    </View>
  );
}
