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
import { completeAuthRedirect, parseAuthCallbackUrl } from "@/src/features/auth/callback";
import {
  isAuthCallbackError,
  type AuthCallbackErrorCode,
} from "@/src/features/auth/callback-errors";
import { useSession } from "@/src/providers/session-provider";

const AUTH_CALLBACK_TIMEOUT_MS = 15000;

class CallbackTimeoutError extends Error {}

// The completion either timed out or failed with a classified code. Raw error
// text (GoTrue messages, the URL's error_description) is NEVER stored here -
// the render maps codes to translated copy, so nothing attacker-influenceable
// or jargon-y can reach the screen.
type CallbackFailure = { kind: "timeout" } | { kind: "error"; code: AuthCallbackErrorCode };

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new CallbackTimeoutError());
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
  const [failure, setFailure] = useState<CallbackFailure | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !url || processedUrl.current === url) {
      return;
    }

    processedUrl.current = url;
    let active = true;

    void (async () => {
      try {
        const outcome = await withTimeout(completeAuthRedirect(url), AUTH_CALLBACK_TIMEOUT_MS);
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

        // Failed or not, the URL's auth material (token_hash / code) must not
        // linger in the address bar or browser history. The failure screen's
        // "Request a new link" routing reads the type from the captured `url`
        // variable, not from the location, so scrubbing is safe here too.
        scrubAuthUrlFromHistory();

        if (error instanceof CallbackTimeoutError) {
          setFailure({ kind: "timeout" });
        } else if (isAuthCallbackError(error)) {
          setFailure({ kind: "error", code: error.code });
        } else {
          // Unknown throw (network layer, etc.) - same calm generic copy, never
          // the raw message.
          setFailure({ kind: "error", code: "generic" });
        }
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

  if (failure) {
    const description =
      failure.kind === "timeout" ? t("callback.timeout") : t(`callback.errors.${failure.code}`);
    // "Request a new link" goes where a fresh link of the SAME kind can be
    // requested: recovery links -> the forgot-password form, signup links -> the
    // verify-email screen (resend button), anything else -> sign-in.
    const linkType = url ? parseAuthCallbackUrl(url).type : null;
    const requestNewLinkRoute =
      linkType === "recovery"
        ? "/(auth)/reset-password"
        : linkType === "signup"
          ? "/(auth)/verify-email"
          : "/(auth)/sign-in";

    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <Text variant="h1">{t("callback.linkProblem")}</Text>
            <Card>
              <CardHeader>
                <CardTitle>{t("callback.unableToContinue")}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="gap-3">
                <Button onPress={() => router.replace(requestNewLinkRoute)}>
                  <Text>{t("callback.requestNewLink")}</Text>
                </Button>
                {requestNewLinkRoute !== "/(auth)/sign-in" ? (
                  <Button onPress={() => router.replace("/(auth)/sign-in")} variant="link">
                    <Text>{t("callback.backToSignIn")}</Text>
                  </Button>
                ) : null}
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
                <Button onPress={() => router.replace("/(auth)/sign-in")}>
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
