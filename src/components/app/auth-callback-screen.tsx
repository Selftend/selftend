import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { completeAuthRedirect } from "@/src/features/auth/callback";
import { useSession } from "@/src/providers/session-provider";

const AUTH_CALLBACK_TIMEOUT_MS = 15000;

function getCurrentWebUrl() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  return window.location.href;
}

// After the callback is handled, strip any auth material (code / token_hash, or legacy
// access_token / refresh_token in the hash) out of the URL so it never persists in the
// browser address bar or history on a shared machine.
function scrubAuthUrlFromHistory() {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  window.history.replaceState(window.history.state, "", window.location.pathname);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export default function AuthCallbackScreen() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  const linkingUrl = Linking.useLinkingURL();
  const url = linkingUrl ?? getCurrentWebUrl();
  const processedUrl = useRef<string | null>(null);
  const fallbackErrorMessage = useRef(t("callback.unableToContinue"));
  const timeoutErrorMessage = useRef(t("callback.timeout"));
  const [errorMessage, setErrorMessage] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    fallbackErrorMessage.current = t("callback.unableToContinue");
    timeoutErrorMessage.current = t("callback.timeout");
  }, [t]);

  useEffect(() => {
    if (!hasSupabaseConfig || !url || processedUrl.current === url) {
      return;
    }

    processedUrl.current = url;
    let active = true;

    void (async () => {
      try {
        const outcome = await withTimeout(
          completeAuthRedirect(url),
          AUTH_CALLBACK_TIMEOUT_MS,
          timeoutErrorMessage.current,
        );
        if (!active) {
          return;
        }

        scrubAuthUrlFromHistory();

        if (outcome === "password-recovery") {
          router.replace("/(auth)/update-password");
          return;
        }

        if (outcome === "email-verified") {
          setVerified(true);
          return;
        }

        if (outcome === "confirmed") {
          router.replace("/");
          return;
        }

        router.replace("/(app)");
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : fallbackErrorMessage.current);
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

  if (verified) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-6 p-6">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>{t("callback.verifiedTitle")}</CardTitle>
              <CardDescription>{t("callback.verifiedBody")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onPress={() => router.replace("/(app)")}>
                <Text>{t("callback.continueButton")}</Text>
              </Button>
            </CardContent>
          </Card>
        </View>
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
