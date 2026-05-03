import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export default function LegalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">Legal and boundaries</Text>
            <Text variant="muted">Product boundaries, public policy pages, and launch-review reminders.</Text>
          </View>

      <Card>
        <CardHeader>
          <CardTitle>Launch review required</CardTitle>
          <CardDescription>
            Policy text is in place for implementation review, but final organization details, contact details, and legal
            approval are still required before public launch.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Product boundary</CardTitle>
          <CardDescription>
            This app is for wellness and guided self-help. It does not diagnose, prescribe, replace therapy, or act as
            emergency support.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Public pages</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => router.push("/privacy")} variant="secondary">
            <Text>Open privacy policy</Text>
          </Button>
          <Button onPress={() => router.push("/terms")} variant="ghost">
            <Text>Open terms of service</Text>
          </Button>
          <Button onPress={() => router.push("/cookies")} variant="ghost">
            <Text>Open cookie policy</Text>
          </Button>
          <Button onPress={() => router.push("/crisis")} variant="ghost">
            <Text>Open crisis guidance</Text>
          </Button>
          <Button onPress={() => router.push("/account-deletion")} variant="ghost">
            <Text>Open account deletion</Text>
          </Button>
          </View>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>License direction</CardTitle>
          <CardDescription>
            The repository is planned under AGPL-3.0-only. Reference repos and curated resource lists may inform design
            decisions, but their code, text, and assets are not copied casually into this project.
          </CardDescription>
        </CardHeader>
      </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
