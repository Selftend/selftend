import { router } from "expo-router";

import { signInWithGoogle } from "@/src/features/auth/api";

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
    setSubmitError(error instanceof Error ? error.message : errorFallback);
  } finally {
    setIsGoogleSubmitting(false);
  }
}
