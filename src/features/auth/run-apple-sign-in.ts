import { router } from "expo-router";

import { signInWithApple } from "@/src/features/auth/api";
import { captureError, isReportableError } from "@/src/lib/sentry";

interface RunAppleSignInArgs {
  setSubmitError: (message: string) => void;
  setIsAppleSubmitting: (value: boolean) => void;
  recordSuccess: () => void;
  recordFailure: (error?: unknown) => void;
  errorFallback: string;
}

/**
 * Mirrors runGoogleSignIn deliberately, so the two providers behave identically
 * from the forms' point of view: a false return means the user backed out (the
 * Apple sheet was dismissed), which is not an error and must not set one.
 */
export async function runAppleSignIn({
  setSubmitError,
  setIsAppleSubmitting,
  recordSuccess,
  recordFailure,
  errorFallback,
}: RunAppleSignInArgs) {
  try {
    setSubmitError("");
    setIsAppleSubmitting(true);
    const didCompleteInApp = await signInWithApple();
    if (didCompleteInApp) {
      recordSuccess();
      router.replace("/(app)");
    }
  } catch (error) {
    recordFailure(error);
    // Same shape as runGoogleSignIn: translated copy only (#1060), with the capture
    // standing in for the message the screen no longer shows. A dismissed sheet never
    // lands here - `signInWithApple` swallows the cancellation and returns false.
    if (isReportableError(error)) {
      captureError(error);
    }
    setSubmitError(errorFallback);
  } finally {
    setIsAppleSubmitting(false);
  }
}
