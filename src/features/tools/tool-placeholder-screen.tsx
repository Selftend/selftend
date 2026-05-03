import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

interface ToolPlaceholderScreenProps {
  title: string;
  description: string;
}

export function ToolPlaceholderScreen({ title, description }: ToolPlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{title}</Text>
            <Text variant="muted">{description}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Under construction</CardTitle>
              <CardDescription>
                This tool is not available yet. For now, Selftend is focused on the working CBT section.
              </CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
