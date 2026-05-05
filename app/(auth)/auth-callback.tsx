import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { useSession } from "@/src/providers/session-provider";

export default function AuthCallbackScreen() {
  const { t } = useTranslation("auth");
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
          router.replace("/");
          return;
        }

        router.replace("/(app)/(tabs)");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : t("callback.unableToContinue"));
      }
    })();

    return () => {
      active = false;
    };
  }, [hasSupabaseConfig, url, t]);

  if (!hasSupabaseConfig) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">{t("callback.supabaseRequired")}</Text>
            <Card>
              <CardHeader>
                <CardTitle>{t("callback.notConfigured")}</CardTitle>
                <CardDescription>{t("callback.notConfiguredDescription")}</CardDescription>
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
            <Text variant="h1">{t("callback.linkProblem")}</Text>
            <Card>
              <CardHeader>
                <CardTitle>{t("callback.unableToContinue")}</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onPress={() => router.replace("/")}>
                  <Text>{t("callback.backToSignIn")}</Text>
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
            <Text variant="h1">{t("callback.linkRequired")}</Text>
            <Card>
              <CardHeader>
                <CardTitle>{t("callback.missingData")}</CardTitle>
                <CardDescription>{t("callback.missingDataDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onPress={() => router.replace("/")}>
                  <Text>{t("callback.backToSignIn")}</Text>
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
        <Text variant="h1">{t("callback.checking")}</Text>
        <ActivityIndicator />
        <Text variant="muted">{t("callback.completing")}</Text>
      </View>
    </SafeAreaView>
  );
}
