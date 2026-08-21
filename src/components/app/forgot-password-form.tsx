import { zodResolver } from "@hookform/resolvers/zod";

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
import { EMAIL_RATE_LIMITED_ERROR, sendPasswordResetEmail } from "@/src/features/auth/api";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/src/features/auth/schemas";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useSession } from "@/src/providers/session-provider";

export function ForgotPasswordForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig } = useSession();
  // ⚠️ These hrefs carry their route group - `/(auth)/sign-in` - and `usePathname`
  // never reports one, so a raw href would record a target that can never match
  // and would fail silently, showing a plain Up. `targetPathname` inside the
  // helper strips the group, which is exactly why the cross-links go through it
  // rather than each spelling out a normalised path (#1265, O3).
  const pushWithOrigin = usePushWithOrigin();
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
      // Raw Supabase strings ("email rate limit exceeded") must never reach the
      // user - every branch maps to translated copy.
      if (error instanceof Error && error.message === EMAIL_RATE_LIMITED_ERROR) {
        setSubmitError(t("forgotPassword.rateLimited"));
      } else {
        setSubmitError(t("forgotPassword.error"));
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={1}>{t("forgotPassword.title")}</CardTitle>
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
                accessibilityLabel={t("forgotPassword.email")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={t("forgotPassword.emailPlaceholder")}
                value={value}
              />
              {errors.email?.message ? (
                <Text className="text-sm text-destructive">{t(errors.email.message)}</Text>
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
          <SubmitButtonContent
            pending={isSubmitting}
            idleLabel={t("forgotPassword.submit")}
            pendingLabel={t("forgotPassword.submitting")}
          />
        </Button>

        <View className="items-center pt-2">
          <Button onPress={() => pushWithOrigin("/(auth)/sign-in")} variant="link">
            <Text>{t("forgotPassword.backToSignIn")}</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}
