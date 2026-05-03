import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { appEnv } from "@/src/lib/env";

export default function SupportScreen() {
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("SelfTend support");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">Support</Text>
            <Text variant="muted">Project links, public contact paths, policy pages, and clear safety boundaries.</Text>
          </View>

      <Card>
        <CardHeader>
          <CardTitle>Important boundary</CardTitle>
          <CardDescription>
            This app is built as guided self-help. If you need urgent help or crisis support, use local emergency and
            crisis resources instead of relying on the app.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          {supportEmail ? (
            <Button
              onPress={() => void Linking.openURL(`mailto:${supportEmail}?subject=${supportSubject}`)}
            >
              <Text>Email support</Text>
            </Button>
          ) : (
            <Text variant="muted">
              Set EXPO_PUBLIC_SUPPORT_EMAIL before public launch. Until then, use GitHub issues for project feedback
              that does not include private health details.
            </Text>
          )}
          <Button onPress={() => router.push("/account-deletion")} variant="ghost">
            <Text>Request account deletion</Text>
          </Button>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project links</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}>
            <Text>Open repository</Text>
          </Button>
          <Button
            onPress={() => void Linking.openURL(`${appEnv.githubRepoUrl}/blob/main/CONTRIBUTING.md`)}
            variant="secondary"
          >
            <Text>Open contribution guide</Text>
          </Button>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policies and safety</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="gap-3">
          <Button onPress={() => router.push("/crisis")} variant="secondary">
            <Text>Open crisis guidance</Text>
          </Button>
          <Button onPress={() => router.push("/privacy")} variant="ghost">
            <Text>Open privacy policy</Text>
          </Button>
          <Button onPress={() => router.push("/terms")} variant="ghost">
            <Text>Open terms and boundaries</Text>
          </Button>
          </View>
        </CardContent>
      </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
