import { createClient } from "@supabase/supabase-js";

import {
  LOCAL_ANON_KEY,
  LOCAL_SUPABASE_URL,
  SEED_USERS,
  clearMailpitMessages,
  createServiceClient,
  findMailpitMessageTo,
  getMailpitMessageBody,
} from "./helpers";

function freshClient() {
  return createClient(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

describe("auth: signInWithPassword (integration)", () => {
  it("returns a session for a seeded user", async () => {
    const client = freshClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: SEED_USERS.alice.email,
      password: SEED_USERS.alice.password,
    });

    expect(error).toBeNull();
    expect(data.user?.id).toBe(SEED_USERS.alice.id);
    expect(data.user?.email).toBe(SEED_USERS.alice.email);
    expect(data.session?.access_token).toEqual(expect.any(String));
  });

  it("rejects a wrong password", async () => {
    const client = freshClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: SEED_USERS.alice.email,
      password: "wrong-password",
    });

    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/invalid|credential/i);
  });

  it("rejects an unknown email", async () => {
    const client = freshClient();
    const { error } = await client.auth.signInWithPassword({
      email: "noone@test.local",
      password: "test-pass-unknown-12",
    });

    expect(error).not.toBeNull();
    expect(error?.message ?? "").toMatch(/invalid|credential/i);
  });
});

describe("auth: signUp (integration)", () => {
  const newEmail = `signup-${Date.now()}@test.local`;

  afterAll(async () => {
    const admin = createServiceClient();
    const list = await admin.auth.admin.listUsers();
    const created = list.data?.users.find((u) => u.email === newEmail);
    if (created) {
      await admin.auth.admin.deleteUser(created.id);
    }
  });

  it("creates a user and (with auto-confirm enabled locally) signs them in", async () => {
    const client = freshClient();
    const { data, error } = await client.auth.signUp({
      email: newEmail,
      password: "test-pass-signup-123",
    });

    expect(error).toBeNull();
    expect(data.user?.email).toBe(newEmail);

    const admin = createServiceClient();
    const list = await admin.auth.admin.listUsers();
    const found = list.data?.users.find((u) => u.email === newEmail);
    expect(found).toBeDefined();
  });
});

describe("auth: password reset flow via Mailpit (integration)", () => {
  beforeAll(async () => {
    await clearMailpitMessages();
  });

  it("sends a recovery email and lands a clickable token", async () => {
    const client = freshClient();
    const { error } = await client.auth.resetPasswordForEmail(SEED_USERS.alice.email);
    expect(error).toBeNull();

    const summary = await findMailpitMessageTo(SEED_USERS.alice.email);
    expect(summary.Subject.toLowerCase()).toMatch(/reset|password|recovery/);

    const body = await getMailpitMessageBody(summary.ID);
    const combined = `${body.HTML}\n${body.Text}`;
    expect(combined).toMatch(/token|recovery|reset/i);
    expect(combined).toMatch(/https?:\/\//);
  });
});

describe("auth: server-side password policy", () => {
  it("rejects sign-up with an 11-character password", async () => {
    const client = freshClient();
    const { data, error } = await client.auth.signUp({
      email: `policy-short-${Date.now()}@test.local`,
      password: "elevenchars",
    });

    expect(data.user).toBeNull();
    expect(error).toBeTruthy();
    // Supabase returns a generic 422 with weak_password code OR a 400 with
    // a "Password should be" message depending on version. Accept either.
    const message = (error?.message ?? "").toLowerCase();
    const code = (error as { code?: string } | null)?.code ?? "";
    expect(code === "weak_password" || message.includes("at least 12")).toBe(true);
  });

  it("accepts sign-up with a 12-character password", async () => {
    const client = freshClient();
    const email = `policy-ok-${Date.now()}@test.local`;
    const { data, error } = await client.auth.signUp({
      email,
      password: "twelvechars1",
    });

    expect(error).toBeNull();
    expect(data.user).not.toBeNull();

    // Cleanup so re-running the test stays clean.
    if (data.user) {
      const admin = createServiceClient();
      await admin.auth.admin.deleteUser(data.user.id);
    }
  });
});
