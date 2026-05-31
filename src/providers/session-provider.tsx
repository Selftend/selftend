import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/src/lib/env";
import { initializeSupabaseAutoRefresh, supabase } from "@/src/lib/supabase";

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

    const authSubscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus("ready");
    });

    return () => {
      mounted = false;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

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
