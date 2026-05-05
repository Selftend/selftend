import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { sendPasswordResetEmail } from "@/src/features/auth/api";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/src/features/auth/schemas";
import { useSession } from "@/src/providers/session-provider";

export function ForgotPasswordForm() {
  const { t } = useTranslation("auth");
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
      setSubmitError(error instanceof Error ? error.message : t("forgotPassword.error"));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("forgotPassword.title")}</CardTitle>
        <CardDescription>{t("forgotPassword.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("forgotPassword.email")}</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("forgotPassword.emailPlaceholder")}
                value={value}
              />
              {errors.email?.message ? (
                <Text className="text-sm text-destructive">{errors.email.message}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">{t("forgotPassword.supabaseNotConfigured")}</Text>
        ) : null}

        {submitError ? <Text className="text-sm text-destructive">{submitError}</Text> : null}

        {sentTo ? (
          <Text className="text-sm text-muted-foreground">
            {t("forgotPassword.success", { sentTo })}
          </Text>
        ) : null}

        <Button disabled={!hasSupabaseConfig || isSubmitting} onPress={() => void onSubmit()}>
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? t("forgotPassword.submitting") : t("forgotPassword.submit")}</Text>
        </Button>

        <View className="items-center pt-2">
          <Button onPress={() => router.push("/")} variant="link">
            <Text>{t("forgotPassword.backToSignIn")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
