import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  resendVerificationEmail,
  signInWithGoogle,
  signInWithPassword,
} from "@/src/features/auth/api";
import { signInSchema, type SignInSchema } from "@/src/features/auth/schemas";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { useSession } from "@/src/providers/session-provider";

export function SignInForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
  } = useForm<SignInSchema>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(signInSchema),
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
      setSubmitError(error instanceof Error ? error.message : t("signIn.googleError"));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      setSubmitError("");
      setIsEmailNotConfirmed(false);
      setResendStatus("idle");
      await signInWithPassword(email, password);
      recordSuccess();
      router.replace("/(app)/(tabs)");
    } catch (error) {
      recordFailure(error);
      const rawMessage = error instanceof Error ? error.message : "";
      const isNotConfirmed = rawMessage.toLowerCase().includes("not confirmed");
      setIsEmailNotConfirmed(isNotConfirmed);
      setSubmitError(
        isNotConfirmed ? t("signIn.emailNotConfirmed") : rawMessage || t("signIn.error"),
      );
    }
  });

  const onResend = async () => {
    const email = getValues("email");
    if (!email) return;
    try {
      setResendStatus("sending");
      await resendVerificationEmail(email);
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
      setSubmitError(t("signIn.resendError"));
      setIsEmailNotConfirmed(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signIn.title")}</CardTitle>
        <CardDescription>{t("signIn.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signIn.email")}</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder={t("signIn.emailPlaceholder")}
                returnKeyType="next"
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
              <View className="flex-row items-center justify-between">
                <Label>{t("signIn.password")}</Label>
                <Button
                  onPress={() => router.push("/(auth)/reset-password")}
                  variant="link"
                  size="sm"
                >
                  <Text className="text-xs">{t("signIn.forgotPassword")}</Text>
                </Button>
              </View>
              <Input
                ref={passwordRef}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void onSubmit()}
                placeholder=""
                returnKeyType="go"
                secureTextEntry
                value={value}
              />
              {errors.password?.message ? (
                <Text className="text-sm text-destructive">{errors.password.message}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">{t("signIn.supabaseNotConfigured")}</Text>
        ) : null}

        {resendStatus === "sent" ? (
          <Text className="text-sm text-muted-foreground">{t("signIn.resendSuccess")}</Text>
        ) : submitError ? (
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className="text-sm text-destructive">{submitError}</Text>
            {isEmailNotConfirmed ? (
              <Button
                disabled={resendStatus === "sending"}
                onPress={() => void onResend()}
                variant="link"
                size="sm"
              >
                <Text className="text-xs">
                  {resendStatus === "sending" ? t("signIn.resendSending") : t("signIn.resendLink")}
                </Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        {isThrottled ? (
          <Text className="text-sm text-destructive">{t("signIn.rateLimited")}</Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting || isThrottled}
          onPress={() => void onSubmit()}
        >
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? t("signIn.submitting") : t("signIn.submit")}</Text>
        </Button>

        <View className="items-center gap-1 pt-1">
          <Text className="text-sm text-muted-foreground">{t("signIn.noAccount")}</Text>
          <Button onPress={() => router.push("/(auth)/sign-up")} variant="link">
            <Text>{t("signIn.signUpLink")}</Text>
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
              source={require("../../../assets/branding/google-logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          )}
          <Text>{isGoogleSubmitting ? t("signIn.googleOpening") : t("signIn.googleButton")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
