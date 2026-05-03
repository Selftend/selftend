import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { resendVerificationEmail, signOut } from "@/src/features/auth/api";
import { useSession } from "@/src/providers/session-provider";

export function VerifyEmailForm() {
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
        error instanceof Error ? error.message : "Unable to resend verification email.",
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
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          We sent a verification link to {user?.email ?? "your email"}. Open the link to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {errorMessage ? (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        ) : null}

        {resendStatus === "sent" ? (
          <Text className="text-sm text-muted-foreground">
            Verification email resent. Check your inbox.
          </Text>
        ) : null}

        <Button
          disabled={resendStatus === "sending"}
          onPress={() => void onResend()}
          variant="outline"
        >
          {resendStatus === "sending" ? <ActivityIndicator color="#20312c" /> : null}
          <Text>{resendStatus === "sending" ? "Sending..." : "Resend verification email"}</Text>
        </Button>

        <View className="items-center pt-2">
          <Button onPress={() => void onSignOut()} variant="link">
            <Text>Sign out and start over</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
