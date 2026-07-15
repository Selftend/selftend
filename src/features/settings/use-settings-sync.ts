import { useEffect, useRef } from "react";

import { type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import { supportedLanguages, type SupportedLanguage } from "@/src/i18n";
import { supabase } from "@/src/lib/supabase";
import { useLanguage } from "@/src/providers/i18n-provider";
import { isThemePreference, useThemeStore } from "@/src/stores/theme-store";

function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return Boolean(value) && (supportedLanguages as readonly string[]).includes(value as string);
}

// A push failed in a way that PROVES the session's user is gone: Postgres 23503
// (foreign_key_violation, surfaced by PostgREST as HTTP 409) - the upsert's FK to
// auth.users has no target row, so the JWT still verifies but its user was deleted
// server-side. Nothing can ever make this session work again.
//
// Deliberately NOT treated as stale (a false-positive here calls signOut(), which
// also wipes the persisted wizard drafts - PHI - from disk):
// - PGRST301 / 401: supabase-js inline-refreshes expired tokens before requests,
//   so a server-side expiry rejection usually means transient clock skew (>=90s) -
//   a refresh would succeed. The pushFailedRef bail above already stops the retry
//   loop for these; the session stays intact and recovers on the next auth change.
function isStaleSessionError(error: unknown): boolean {
  const e = error as { code?: string } | null;
  if (!e || typeof e !== "object") return false;
  return e.code === "23503";
}

export function useSettingsSync(userId: string | null, preferences: UserPreferences | undefined) {
  const { language, setLanguage, hydrated } = useLanguage();
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const { mutate: updatePreferences } = useUpdateUserPreferences(userId);
  // Track WHICH user was synced, not just whether a sync happened: on account switch
  // (sign out → sign in a different user without remounting this long-lived hook) the
  // initial DB-pull must run again, otherwise the previous user's local theme/language
  // gets pushed onto the new account.
  const syncedUserId = useRef<string | null>(null);
  // True while the initial DB→local language pull is still applying. setLanguage is
  // async (it awaits a dynamic bundle import), but setThemePreference is synchronous -
  // so a combined pull re-fires this effect (theme is a dep) before `language` has
  // updated. Without this guard that re-run would hit the push branch and write the
  // STALE local language back onto the account, undoing the pull.
  const pullInFlightRef = useRef(false);
  // Once a push fails, STOP pushing until the next auth change (userId change resets
  // it below). Without this bail the effect re-fires on every preferences tick and
  // re-attempts the same doomed push forever - the observed infinite 409 loop when a
  // valid JWT belongs to a deleted user.
  const pushFailedRef = useRef(false);

  useEffect(() => {
    if (!preferences || !userId || !hydrated) return;

    if (syncedUserId.current !== userId) {
      syncedUserId.current = userId;
      pushFailedRef.current = false;

      const dbLang =
        preferences.languageExplicit && isSupportedLanguage(preferences.language)
          ? preferences.language
          : null;
      const dbTheme = isThemePreference(preferences.theme) ? preferences.theme : null;

      const needsLangUpdate = dbLang !== null && dbLang !== language;
      const needsThemeUpdate = dbTheme !== null && dbTheme !== themePreference;

      if (needsLangUpdate) {
        pullInFlightRef.current = true;
        // Swallow a failed language-bundle load (network chunk fetch on web); the effect
        // re-runs on the next preferences tick, so a transient failure self-heals.
        void setLanguage(dbLang)
          .catch(() => undefined)
          .finally(() => {
            pullInFlightRef.current = false;
          });
      }
      if (needsThemeUpdate) setThemePreference(dbTheme);

      // Return early to let state updates settle before considering a push.
      if (needsLangUpdate || needsThemeUpdate) return;
    }

    // Don't push while the initial language pull is still resolving (see pullInFlightRef).
    if (pullInFlightRef.current) return;

    // A previous push already failed for this session - don't retry (see pushFailedRef).
    if (pushFailedRef.current) return;

    if (language !== preferences.language || themePreference !== preferences.theme) {
      updatePreferences(
        { language, theme: themePreference },
        {
          onError: (error) => {
            pushFailedRef.current = true;
            // Stale-session guard, deliberately scoped HERE and not in a global fetch
            // interceptor: this hook is the one writer that fires automatically on
            // every preferences tick, so it is where a dead session turns into a
            // silent infinite failure loop. User-initiated writes surface their own
            // errors and stop. Signing out clears the zombie JWT and lands the user
            // on sign-in instead of a half-working app.
            if (isStaleSessionError(error)) {
              void supabase?.auth.signOut();
            }
          },
        },
      );
    }
  }, [
    hydrated,
    language,
    themePreference,
    preferences,
    userId,
    setLanguage,
    setThemePreference,
    updatePreferences,
  ]);
}
