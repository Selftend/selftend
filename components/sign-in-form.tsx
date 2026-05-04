import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { signInWithGoogle, signInWithPassword } from "@/src/features/auth/api";
import { signInSchema, type SignInSchema } from "@/src/features/auth/schemas";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { useSession } from "@/src/providers/session-provider";

export function SignInForm() {
  const { hasSupabaseConfig } = useSession();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignInSchema>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(signInSchema),
  });

  const onGoogleSubmit = async () => {
    try {
      setSubmitError("");
      setIsGoogleSubmitting(true);
      const didCompleteInApp = await signInWithGoogle();
      if (didCompleteInApp) {
        recordSuccess();
        router.replace("/(app)/(tabs)");
      }
    } catch (error) {
      recordFailure(error);
      setSubmitError(
        error instanceof Error ? error.message : "Unable to sign in with Google.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      setSubmitError("");
      await signInWithPassword(email, password);
      recordSuccess();
      router.replace("/(app)/(tabs)");
    } catch (error) {
      recordFailure(error);
      setSubmitError(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to your account</CardTitle>
        <CardDescription>Welcome back! Please sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>Email</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="m@example.com"
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
              <View className="flex-row items-center justify-between">
                <Label>Password</Label>
                <Button
                  onPress={() => router.push("/(auth)/reset-password")}
                  variant="link"
                  size="sm"
                >
                  <Text className="text-xs">Forgot your password?</Text>
                </Button>
              </View>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder=""
                secureTextEntry
                value={value}
              />
              {errors.password?.message ? (
                <Text className="text-sm text-destructive">{errors.password.message}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">
            Supabase auth is not configured yet. Add environment values to continue.
          </Text>
        ) : null}

        {submitError ? (
          <Text className="text-sm text-destructive">{submitError}</Text>
        ) : null}

        {isThrottled ? (
          <Text className="text-sm text-destructive">
            Too many attempts. Please wait before trying again.
          </Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting || isThrottled}
          onPress={() => void onSubmit()}
        >
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? "Signing in..." : "Continue"}</Text>
        </Button>

        <View className="items-center gap-1 pt-1">
          <Text className="text-sm text-muted-foreground">Don't have an account?</Text>
          <Button onPress={() => router.push("/(auth)/sign-up")} variant="link">
            <Text>Sign up</Text>
          </Button>
        </View>

        <View className="items-center">
          <Text className="text-sm text-muted-foreground">or</Text>
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
              source={require("../assets/branding/google-logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          )}
          <Text>{isGoogleSubmitting ? "Opening Google..." : "Continue with Google"}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
