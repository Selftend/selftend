import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/src/lib/env";
import { initializeSupabaseAutoRefresh, supabase } from "@/src/lib/supabase";
import { resetAllDraftStores } from "@/src/stores/draft-store-registry";

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
  const [status, setStatus] = useState<SessionStatus>("loading");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) {
      setStatus("ready");
      return;
    }

    initializeSupabaseAutoRefresh();

    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session);
        setStatus("ready");
      })
      .catch(() => {
        // A rejected session read must not strand the app on the loading screen.
        if (mounted) setStatus("ready");
      });

    const authSubscription = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Purge all cached PHI (and any still-valid signed avatar URLs) on sign-out so the
      // previous user's data never lingers in memory - matters most on native, which has
      // no full page reload to drop the in-memory QueryClient. The draft stores are
      // module-level singletons that also hold PHI (e.g. an in-flight CBT thought record
      // whose save failed) and survive sign-out, so reset them too.
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        resetAllDraftStores();
      }

      setSession(nextSession);
      setStatus("ready");
    });

    return () => {
      mounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, [queryClient]);

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
