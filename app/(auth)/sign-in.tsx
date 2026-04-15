import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Redirect, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { useState } from "react";

import { signInWithPassword } from "@/src/features/auth/api";
import { type SignInValues, signInSchema } from "@/src/features/auth/schemas";
import { Button } from "@/src/components/button";
import { FieldShell } from "@/src/components/field-shell";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";
import { useSession } from "@/src/providers/session-provider";

export default function SignInScreen() {
  const { hasSupabaseConfig, session } = useSession();
  const [submitError, setSubmitError] = useState("");
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignInValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(signInSchema),
  });

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError("");
      await signInWithPassword(values.email, values.password);
      router.replace("/(app)/(tabs)");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  });

  return (
    <Screen
      footer={<Button isLoading={isSubmitting} onPress={() => void onSubmit()} text="Sign in" />}
      subtitle="Start with one private account so your CBT history can stay available across web, Android, and iOS."
      title="Welcome back"
    >
      {!hasSupabaseConfig ? (
        <NoticeCard
          body="Add your Supabase environment values from .env.example before testing authentication."
          title="Supabase setup required"
          tone="warning"
        />
      ) : null}
      {submitError ? <NoticeCard body={submitError} title="Sign-in problem" tone="warning" /> : null}

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
              placeholder="Your password"
              secureTextEntry
              value={value}
            />
          </FieldShell>
        )}
      />

      <View className="gap-3">
        <Link asChild href="/(auth)/sign-up">
          <Text className="text-sm font-semibold text-pine">Create an account</Text>
        </Link>
        <Link asChild href="/(auth)/reset-password">
          <Text className="text-sm font-semibold text-pine">Reset password</Text>
        </Link>
      </View>
    </Screen>
  );
}
