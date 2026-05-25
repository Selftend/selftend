import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
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
import { resendVerificationEmail, signOut } from "@/src/features/auth/api";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { supabase } from "@/src/lib/supabase";
import { useSession } from "@/src/providers/session-provider";

const CONFIRMATION_POLL_MS = 4000;

export function VerifyEmailForm() {
  const { t } = useTranslation("auth");
  const { session, user } = useSession();
  const { email: emailParam } = useLocalSearchParams<{ email: string }>();
  const email = emailParam ?? user?.email;
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Advance as soon as the provider observes a confirmed session
  // (covers the email-link callback and web cross-tab storage sync).
  useEffect(() => {
    if (session && user?.email_confirmed_at) {
      router.replace("/(app)/(tabs)");
    }
  }, [session, user?.email_confirmed_at]);

  // Backstop poll: re-read the session and, if one exists but is not yet
  // confirmed, refresh it to pick up a newly flipped email_confirmed_at.
  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let active = true;
    const interval = setInterval(() => {
      void (async () => {
        const { data } = await client.auth.getSession();
        let confirmed = Boolean(data.session?.user?.email_confirmed_at);
        if (data.session && !confirmed) {
          const { data: refreshed } = await client.auth.refreshSession();
          confirmed = Boolean(refreshed.session?.user?.email_confirmed_at);
        }
        if (active && confirmed) {
          router.replace("/(app)/(tabs)");
        }
      })();
    }, CONFIRMATION_POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const onResend = async () => {
    if (!email || isThrottled) {
      return;
    }
    try {
      setErrorMessage("");
      setResendStatus("sending");
      await resendVerificationEmail(email);
      recordSuccess();
      setResendStatus("sent");
    } catch (error) {
      recordFailure(error);
      setResendStatus("idle");
      setErrorMessage(t("verifyEmail.resendError"));
    }
  };

  const onSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("verifyEmail.title")}</CardTitle>
        <CardDescription>
          {t("verifyEmail.subtitle", { email: email ?? "your email" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {resendStatus === "sent" ? (
          <Text className="text-sm text-muted-foreground">{t("verifyEmail.resendSuccess")}</Text>
        ) : null}
        {errorMessage && !isThrottled ? (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        ) : null}
        {isThrottled ? (
          <Text className="text-sm text-destructive">{t("verifyEmail.rateLimited")}</Text>
        ) : null}
        <Button
          disabled={!email || resendStatus === "sending" || isThrottled}
          onPress={() => void onResend()}
        >
          {resendStatus === "sending" ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>
            {resendStatus === "sending"
              ? t("verifyEmail.resendSubmitting")
              : t("verifyEmail.resendButton")}
          </Text>
        </Button>
        <View className="items-center">
          <Button disabled={isSigningOut} onPress={() => void onSignOut()} variant="outline">
            <Text>{t("verifyEmail.signOutButton")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
