import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { sendPasswordResetEmail } from "@/src/features/auth/api";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/src/features/auth/schemas";
import { useSession } from "@/src/providers/session-provider";

export function ForgotPasswordForm() {
  const { hasSupabaseConfig } = useSession();
  const [submitError, setSubmitError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ForgotPasswordSchema>({
    defaultValues: { email: "" },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      setSubmitError("");
      setSentTo("");
      await sendPasswordResetEmail(email);
      setSentTo(email);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send reset email.",
      );
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>Email</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="m@example.com"
                value={value}
              />
              {errors.email?.message ? (
                <Text className="text-sm text-destructive">{errors.email.message}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">
            Supabase auth is not configured yet. Add environment values to continue.
          </Text>
        ) : null}

        {submitError ? (
          <Text className="text-sm text-destructive">{submitError}</Text>
        ) : null}

        {sentTo ? (
          <Text className="text-sm text-muted-foreground">
            A password-reset link was sent to {sentTo}. Check your inbox.
          </Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting}
          onPress={() => void onSubmit()}
        >
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? "Sending..." : "Send reset link"}</Text>
        </Button>

        <View className="items-center pt-2">
          <Button onPress={() => router.push("/")} variant="link">
            <Text>Back to sign in</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
