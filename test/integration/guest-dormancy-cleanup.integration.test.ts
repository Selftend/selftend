import { createAnonClient, createServiceClient, runSql, signInAs } from "./helpers";

// ---------------------------------------------------------------------------
// cleanup_dormant_guest_accounts() (integration)
//
// Migration: supabase/migrations/20260826010000_guest_dormancy_cleanup.sql
//
// Guest dormancy cleanup (#1449, spec on #1439 §7): guest accounts
// (is_anonymous = true) are deleted after 12 months of inactivity, where
// activity is the greatest of created_at, last_sign_in_at, and the newest
// session refresh - never age alone. Deletion goes through the shared
// purge_user_account(uuid) helper, so owned rows and storage objects go with
// the auth row.
//
// Tests insert their own dated rows straight into the auth schema via runSql
// (no API can write created_at / refreshed_at), per the spec's test strategy:
// no seed fixtures. Security model mirrors purge_user_account: execute revoked
// from public/anon/authenticated (42501), service_role granted explicitly -
// which is also how these tests invoke it; the daily pg_cron job runs as the
// function owner (postgres) and needs no grant.
// ---------------------------------------------------------------------------

// All rows this suite creates carry this UUID prefix so cleanup can never
// touch seed users or another suite's throwaway accounts.
const TEST_UUID_PREFIX = "d0a91449";
const guestId = (n: number) => `${TEST_UUID_PREFIX}-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** SQL timestamp expression n months before now (UTC). */
const monthsAgo = (n: number) => `timezone('utc', now()) - interval '${n} months'`;

function insertAuthUser(options: {
  id: string;
  isAnonymous: boolean;
  createdAtSql: string;
  lastSignInAtSql?: string;
  email?: string;
}) {
  const { id, createdAtSql } = options;
  const lastSignIn = options.lastSignInAtSql ?? "null";
  const email = options.email ? `'${options.email}'` : "null";
  // Mirrors supabase/seed.sql: the empty-string token columns are set
  // explicitly because GoTrue's schema scan fails if they end up NULL on a
  // direct insert.
  runSql(`
    insert into auth.users (
      id, instance_id, aud, role, email,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
      email_change, email_change_confirm_status, phone_change, phone_change_token,
      reauthentication_token, created_at, updated_at, last_sign_in_at
    ) values (
      '${id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email},
      '{"provider": "anonymous", "providers": ["anonymous"]}', '{}', null, false, ${options.isAnonymous},
      '', '', '', '', '', 0, '', '', '',
      ${createdAtSql}, ${createdAtSql}, ${lastSignIn}
    );
  `);
}

function insertSession(userId: string, refreshedAtSql: string) {
  runSql(`
    insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at, aal)
    values (gen_random_uuid(), '${userId}', ${refreshedAtSql}, ${refreshedAtSql}, ${refreshedAtSql}, 'aal1');
  `);
}

function authUserExists(id: string): boolean {
  return runSql(`select count(*) from auth.users where id = '${id}';`) === "1";
}

function deleteSuiteUsers() {
  // Raw delete is fine here: these rows never own storage objects, and owned
  // public rows either cascade or are removed by the function under test.
  runSql(`delete from public.user_preferences where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  runSql(`delete from auth.users where id::text like '${TEST_UUID_PREFIX}-%';`);
}

/**
 * Purges dormant guests left behind by earlier runs (or local dev) until the
 * database is drained, so count assertions below are deterministic.
 */
async function drainDormantGuests() {
  const service = createServiceClient();
  for (let i = 0; i < 20; i += 1) {
    const { data, error } = await service.rpc("cleanup_dormant_guest_accounts");
    if (error) throw new Error(`drainDormantGuests failed: ${error.message}`);
    if (data === 0) return;
  }
  throw new Error("drainDormantGuests did not converge in 20 batches");
}

