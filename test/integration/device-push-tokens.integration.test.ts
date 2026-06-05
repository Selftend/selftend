import type { SupabaseClient } from "@supabase/supabase-js";

import { SEED_USERS, createServiceClient, signInAs } from "./helpers";

// device_push_tokens is the native sibling of web_push_subscriptions: per-user, RLS own-row.
// (Cascade-on-user-delete is covered by the delete_user_account() test in
// db-functions.integration.test.ts.)

const TEST_TOKEN = "ExponentPushToken[device-tokens-itest]";

describe("device_push_tokens (integration)", () => {
  let bob: SupabaseClient;
  let alice: SupabaseClient;

  beforeAll(async () => {
    bob = await signInAs("bob");
    alice = await signInAs("alice");
  });

  afterAll(async () => {
    const admin = createServiceClient();
    await admin.from("device_push_tokens").delete().eq("expo_push_token", TEST_TOKEN);
    await bob.auth.signOut();
    await alice.auth.signOut();
  });

  it("lets the owner upsert and read their token (enabled defaults true)", async () => {
    const insert = await bob.from("device_push_tokens").upsert(
      {
        user_id: SEED_USERS.bob.id,
        expo_push_token: TEST_TOKEN,
        platform: "android",
        time_zone: "Europe/Sofia",
      },
      { onConflict: "expo_push_token" },
    );
    expect(insert.error).toBeNull();

    const read = await bob
      .from("device_push_tokens")
      .select("platform,enabled,time_zone")
      .eq("expo_push_token", TEST_TOKEN)
      .single();
    expect(read.error).toBeNull();
    expect(read.data).toMatchObject({
      platform: "android",
      enabled: true,
      time_zone: "Europe/Sofia",
    });
  });

  it("does not let another user read the token (RLS)", async () => {
    const { data, error } = await alice
      .from("device_push_tokens")
      .select("id")
      .eq("expo_push_token", TEST_TOKEN);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("lets the owner delete their own token", async () => {
    const del = await bob.from("device_push_tokens").delete().eq("expo_push_token", TEST_TOKEN);
    expect(del.error).toBeNull();

    const read = await bob
      .from("device_push_tokens")
      .select("id")
      .eq("expo_push_token", TEST_TOKEN);
    expect(read.data ?? []).toHaveLength(0);
  });
});
