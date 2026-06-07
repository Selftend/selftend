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
import { resendVerificationEmail } from "@/src/features/auth/api";
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

  useEffect(() => {
    if (session && user?.email_confirmed_at) {
      router.replace("/(app)");
    }
  }, [session, user?.email_confirmed_at]);

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
          router.replace("/(app)");
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
          <Button onPress={() => router.replace("/")} variant="link">
            <Text>{t("verifyEmail.backToSignIn")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
