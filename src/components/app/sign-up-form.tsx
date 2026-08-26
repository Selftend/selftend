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
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import {
  EMAIL_ALREADY_EXISTS_ERROR,
  LEAKED_PASSWORD_ERROR,
  convertGuestWithPassword,
  signUpWithPassword,
} from "@/src/features/auth/api";
import { runGoogleSignIn } from "@/src/features/auth/run-google-sign-in";
import { runAppleSignIn } from "@/src/features/auth/run-apple-sign-in";
import { runGoogleLink } from "@/src/features/auth/run-google-link";
import { runAppleLink } from "@/src/features/auth/run-apple-link";
import {
  consumeConversionCollision,
  type CollisionProvider,
} from "@/src/features/auth/conversion-collision";
import { useGuestAbandonGuard } from "@/src/features/auth/use-guest-abandon-guard";
import { GuestAbandonDialog } from "@/src/components/app/guest-abandon-dialog";
import { AppleSignInButton } from "@/src/components/app/apple-sign-in-button";
import { signUpSchema, type SignUpSchema } from "@/src/features/auth/schemas";
import { recordSignInPrefill } from "@/src/features/auth/sign-in-prefill";
import { useAuthThrottle } from "@/src/features/auth/use-auth-throttle";
import { captureError, isReportableError } from "@/src/lib/sentry";
import { useThemePalette } from "@/src/lib/theme-palette";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { useSession } from "@/src/providers/session-provider";

