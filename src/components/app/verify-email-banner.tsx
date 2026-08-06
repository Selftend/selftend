import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  EMAIL_RATE_LIMITED_ERROR,
  INVALID_VERIFICATION_CODE_ERROR,
  sendVerificationCode,
  verifyEmailCode,
} from "@/src/features/auth/api";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

const RESEND_COOLDOWN_MS = 60_000;
// The backend owns the OTP length, not this component. It was hardcoded to 6
// while the hosted project issued 8-digit codes, so `maxLength` truncated every
// code to its first six digits and verification failed for everyone using it -
// silently, because a truncated code is indistinguishable from a wrong one.
//
// `supabase/config.toml` now pins `otp_length`, so local and hosted agree in
// version control. These bounds are the tolerance around that: wide enough that
// a deliberate change to the setting cannot break verification again, narrow
// enough to keep the input honest.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

/**
 * The persistent top banner of #489: shown to signed-in email+password users
 * until they prove mailbox ownership. Sends a signInWithOtp code, verifies it
 * inline, then stamps user_preferences.email_verified - the app's own flag,
 * since autoconfirm makes auth's email_confirmed_at meaningless. There is no
 * dismiss by design (owner decision): the banner is quiet, but it stays.
 *
 * OAuth users never see it - their provider vouched for the mailbox - and it
 * renders nothing until preferences have actually loaded, so a slow fetch
 * can't flash it at an already-verified user.
 */
export function VerifyEmailBanner() {
  const { t } = useTranslation("auth");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: preferences } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  // `hasSent` decides which half renders (send prompt vs code entry) and only
  // ever goes false->true, so a resend can't unmount the code input under the
  // user. `busy` covers both async legs.
  const [hasSent, setHasSent] = useState(false);
  const [busy, setBusy] = useState<"sending" | "verifying" | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(true);

  // Re-arm the resend button a cooldown after each send disarms it.
  useEffect(() => {
    if (canResend) return;
    const timer = setTimeout(() => setCanResend(true), RESEND_COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [canResend]);

  const email = user?.email ?? null;
  const isEmailProvider = user?.app_metadata?.provider === "email";
  if (!email || !isEmailProvider || !preferences || preferences.emailVerified) {
    return null;
  }

  const onSend = async () => {
    setError("");
    setBusy("sending");
    try {
      await sendVerificationCode(email);
      setCanResend(false);
      setHasSent(true);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "";
      setError(
        message === EMAIL_RATE_LIMITED_ERROR
          ? t("verifyBanner.rateLimited")
          : t("verifyBanner.sendError"),
      );
    } finally {
      setBusy(null);
    }
  };

  const onVerify = async () => {
    setError("");
    setBusy("verifying");
    try {
      await verifyEmailCode(email, code.trim());
      const updated = await updatePreferences.mutateAsync({ emailVerified: true });
      // On a database that predates the email_verified migration, the write's
      // missing-column retry silently drops the flag: the mutation "succeeds",
      // the banner stays, and every code entry looks like it did nothing
      // (#504). The returned row is the truth - if the flag didn't stick,
      // say so instead of nagging silently. On migrated databases the flag
      // flip unmounts the banner and this branch never runs.
      if (!updated?.emailVerified) {
        setError(t("verifyBanner.verifyError"));
        return;
      }
      // No state reset needed: the flag flip unmounts the banner.
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : "";
      setError(
        message === INVALID_VERIFICATION_CODE_ERROR
          ? t("verifyBanner.invalidCode")
          : t("verifyBanner.verifyError"),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      role="status"
      className="border-t border-border bg-muted px-4 py-2"
    >
      <View className="flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Text variant="muted" className="text-sm">
          {hasSent ? t("verifyBanner.codeSent") : t("verifyBanner.title")}
        </Text>
        {!hasSent ? (
          <Button size="sm" variant="link" disabled={busy !== null} onPress={() => void onSend()}>
            <Text className="text-sm">
              {busy === "sending" ? t("verifyBanner.sending") : t("verifyBanner.sendCode")}
            </Text>
          </Button>
        ) : (
          <>
            <Input
              accessibilityLabel={t("verifyBanner.codeLabel")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              maxLength={MAX_CODE_LENGTH}
              onChangeText={setCode}
              onSubmitEditing={() => void onVerify()}
              placeholder={t("verifyBanner.codePlaceholder")}
              className="h-9 w-28 text-center"
              value={code}
            />
            <Button
              size="sm"
              disabled={busy !== null || code.trim().length < MIN_CODE_LENGTH}
              onPress={() => void onVerify()}
            >
              <Text className="text-sm">
                {busy === "verifying" ? t("verifyBanner.verifying") : t("verifyBanner.confirm")}
              </Text>
            </Button>
            <Button
              size="sm"
              variant="link"
              disabled={!canResend || busy !== null}
              onPress={() => void onSend()}
            >
              <Text className="text-sm">
                {busy === "sending" ? t("verifyBanner.sending") : t("verifyBanner.resend")}
              </Text>
            </Button>
          </>
        )}
      </View>
      {error ? (
        <Text className="text-center text-sm text-destructive" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
