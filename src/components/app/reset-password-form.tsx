import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
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
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import {
  updatePassword,
  LEAKED_PASSWORD_ERROR,
  SESSION_MISSING_ERROR,
} from "@/src/features/auth/api";
import { resetPasswordSchema, type ResetPasswordSchema } from "@/src/features/auth/schemas";
import { useSession } from "@/src/providers/session-provider";

export function ResetPasswordForm() {
  const { t } = useTranslation("auth");
  const { session, status } = useSession();
  const [submitError, setSubmitError] = useState("");
  const [sessionLost, setSessionLost] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ResetPasswordSchema>({
    defaultValues: { password: "", confirmPassword: "" },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      setSubmitError("");
      await updatePassword(password);
      router.replace("/(app)");
    } catch (error) {
      if (error instanceof Error && error.message === LEAKED_PASSWORD_ERROR) {
        setSubmitError(t("validation.passwordBreached"));
      } else if (error instanceof Error && error.message === SESSION_MISSING_ERROR) {
        setSessionLost(true);
      } else {
        // Never surface the raw Supabase message - map everything unmatched to
        // the generic translated copy.
        setSubmitError(t("resetPassword.error"));
      }
    }
  });

  // The recovery session is established by the auth callback before it routes
  // here; wait for the session read so a valid link doesn't flash the
  // expired-link card.
  if (status === "loading") {
    return (
      <View className="items-center py-8">
        <ActivityIndicator />
      </View>
    );
  }

  // No recovery session (expired/invalid reset link, or direct navigation) -
  // the update would fail with "Auth session missing!", so offer a new reset
  // email instead of the form.
  if (!session || sessionLost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle aria-level={1}>{t("resetPassword.expiredTitle")}</CardTitle>
          <CardDescription>{t("resetPassword.expiredSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <Button onPress={() => router.replace("/(auth)/reset-password")}>
            <Text>{t("resetPassword.requestNewLink")}</Text>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={1}>{t("resetPassword.title")}</CardTitle>
        <CardDescription>{t("resetPassword.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("resetPassword.newPassword")}</Label>
              <Input
                accessibilityLabel={t("resetPassword.newPassword")}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder=""
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
              <Label>{t("resetPassword.confirmPassword")}</Label>
              <Input
                accessibilityLabel={t("resetPassword.confirmPassword")}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder=""
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

        {submitError ? <Text className="text-sm text-destructive">{submitError}</Text> : null}

        <Button disabled={isSubmitting} onPress={() => void onSubmit()}>
          <SubmitButtonContent
            pending={isSubmitting}
            idleLabel={t("resetPassword.submit")}
            pendingLabel={t("resetPassword.submitting")}
          />
        </Button>
      </CardContent>
    </Card>
  );
}