export function SignUpForm() {
  const { t } = useTranslation("auth");
  const { hasSupabaseConfig, user } = useSession();
  // Conversion mode (#1443): a guest reaching this screen is converting their
  // account in place, not creating a second one. Same fields, different verbs:
  // `updateUser` instead of `signUp`, so the user id - and every row under it -
  // stays put.
  const isConversion = user?.is_anonymous === true;
  // ⚠️ These hrefs carry their route group - `/(auth)/sign-in` - which the
  // helper's `targetPathname` strips; see its docblock for why a raw one would
  // record a target that can never match, silently (#1265, O3).
  const pushWithOrigin = usePushWithOrigin();
  const theme = useThemePalette();
  const { isThrottled, recordFailure, recordSuccess } = useAuthThrottle();
  const [submitError, setSubmitError] = useState("");
  // The email whose conversion hit 422 `email_exists` - set only in conversion
  // mode, it renders the "Sign in instead" link and carries the typed address
  // into sign-in as the prefill (spec §5: no pre-submit existence check).
  const [collisionEmail, setCollisionEmail] = useState("");
  // The provider whose linkIdentity dance hit 422 `identity_already_exists` -
  // conversion mode only. Renders the inline error + the provider one-tap
  // "Sign in with Google/Apple instead" (spec §5: never a silent
  // signInWithIdToken fallback).
  const [oauthCollision, setOauthCollision] = useState<CollisionProvider | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  // The abandonment warning before the collision one-tap's SECOND OAuth dance
  // (#1444's dialog, reused): after that dance the session is already
  // replaced, so the warning must come first.
  const { guardSignIn, isChecking, isProceeding, warningVisible, proceed, cancel } =
    useGuestAbandonGuard();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<SignUpSchema>({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    resolver: zodResolver(signUpSchema),
  });

  // Proper nouns, identical in every locale - interpolated into the
  // collision copy rather than duplicated per provider.
  const providerLabel = (provider: CollisionProvider) =>
    provider === "google" ? "Google" : "Apple";

  const showOauthCollision = useCallback(
    (provider: CollisionProvider) => {
      setOauthCollision(provider);
      setSubmitError(t("conversion.identityAlreadyExists", { provider: providerLabel(provider) }));
    },
    [t],
  );

  // A web linkIdentity collision comes back through /auth-callback (full-page
  // PKCE redirect) and travels here as a consume-once handoff - same shape as
  // sign-in-prefill, same focus-not-mount reasoning. Consumed regardless of
  // mode so a stale record never lingers, applied only in conversion mode.
  useFocusEffect(
    useCallback(() => {
      const provider = consumeConversionCollision();
      if (provider && isConversion) {
        showOauthCollision(provider);
      }
    }, [isConversion, showOauthCollision]),
  );

  const onGoogleSubmit = () => {
    setOauthCollision(null);
    // Conversion links the identity to the guest's account (linkIdentity);
    // plain sign-up signs into the identity's own account. ☠️ The two must
    // never swap - the sign-in runner from a guest session silently strands
    // the guest's data.
    if (isConversion) {
      return runGoogleLink({
        setSubmitError,
        setIsGoogleSubmitting,
        recordSuccess,
        recordFailure,
        errorFallback: t("signUp.googleError"),
        onCollision: () => showOauthCollision("google"),
      });
    }
    return runGoogleSignIn({
      setSubmitError,
      setIsGoogleSubmitting,
      recordSuccess,
      recordFailure,
      errorFallback: t("signUp.googleError"),
    });
  };

  const onAppleSubmit = () => {
    setOauthCollision(null);
    if (isConversion) {
      return runAppleLink({
        setSubmitError,
        setIsAppleSubmitting,
        recordSuccess,
        recordFailure,
        errorFallback: t("apple.error"),
        onCollision: () => showOauthCollision("apple"),
      });
    }
    return runAppleSignIn({
      setSubmitError,
      setIsAppleSubmitting,
      recordSuccess,
      recordFailure,
      errorFallback: t("apple.error"),
    });
  };

  // The collision's one-tap: the SECOND dance, into the identity's own
  // account - exactly the sign-in the warn-and-abandon guard exists for.
  const onSignInWithProviderInstead = () => {
    const provider = oauthCollision;
    if (!provider) return;
    void guardSignIn(() =>
      provider === "google"
        ? runGoogleSignIn({
            setSubmitError,
            setIsGoogleSubmitting,
            recordSuccess,
            recordFailure,
            errorFallback: t("signUp.googleError"),
          })
        : runAppleSignIn({
            setSubmitError,
            setIsAppleSubmitting,
            recordSuccess,
            recordFailure,
            errorFallback: t("apple.error"),
          }),
    );
  };

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      setSubmitError("");
      setCollisionEmail("");
      setOauthCollision(null);
      if (isConversion) {
        // Applies instantly under autoconfirm and refreshes the session inside
        // (the JWT keeps claiming guest until then). Straight into the app: the
        // attached email is unverified, and the verify banner takes over there.
        await convertGuestWithPassword(email, password, name);
        recordSuccess();
        router.replace("/(app)");
        return;
      }
      const { session } = await signUpWithPassword(email, password, name);
      recordSuccess();
      // Autoconfirm environments (#489) return a session right away: straight
      // into the app, where the verify banner takes over. A confirmation-mode
      // environment returns none - the legacy verify-email screen still covers
      // that until every environment is flipped.
      if (session) {
        router.replace("/(app)");
      } else {
        router.replace({ pathname: "/(auth)/verify-email", params: { email } });
      }
    } catch (error) {
      recordFailure(error);
      if (error instanceof Error && error.message === EMAIL_ALREADY_EXISTS_ERROR) {
        if (isConversion) {
          setCollisionEmail(email);
          setSubmitError(t("conversion.emailAlreadyExists"));
        } else {
          setSubmitError(t("signUp.emailAlreadyExists"));
        }
      } else if (error instanceof Error && error.message === LEAKED_PASSWORD_ERROR) {
        setSubmitError(t("validation.passwordBreached"));
      } else {
        // An unmapped message is a Supabase/network string, English for every user,
        // naming no step the user can take - translated copy only (#1060). The capture
        // keeps it diagnosable (`signUpWithPassword` is not a TanStack mutation);
        // `isReportableError` drops the expected offline and <500 auth cases.
        if (isReportableError(error)) {
          captureError(error);
        }
        setSubmitError(isConversion ? t("conversion.error") : t("signUp.error"));
      }
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle aria-level={1}>
          {isConversion ? t("conversion.title") : t("signUp.title")}
        </CardTitle>
        <CardDescription>
          {isConversion ? t("conversion.subtitle") : t("signUp.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        {/* OAuth in conversion mode is `linkIdentity` only (#1445): the
            handlers above fork on `isConversion`, and the link path keeps the
            guest's account. ☠️ signInWithOAuth / signInWithIdToken sign into
            the identity's OWN account and silently strand the guest's data -
            they appear in conversion only as the collision one-tap, behind
            the abandonment warning. */}
        <Button
          disabled={!hasSupabaseConfig || isGoogleSubmitting || isChecking || isProceeding}
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
          <Text>{isGoogleSubmitting ? t("signUp.googleOpening") : t("signUp.googleButton")}</Text>
        </Button>

        <AppleSignInButton
          onPress={onAppleSubmit}
          disabled={
            isSubmitting || isGoogleSubmitting || isAppleSubmitting || isChecking || isProceeding
          }
        />

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="text-xs text-muted-foreground">{t("common:orContinueWithEmail")}</Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.name")}</Label>
              <Input
                accessibilityLabel={t("signUp.name")}
                autoCapitalize="words"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => emailRef.current?.focus()}
                placeholder={t("signUp.namePlaceholder")}
                returnKeyType="next"
                value={value}
              />
              {errors.name?.message ? (
                <Text className="text-sm text-destructive">{t(errors.name.message)}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.email")}</Label>
              <Input
                ref={emailRef}
                accessibilityLabel={t("signUp.email")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder={t("signUp.emailPlaceholder")}
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
              <Label>{t("signUp.password")}</Label>
              <Input
                ref={passwordRef}
                accessibilityLabel={t("signUp.password")}
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                placeholder=""
                returnKeyType="next"
                secureTextEntry
                value={value}
              />
              <Text className="text-xs text-muted-foreground">
                {t("validation.passwordMin12Hint")}
              </Text>
              {errors.password?.message ? (
                <Text className="text-sm text-destructive">{t(errors.password.message)}</Text>
              ) : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onBlur, onChange, value } }) => (
            <View className="gap-2">
              <Label>{t("signUp.confirmPassword")}</Label>
              <Input
                ref={confirmPasswordRef}
                accessibilityLabel={t("signUp.confirmPassword")}
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
              {errors.confirmPassword?.message ? (
                <Text className="text-sm text-destructive">
                  {t(errors.confirmPassword.message)}
                </Text>
              ) : null}
            </View>
          )}
        />

        {!hasSupabaseConfig ? (
          <Text variant="muted">{t("signUp.supabaseNotConfigured")}</Text>
        ) : null}

        {submitError ? (
          <View className="flex-row flex-wrap items-center gap-x-1">
            <Text className="text-sm text-destructive">{submitError}</Text>
            {collisionEmail ? (
              <Button
                onPress={() => {
                  // In-memory handoff, not a `?email=` param: sign-in is
                  // singular and query-keyed screens cannot be (see
                  // sign-in-prefill.ts).
                  recordSignInPrefill(collisionEmail);
                  pushWithOrigin("/(auth)/sign-in");
                }}
                variant="link"
                size="sm"
              >
                <Text className="text-xs">{t("conversion.signInInstead")}</Text>
              </Button>
            ) : oauthCollision ? (
              <Button
                disabled={isChecking || isProceeding}
                onPress={onSignInWithProviderInstead}
                variant="link"
                size="sm"
              >
                <Text className="text-xs">
                  {t("conversion.signInWithProviderInstead", {
                    provider: providerLabel(oauthCollision),
                  })}
                </Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        {isThrottled ? (
          <Text className="text-sm text-destructive">{t("signUp.rateLimited")}</Text>
        ) : null}

        <Button
          disabled={!hasSupabaseConfig || isSubmitting || isThrottled || isChecking || isProceeding}
          onPress={() => void onSubmit()}
        >
          <SubmitButtonContent
            pending={isSubmitting}
            idleLabel={isConversion ? t("conversion.submit") : t("signUp.submit")}
            pendingLabel={isConversion ? t("conversion.submitting") : t("signUp.submitting")}
          />
        </Button>

        <View className="flex-row flex-wrap items-center justify-center gap-x-1 pt-1">
          <Text className="text-sm text-muted-foreground">{t("signUp.hasAccount")}</Text>
          <Button onPress={() => pushWithOrigin("/(auth)/sign-in")} variant="link">
            <Text>{t("signUp.signInLink")}</Text>
          </Button>
        </View>

        <View className="items-center gap-1">
          <Text className="text-center text-xs text-muted-foreground">
            {t("signUp.privacyReassurance")}
          </Text>
          <Button onPress={() => pushWithOrigin("/security")} variant="link" size="sm">
            <Text className="text-xs">{t("signUp.privacyLink")}</Text>
          </Button>
        </View>

        <GuestAbandonDialog
          visible={warningVisible}
          isPending={isProceeding}
          onCancel={cancel}
          onConfirm={() => void proceed()}
        />
      </CardContent>
    </Card>
  );
}
