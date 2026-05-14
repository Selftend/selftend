import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/src/components/react-native-reusables/button";
import { useColorScheme } from "nativewind";
import { View } from "react-native";
import type { ComponentProps } from "react";

export type SocialConnection = {
  id: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
};

export type SocialConnectionsProps = {
  connections: SocialConnection[];
};

export function SocialConnections({ connections }: SocialConnectionsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row gap-1">
      {connections.map((item) => (
        <Button key={item.id} variant="ghost" size="sm" className="flex-1" onPress={item.onPress}>
          <Ionicons name={item.icon} size={18} color={isDark ? "#fafafa" : "#0a0a0a"} />
        </Button>
      ))}
    </View>
  );
}
