import { ActivityIndicator, Text, View } from "react-native";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View className="min-h-32 items-center justify-center gap-3">
      <ActivityIndicator color="#31413a" />
      <Text className="text-sm text-ink/60">{label}</Text>
    </View>
  );
}
