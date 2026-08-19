import { router } from "expo-router";

import { signInWithGoogle } from "@/src/features/auth/api";
import { captureError, isReportableError } from "@/src/lib/sentry";

interface RunGoogleSignInArgs {
  setSubmitError: (message: string) => void;
  setIsGoogleSubmitting: (value: boolean) => void;
  recordSuccess: () => void;
  recordFailure: (error?: unknown) => void;
  errorFallback: string;
}

export async function runGoogleSignIn({
  setSubmitError,
  setIsGoogleSubmitting,
  recordSuccess,
  recordFailure,
  errorFallback,
}: RunGoogleSignInArgs) {
  try {
    setSubmitError("");
    setIsGoogleSubmitting(true);
    const didCompleteInApp = await signInWithGoogle();
    if (didCompleteInApp) {
      recordSuccess();
      router.replace("/(app)");
    }
  } catch (error) {
    recordFailure(error);
    // The thrown message no longer reaches the screen: OAuth/Supabase strings are
    // English for every user and name no step the user can take (#1060). Capture
    // keeps them diagnosable - `signInWithGoogle` is not a TanStack mutation, so
    // no global reporter sees it - while `isReportableError` drops the expected
    // offline and <500 auth cases.
    if (isReportableError(error)) {
      captureError(error);
    }
    setSubmitError(errorFallback);
  } finally {
    setIsGoogleSubmitting(false);
  }
}
