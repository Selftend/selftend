import { zodResolver } from "@hookform/resolvers/zod";
import { router, useFocusEffect } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, TextInput, View } from "react-native";
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
import { GuestAbandonDialog } from "@/src/components/app/guest-abandon-dialog";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import {
  INVALID_CREDENTIALS_ERROR,
  resendVerificationEmail,
  signInWithPassword,
} from "@/src/features/auth/api";
import { guestHoldsContent } from "@/src/features/auth/guest-content";
import { runGoogleSignIn } from "@/src/features/auth/run-google-sign-in";
import { runAppleSignIn } from "@/src/features/auth/run-apple-sign-in";
import { AppleSignInButton } from "@/src/components/app/apple-sign-in-button";
import { signInSchema, type SignInSchema } from "@/src/features/auth/schemas";
import { consumeSignInPrefill } from "@/src/features/auth/sign-in-prefill";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { COMPACT_CONTROL_HIT_SLOP } from "@/src/lib/accessibility";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useThemePalette } from "@/src/lib/theme-palette";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useSession } from "@/src/providers/session-provider";

export function SignInForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig, user } = useSession();
  const isGuest = user?.is_anonymous === true;
  // ⚠️ These hrefs carry their route group - `/(auth)/sign-in` - which the
  // helper's `targetPathname` strips; see its docblock for why a raw one would
  // record a target that can never match, silently (#1265, O3).
  const pushWithOrigin = usePushWithOrigin();
  const theme = useThemePalette();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  // Warn-and-abandon (#1444, spec §6): a guest signing in to another account
  // leaves this device's guest data behind, so any sign-in path a guest with
  // content takes detours through one calm confirm. The chosen path waits
  // here while the dialog is up - non-null IS the dialog's visibility;
  // confirm runs it, cancel drops it.
  const [pendingAbandonAction, setPendingAbandonAction] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [isAbandonPending, setIsAbandonPending] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    setValue,
  } = useForm<SignInSchema>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(signInSchema),
  });

  // Prefill from the conversion collision's "Sign in instead" link (#1443).
  // A focus effect, not a mount effect: sign-in is `dangerouslySingular`
  // (#1027), so the link may land on a REUSED instance whose mount effects
  // never rerun - focus fires either way. Consume-once (see the module's
  // docblock for why this is not a query param), and the handed-off address
  // overwrites whatever was typed: clicking "Sign in instead" for an email is
  // as explicit as intent gets.
  useFocusEffect(
    useCallback(() => {
      const prefillEmail = consumeSignInPrefill();
      if (prefillEmail) {
        setValue("email", prefillEmail);
      }
    }, [setValue]),
  );

  /**
   * Detour a guest-with-content sign-in through the abandon confirm. Returns
   * true when the dialog took over (the caller stops; confirm re-runs
   * `action`). The content check itself fails toward warning - see
   * `guestHoldsContent` - because the only cost of a needless dialog is a
   * cancel, while a skipped one signs data away silently.
   *
   * The OAuth paths run this BEFORE their dance starts: on web the redirect
   * leaves the page and on native the session is replaced when the flow
   * returns, so afterwards there is no guest left to warn (#1445 inherits the
   * same before-the-dance rule for its collision one-tap).
   */
  const interceptGuestAbandon = async (action: () => Promise<void>): Promise<boolean> => {
    if (!isGuest || !(await guestHoldsContent())) return false;
    setPendingAbandonAction(() => action);
    return true;
  };

  const onAbandonConfirm = async () => {
    if (!pendingAbandonAction) return;
    setIsAbandonPending(true);
    try {
      await pendingAbandonAction();
    } finally {
      setIsAbandonPending(false);
      setPendingAbandonAction(null);
    }
  };

  const onAbandonCancel = () => {
    setPendingAbandonAction(null);
  };

  const runGoogle = () =>
    runGoogleSignIn({
      setSubmitError,
      setIsGoogleSubmitting,
      recordSuccess,
      recordFailure,
      errorFallback: t("signIn.googleError"),
    });

  const onGoogleSubmit = async () => {
    // The provider button shows pending during the content check so a slow
    // fetch doesn't read as a dead button.
    setIsGoogleSubmitting(true);
    const intercepted = await interceptGuestAbandon(runGoogle);
    setIsGoogleSubmitting(false);
    if (!intercepted) await runGoogle();
  };

  const runApple = () =>
    runAppleSignIn({
      setSubmitError,
      setIsAppleSubmitting,
      recordSuccess,
      recordFailure,
      errorFallback: t("apple.error"),
    });

  const onAppleSubmit = async () => {
    setIsAppleSubmitting(true);
    const intercepted = await interceptGuestAbandon(runApple);
    setIsAppleSubmitting(false);
    if (!intercepted) await runApple();
  };

  const performPasswordSignIn = async ({ email, password }: SignInSchema) => {
    try {
      await signInWithPassword(email, password);
      recordSuccess();
      router.replace("/(app)");
    } catch (error) {
      recordFailure(error);
      const rawMessage = error instanceof Error ? error.message : "";
      const isNotConfirmed = rawMessage.toLowerCase().includes("not confirmed");
      setIsEmailNotConfirmed(isNotConfirmed);
      if (isNotConfirmed) {
        setSubmitError(t("signIn.emailNotConfirmed"));
      } else if (rawMessage === INVALID_CREDENTIALS_ERROR) {
        // Includes the SSO hint: Google-created accounts have no password, and
        // "wrong password" is the most common dead end for them.
        setSubmitError(t("signIn.invalidCredentials"));
      } else {
        // An unmapped message is a Supabase/network string, English for every user,
        // naming no step the user can take - translated copy only (#1060). The capture
        // keeps it diagnosable (`signInWithPassword` is not a TanStack mutation);
        // `isReportableError` drops the expected offline and <500 auth cases.
        if (isReportableError(error)) {
          captureError(error);
        }
        setSubmitError(t("signIn.error"));
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    setIsEmailNotConfirmed(false);
    setResendStatus("idle");
    if (await interceptGuestAbandon(() => performPasswordSignIn(values))) return;
    await performPasswordSignIn(values);
  });

  const onResend = async () => {
    const email = getValues("email");
    if (!email) return;
    try {
      setResendStatus("sending");
      await resendVerificationEmail(email);
      setResendStatus("sent");
    } catch {
      setResendStatus("idle");
      setSubmitError(t("signIn.resendError"));
      setIsEmailNotConfirmed(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={1}>{t("signIn.title")}</CardTitle>
        <CardDescription>{t("signIn.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Button
          disabled={!hasSupabaseConfig || isGoogleSubmitting}
          onPress={() => void onGoogleSubmit()}
          variant="outline"
        >
          {isGoogleSubmitting ? (
            <ActivityIndicator color={theme.mutedForeground} />
          ) : (
            <Image
              source={require("../../../assets/branding/google-logo.png")}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          )}
          <Text>{isGoogleSubmitting ? t("signIn.googleOpening") : t("signIn.googleButton")}</Text>
        </Button>

        <AppleSignInButton
          onPress={onAppleSubmit}
          disabled={isSubmitting || isGoogleSubmitting || isAppleSubmitting}
        />

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs text-muted-foreground">{t("common:orContinueWithEmail")}</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signIn.email")}</Label>
              <Input
                testID="sign-in-email"
                accessibilityLabel={t("signIn.email")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder={t("signIn.emailPlaceholder")}
                returnKeyType="next"
                value={value}
              />
              {errors.email?.message ? (
                <Text className="text-sm text-destructive">{t(errors.email.message)}</Text>
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
                <Label>{t("signIn.password")}</Label>
                <Button
                  hitSlop={COMPACT_CONTROL_HIT_SLOP}
                  onPress={() => pushWithOrigin("/(auth)/reset-password")}
                  variant="link"
                  size="sm"
                >
                  <Text className="text-xs">{t("signIn.forgotPassword")}</Text>
                </Button>
              </View>
              <Input
                ref={passwordRef}
                testID="sign-in-password"
                accessibilityLabel={t("signIn.password")}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => void onSubmit()}
                placeholder=""
                returnKeyType="go"
                secureTextEntry
                value={value}
              />
              {errors.password?.message ? (
                <Text className="text-sm text-destructive">{t(errors.password.message)}</Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">{t("signIn.supabaseNotConfigured")}</Text>
        ) : null}

        {resendStatus === "sent" ? (
          <Text className="text-sm text-muted-foreground">{t("signIn.resendSuccess")}</Text>
        ) : submitError ? (
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className="text-sm text-destructive">{submitError}</Text>
            {isEmailNotConfirmed ? (
              <Button
                disabled={resendStatus === "sending"}
                onPress={() => void onResend()}
                variant="link"
                size="sm"
              >
                <Text className="text-xs">
                  {resendStatus === "sending" ? t("signIn.resendSending") : t("signIn.resendLink")}
                </Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        {isThrottled ? (
          <Text className="text-sm text-destructive">{t("signIn.rateLimited")}</Text>
        ) : null}

        <Button
          testID="sign-in-submit"
          disabled={!hasSupabaseConfig || isSubmitting || isThrottled}
          onPress={() => void onSubmit()}
        >
          <SubmitButtonContent
            pending={isSubmitting}
            idleLabel={t("signIn.submit")}
            pendingLabel={t("signIn.submitting")}
          />
        </Button>

        <View className="flex-row flex-wrap items-center justify-center gap-x-1 pt-1">
          <Text className="text-sm text-muted-foreground">{t("signIn.noAccount")}</Text>
          <Button onPress={() => pushWithOrigin("/(auth)/sign-up")} variant="link">
            <Text>{t("signIn.signUpLink")}</Text>
          </Button>
        </View>

        <GuestAbandonDialog
          visible={pendingAbandonAction !== null}
          isPending={isAbandonPending}
          confirmLabel={t("guestAbandon.confirmSignIn")}
          onCancel={onAbandonCancel}
          onConfirm={() => void onAbandonConfirm()}
        />
      </CardContent>
    </Card>
  );
}
