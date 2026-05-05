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
import { updatePassword } from "@/src/features/auth/api";
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
      setSubmitError(error instanceof Error ? error.message : t("resetPassword.error"));
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
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? t("resetPassword.submitting") : t("resetPassword.submit")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
