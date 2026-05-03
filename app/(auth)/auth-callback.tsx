import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { useSession } from "@/src/providers/session-provider";

export default function AuthCallbackScreen() {
  const { hasSupabaseConfig } = useSession();
  const url = Linking.useLinkingURL();
  const hasProcessedLink = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig || !url || hasProcessedLink.current) {
      return;
    }

    hasProcessedLink.current = true;
    let active = true;

    void (async () => {
      try {
        const outcome = await completeAuthRedirect(url);
        if (!active) {
          return;
        }

        if (outcome === "password-recovery") {
          router.replace("/(auth)/update-password");
          return;
        }

        if (outcome === "confirmed") {
          router.replace("/(auth)/sign-in");
          return;
        }

        router.replace("/(app)/(tabs)");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to complete the auth link.");
      }
    })();

    return () => {
      active = false;
    };
  }, [hasSupabaseConfig, url]);

  if (!hasSupabaseConfig) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">Supabase setup required</Text>
            <Card>
              <CardHeader>
                <CardTitle>Authentication is not configured</CardTitle>
                <CardDescription>Add your real Supabase URL and key before testing sign-in.</CardDescription>
              </CardHeader>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">Authentication link problem</Text>
            <Card>
              <CardHeader>
                <CardTitle>Unable to continue</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onPress={() => router.replace("/(auth)/sign-in")}>
                  <Text>Back to sign in</Text>
                </Button>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!url) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">Authentication link required</Text>
            <Card>
              <CardHeader>
                <CardTitle>Missing callback data</CardTitle>
                <CardDescription>
                  Open this screen from an email or OAuth sign-in redirect rather than navigating to it directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onPress={() => router.replace("/(auth)/sign-in")}>
                  <Text>Back to sign in</Text>
                </Button>
              </CardContent>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text variant="h1">Checking your link</Text>
        <ActivityIndicator />
        <Text variant="muted">Completing your sign-in...</Text>
      </View>
    </SafeAreaView>
  );
}
