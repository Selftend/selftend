import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
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
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">Sign in</Text>
            <Text variant="muted">
              Use a passwordless email link or Google so the same account works across web and device builds without a
              manual sign-up screen.
            </Text>
          </View>

          {!hasSupabaseConfig ? (
            <Card>
              <CardHeader>
                <CardTitle>Supabase setup required</CardTitle>
                <CardDescription>
                  Add your Supabase environment values from .env.example before testing authentication.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {submitError ? (
            <Card>
              <CardHeader>
                <CardTitle>Sign-in problem</CardTitle>
                <CardDescription>{submitError}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {magicLinkSentTo ? (
            <Card>
              <CardHeader>
                <CardTitle>Check your inbox</CardTitle>
                <CardDescription>
                  We sent a one-time sign-in link to {magicLinkSentTo}. Open it from your inbox to finish signing in.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <View className="gap-3">
            <Controller
              control={control}
              name="email"
              render={({ field: { onBlur, onChange, value } }) => (
                <View className="gap-2">
                  <Label>Email</Label>
                  <Text variant="muted">
                    A one-time link will sign you in and create your account if it does not exist yet.
                  </Text>
                  <Input
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="you@example.com"
                    value={value}
                  />
                  {errors.email?.message ? <Text variant="muted">{errors.email.message}</Text> : null}
                </View>
              )}
            />
            <Text variant="muted">
              New users are created on first successful Google sign-in or magic-link completion. Manual sign-up and
              passwords stay out of the MVP.
            </Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>Before you continue</CardTitle>
              <CardDescription>
                The app is for wellness and guided self-help. It is not therapy, diagnosis, or emergency support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-3">
                <Pressable
                  className="flex-row items-start gap-3"
                  onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
                >
                  <Checkbox
                    checked={hasAcceptedTerms}
                    onCheckedChange={setHasAcceptedTerms}
                  />
                  <Text className="flex-1 text-sm">
                    I am 13 or older and agree to the Privacy Policy and Terms of Service.
                  </Text>
                </Pressable>
                <Button onPress={() => router.push("/privacy")} variant="ghost">
                  <Text>Privacy policy</Text>
                </Button>
                <Button onPress={() => router.push("/terms")} variant="ghost">
                  <Text>Terms of service</Text>
                </Button>
                <Button onPress={() => router.push("/crisis")} variant="ghost">
                  <Text>Crisis guidance</Text>
                </Button>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background p-4">
        <View className="gap-3">
          {!hasAcceptedTerms ? (
            <Text className="text-center text-sm text-muted-foreground">
              Accept the terms above to continue.
            </Text>
          ) : null}
          <Button
            disabled={!hasSupabaseConfig || isMagicLinkSubmitting || !hasAcceptedTerms}
            onPress={() => void onMagicLinkSubmit()}
          >
            {isMagicLinkSubmitting ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>{isMagicLinkSubmitting ? "Sending sign-in link" : "Email me a sign-in link"}</Text>
          </Button>
          <Button
            disabled={!hasSupabaseConfig || isGoogleSubmitting || !hasAcceptedTerms}
            onPress={() => void onGoogleSubmit()}
            variant="ghost"
          >
            {isGoogleSubmitting ? <ActivityIndicator color="#20312c" /> : null}
            <Text>{isGoogleSubmitting ? "Opening Google sign-in" : "Continue with Google"}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
