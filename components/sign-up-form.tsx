import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { signInWithGoogle, signUpWithPassword } from "@/src/features/auth/api";
import { signUpSchema, type SignUpSchema } from "@/src/features/auth/schemas";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { useSession } from "@/src/providers/session-provider";

export function SignUpForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpSchema>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
    resolver: zodResolver(signUpSchema),
  });

  const onGoogleSubmit = async () => {
    try {
      setSubmitError("");
      setIsGoogleSubmitting(true);
      const didCompleteInApp = await signInWithGoogle();
      if (didCompleteInApp) {
        recordSuccess();
        router.replace("/(app)/(tabs)");
      }
    } catch (error) {
      recordFailure(error);
      setSubmitError(error instanceof Error ? error.message : t("signUp.googleError"));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      setSubmitError("");
      await signUpWithPassword(email, password);
      recordSuccess();
      router.replace("/(auth)/verify-email");
    } catch (error) {
      recordFailure(error);
      setSubmitError(error instanceof Error ? error.message : t("signUp.error"));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signUp.title")}</CardTitle>
        <CardDescription>{t("signUp.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.email")}</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("signUp.emailPlaceholder")}
                value={value}
              />
              {errors.email?.message ? (
                <Text className="text-sm text-destructive">{errors.email.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.password")}</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder=""
                secureTextEntry
                value={value}
              />
              <Text className="text-xs text-muted-foreground">
                {t("validation.passwordRequirementsHint")}
              </Text>
              {errors.password?.message ? (
                <Text className="text-sm text-destructive">{errors.password.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.confirmPassword")}</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder=""
                secureTextEntry
                value={value}
              />
              {errors.confirmPassword?.message ? (
                <Text className="text-sm text-destructive">{errors.confirmPassword.message}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">{t("signUp.supabaseNotConfigured")}</Text>
        ) : null}

        {submitError ? <Text className="text-sm text-destructive">{submitError}</Text> : null}

        {isThrottled ? (
          <Text className="text-sm text-destructive">{t("signUp.rateLimited")}</Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting || isThrottled}
          onPress={() => void onSubmit()}
        >
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? t("signUp.submitting") : t("signUp.submit")}</Text>
        </Button>

        <View className="items-center gap-1 pt-1">
          <Text className="text-sm text-muted-foreground">{t("signUp.hasAccount")}</Text>
          <Button onPress={() => router.push("/")} variant="link">
            <Text>{t("signUp.signInLink")}</Text>
          </Button>
        </View>

        <View className="items-center">
          <Text className="text-sm text-muted-foreground">{t("common:or")}</Text>
        </View>

        <Button
          disabled={!hasSupabaseConfig || isGoogleSubmitting}
          onPress={() => void onGoogleSubmit()}
          variant="outline"
        >
          {isGoogleSubmitting ? (
            <ActivityIndicator color="#20312c" />
          ) : (
            <Image
              source={require("../assets/branding/google-logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          )}
          <Text>{isGoogleSubmitting ? t("signUp.googleOpening") : t("signUp.googleButton")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
