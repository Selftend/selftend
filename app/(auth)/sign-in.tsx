import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { useState } from "react";

import { Button } from "@/src/components/button";
import { FieldShell } from "@/src/components/field-shell";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { TextField } from "@/src/components/text-field";
import { signInWithGoogle, signInWithMagicLink } from "@/src/features/auth/api";
import {
  magicLinkSignInSchema,
  type MagicLinkSignInSchema,
} from "@/src/features/auth/schemas";
import { useSession } from "@/src/providers/session-provider";

export default function SignInScreen() {
  const { hasSupabaseConfig, session } = useSession();
  const [submitError, setSubmitError] = useState("");
  const [magicLinkSentTo, setMagicLinkSentTo] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isMagicLinkSubmitting, setIsMagicLinkSubmitting] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<MagicLinkSignInSchema>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(magicLinkSignInSchema),
  });

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  const onGoogleSubmit = async () => {
    try {
      setSubmitError("");
      setIsGoogleSubmitting(true);
      const didCompleteInApp = await signInWithGoogle();
      if (didCompleteInApp) {
        router.replace("/(app)/(tabs)");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to sign in with Google.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onMagicLinkSubmit = handleSubmit(async ({ email }) => {
    try {
      setSubmitError("");
      setMagicLinkSentTo("");
      setIsMagicLinkSubmitting(true);
      await signInWithMagicLink(email);
      setMagicLinkSentTo(email);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send a sign-in link.",
      );
    } finally {
      setIsMagicLinkSubmitting(false);
    }
  });

  return (
    <Screen
      footer={
        <View className="gap-3">
          <Button
            disabled={!hasSupabaseConfig}
            isLoading={isMagicLinkSubmitting}
            onPress={() => void onMagicLinkSubmit()}
            text="Email me a sign-in link"
          />
          <Button
            disabled={!hasSupabaseConfig}
            isLoading={isGoogleSubmitting}
            onPress={() => void onGoogleSubmit()}
            text="Continue with Google"
            variant="ghost"
          />
        </View>
      }
      subtitle="Use a passwordless email link or Google so the same account works across web and device builds without a manual sign-up screen."
      title="Sign in"
    >
      {!hasSupabaseConfig ? (
        <NoticeCard
          body="Add your Supabase environment values from .env.example before testing authentication."
          title="Supabase setup required"
          tone="warning"
        />
      ) : null}
      {submitError ? (
        <NoticeCard body={submitError} title="Sign-in problem" tone="warning" />
      ) : null}
      {magicLinkSentTo ? (
        <NoticeCard
          body={`We sent a one-time sign-in link to ${magicLinkSentTo}. Open it from your inbox to finish signing in.`}
          title="Check your inbox"
        />
      ) : null}

      <View className="gap-3">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <FieldShell
              description="A one-time link will sign you in and create your account if it does not exist yet."
              error={errors.email?.message}
              label="Email"
            >
              <TextField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="you@example.com"
                value={value}
              />
            </FieldShell>
          )}
        />
        <Text className="text-sm leading-6 text-ink/70">
          New users are created on first successful Google sign-in or magic-link completion. Manual sign-up and passwords stay out of the MVP.
        </Text>
      </View>
    </Screen>
  );
}
