// Runtime guest-session helpers shared by the plain @playwright/test guest
// specs (guest-conversion, guest-chrome). Spec §10: guests are never seeded -
// they are minted at runtime via signInAnonymously, which requires
// `enable_anonymous_sign_ins = true` in supabase/config.toml (#1440). Auth
// config applies at `supabase start`, so a stack booted before that key
// existed fails the mint, not the app.
//
// ☠️ Everything here imports from session-injection, NOT ./fixtures: importing
// fixtures.ts registers its `beforeEach({ user })` pool-fixture hook on the
// importing spec too, and every test there dies with "beforeEach hook has
// unknown parameter".

import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  CANDIDATE_STORAGE_KEYS,
  CAPTURE_STORAGE_KEY,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_VALUE,
  NORMALIZED_GATE_PREFS,
} from "./session-injection";
import { createServiceClient, LOCAL_ANON_KEY, LOCAL_SUPABASE_URL } from "../integration/helpers";

/** Mint a real guest session headlessly and return its id + the persisted JSON. */
export async function mintGuestSession() {
  const mem = new Map<string, string>();
  const client = createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: {
      storage: {
        getItem: (k) => mem.get(k) ?? null,
        setItem: (k, v) => {
          mem.set(k, v);
        },
        removeItem: (k) => {
          mem.delete(k);
        },
      },
      storageKey: CAPTURE_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) {
    throw new Error(`signInAnonymously failed: ${error?.message ?? "no session"}`);
  }
  const sessionValue = mem.get(CAPTURE_STORAGE_KEY);
  if (!sessionValue) throw new Error(`No session persisted under ${CAPTURE_STORAGE_KEY}`);
  return { guestId: data.session.user.id, sessionValue };
}

/**
 * Mint a guest, normalize its gate prefs, and plant the session in the page
 * before any app code runs. Returns the guest's user id for cleanup.
 *
 * The consent/onboarding gates would otherwise fire first thing inside the
 * shell. email_verified deliberately stays at its false default: for the
 * conversion journey the post-conversion verify banner is part of the
 * assertions, and for the chrome journey a false flag is exactly what would
 * expose a broken guest guard on the banner.
 */
export async function startGuestSession(page: Page): Promise<string> {
  const minted = await mintGuestSession();

  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .upsert(
      { user_id: minted.guestId, ...NORMALIZED_GATE_PREFS, email_verified: false },
      { onConflict: "user_id" },
    );
  if (error) {
    throw new Error(`Prefs normalization failed for guest ${minted.guestId}: ${error.message}`);
  }

  // Plant the guest session (every candidate key - see fixtures.ts) plus the
  // cookie-consent record before any app code runs.
  await page.addInitScript(
    ({ keys, value, consentKey, consentValue }) => {
      for (const key of keys) window.localStorage.setItem(key, value);
      window.localStorage.setItem(consentKey, consentValue);
    },
    {
      keys: CANDIDATE_STORAGE_KEYS,
      value: minted.sessionValue,
      consentKey: COOKIE_CONSENT_KEY,
      consentValue: COOKIE_CONSENT_VALUE,
    },
  );

  return minted.guestId;
}

/**
 * Delete the guest row itself (converted or not). deleteUserByEmail can't
 * reach a still-anonymous guest - it has no email - so delete by id.
 */
export async function deleteGuest(guestId: string | undefined) {
  if (!guestId) return;
  const admin = createServiceClient();
  await admin.auth.admin.deleteUser(guestId).catch(() => undefined);
}
