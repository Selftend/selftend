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
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import {
  EMAIL_ALREADY_EXISTS_ERROR,
  LEAKED_PASSWORD_ERROR,
  signUpWithPassword,
} from "@/src/features/auth/api";
import { runGoogleSignIn } from "@/src/features/auth/run-google-sign-in";
import { signUpSchema, type SignUpSchema } from "@/src/features/auth/schemas";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useSession } from "@/src/providers/session-provider";
import { THEME } from "@/lib/theme";

export function SignUpForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  const colorScheme = useColorSchemeName();
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
        <CardTitle aria-level={1}>{t("signUp.title")}</CardTitle>
        <CardDescription>{t("signUp.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Button
          disabled={!hasSupabaseConfig || isGoogleSubmitting}
          onPress={() => void onGoogleSubmit()}
          variant="outline"
        >
          {isGoogleSubmitting ? (
            <ActivityIndicator color={THEME[colorScheme].mutedForeground} />
          ) : (
            <Image
              source={require("../../../assets/branding/google-logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          )}
          <Text>{isGoogleSubmitting ? t("signUp.googleOpening") : t("signUp.googleButton")}</Text>
        </Button>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs text-muted-foreground">{t("common:orContinueWithEmail")}</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.name")}</Label>
              <Input
                accessibilityLabel={t("signUp.name")}
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
                <Text className="text-sm text-destructive">{t(errors.name.message)}</Text>
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
                accessibilityLabel={t("signUp.email")}
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
                <Text className="text-sm text-destructive">{t(errors.email.message)}</Text>
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
                accessibilityLabel={t("signUp.password")}
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
                <Text className="text-sm text-destructive">{t(errors.password.message)}</Text>
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
                accessibilityLabel={t("signUp.confirmPassword")}
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
                <Text className="text-sm text-destructive">
                  {t(errors.confirmPassword.message)}
                </Text>
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
          <SubmitButtonContent
            pending={isSubmitting}
            idleLabel={t("signUp.submit")}
            pendingLabel={t("signUp.submitting")}
          />
        </Button>

        <View className="flex-row flex-wrap items-center justify-center gap-x-1 pt-1">
          <Text className="text-sm text-muted-foreground">{t("signUp.hasAccount")}</Text>
          <Button onPress={() => router.push("/(auth)/sign-in")} variant="link">
            <Text>{t("signUp.signInLink")}</Text>
          </Button>
        </View>

        <View className="items-center gap-1">
          <Text className="text-center text-xs text-muted-foreground">
            {t("signUp.privacyReassurance")}
          </Text>
          <Button onPress={() => router.push("/security")} variant="link" size="sm">
            <Text className="text-xs">{t("signUp.privacyLink")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
