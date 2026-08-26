import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { isAuthRetryableFetchError, type Session, type User } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/src/lib/env";
import {
  initializeSupabaseAutoRefresh,
  storedSessionRecordExists,
  supabase,
} from "@/src/lib/supabase";
import { captureError, setSentryUser } from "@/src/lib/sentry";
import { clearPersistedQueryCache } from "@/src/lib/query-client";
import {
  clearSessionMarker,
  readSessionMarker,
  writeSessionMarker,
} from "@/src/features/auth/session-marker";
import { purgePersistedWizardDrafts, resetAllDraftStores } from "@/src/stores/draft-store-registry";
import { useFreshStartNoticeStore } from "@/src/stores/fresh-start-notice-store";

type SessionStatus = "loading" | "ready";

interface SessionContextValue {
  hasSupabaseConfig: boolean;
  session: Session | null;
  status: SessionStatus;
  user: User | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  // Without a Supabase client there is nothing to wait for - start "ready".
  const [status, setStatus] = useState<SessionStatus>(supabase ? "loading" : "ready");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    initializeSupabaseAutoRefresh();

    let mounted = true;

    client.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) {
          return;
        }

        // Returning cleaned-up device (#1450): supabase-js deletes its stored
        // session itself when a restore fails for good, so "no session" alone
        // cannot distinguish a first launch from a device whose account died
        // under it (dormancy cleanup, or any other invalidation - the client
        // cannot tell which). The device's own marker can: it is written
        // beside every session below and cleared only on a deliberate exit.
        // The second check keeps an OFFLINE launch honest: a retryable
        // refresh failure leaves the client's stored record in place for a
        // later retry, and that session may yet restore - marker plus a
        // still-present record means "waiting", not "lost", so no notice and
        // the marker survives. Marker with the record gone is the real thing:
        // one calm, generic notice - never a silent fresh start - and the
        // marker is cleared so the notice cannot repeat.
        if (!data.session) {
          const hadSession = await readSessionMarker();
          const recordStillHeld = hadSession && (await storedSessionRecordExists());
          if (!mounted) {
            return;
          }
          if (hadSession && !recordStillHeld) {
            useFreshStartNoticeStore.getState().showFreshStartNotice();
            void clearSessionMarker();
          }
        }

        // Guest entry (#1440): a native cold start with no stored session
        // silently becomes a guest account - registration is optional, never a
        // gate. Both signed-out gates (the app/index.tsx landing fork and
        // protected-layout's `!session` branch) branch on this provider's
        // state, so they inherit the guest-or-fallback rule from this one
        // seam: `status` stays "loading" for the round trip, success arrives
        // as a session, and failure leaves `session` null - exactly today's
        // auth landing. Deliberately ONLY at initial-session resolution: a
        // registered user signing out later must land on the auth screens to
        // switch accounts, not be handed a fresh guest. Web keeps its
        // marketing landing untouched (#1441 adds the Start-now CTA there).
        if (!data.session && Platform.OS !== "web") {
          const guest = await client.auth.signInAnonymously();
          if (!mounted) {
            return;
          }

          // `anonymous_provider_disabled` is the hosted kill switch - the
          // client ships dark behind it, so the expected fallback is not an
          // incident. Neither is a fetch failure: that is just an offline
          // first launch, and the landing's own sign-in is equally offline.
          if (
            guest.error &&
            guest.error.code !== "anonymous_provider_disabled" &&
            !isAuthRetryableFetchError(guest.error)
          ) {
            captureError(guest.error);
          }

          setSession(guest.data.session);
          setSentryUser(guest.data.session?.user?.id ?? null);
          setStatus("ready");
          return;
        }

        setSession(data.session);
        setSentryUser(data.session?.user?.id ?? null);
        setStatus("ready");
      })
      .catch(() => {
        // A rejected session read must not strand the app on the loading screen.
        if (mounted) setStatus("ready");
      });

    const authSubscription = client.auth.onAuthStateChange((event, nextSession) => {
      // INITIAL_SESSION only duplicates what the getSession() chain above
      // resolves, and initial state must have that one owner: on a no-session
      // native cold start the event arrives as null while the guest attempt
      // (#1440) is still in flight, and letting it set "ready" would flash
      // the auth landing for the length of the round trip.
      if (event === "INITIAL_SESSION") {
        return;
      }

      // Purge all cached PHI (and any still-valid signed avatar URLs) on sign-out so the
      // previous user's data never lingers in memory - matters most on native, which has
      // no full page reload to drop the in-memory QueryClient. The draft stores are
      // module-level singletons that also hold PHI (e.g. an in-flight CBT thought record
      // whose save failed) and survive sign-out, so reset them too. The AsyncStorage-backed
      // persisted query cache also holds decrypted entries and must be removed so it cannot
      // be read by a subsequent user or after app reinstall from a backup.
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        resetAllDraftStores();
        // resetAllDraftStores only reaches stores REGISTERED in this JS context
        // (registration happens at module evaluation) - a wizard whose screen was
        // never visited in this page load still has its persisted draft (PHI) on
        // disk. The prefix purge removes every persisted wizard draft regardless
        // of registration, so a later account on the same device can never see a
        // previous user's in-progress records.
        purgePersistedWizardDrafts().catch((error) => captureError(error));
        clearPersistedQueryCache().catch((error) => captureError(error));
      }

      // Sentry user context mirrors the session: UUID while signed in,
      // cleared the moment the user signs out.
      setSentryUser(nextSession?.user?.id ?? null);
      setSession(nextSession);
      setStatus("ready");
    });

    return () => {
      mounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, [queryClient]);

  // The fresh-start marker (#1450) follows the session: written whenever one
  // exists (guest or registered - both would be losses worth naming), left in
  // place on session death. Only the deliberate exits clear it, inside the
  // `signOut` wrapper - the 23503 zombie guard bypasses that wrapper on
  // purpose, so an involuntary sign-out keeps the marker for the next launch.
  const sessionUserId = session?.user?.id ?? null;
  useEffect(() => {
    if (sessionUserId) {
      void writeSessionMarker();
    }
  }, [sessionUserId]);

  const value: SessionContextValue = {
    hasSupabaseConfig,
    session,
    status,
    user: session?.user ?? null,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return context;
}
