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
  EMAIL_ALREADY_EXISTS_ERROR,
  LEAKED_PASSWORD_ERROR,
  signUpWithPassword,
} from "@/src/features/auth/api";
import { runGoogleSignIn } from "@/src/features/auth/run-google-sign-in";
import { signUpSchema, type SignUpSchema } from "@/src/features/auth/schemas";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { useSession } from "@/src/providers/session-provider";

export function SignUpForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpSchema>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    resolver: zodResolver(signUpSchema),
  });

  const onGoogleSubmit = () =>
    runGoogleSignIn({
      setSubmitError,
      setIsGoogleSubmitting,
      recordSuccess,
      recordFailure,
      errorFallback: t("signUp.googleError"),
    });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      setSubmitError("");
      await signUpWithPassword(email, password, name);
      recordSuccess();
      router.replace({ pathname: "/(auth)/verify-email", params: { email } });
    } catch (error) {
      recordFailure(error);
      if (error instanceof Error && error.message === EMAIL_ALREADY_EXISTS_ERROR) {
        setSubmitError(t("signUp.emailAlreadyExists"));
      } else if (error instanceof Error && error.message === LEAKED_PASSWORD_ERROR) {
        setSubmitError(t("validation.passwordBreached"));
      } else {
        setSubmitError(error instanceof Error ? error.message : t("signUp.error"));
      }
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
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.name")}</Label>
              <Input
                autoCapitalize="words"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder={t("signUp.namePlaceholder")}
                returnKeyType="next"
                value={value}
              />
              {errors.name?.message ? (
                <Text className="text-sm text-destructive">{errors.name.message}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.email")}</Label>
              <Input
                ref={emailRef}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder={t("signUp.emailPlaceholder")}
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
              <Label>{t("signUp.password")}</Label>
              <Input
                ref={passwordRef}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                placeholder=""
                returnKeyType="next"
                secureTextEntry
                value={value}
              />
              <Text className="text-xs text-muted-foreground">
                {t("validation.passwordMin12Hint")}
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
                ref={confirmPasswordRef}
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
              source={require("../../../assets/branding/google-logo.png")}
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
