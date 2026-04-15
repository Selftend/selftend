import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { useState } from "react";

import { resetPassword } from "@/src/features/auth/api";
import { type ResetPasswordValues, resetPasswordSchema } from "@/src/features/auth/schemas";
import { Button } from "@/src/components/button";
import { FieldShell } from "@/src/components/field-shell";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";

export default function ResetPasswordScreen() {
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<ResetPasswordValues>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError("");
      setSuccessMessage("");
      await resetPassword(values.email);
      setSuccessMessage("If the account exists, a reset link is on its way.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to send reset email.");
    }
  });

  return (
    <Screen
      footer={<Button isLoading={isSubmitting} onPress={() => void onSubmit()} text="Send reset email" />}
      subtitle="Use a quiet recovery path instead of making account access a blocker."
      title="Reset password"
    >
      {submitError ? <NoticeCard body={submitError} title="Reset problem" tone="warning" /> : null}
      {successMessage ? <NoticeCard body={successMessage} title="Email sent" /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <FieldShell error={errors.email?.message} label="Email">
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="name@example.com"
              value={value}
            />
          </FieldShell>
        )}
      />

      <View className="gap-3">
        <Link asChild href="/(auth)/sign-in">
          <Text className="text-sm font-semibold text-pine">Back to sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}
