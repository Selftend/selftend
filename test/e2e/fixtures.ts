import fs from "node:fs";
import path from "node:path";

import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { createServiceClient, LOCAL_SUPABASE_URL, LOCAL_ANON_KEY } from "../integration/helpers";
// Relative import (not the "@/" alias) keeps this resolvable under Playwright's
// loader. policy-content.ts has zero runtime imports, so it is safe in Node.
import { policyVersion } from "../../src/features/policies/policy-content";

export interface PoolUser {
  id: string;
  email: string;
  password: string;
}

const POOL_PASSWORD = "e2e-worker-pass-123";

// Must match supabase/seed.sql (e2e-w0..e2e-w7, ids ...010-...017).
export const POOL_USERS: PoolUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    email: "e2e-w0@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    email: "e2e-w1@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    email: "e2e-w2@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000013",
    email: "e2e-w3@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000014",
    email: "e2e-w4@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000015",
    email: "e2e-w5@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000016",
    email: "e2e-w6@test.local",
    password: POOL_PASSWORD,
  },
  {
    id: "00000000-0000-0000-0000-000000000017",
    email: "e2e-w7@test.local",
    password: POOL_PASSWORD,
  },
];

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

// The key under which we CAPTURE the session (any valid key works - the stored
// value is the same session JSON regardless of key name).
const CAPTURE_STORAGE_KEY = storageKeyForUrl(resolveAppSupabaseUrl());

// Plant the session under EVERY storage key the e2e web bundle might read from.
// Which one the app actually uses depends on the EXPO_PUBLIC_SUPABASE_URL Metro
// inlined, which is non-deterministic across machines AND across Metro cache
// state (a cached dev bundle uses .env.local's URL; a clean build uses the
// webServer.env localhost). The app reads only its own key; the others are inert.
// This removes the last source of injection flakiness.
const CANDIDATE_STORAGE_KEYS = [
  ...new Set([
    CAPTURE_STORAGE_KEY,
    storageKeyForUrl("http://localhost:54321"),
    storageKeyForUrl("http://127.0.0.1:54321"),
  ]),
];

// Cookie-consent store key/shape (src/stores/cookie-consent-store.ts). Planting
// an "accepted" record suppresses the consent banner deterministically.
const COOKIE_CONSENT_KEY = "selftend_cookie_consent";
const COOKIE_CONSENT_VALUE = JSON.stringify({
  analytics: false,
  accepted: true,
  acceptedAt: "2026-01-01T00:00:00.000Z",
});

// Both fixtures are WORKER-scoped (one pool user + one session file per worker).
interface WorkerFixtures {
  user: PoolUser;
  workerStorageState: string;
}

export const test = base.extend<object, WorkerFixtures>({
  // One dedicated pool user per parallel worker (indexed by parallelIndex).
  user: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const u = POOL_USERS[workerInfo.parallelIndex];
      if (!u) {
        throw new Error(
          `No pool user for parallelIndex ${workerInfo.parallelIndex}. ` +
            `Add more POOL_USERS (and seed users) or lower 'workers' in playwright.config.ts.`,
        );
      }
      await use(u);
    },
    { scope: "worker" },
  ],

  // Build a storageState file once per worker by capturing a real session.
  workerStorageState: [
    async ({ user }, use, workerInfo) => {
      // 1. Capture the byte-exact value auth-js persists, using in-memory storage
      //    and the SAME storageKey the app uses. Version-proof: we store whatever
      //    auth-js writes rather than hand-building the session shape.
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
      const { error } = await client.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      if (error) {
        throw new Error(`Headless sign-in failed for ${user.email}: ${error.message}`);
      }
      const sessionValue = mem.get(CAPTURE_STORAGE_KEY);
      if (!sessionValue) {
        throw new Error(`No session persisted under ${CAPTURE_STORAGE_KEY} for ${user.email}`);
      }

      // 2. Write a Playwright storageState file scoped to the e2e origin.
      const baseURL = workerInfo.project.use.baseURL;
      if (!baseURL) throw new Error("project.use.baseURL is required for e2e session injection");
      const origin = new URL(baseURL).origin;

      const state = {
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [
              ...CANDIDATE_STORAGE_KEYS.map((name) => ({ name, value: sessionValue })),
              { name: COOKIE_CONSENT_KEY, value: COOKIE_CONSENT_VALUE },
            ],
          },
        ],
      };

      const dir = path.join(process.cwd(), "test-results", ".auth");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `worker-${workerInfo.parallelIndex}.json`);
      fs.writeFileSync(file, JSON.stringify(state));

      await use(file);
    },
    { scope: "worker" },
  ],

  // Override Playwright's built-in (test-scoped) storageState to use the worker file.
  // The fixture callback's second arg is named `provide` (not Playwright's usual
  // `use`) so the react-hooks/rules-of-hooks lint rule doesn't mistake the call for
  // React 19's `use` hook.
  storageState: async ({ workerStorageState }, provide) => {
    await provide(workerStorageState);
  },
});

// Per-test normalization: guarantee the consent + onboarding gates never fire,
// even after a snapshot/restore spec puts back stale prefs. Reads the live
// policyVersion constant so it can never drift.
test.beforeEach(async ({ user }) => {
  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .update({
      app_onboarding_completed: true,
      cbt_onboarding_completed: true,
      policy_version_accepted: policyVersion,
    })
    .eq("user_id", user.id);
  if (error) {
    throw new Error(`Prefs normalization failed for ${user.id}: ${error.message}`);
  }
});

export { expect };
