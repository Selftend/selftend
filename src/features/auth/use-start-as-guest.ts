import { useState } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { router } from "expo-router";

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

    // ☠️ An under-floor device does not get a guest (#2826) - the web twin of
    // SessionProvider's native guard (#1765, spec #227 §3), reading the same
    // flag through the same function so the two cannot drift. Without it the
    // block still holds (ProtectedLayout renders the exit screen before its
    // `!session` branch), but every press inside the window would mint an
    // anonymous auth user that nothing ever uses or deletes. Instead the press
    // goes straight to that screen, signed out: the block owns the surface and
    // no account is created for it to strand. Fails open like native - an
    // unreadable store answers `false`.
    if (await readUnderFloorBlock(new Date())) {
      router.replace("/(app)");
      setPending(false);
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
