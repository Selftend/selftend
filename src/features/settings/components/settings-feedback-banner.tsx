import { View } from "react-native";

import { Card } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

interface SettingsFeedbackBannerProps {
  title: string;
  message: string;
}

/**
 * The shared success/error feedback `Card`, extracted verbatim from the screen.
 * Rendered by the screen for both the error and success banners so their single
 * shared behavior is preserved (R7).
 */
export function SettingsFeedbackBanner({ title, message }: SettingsFeedbackBannerProps) {
  return (
    <Card className="gap-4 p-5">
      <View className="gap-1">
        <Text className="text-base font-semibold">{title}</Text>
        <Text className="text-xs leading-snug text-muted-foreground">{message}</Text>
      </View>
    </Card>
  );
}
