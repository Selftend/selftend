import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { View } from "react-native";
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
import { updatePassword, LEAKED_PASSWORD_ERROR } from "@/src/features/auth/api";
import { resetPasswordSchema, type ResetPasswordSchema } from "@/src/features/auth/schemas";

export function ResetPasswordForm() {
  const { t } = useTranslation("auth");
  const [submitError, setSubmitError] = useState("");
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
      router.replace("/(app)/(tabs)");
    } catch (error) {
      if (error instanceof Error && error.message === LEAKED_PASSWORD_ERROR) {
        setSubmitError(t("validation.passwordBreached"));
      } else {
        setSubmitError(error instanceof Error ? error.message : t("resetPassword.error"));
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resetPassword.title")}</CardTitle>
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
              <Label>{t("resetPassword.confirmPassword")}</Label>
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
