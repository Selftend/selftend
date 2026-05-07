import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Local Supabase CLI uses deterministic keys derived from the default JWT secret,
// so they're identical on every developer machine and in CI. Hardcoding avoids
// any env-loading complexity in the test runner.
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const SEED_USERS = {
  alice: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "alice@test.local",
    password: "password123",
  },
  bob: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "bob@test.local",
    password: "password123",
  },
  demo: {
    id: "00000000-0000-0000-0000-000000000003",
    email: "demo@test.local",
    password: "password123",
  },
} as const;

export type SeedUserName = keyof typeof SEED_USERS;

const baseAuthOptions = {
  // Each test client is its own session; never share storage across tests.
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export function createAnonClient() {
  return createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: baseAuthOptions,
  });
}

export function createServiceClient() {
  return createClient(LOCAL_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: baseAuthOptions,
  });
}

export async function signInAs(name: SeedUserName): Promise<SupabaseClient> {
  const user = SEED_USERS[name];
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) {
    throw new Error(`signInAs(${name}) failed: ${error.message}`);
  }
  return client;
}

// Hard-deletes test rows owned by a user. Uses the service role key so it
// works regardless of test outcome and bypasses RLS.
export async function deleteThoughtRecords(userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const admin = createServiceClient();
  const { error } = await admin
    .from("thought_records")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (error) {
    throw new Error(`deleteThoughtRecords cleanup failed: ${error.message}`);
  }
}

export async function deleteAllThoughtRecordsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("thought_records").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`deleteAllThoughtRecordsForUser cleanup failed: ${error.message}`);
  }
}

// Re-creates a user via admin API after a destructive test. Used by
// delete_user_account tests so a torn-down user comes back for the next run
// without requiring `db:reset`.
export async function ensureSeedUser(name: SeedUserName) {
  const user = SEED_USERS[name];
  const admin = createServiceClient();
  const { data: existing } = await admin.auth.admin.getUserById(user.id);
  if (existing?.user) return;

  await admin.auth.admin.createUser({
    user_id: user.id,
    email: user.email,
    password: user.password,
    email_confirm: true,
  } as Parameters<typeof admin.auth.admin.createUser>[0]);
}

// Mailpit (the Supabase CLI's local mail catcher) exposes a REST API on 54324.
const MAILPIT_URL = "http://127.0.0.1:54324";

interface MailpitMessageSummary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
  Created: string;
}

export async function clearMailpitMessages() {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}

export async function findMailpitMessageTo(
  address: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<MailpitMessageSummary> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const pollMs = options.pollMs ?? 100;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const body = (await response.json()) as { messages: MailpitMessageSummary[] };
    const match = body.messages.find((m) =>
      m.To.some((to) => to.Address.toLowerCase() === address.toLowerCase()),
    );
    if (match) return match;
    await new Promise((r) => setTimeout(r, pollMs));
  }

  throw new Error(`Timed out waiting for Mailpit message to ${address}`);
}

export async function getMailpitMessageBody(id: string): Promise<{ HTML: string; Text: string }> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  const body = (await response.json()) as { HTML: string; Text: string };
  return body;
}
