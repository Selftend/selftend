import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { distortionDefinitions } from "@/src/constants/distortions";

export default function LearnScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">Distortion guide</Text>
            <Text variant="muted">
              Short, app-owned explanations of the distortion patterns the first CBT slice supports.
            </Text>
          </View>

      <Card>
        <CardHeader>
          <CardTitle>Use gently</CardTitle>
          <CardDescription>These patterns are prompts for reflection, not labels to pin on yourself.</CardDescription>
        </CardHeader>
      </Card>

      {distortionDefinitions.map((distortion) => (
        <Card key={distortion.key}>
          <CardHeader>
            <CardTitle>{distortion.title}</CardTitle>
            <CardDescription>
              {distortion.shortDescription} Reflection prompt: {distortion.reflectionPrompt}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
