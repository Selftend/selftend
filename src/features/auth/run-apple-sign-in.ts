import { router } from "expo-router";

import { signInWithApple } from "@/src/features/auth/api";

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
    setSubmitError(error instanceof Error ? error.message : errorFallback);
  } finally {
    setIsAppleSubmitting(false);
  }
}
