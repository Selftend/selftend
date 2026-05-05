import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { resendVerificationEmail, signOut } from "@/src/features/auth/api";
import { useSession } from "@/src/providers/session-provider";

export function VerifyEmailForm() {
  const { t } = useTranslation("auth");
  const { user } = useSession();
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onResend = async () => {
    if (!user?.email) return;
    try {
      setErrorMessage("");
      setResendStatus("sending");
      await resendVerificationEmail(user.email);
      setResendStatus("sent");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("verifyEmail.resendError"),
      );
      setResendStatus("idle");
    }
  };

  const onSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("verifyEmail.title")}</CardTitle>
        <CardDescription>
          {t("verifyEmail.subtitle", { email: user?.email ?? "your email" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {errorMessage ? (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        ) : null}

        {resendStatus === "sent" ? (
          <Text className="text-sm text-muted-foreground">
            {t("verifyEmail.resendSuccess")}
          </Text>
        ) : null}

        <Button
          disabled={resendStatus === "sending"}
          onPress={() => void onResend()}
          variant="outline"
        >
          {resendStatus === "sending" ? <ActivityIndicator color="#20312c" /> : null}
          <Text>{resendStatus === "sending" ? t("verifyEmail.resendSubmitting") : t("verifyEmail.resendButton")}</Text>
        </Button>

        <View className="items-center pt-2">
          <Button onPress={() => void onSignOut()} variant="link">
            <Text>{t("verifyEmail.signOutButton")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
