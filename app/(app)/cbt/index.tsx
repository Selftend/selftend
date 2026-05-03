import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export default function CbtHomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">CBT</Text>
            <Text variant="muted">
              A focused CBT section built around thought records, distortion awareness, and quiet review.
            </Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Why the scope is narrow</CardTitle>
              <CardDescription>
                The first build stays narrow on purpose: one practical tool, a small learn surface, and a private
                history.
              </CardDescription>
            </CardHeader>
          </Card>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={() => router.push("/cbt/new")}>
                <Text>New record</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button onPress={() => router.push("/cbt/learn")} variant="secondary">
                <Text>Learn</Text>
              </Button>
            </View>
          </View>

          <Pressable onPress={() => router.push("/cbt/learn")}>
            <Card>
              <CardHeader>
                <CardTitle>Distortion guide</CardTitle>
                <CardDescription>See the core thinking patterns this section currently focuses on.</CardDescription>
              </CardHeader>
            </Card>
          </Pressable>
          <Pressable onPress={() => router.push("/cbt/history")}>
            <Card>
              <CardHeader>
                <CardTitle>Record history</CardTitle>
                <CardDescription>
                  Review the records you have already saved without mixing CBT with unrelated modules.
                </CardDescription>
              </CardHeader>
            </Card>
          </Pressable>

          <View className="gap-2">
            <Text variant="h3">The current flow</Text>
            <Text variant="muted">
              Capture the situation, name the first thought, choose emotions, notice distortions, and respond with a
              more balanced thought.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
