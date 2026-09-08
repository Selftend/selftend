import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

/**
 * `policy_version_accepted` never moves backwards (#2217).
 *
 * Selftend's clients do not deploy together: the web build is live within the
 * release run, Android waits on Play review, iOS on a manual TestFlight
 * promotion. Every build's consent gate compares the stored version against the
 * constant compiled into THAT build, and its accept path writes that same
 * constant back. So during a rollout the one `user_preferences` row is written
 * by two builds that disagree about what the current policy is, and the older
 * one overwrites the newer.
 *
 * ☠️ The clobbering client is the one already installed on people's phones. It
 * cannot be changed. That is the whole reason this guard is in the database:
 * the database deploys ahead of every client, unconditionally, and holds no
 * matter which build issues the write.
 *
 * These tests go through PostgREST as the row's own user - the same path
 * `recordPolicyConsent` takes - rather than through psql, because the point is
 * that an ordinary authenticated write is what gets held, not that a superuser
 * can be stopped.
 */
describe("policy_version_accepted is monotonic (integration)", () => {
  const password = "policy-monotonic-test-pass-123";
  const admin = createServiceClient();
  const created: string[] = [];

  const OLD_VERSION = "2026-08-27-feedback-processors";
  const NEW_VERSION = "2026-09-04-teen-floor";

  async function newSignedInUser() {
    const email = `policy-monotonic-${Date.now()}-${created.length}@test.local`;
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(result.error).toBeNull();
    const userId = result.data.user!.id;
    created.push(userId);

    const client = createAnonClient();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    expect(signedIn.error).toBeNull();
    return { userId, client };
  }

  /** Exactly what `recordPolicyConsent` sends (src/features/settings/repository.ts). */
  async function accept(client: SupabaseClient, userId: string, version: string, at: string) {
    const { error } = await client.from("user_preferences").upsert(
      {
        user_id: userId,
        privacy_policy_accepted_at: at,
        terms_accepted_at: at,
        policy_version_accepted: version,
        health_data_consent_at: at,
      },
      { onConflict: "user_id" },
    );
    return error;
  }

  /** The 0.17.0 payload: no `health_data_consent_at` - that column did not exist. */
  async function acceptAsShippedClient(client: SupabaseClient, userId: string, at: string) {
    const { error } = await client.from("user_preferences").upsert(
      {
        user_id: userId,
        privacy_policy_accepted_at: at,
        terms_accepted_at: at,
        policy_version_accepted: OLD_VERSION,
      },
      { onConflict: "user_id" },
    );
    return error;
  }

  async function readConsent(client: SupabaseClient, userId: string) {
    const row = await client
      .from("user_preferences")
      .select(
        "policy_version_accepted, privacy_policy_accepted_at, terms_accepted_at, health_data_consent_at",
      )
      .eq("user_id", userId)
      .single();
    expect(row.error).toBeNull();
    return row.data as {
      policy_version_accepted: string | null;
      privacy_policy_accepted_at: string | null;
      terms_accepted_at: string | null;
      health_data_consent_at: string | null;
    };
  }

  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  });

  it("records a first acceptance, whatever version it names", async () => {
    // ⚠️ The failure this guard must never produce. A row with nothing stored
    // has no high-water mark to defend, and an account that could not record
    // its FIRST acceptance would be walled out of the app permanently.
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, OLD_VERSION, "2026-08-27T10:00:00.000Z")).toBeNull();

    expect((await readConsent(client, userId)).policy_version_accepted).toBe(OLD_VERSION);
  });

  it("raises the recorded version on a genuine upgrade", async () => {
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, OLD_VERSION, "2026-08-27T10:00:00.000Z")).toBeNull();
    expect(await accept(client, userId, NEW_VERSION, "2026-09-04T10:00:00.000Z")).toBeNull();

    const row = await readConsent(client, userId);
    expect(row.policy_version_accepted).toBe(NEW_VERSION);
    expect(row.terms_accepted_at).toBe("2026-09-04T10:00:00+00:00");
  });

  it("holds the newer version when the shipped 0.17.0 client writes its older one", async () => {
    // The reported loop, end to end: accept on web, then open the phone.
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, NEW_VERSION, "2026-09-04T10:00:00.000Z")).toBeNull();

    // ☠️ The write SUCCEEDS. Failing it would leave that person looking at an
    // error on a full-screen wall with no way past; the record simply does not
    // move.
    expect(await acceptAsShippedClient(client, userId, "2026-09-05T10:00:00.000Z")).toBeNull();

    const row = await readConsent(client, userId);
    expect(row.policy_version_accepted).toBe(NEW_VERSION);
    // The timestamps are held too. Advancing them while keeping the newer
    // version would assert the person accepted the CURRENT policy at that
    // moment - the one thing that demonstrably did not happen.
    expect(row.privacy_policy_accepted_at).toBe("2026-09-04T10:00:00+00:00");
    expect(row.terms_accepted_at).toBe("2026-09-04T10:00:00+00:00");
    expect(row.health_data_consent_at).toBe("2026-09-04T10:00:00+00:00");
  });

  it("survives the whole alternation, not just one round of it", async () => {
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, NEW_VERSION, "2026-09-04T10:00:00.000Z")).toBeNull();
    for (const day of ["05", "06", "07"]) {
      expect(
        await acceptAsShippedClient(client, userId, `2026-09-${day}T10:00:00.000Z`),
      ).toBeNull();
      expect((await readConsent(client, userId)).policy_version_accepted).toBe(NEW_VERSION);
    }
  });

  it("leaves unrelated preference writes alone", async () => {
    // The trigger fires on every UPDATE of the table. A write that does not
    // touch the column must be indistinguishable from one made without it.
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, NEW_VERSION, "2026-09-04T10:00:00.000Z")).toBeNull();

    const { error } = await client
      .from("user_preferences")
      .update({ app_onboarding_completed: true })
      .eq("user_id", userId);
    expect(error).toBeNull();

    const row = await readConsent(client, userId);
    expect(row.policy_version_accepted).toBe(NEW_VERSION);
    expect(row.terms_accepted_at).toBe("2026-09-04T10:00:00+00:00");
  });

  it("allows the record to be cleared, so a deliberate re-gate still works", async () => {
    // Clearing is not a false claim about what was accepted, and it is the
    // supported way to stage a re-gate (a capture, a support reset). Only an
    // OLDER STRING is refused.
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, NEW_VERSION, "2026-09-04T10:00:00.000Z")).toBeNull();

    const { error } = await client
      .from("user_preferences")
      .update({ policy_version_accepted: null })
      .eq("user_id", userId);
    expect(error).toBeNull();

    expect((await readConsent(client, userId)).policy_version_accepted).toBeNull();
  });

  it("lets a row holding an unrankable value heal on the next acceptance", async () => {
    // No date prefix means no ordering exists, so there is nothing to defend
    // and the write goes through. That is what stops a legacy or hand-edited
    // value from freezing an account's consent record forever.
    const { userId, client } = await newSignedInUser();

    expect(await accept(client, userId, "legacy-v3", "2026-08-01T10:00:00.000Z")).toBeNull();
    expect(await accept(client, userId, OLD_VERSION, "2026-08-27T10:00:00.000Z")).toBeNull();

    expect((await readConsent(client, userId)).policy_version_accepted).toBe(OLD_VERSION);
  });
});
