import { useState } from "react";
import { router } from "expo-router";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { readUnderFloorBlock } from "@/src/features/auth/under-floor-block";
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
 * A device inside an under-floor block window gets no account at all: the CTA
 * routes straight to the gated tree, where ProtectedLayout's block check owns
 * the surface (#2826, mirroring SessionProvider's native rule from #1765).
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
    // ☠️ An under-floor device does not get a guest (#1765, spec #227 §3) -
    // this is the web CTA's half of the check SessionProvider makes before its
    // native silent sign-in. The block holds without it: ProtectedLayout
    // consults the same flag above its `!session` branch and renders the exit
    // screen session-less. What this check prevents is the mint - every press
    // inside the window created an anonymous auth user purely so the block
    // could strand it (#2826). `replace` mirrors the index route's own
    // `<Redirect href="/(app)" />`, and the read fails open, so a storage
    // fault can never lock a device out of getting a session. Stays pending:
    // the replace is about to unmount the landing.
    if (await readUnderFloorBlock(new Date())) {
      router.replace("/(app)");
      return;
    }
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
      setPending(false);
      return;
    }
    // Success: stay pending. The session redirect is about to unmount the
    // landing; re-enabling the CTA first would open a window where a second
    // press mints a second, instantly orphaned guest account.
  };

  return { pending, startAsGuest };
}
