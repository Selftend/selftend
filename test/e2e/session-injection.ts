// Session-injection constants shared by fixtures.ts (the worker-pool path)
// and specs that plant a session OUTSIDE the pool (guest-conversion mints an
// anonymous session no pool user can provide).
//
// ☠️ Deliberately side-effect-free, and it must stay that way: fixtures.ts
// registers a `test.beforeEach(({ user }) => ...)` at module scope, so a plain
// @playwright/test spec that imports ANYTHING from fixtures.ts inherits that
// hook and dies with `beforeEach hook has unknown parameter "user"` (the
// worker fixtures only exist on its extended `test`). Constants live here so
// both worlds can share them without sharing the hook.

import fs from "node:fs";
import path from "node:path";

// Relative import (not the "@/" alias) keeps this resolvable under Playwright's
// loader. policy-content.ts has zero runtime imports, so it is safe in Node.
import { policyVersion } from "../../src/features/policies/policy-content";

// supabase-js derives its localStorage key as
// `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`, using the URL the
// app's client was CONSTRUCTED with - i.e. the EXPO_PUBLIC_SUPABASE_URL Metro inlined
// into the web bundle. That value follows Expo's env precedence (.env.local > .env),
// and a present .env.local wins over playwright.config.ts's webServer.env. So we must
// resolve the same effective URL here rather than hardcode a hostname, or the planted
// session lands under the wrong key and the app boots logged-out. (Verified empirically:
// a real UI login on this machine persists under `sb-192-auth-token`, from
// .env.local's http://192.168.0.20:54321.)
function resolveAppSupabaseUrl(): string {
  const fromEnvFile = (file: string): string | undefined => {
    try {
      const raw = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      const match = raw.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m);
      return match?.[1].trim();
    } catch {
      return undefined;
    }
  };
  // Precedence: a local .env.local (developer machines) takes priority - empirically it
  // wins over the inlined webServer.env for the bundled supabase client. Next the value
  // playwright.config.ts injects via webServer.env (the source in CI, where no .env.local
  // exists). Finally the local default. We deliberately do NOT fall back to .env - it
  // holds the PROD Supabase URL, which must never drive a local e2e storage key.
  return (
    fromEnvFile(".env.local") ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost:54321"
  );
}

const storageKeyForUrl = (url: string) => `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

// The key under which sessions are CAPTURED (any valid key works - the stored
// value is the same session JSON regardless of key name).
export const CAPTURE_STORAGE_KEY = storageKeyForUrl(resolveAppSupabaseUrl());

// Plant the session under EVERY storage key the e2e web bundle might read from.
// Which one the app actually uses depends on the EXPO_PUBLIC_SUPABASE_URL Metro
// inlined, which is non-deterministic across machines AND across Metro cache
// state (a cached dev bundle uses .env.local's URL; a clean build uses the
// webServer.env localhost). The app reads only its own key; the others are inert.
// This removes the last source of injection flakiness.
export const CANDIDATE_STORAGE_KEYS = [
  ...new Set([
    CAPTURE_STORAGE_KEY,
    storageKeyForUrl("http://localhost:54321"),
    storageKeyForUrl("http://127.0.0.1:54321"),
  ]),
];

// Cookie-consent store key/shape (src/stores/cookie-consent-store.ts). Planting
// an "accepted" record suppresses the consent banner deterministically.
export const COOKIE_CONSENT_KEY = "selftend_cookie_consent";
export const COOKIE_CONSENT_VALUE = JSON.stringify({
  analytics: false,
  accepted: true,
  acceptedAt: "2026-01-01T00:00:00.000Z",
});

// The user_preferences gate fields (column names) that must always hold
// non-gate-firing values while a suite runs. Reads the live policyVersion
// constant so it can never drift. reminder_consent(+updated_at) marks the
// one-time reminder prompt as already declined (see isReminderPromptEligible)
// - otherwise the "Want a daily reminder?" modal pops after any tool
// completion and blocks unrelated specs' buttons/navigation.
//
// Snapshot/restore specs MUST spread this over any captured full row before
// restoring it: a beforeAll capture happens before fixtures.ts's normalization
// ever ran, so the raw capture can hold the seed's stale policy version and a
// null reminder timestamp - restoring that resurrects the consent gate for a
// later test (#172: a trace caught the gate rendering from exactly such a
// restored row).
export const NORMALIZED_GATE_PREFS = {
  app_onboarding_completed: true,
  policy_version_accepted: policyVersion,
  reminder_consent: false,
  reminder_consent_updated_at: "2026-01-01T00:00:00.000Z",
  // Pooled users count as verified or the #489 banner pins itself to the top
  // of every spec. The banner's own journey lives in sign-up-onboarding
  // (plain @playwright/test, fresh user), which the normalization never
  // touches.
  email_verified: true,
  // The once-ever starter-routine offer (#1677) counts as already shown.
  // With reminder consent declined above, the reminder prompt never wins a
  // save here, so a pooled user with records in two distinct tools and zero
  // routines (bob, by design - see supabase/seed.sql) would otherwise pop
  // the offer after any tool save and block unrelated specs' buttons.
  starter_routine_offered: true,
} as const;
