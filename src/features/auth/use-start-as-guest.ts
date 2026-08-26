import { useState } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { captureError } from "@/src/lib/sentry";
import { supabase } from "@/src/lib/supabase";

/**
 * The web landing's guest entry (#1441): the Start-now CTA calls
 * `signInAnonymously` and lets the session land through the auth listener -
 * `SessionProvider` picks up SIGNED_IN and the index route's `session`
 * redirect carries the visitor into the app. Nothing here navigates on
 * success, so there is exactly one owner of "signed in means inside".
 *
 * Failure degrades to today's landing behaviour: the sign-up form, which is
 * where the old primary CTA pointed. That covers the dark rollout
 * (`anonymous_provider_disabled` is the hosted kill switch the client ships
 * behind, not an incident - same rule as SessionProvider's native attempt)
 * and the offline case (sign-up is equally offline, and its form says so).
 * Everything else is captured before degrading.
 */
export function useStartAsGuest() {
  const [pending, setPending] = useState(false);
  const pushWithOrigin = usePushWithOrigin();

  const startAsGuest = async () => {
    if (!supabase) {
      pushWithOrigin("/(auth)/sign-up");
      return;
    }
    setPending(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error || !data.session) {
        if (
          error &&
          error.code !== "anonymous_provider_disabled" &&
          !isAuthRetryableFetchError(error)
        ) {
          captureError(error);
        }
        pushWithOrigin("/(auth)/sign-up");
      }
    } finally {
      setPending(false);
    }
  };

  return { pending, startAsGuest };
}
