import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/src/components/card";

export function SectionLinkCard({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  title: string;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1 gap-2">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-mist">
              <Ionicons color="#31413a" name={icon} size={22} />
            </View>
            <Text className="text-xl font-semibold text-ink">{title}</Text>
            <Text className="text-sm leading-6 text-ink/70">{description}</Text>
          </View>
          <Ionicons color="#31413a" name="arrow-forward" size={20} />
        </View>
      </Card>
    </Pressable>
  );
}
