import { router } from "expo-router";

import { IDENTITY_ALREADY_EXISTS_ERROR, linkAppleIdentity } from "@/src/features/auth/api";
import { captureError, isReportableError } from "@/src/lib/sentry";

interface RunAppleLinkArgs {
  setSubmitError: (message: string) => void;
  setIsAppleSubmitting: (value: boolean) => void;
  recordSuccess: () => void;
  recordFailure: (error?: unknown) => void;
  errorFallback: string;
  /** See runGoogleLink - Apple's collision throws in-form (native id-token). */
  onCollision: () => void;
}

/**
 * The conversion form's Apple half (#1445): the same system sheet as
 * runAppleSignIn, but the token goes to `linkIdentity`'s id-token overload so
 * the guest's account is kept. A false return means the user backed out of
 * the sheet - not an error, sets nothing.
 */
export async function runAppleLink({
  setSubmitError,
  setIsAppleSubmitting,
  recordSuccess,
  recordFailure,
  errorFallback,
  onCollision,
}: RunAppleLinkArgs) {
  try {
    setSubmitError("");
    setIsAppleSubmitting(true);
    const didCompleteInApp = await linkAppleIdentity();
    if (didCompleteInApp) {
      recordSuccess();
      router.replace("/(app)");
    }
  } catch (error) {
    recordFailure(error);
    if (error instanceof Error && error.message === IDENTITY_ALREADY_EXISTS_ERROR) {
      onCollision();
      return;
    }
    if (isReportableError(error)) {
      captureError(error);
    }
    setSubmitError(errorFallback);
  } finally {
    setIsAppleSubmitting(false);
  }
}
