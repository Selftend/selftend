import fs from "node:fs";
import path from "node:path";

import { test as base, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { createServiceClient, LOCAL_SUPABASE_URL, LOCAL_ANON_KEY } from "../integration/helpers";
import {
  CANDIDATE_STORAGE_KEYS,
  CAPTURE_STORAGE_KEY,
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_VALUE,
  NORMALIZED_GATE_PREFS,
} from "./session-injection";

// Re-exported so pool-fixture specs keep one import site. ☠️ A spec on PLAIN
// @playwright/test must import from ./session-injection instead: loading this
// module registers the `beforeEach({ user })` hook below, and a file without
// the worker fixtures dies on it ("beforeEach hook has unknown parameter").
export { NORMALIZED_GATE_PREFS };

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

// Per-test normalization: guarantee the consent + onboarding gates never fire.
// Upsert, not update: an UPDATE against a missing row is a silent 0-row no-op,
// leaving the app to lazily recreate the row with gate-firing defaults
// mid-test (#172). Every other column keeps its table default on insert.
test.beforeEach(async ({ user }) => {
  const admin = createServiceClient();
  const { error } = await admin
    .from("user_preferences")
    .upsert({ user_id: user.id, ...NORMALIZED_GATE_PREFS }, { onConflict: "user_id" });
  if (error) {
    throw new Error(`Prefs normalization failed for ${user.id}: ${error.message}`);
  }
});

export { expect };
