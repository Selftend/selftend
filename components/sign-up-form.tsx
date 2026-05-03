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
import { signInWithGoogle, signUpWithPassword } from "@/src/features/auth/api";
import { signUpSchema, type SignUpSchema } from "@/src/features/auth/schemas";
import { useSession } from "@/src/providers/session-provider";

export function SignUpForm() {
  const { hasSupabaseConfig } = useSession();
  const [submitError, setSubmitError] = useState("");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpSchema>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
    resolver: zodResolver(signUpSchema),
  });

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

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      setSubmitError("");
      await signUpWithPassword(email, password);
      router.replace("/(auth)/verify-email");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to create account.",
      );
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to get started.</CardDescription>
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
              <Label>Password</Label>
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

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>Confirm password</Label>
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

        {!hasSupabaseConfig ? (
          <Text variant="muted">
            Supabase auth is not configured yet. Add environment values to continue.
          </Text>
        ) : null}

        {submitError ? (
          <Text className="text-sm text-destructive">{submitError}</Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting}
          onPress={() => void onSubmit()}
        >
          {isSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{isSubmitting ? "Creating account..." : "Sign up"}</Text>
        </Button>

        <View className="items-center gap-1 pt-1">
          <Text className="text-sm text-muted-foreground">Already have an account?</Text>
          <Button onPress={() => router.push("/")} variant="link">
            <Text>Sign in</Text>
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