describe("cleanup_dormant_guest_accounts() (integration)", () => {
  beforeEach(deleteSuiteUsers);
  afterEach(deleteSuiteUsers);

  it("is denied for anon callers (42501 permission denied)", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("cleanup_dormant_guest_accounts");
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501");
    expect(error?.message).toMatch(/permission denied/i);
  });

  it("is denied for authenticated callers (42501 permission denied)", async () => {
    const alice = await signInAs("alice");
    try {
      const { error } = await alice.rpc("cleanup_dormant_guest_accounts");
      expect(error).not.toBeNull();
      expect(error?.code).toBe("42501");
      expect(error?.message).toMatch(/permission denied/i);
    } finally {
      await alice.auth.signOut();
    }
  });

  it("refuses a non-positive batch size instead of looping forever", async () => {
    const service = createServiceClient();
    const { error } = await service.rpc("cleanup_dormant_guest_accounts", { batch_size: 0 });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/batch_size must be positive/);
  });

  it("deletes a guest dormant for over 12 months through the purge helper", async () => {
    const dormant = guestId(1);
    insertAuthUser({
      id: dormant,
      isAnonymous: true,
      createdAtSql: monthsAgo(14),
      lastSignInAtSql: monthsAgo(14),
    });
    insertSession(dormant, monthsAgo(13));
    // An owned row proves deletion runs through purge_user_account, not a raw
    // auth.users delete.
    runSql(`insert into public.user_preferences (user_id) values ('${dormant}');`);

    const service = createServiceClient();
    const { data, error } = await service.rpc("cleanup_dormant_guest_accounts");
    expect(error).toBeNull();
    expect(data).toBeGreaterThanOrEqual(1);

    expect(authUserExists(dormant)).toBe(false);
    expect(
      runSql(`select count(*) from public.user_preferences where user_id = '${dormant}';`),
    ).toBe("0");
  });

  it("spares an old guest whose newest session refresh is recent", async () => {
    const oldButActive = guestId(2);
    insertAuthUser({
      id: oldButActive,
      isAnonymous: true,
      createdAtSql: monthsAgo(24),
      lastSignInAtSql: monthsAgo(24),
    });
    // Two sessions: one stale, one recently refreshed - the NEWEST refresh
    // must win, so an open device keeps the account alive.
    insertSession(oldButActive, monthsAgo(20));
    insertSession(oldButActive, monthsAgo(1));

    const service = createServiceClient();
    const { error } = await service.rpc("cleanup_dormant_guest_accounts");
    expect(error).toBeNull();

    expect(authUserExists(oldButActive)).toBe(true);
  });

  it("spares a guest with a recent sign-in despite an old account", async () => {
    const recentSignIn = guestId(3);
    insertAuthUser({
      id: recentSignIn,
      isAnonymous: true,
      createdAtSql: monthsAgo(24),
      lastSignInAtSql: monthsAgo(2),
    });

    const service = createServiceClient();
    const { error } = await service.rpc("cleanup_dormant_guest_accounts");
    expect(error).toBeNull();

    expect(authUserExists(recentSignIn)).toBe(true);
  });

  it("spares a recently created guest with no sign-in or sessions yet", async () => {
    const fresh = guestId(4);
    insertAuthUser({ id: fresh, isAnonymous: true, createdAtSql: monthsAgo(1) });

    const service = createServiceClient();
    const { error } = await service.rpc("cleanup_dormant_guest_accounts");
    expect(error).toBeNull();

    expect(authUserExists(fresh)).toBe(true);
  });

  it("never touches registered accounts, no matter how dormant", async () => {
    const registered = guestId(5);
    insertAuthUser({
      id: registered,
      isAnonymous: false,
      createdAtSql: monthsAgo(30),
      lastSignInAtSql: monthsAgo(30),
      // SQL-created and never handed to the auth API, so nothing ever emails it.
      email: "dormant-registered@test.local",
    });

    const service = createServiceClient();
    const { error } = await service.rpc("cleanup_dormant_guest_accounts");
    expect(error).toBeNull();

    expect(authUserExists(registered)).toBe(true);
  });

  it("purges at most batch_size guests per call and reports the count", async () => {
    await drainDormantGuests();
    const ids = [guestId(6), guestId(7), guestId(8)];
    for (const id of ids) {
      insertAuthUser({
        id,
        isAnonymous: true,
        createdAtSql: monthsAgo(15),
        lastSignInAtSql: monthsAgo(15),
      });
    }

    const service = createServiceClient();
    const first = await service.rpc("cleanup_dormant_guest_accounts", { batch_size: 2 });
    expect(first.error).toBeNull();
    expect(first.data).toBe(2);
    const remaining = runSql(
      `select count(*) from auth.users where id::text like '${TEST_UUID_PREFIX}-%';`,
    );
    expect(remaining).toBe("1");

    const second = await service.rpc("cleanup_dormant_guest_accounts", { batch_size: 2 });
    expect(second.error).toBeNull();
    expect(second.data).toBe(1);
    expect(
      runSql(`select count(*) from auth.users where id::text like '${TEST_UUID_PREFIX}-%';`),
    ).toBe("0");
  });

  it("is scheduled as a daily pg_cron job by the migration", () => {
    const row = runSql(
      "select schedule || '|' || command from cron.job where jobname = 'selftend-cleanup-dormant-guests';",
    );
    const [schedule, command] = row.split("|");
    // Five cron fields with fixed hour/minute and every day-of-month/month/day-of-week = daily.
    expect(schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
    expect(command).toContain("cleanup_dormant_guest_accounts");
  });
});
