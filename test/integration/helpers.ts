import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Local Supabase CLI uses deterministic keys derived from the default JWT secret,
// so they're identical on every developer machine and in CI. Hardcoding avoids
// any env-loading complexity in the test runner.
export const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
export const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const SEED_USERS = {
  alice: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "alice@test.local",
    password: "test-pass-alice-123",
  },
  bob: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "bob@test.local",
    password: "test-pass-bob-123",
  },
  demo: {
    id: "00000000-0000-0000-0000-000000000003",
    email: "demo@test.local",
    password: "test-pass-demo-123",
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

export async function deleteAllThoughtRecordsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("thought_records").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`deleteAllThoughtRecordsForUser cleanup failed: ${error.message}`);
  }
}

export async function deleteAllMoodLogsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("mood_logs").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`deleteAllMoodLogsForUser cleanup failed: ${error.message}`);
  }
}

export async function deleteAllJournalEntriesForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("journal_entries").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`deleteAllJournalEntriesForUser cleanup failed: ${error.message}`);
  }
}

export async function deleteAllGratitudeEntriesForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("gratitude_entries").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`deleteAllGratitudeEntriesForUser cleanup failed: ${error.message}`);
  }
}

export async function deleteAllActivityLogsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("activity_logs").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllActivityLogsForUser cleanup failed: ${error.message}`);
}

export async function deleteAllAngerLogsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("anger_logs").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllAngerLogsForUser cleanup failed: ${error.message}`);
}

export async function deleteAllCoreBeliefsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("core_beliefs").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllCoreBeliefsForUser cleanup failed: ${error.message}`);
}

export async function deleteAllWorryEntriesForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("worry_entries").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllWorryEntriesForUser cleanup failed: ${error.message}`);
}

export async function deleteAllSelfCareLogsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("self_care_logs").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllSelfCareLogsForUser cleanup failed: ${error.message}`);
}

export async function deleteAllValuesProfileForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("values_profile").delete().eq("user_id", userId);
  if (error) throw new Error(`deleteAllValuesProfileForUser cleanup failed: ${error.message}`);
}

export async function deleteAllMindfulnessSessionsForUser(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.from("mindfulness_sessions").delete().eq("user_id", userId);
  if (error)
    throw new Error(`deleteAllMindfulnessSessionsForUser cleanup failed: ${error.message}`);
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
