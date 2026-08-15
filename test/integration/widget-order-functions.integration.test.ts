import type { SupabaseClient } from "@supabase/supabase-js";

import { createAnonClient, createServiceClient } from "./helpers";

// add_widget_preference / set_widget_order (#974), exercised through PostgREST so
// `auth.uid()`, RLS and the grants are the real ones.
describe("widget order functions (integration)", () => {
  const password = "widget-order-rpc-test-pass-123";
  const email = `widget-order-rpc-${Date.now()}@test.local`;
  const otherEmail = `widget-order-rpc-other-${Date.now()}@test.local`;
  const admin = createServiceClient();
  let userId: string;
  let otherUserId: string;
  let client: SupabaseClient;
  let otherClient: SupabaseClient;

  async function createSignedInUser(userEmail: string) {
    const created = await admin.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const signedInClient = createAnonClient();
    const signedIn = await signedInClient.auth.signInWithPassword({ email: userEmail, password });
    expect(signedIn.error).toBeNull();
    return { id: created.data.user!.id, client: signedInClient };
  }

  async function positions(forClient: SupabaseClient, forUserId: string) {
    const { data, error } = await forClient
      .from("widget_preferences")
      .select("widget_id, position")
      .eq("user_id", forUserId)
      .order("position", { ascending: true });
    expect(error).toBeNull();
    return (data ?? []) as { widget_id: string; position: number }[];
  }

  async function reset() {
    const { error } = await client.from("widget_preferences").delete().eq("user_id", userId);
    expect(error).toBeNull();
  }

  async function seed(rows: { widget_id: string; position: number }[]) {
    await reset();
    const { error } = await client
      .from("widget_preferences")
      .insert(rows.map((row) => ({ ...row, user_id: userId })));
    expect(error).toBeNull();
  }

  // One INSERT per row, so every row gets a distinct `created_at` in insertion order.
  // A single multi-row insert shares one transaction timestamp, which would leave
  // `widget_id` as the only tiebreak and make the `created_at` leg untestable.
  async function seedSequentially(rows: { widget_id: string; position: number }[]) {
    await reset();
    for (const row of rows) {
      const { error } = await client.from("widget_preferences").insert({ ...row, user_id: userId });
      expect(error).toBeNull();
    }
  }

  // The order a client reads with (#986): `position` first, then the `created_at` and
  // `widget_id` tiebreaks that make the read total even while two rows share a position.
  async function readOrder(withTiebreak: boolean) {
    let query = client
      .from("widget_preferences")
      .select("widget_id")
      .eq("user_id", userId)
      .order("position", { ascending: true });
    if (withTiebreak) {
      query = query
        .order("created_at", { ascending: true })
        .order("widget_id", { ascending: true });
    }
    const { data, error } = await query;
    expect(error).toBeNull();
    return ((data ?? []) as { widget_id: string }[]).map((row) => row.widget_id);
  }

  beforeAll(async () => {
    const owner = await createSignedInUser(email);
    userId = owner.id;
    client = owner.client;

    const other = await createSignedInUser(otherEmail);
    otherUserId = other.id;
    otherClient = other.client;
  });

  afterAll(async () => {
    await client?.auth.signOut();
    await otherClient?.auth.signOut();
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (otherUserId) await admin.auth.admin.deleteUser(otherUserId);
  });

  describe("add_widget_preference", () => {
    beforeEach(reset);

    it("appends each widget at the end, starting from 0", async () => {
      for (const widgetId of ["mood-checkin", "journal-week", "sleep-latest"]) {
        const { error } = await client.rpc("add_widget_preference", { p_widget_id: widgetId });
        expect(error).toBeNull();
      }

      expect(await positions(client, userId)).toEqual([
        { widget_id: "mood-checkin", position: 0 },
        { widget_id: "journal-week", position: 1 },
        { widget_id: "sleep-latest", position: 2 },
      ]);
    });

    it("is idempotent - re-adding does not duplicate the row or move it", async () => {
      await client.rpc("add_widget_preference", { p_widget_id: "mood-checkin" });
      await client.rpc("add_widget_preference", { p_widget_id: "journal-week" });
      const { error } = await client.rpc("add_widget_preference", { p_widget_id: "mood-checkin" });
      expect(error).toBeNull();

      expect(await positions(client, userId)).toEqual([
        { widget_id: "mood-checkin", position: 0 },
        { widget_id: "journal-week", position: 1 },
      ]);
    });

    // The point of the whole slice. The old client path read the list, took
    // `max(position) + 1` and wrote it back, so two adds in flight together landed on
    // the same position. Computing it server-side is necessary but NOT sufficient:
    // under READ COMMITTED two concurrent transactions still snapshot the same maximum,
    // which is why the function takes a per-user advisory lock. Without that lock this
    // test fails - measured: both rows land on position 0.
    it("gives concurrent adds distinct positions", async () => {
      const widgetIds = [
        "mood-checkin",
        "journal-week",
        "sleep-latest",
        "habits-today",
        "breathing-suggested",
        "grounding-log",
        "meditation-pick",
        "cbt-open-record",
      ];

      const results = await Promise.all(
        widgetIds.map((widgetId) => client.rpc("add_widget_preference", { p_widget_id: widgetId })),
      );
      for (const result of results) expect(result.error).toBeNull();

      const rows = await positions(client, userId);
      expect(rows).toHaveLength(widgetIds.length);
      // Every row got its own position, and together they are exactly 0..n-1.
      expect(rows.map((row) => row.position)).toEqual([...widgetIds.keys()]);
    });

    it("rejects a blank widget id", async () => {
      const { error } = await client.rpc("add_widget_preference", { p_widget_id: "   " });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Invalid widget id");
    });

    it("is not executable by an anonymous caller", async () => {
      const anon = createAnonClient();
      const { error } = await anon.rpc("add_widget_preference", { p_widget_id: "mood-checkin" });
      expect(error).not.toBeNull();
    });
  });

  describe("set_widget_order", () => {
    beforeEach(async () => {
      await seed([
        { widget_id: "a", position: 0 },
        { widget_id: "b", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "d", position: 3 },
        { widget_id: "e", position: 4 },
      ]);
    });

    it("reorders the full list", async () => {
      const { error } = await client.rpc("set_widget_order", {
        p_widget_ids: ["e", "d", "c", "b", "a"],
      });
      expect(error).toBeNull();

      expect(await positions(client, userId)).toEqual([
        { widget_id: "e", position: 0 },
        { widget_id: "d", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "b", position: 3 },
        { widget_id: "a", position: 4 },
      ]);
    });

    // The property that makes a partitioned renderer safe: a caller that can only see
    // part of the list cannot disturb the part it cannot see.
    it("leaves every unnamed row's position untouched", async () => {
      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["e", "a"] });
      expect(error).toBeNull();

      // Only the slots {0, 4} that `a` and `e` already held were redistributed.
      // b, c and d keep 1, 2 and 3 exactly.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "e", position: 0 },
        { widget_id: "b", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "d", position: 3 },
        { widget_id: "a", position: 4 },
      ]);
    });

    it("hands out only the non-contiguous slots the named rows already held", async () => {
      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["d", "b", "a"] });
      expect(error).toBeNull();

      // Named rows held {0, 1, 3}; sorted and reassigned as d=0, b=1, a=3.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "d", position: 0 },
        { widget_id: "b", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "a", position: 3 },
        { widget_id: "e", position: 4 },
      ]);
    });

    it("ignores ids the caller does not own, and duplicate ids", async () => {
      const { error } = await client.rpc("set_widget_order", {
        p_widget_ids: ["b", "b", "not-mine", "a"],
      });
      expect(error).toBeNull();

      // Only a and b move, within the slots {0, 1} they held.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "b", position: 0 },
        { widget_id: "a", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "d", position: 3 },
        { widget_id: "e", position: 4 },
      ]);
    });

    it("treats an empty array as a no-op", async () => {
      const { error } = await client.rpc("set_widget_order", { p_widget_ids: [] });
      expect(error).toBeNull();

      expect(await positions(client, userId)).toEqual([
        { widget_id: "a", position: 0 },
        { widget_id: "b", position: 1 },
        { widget_id: "c", position: 2 },
        { widget_id: "d", position: 3 },
        { widget_id: "e", position: 4 },
      ]);
    });

    it("rejects a blank widget id", async () => {
      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["a", ""] });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Invalid widget id");
    });

    it("rejects more than 100 ids", async () => {
      const tooMany = Array.from({ length: 101 }, (_, index) => `w${index}`);
      const { error } = await client.rpc("set_widget_order", { p_widget_ids: tooMany });
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Too many widgets");
    });

    // `security invoker` plus the `user_id = uid` filter: naming another user's ids
    // reaches nothing, and their rows keep their positions.
    it("cannot reorder another user's rows", async () => {
      const seeded = await otherClient.from("widget_preferences").insert([
        { user_id: otherUserId, widget_id: "a", position: 0 },
        { user_id: otherUserId, widget_id: "b", position: 1 },
      ]);
      expect(seeded.error).toBeNull();

      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["b", "a"] });
      expect(error).toBeNull();

      expect(await positions(otherClient, otherUserId)).toEqual([
        { widget_id: "a", position: 0 },
        { widget_id: "b", position: 1 },
      ]);

      await otherClient.from("widget_preferences").delete().eq("user_id", otherUserId);
    });

    it("is not executable by an anonymous caller", async () => {
      const anon = createAnonClient();
      const { error } = await anon.rpc("set_widget_order", { p_widget_ids: ["a"] });
      expect(error).not.toBeNull();
    });
  });

  // #986. `position` is not constrained unique and RLS lets any client write it directly,
  // so a duplicate can still arrive from outside these two functions - most realistically
  // from a pre-#974 build, which still rewrites positions 0..n-1 over a filtered view of
  // the list. Before this slice a duplicate was permanent: `set_widget_order` preserves
  // the multiset of positions, so no reorder could ever heal one.
  //
  // Every seed here writes the duplicate the way such a client would - a direct insert
  // under the user's own RLS policy.
  describe("duplicate positions arriving from outside these functions", () => {
    // `z` is inserted before `a` so insertion order and alphabetical order disagree.
    // Healing follows (position, created_at, widget_id), so `z` must come first; if
    // `widget_id` were doing the work the pair would come back the other way round.
    const duplicated = [
      { widget_id: "z", position: 0 },
      { widget_id: "a", position: 0 },
      { widget_id: "c", position: 1 },
    ];

    it("add_widget_preference renumbers them before appending", async () => {
      await seedSequentially([
        { widget_id: "z", position: 0 },
        { widget_id: "a", position: 0 },
      ]);

      const { error } = await client.rpc("add_widget_preference", { p_widget_id: "m" });
      expect(error).toBeNull();

      // Without healing the new row lands on `max(position) + 1` = 1, next to `a`, and
      // the pair at 0 stays duplicated forever.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "z", position: 0 },
        { widget_id: "a", position: 1 },
        { widget_id: "m", position: 2 },
      ]);
    });

    it("set_widget_order renumbers them before redistributing slots", async () => {
      await seedSequentially(duplicated);

      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["a", "z"] });
      expect(error).toBeNull();

      // Healed to z=0, a=1, c=2 first; only then do the named rows swap the slots
      // {0, 1} they hold. Without healing both named rows hold 0, so the "swap" hands
      // 0 back to each of them and the duplicate survives.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "a", position: 0 },
        { widget_id: "z", position: 1 },
        { widget_id: "c", position: 2 },
      ]);
    });

    it("leaves the unnamed row's rank alone even though its position value changes", async () => {
      await seedSequentially([
        { widget_id: "z", position: 0 },
        { widget_id: "a", position: 0 },
        { widget_id: "c", position: 5 },
      ]);

      const { error } = await client.rpc("set_widget_order", { p_widget_ids: ["a", "z"] });
      expect(error).toBeNull();

      // `c` was never named, and it is still last. Healing closes its gap (5 -> 2), so
      // the guarantee an unnamed row gets is that its RANK is untouched, not its
      // literal position value.
      expect(await positions(client, userId)).toEqual([
        { widget_id: "a", position: 0 },
        { widget_id: "z", position: 1 },
        { widget_id: "c", position: 2 },
      ]);
    });

    // The contract that lets the read keep its tiebreak and the write keep healing
    // without the two disagreeing: healing is invisible. This derives the expectation
    // from an actual pre-heal read rather than restating the ordering.
    it("heals into exactly the order the read already showed", async () => {
      await seedSequentially(duplicated);
      const beforeHeal = await readOrder(true);

      // Re-adding a widget the user already has is a heal and nothing else: the insert
      // hits `on conflict do nothing`.
      const { error } = await client.rpc("add_widget_preference", { p_widget_id: "z" });
      expect(error).toBeNull();

      // Read back with no tiebreak at all - positions are distinct now, so they alone
      // are total. Same sequence, so no dashboard reshuffles when a duplicate heals.
      expect(await readOrder(false)).toEqual(beforeHeal);
      expect(beforeHeal).toEqual(["z", "a", "c"]);
    });
  });
});
