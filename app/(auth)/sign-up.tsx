import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Redirect } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { useState } from "react";

import { signUpWithPassword } from "@/src/features/auth/api";
import { type SignUpValues, signUpSchema } from "@/src/features/auth/schemas";
import { Button } from "@/src/components/button";
import { FieldShell } from "@/src/components/field-shell";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { hasSupabaseConfig, session } = useSession();
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(signUpSchema),
  });

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError("");
      setSuccessMessage("");
      const result = await signUpWithPassword(values.email, values.password);
      if (result.session) {
        setSuccessMessage("Your account is ready. You can sign in immediately.");
        return;
      }

      setSuccessMessage("Check your inbox for the confirmation email, then sign in.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create account.");
    }
  });

  return (
    <Screen
      footer={<Button isLoading={isSubmitting} onPress={() => void onSubmit()} text="Create account" />}
      subtitle="Auth is included in the first slice so your CBT records have one stable place to live."
      title="Create your account"
    >
      {!hasSupabaseConfig ? (
        <NoticeCard
          body="Add your Supabase environment values from .env.example before testing authentication."
          title="Supabase setup required"
          tone="warning"
        />
      ) : null}
      {submitError ? <NoticeCard body={submitError} title="Signup problem" tone="warning" /> : null}
      {successMessage ? <NoticeCard body={successMessage} title="Account flow ready" /> : null}

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
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <FieldShell error={errors.password?.message} label="Password">
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="At least 8 characters"
              secureTextEntry
              value={value}
            />
          </FieldShell>
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onBlur, onChange, value } }) => (
          <FieldShell error={errors.confirmPassword?.message} label="Confirm password">
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Repeat your password"
              secureTextEntry
              value={value}
            />
          </FieldShell>
        )}
      />

      <View className="gap-3">
        <Link asChild href="/(auth)/sign-in">
          <Text className="text-sm font-semibold text-pine">Already have an account? Sign in</Text>
        </Link>
      </View>
    </Screen>
  );
}
