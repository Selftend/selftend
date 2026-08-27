import { router } from "expo-router";

import { IDENTITY_ALREADY_EXISTS_ERROR, linkGoogleIdentity } from "@/src/features/auth/api";
import { captureError, isReportableError } from "@/src/lib/sentry";

interface RunGoogleLinkArgs {
  setSubmitError: (message: string) => void;
  setIsGoogleSubmitting: (value: boolean) => void;
  recordSuccess: () => void;
  recordFailure: (error?: unknown) => void;
  errorFallback: string;
  /**
   * The identity is already on another account (422
   * `identity_already_exists`). The form owns what happens next - inline
   * error + one-tap "Sign in with Google instead" behind the abandonment
   * warning (#1445 reusing #1444's dialog) - so the runner only reports.
   * Native-path only: on web the collision surfaces at /auth-callback after
   * the full-page redirect, and travels back via conversion-collision.ts.
   */
  onCollision: () => void;
}

/**
 * The conversion form's Google half (#1445): mirrors runGoogleSignIn's shape,
 * but the underlying call is `linkIdentity` - the guest's account is KEPT and
 * gains the identity, where the sign-in runner would land in the identity's
 * own account and strand the guest.
 */
export async function runGoogleLink({
  setSubmitError,
  setIsGoogleSubmitting,
  recordSuccess,
  recordFailure,
  errorFallback,
  onCollision,
}: RunGoogleLinkArgs) {
  try {
    setSubmitError("");
    setIsGoogleSubmitting(true);
    const didCompleteInApp = await linkGoogleIdentity();
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
    // Same shape as runGoogleSignIn: translated copy only (#1060), with the
    // capture standing in for the message the screen no longer shows.
    if (isReportableError(error)) {
      captureError(error);
    }
    setSubmitError(errorFallback);
  } finally {
    setIsGoogleSubmitting(false);
  }
}
