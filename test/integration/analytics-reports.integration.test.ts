import * as fs from "node:fs";
import * as path from "node:path";

import { runSql } from "./helpers";

// ---------------------------------------------------------------------------
// Aggregate analytics reports (integration)
//
// Files: scripts/analytics-onboarding.sql, -engagement.sql, -segment.sql
//
// These reports are plain SQL run by hand through psql, so nothing else in the
// repo type-checks them: a renamed column or a dropped table breaks them
// silently until the day someone actually runs one, which is quarterly. The
// smoke tests below execute every report end to end with ON_ERROR_STOP=1, which
// is the whole gate for that class of rot.
//
// The rest of the suite covers the segment report's judgement calls (#1613,
// decided on #1605): which arm a user lands in, the signup-anchored W4 window,
// and k=5 cell suppression. Those are read as evidence about who Selftend is
// for, so getting a user into the wrong arm is worse than a crash.
//
// Rows are inserted straight into the auth schema via runSql (no API can write
// auth.users.created_at), following guest-dormancy-cleanup.integration.test.ts.
// ---------------------------------------------------------------------------

const SCRIPTS_DIR = path.resolve(__dirname, "..", "..", "scripts");
const REPORTS = ["onboarding", "engagement", "segment"] as const;

// Every row this suite creates carries this UUID prefix, so teardown can never
// touch seed users or another suite's throwaway accounts, and so the assertions
// below can filter down to this cohort alone.
const TEST_UUID_PREFIX = "d0a91613";
const userId = (n: number) => `${TEST_UUID_PREFIX}-0000-4000-8000-${String(n).padStart(12, "0")}`;

function reportSql(name: string): string {
  return fs.readFileSync(path.join(SCRIPTS_DIR, `analytics-${name}.sql`), "utf8");
}

/**
 * The report's definitions — every temp view and helper function, up to the
 * first `\echo`. Appending a query to this runs it against the report's own
 * views, so the logic under test is the shipped logic and not a copy of it.
 */
function definitions(name: string): string {
  const source = reportSql(name);
  const firstSection = source.indexOf("\n\\echo");
  if (firstSection === -1) {
    throw new Error(`analytics-${name}.sql has no \\echo section to split on`);
  }
  return `${source.slice(0, firstSection)}\n`;
}

/**
 * One printed section of a report, by its `=== n)` number: the statements
 * between that `\echo` heading and the next one, with the `\echo` lines
 * themselves dropped. Running it through `queryWithin` executes the shipped
 * section verbatim against the report's own views.
 */
function section(name: string, number: number): string {
  const lines = reportSql(name).split("\n");
  const start = lines.findIndex((line) => line.startsWith(`\\echo '=== ${number})`));
  if (start === -1) throw new Error(`analytics-${name}.sql has no section ${number}`);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("\\echo")) break;
    body.push(line);
  }
  return body.join("\n");
}

// psql prints a command tag (CREATE VIEW, CREATE FUNCTION) for every statement
// in the definitions block, so the rows we want are whatever follows this.
const ROW_MARKER = "__rows_below__";

/** Runs a query against the named report's own temp views and helper functions. */
function queryWithin(name: string, sql: string): string[][] {
  const output = runSql(`${definitions(name)}select '${ROW_MARKER}';\n${sql}\n`);
  const lines = output.split("\n");
  const start = lines.indexOf(ROW_MARKER);
  if (start === -1) throw new Error(`analytics-${name}.sql definitions did not run:\n${output}`);
  return lines
    .slice(start + 1)
    .filter((line) => line !== "")
    .map((line) => line.split("|"));
}

function insertAuthUser(options: { id: string; isAnonymous?: boolean; createdAtSql: string }) {
  // Mirrors supabase/seed.sql: the empty-string token columns are set
  // explicitly because GoTrue's schema scan fails if they end up NULL on a
  // direct insert.
  runSql(`
    insert into auth.users (
      id, instance_id, aud, role, email,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
      email_change, email_change_confirm_status, phone_change, phone_change_token,
      reauthentication_token, created_at, updated_at
    ) values (
      '${options.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null,
      '{"provider": "anonymous", "providers": ["anonymous"]}', '{}', null, false, ${options.isAnonymous ?? false},
      '', '', '', '', '', 0, '', '', '',
      ${options.createdAtSql}, ${options.createdAtSql}
    );
  `);
}

function insertPreferences(options: {
  id: string;
  initialConcernsSql: string;
  viaSql: string;
  completed: boolean;
}) {
  runSql(`
    insert into public.user_preferences (
      user_id, app_onboarding_completed, app_onboarding_completed_via, initial_concerns
    ) values (
      '${options.id}', ${options.completed}, ${options.viaSql}, ${options.initialConcernsSql}
    );
  `);
}

/** A content row at a chosen moment; mood_logs is written through its INSTEAD OF trigger. */
function insertMoodLog(id: string, createdAtSql: string) {
  runSql(`
    insert into public.mood_logs (user_id, mood_score, created_at, logged_at)
    values ('${id}', 3, ${createdAtSql}, ${createdAtSql});
  `);
}

/** A preferences row whose only interesting column is the enabled_modules array. */
function insertEnabledModules(id: string, enabledModulesSql: string) {
  runSql(`
    insert into public.user_preferences (user_id, enabled_modules)
    values ('${id}', ${enabledModulesSql});
  `);
}

/** A gratitude record, the module content row the #1672 drift was first seen on. */
function insertGratitudeEntry(id: string) {
  runSql(`insert into public.gratitude_entries (user_id, item_1) values ('${id}', 'a warm cup');`);
}

function deleteSuiteUsers() {
  runSql(
    `delete from public.gratitude_entries_data where user_id::text like '${TEST_UUID_PREFIX}-%';`,
  );
  runSql(`delete from public.mood_logs_data where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  runSql(`delete from public.user_preferences where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  runSql(`delete from auth.users where id::text like '${TEST_UUID_PREFIX}-%';`);
}

describe("aggregate analytics reports (integration)", () => {
  beforeAll(deleteSuiteUsers);
  afterAll(deleteSuiteUsers);

  describe("every report executes against the live schema", () => {
    for (const name of REPORTS) {
      it(`analytics-${name}.sql runs clean`, () => {
        // runSql uses ON_ERROR_STOP=1 and throws on a non-zero exit, so a
        // renamed column or dropped table fails here rather than in three
        // months when someone runs the report by hand.
        expect(() => runSql(reportSql(name))).not.toThrow();
      });
    }
  });

  describe("segment report: k=5 cell suppression", () => {
    it("suppresses counts of 1..4, prints 0 and 5+", () => {
      const [row] = queryWithin(
        "segment",
        `select pg_temp.k_count(0), pg_temp.k_count(1), pg_temp.k_count(4),
                pg_temp.k_count(5), pg_temp.k_count(41), pg_temp.k_count(null);`,
      );
      expect(row).toEqual(["0", "<5", "<5", "5", "41", "0"]);
    });

    it("withholds a percentage whose denominator is suppressed", () => {
      // The false-precision case the rule exists for: 2 of 3 is not "67%".
      const [row] = queryWithin(
        "segment",
        `select pg_temp.k_pct(2, 3), pg_temp.k_pct(0, 0), pg_temp.k_pct(4, 4);`,
      );
      expect(row).toEqual(["-", "-", "-"]);
    });

    it("withholds a percentage whose numerator is suppressed, even on a large denominator", () => {
      // Printing "7.5%" over 40 would disclose the numerator the count hid.
      const [row] = queryWithin("segment", `select pg_temp.k_pct(3, 40), pg_temp.k_pct(1, 100);`);
      expect(row).toEqual(["-", "-"]);
    });

    it("prints a percentage once both cells clear k=5, and prints a true zero", () => {
      const [row] = queryWithin(
        "segment",
        `select pg_temp.k_pct(5, 10), pg_temp.k_pct(0, 40), pg_temp.k_pct(30, 30);`,
      );
      expect(row).toEqual(["50.0%", "0.0%", "100.0%"]);
    });
  });

  describe("segment report: which arm a user lands in", () => {
    beforeAll(() => {
      deleteSuiteUsers();
      const createdAt = "now() - interval '40 days'";

      // 1: two concerns at intake -> two arms, because arms overlap.
      insertAuthUser({ id: userId(1), createdAtSql: createdAt });
      insertPreferences({
        id: userId(1),
        initialConcernsSql: `array['sleep','habits']`,
        viaSql: `'finish'`,
        completed: true,
      });

      // 2 and 3: both have an EMPTY initial_concerns, and only
      // app_onboarding_completed_via can tell them apart.
      insertAuthUser({ id: userId(2), createdAtSql: createdAt });
      insertPreferences({
        id: userId(2),
        initialConcernsSql: `array[]::text[]`,
        viaSql: `'skip'`,
        completed: true,
      });
      insertAuthUser({ id: userId(3), createdAtSql: createdAt });
      insertPreferences({
        id: userId(3),
        initialConcernsSql: `array[]::text[]`,
        viaSql: `'finish'`,
        completed: true,
      });

      // 4: empty concerns written with no completion mode (the empty-Home
      // suggestion flow). Neither zero arm may claim this user.
      insertAuthUser({ id: userId(4), createdAtSql: createdAt });
      insertPreferences({
        id: userId(4),
        initialConcernsSql: `array[]::text[]`,
        viaSql: "null",
        completed: false,
      });

      // 5: no user_preferences row at all. 6: a row that predates the column.
      insertAuthUser({ id: userId(5), createdAtSql: createdAt });
      insertAuthUser({ id: userId(6), createdAtSql: createdAt });
      insertPreferences({
        id: userId(6),
        initialConcernsSql: "null",
        viaSql: `'finish'`,
        completed: true,
      });

      // 7: a key no client ships. The RPC does not validate concern keys, so
      // section 4 is the only thing standing between this and a silent drop.
      insertAuthUser({ id: userId(7), createdAtSql: createdAt });
      insertPreferences({
        id: userId(7),
        initialConcernsSql: `array['not-a-real-concern']`,
        viaSql: `'finish'`,
        completed: true,
      });

      // 8: a guest, so the account axis is exercised on real rows.
      insertAuthUser({ id: userId(8), createdAtSql: createdAt, isAnonymous: true });
      insertPreferences({
        id: userId(8),
        initialConcernsSql: `array['low-mood']`,
        viaSql: `'finish'`,
        completed: true,
      });
    });

    afterAll(deleteSuiteUsers);

    it("puts each user in the arms their intake record earns", () => {
      const rows = queryWithin(
        "segment",
        `select account, arm, count(*) from user_arms
          where user_id::text like '${TEST_UUID_PREFIX}-%'
          group by 1, 2 order by 1, 2;`,
      );
      expect(rows).toEqual([
        ["guest", "low-mood", "1"],
        ["registered", "finished-with-none", "1"],
        ["registered", "habits", "1"],
        ["registered", "not-a-real-concern", "1"],
        ["registered", "skipped", "1"],
        ["registered", "sleep", "1"],
        ["registered", "unknown", "2"],
        ["registered", "zero-concerns-no-mode", "1"],
      ]);
    });

    it("counts a multi-concern user once per arm, so arm rows exceed users", () => {
      const [row] = queryWithin(
        "segment",
        `select count(distinct user_id), count(*) from user_arms
          where user_id::text like '${TEST_UUID_PREFIX}-%';`,
      );
      // 8 users, 9 arm rows: user 1 declared two concerns.
      expect(row).toEqual(["8", "9"]);
    });

    it("surfaces an unrecognised concern key instead of dropping it", () => {
      const rows = queryWithin(
        "segment",
        `select ua.arm from user_arms ua
          where ua.user_id::text like '${TEST_UUID_PREFIX}-%'
            and not exists (select 1 from arm_labels al where al.arm = ua.arm);`,
      );
      expect(rows).toEqual([["not-a-real-concern"]]);
    });

    it("never files a zero-concern user under a concern arm", () => {
      const rows = queryWithin(
        "segment",
        `select count(*) from user_arms
          where user_id::text in ('${userId(2)}', '${userId(3)}', '${userId(4)}')
            and arm in ('anxious-thoughts','low-mood','stress-overwhelm','sleep','habits','reflection');`,
      );
      expect(rows).toEqual([["0"]]);
    });
  });

  describe("segment report: the W4 window is signup-anchored", () => {
    beforeAll(() => {
      deleteSuiteUsers();

      // Every user below signed up 40 days ago unless stated, so the only thing
      // that varies is WHERE in their own timeline the content row falls. The
      // fixtures deliberately straddle both edges of the window: without a
      // day-24 and a day-37 user, widening the window in either direction is
      // invisible and the whole suite is vacuous.

      // 10: day 30 — inside the window.
      insertAuthUser({ id: userId(10), createdAtSql: "now() - interval '40 days'" });
      insertMoodLog(userId(10), "now() - interval '10 days'");

      // 11: day 10 — active, but far short of the window.
      insertAuthUser({ id: userId(11), createdAtSql: "now() - interval '40 days'" });
      insertMoodLog(userId(11), "now() - interval '30 days'");

      // 12: active today, but signed up 3 days ago, so W4 has not elapsed.
      insertAuthUser({ id: userId(12), createdAtSql: "now() - interval '3 days'" });
      insertMoodLog(userId(12), "now()");

      // 13: mature and silent.
      insertAuthUser({ id: userId(13), createdAtSql: "now() - interval '40 days'" });

      // 14: day 24 — just BELOW the window. Pins the 28-day lower edge.
      insertAuthUser({ id: userId(14), createdAtSql: "now() - interval '40 days'" });
      insertMoodLog(userId(14), "now() - interval '16 days'");

      // 15: day 37 — just PAST the window. Pins the 35-day upper edge.
      insertAuthUser({ id: userId(15), createdAtSql: "now() - interval '40 days'" });
      insertMoodLog(userId(15), "now() - interval '3 days'");

      // 16: signed up 30 days ago and active on day 29, so they are inside the
      // window but their W4 has not fully elapsed. Pins the maturity threshold:
      // this user must never be counted, however active they are.
      insertAuthUser({ id: userId(16), createdAtSql: "now() - interval '30 days'" });
      insertMoodLog(userId(16), "now() - interval '1 days'");
    });

    afterAll(deleteSuiteUsers);

    it("marks maturity and retention per user's own signup date", () => {
      const rows = queryWithin(
        "segment",
        `select user_id, w4_mature, w4_retained from user_w4
          where user_id::text like '${TEST_UUID_PREFIX}-%' order by user_id;`,
      );
      expect(rows).toEqual([
        [userId(10), "t", "t"],
        [userId(11), "t", "f"],
        [userId(12), "f", "f"],
        [userId(13), "t", "f"],
        [userId(14), "t", "f"],
        [userId(15), "t", "f"],
        [userId(16), "f", "t"],
      ]);
    });

    it("counts only mature users toward the gate, however active the rest are", () => {
      // User 16 is retained but immature; the gate must not see them.
      const [row] = queryWithin(
        "segment",
        `select count(*) filter (where w4_mature and w4_retained),
                count(*) filter (where w4_retained)
           from user_w4 where user_id::text like '${TEST_UUID_PREFIX}-%';`,
      );
      expect(row).toEqual(["1", "2"]);
    });

    it("agrees with the engagement report's W4 column, the one canonical definition", () => {
      // The two files define retention separately; if they ever disagree, the
      // segment report is measuring something the rest of the repo does not.
      // The engagement side below is transcribed from analytics-engagement.sql
      // §3, so editing that section without editing this fails here.
      const engagement = queryWithin(
        "engagement",
        `select a.user_id,
                coalesce(bool_or(c.created_at >= a.created_at + interval '28 days'
                             and c.created_at <  a.created_at + interval '35 days'), false)
           from accounts a
           left join content_events c on c.user_id = a.user_id
          where a.user_id::text like '${TEST_UUID_PREFIX}-%'
          group by 1 order by 1;`,
      );
      const segment = queryWithin(
        "segment",
        `select user_id, w4_retained from user_w4
          where user_id::text like '${TEST_UUID_PREFIX}-%' order by user_id;`,
      );
      expect(segment).toEqual(engagement);
    });
  });

  describe("engagement report: module usage counts records, never enabled_modules", () => {
    // #1672. `enabled_modules` gates nothing (see test/analytics-shared-sql.test.ts
    // for the history), so the module table reports one thing: distinct people
    // with at least one record in the module's tables. The suite cannot filter
    // the shipped section to its own cohort, so it reads §4 before and after
    // seeding and asserts on the difference, which seed users cannot move.
    const REGISTERED_GRATITUDE = "registered/gratitude";
    const REGISTERED_ACT = "registered/act";
    const REGISTERED_CBT = "registered/cbt";

    /** `account/module` -> distinct users with a record, as §4 prints it. */
    function moduleUsers(): Map<string, number> {
      return new Map(
        queryWithin("engagement", section("engagement", 4)).map(([account, module, users]) => [
          `${account}/${module}`,
          Number(users),
        ]),
      );
    }

    let before: Map<string, number>;

    beforeAll(() => {
      deleteSuiteUsers();
      before = moduleUsers();

      // 30: a gratitude record and an EMPTY enabled_modules - the row shape
      // that surfaced the drift (gratitude used, never "enabled").
      insertAuthUser({ id: userId(30), createdAtSql: "now() - interval '40 days'" });
      insertEnabledModules(userId(30), "'{}'");
      insertGratitudeEntry(userId(30));

      // 31: enabled_modules lists act and cbt, and there is no record of anything.
      insertAuthUser({ id: userId(31), createdAtSql: "now() - interval '40 days'" });
      insertEnabledModules(userId(31), "'{cbt,act}'");

      // 32: two gratitude records, so distinct counting is what is tested.
      insertAuthUser({ id: userId(32), createdAtSql: "now() - interval '40 days'" });
      insertEnabledModules(userId(32), "'{cbt,gratitude}'");
      insertGratitudeEntry(userId(32));
      insertGratitudeEntry(userId(32));
    });

    afterAll(deleteSuiteUsers);

    it("counts a person with a record once, whether or not enabled_modules lists the module", () => {
      const after = moduleUsers();
      expect(after.get(REGISTERED_GRATITUDE)! - before.get(REGISTERED_GRATITUDE)!).toBe(2);
    });

    it("never counts a person enabled_modules lists who has no record", () => {
      const after = moduleUsers();
      expect(after.get(REGISTERED_ACT)! - before.get(REGISTERED_ACT)!).toBe(0);
      expect(after.get(REGISTERED_CBT)! - before.get(REGISTERED_CBT)!).toBe(0);
    });

    it("prints every module for every account type, zeros included", () => {
      const keys = [...moduleUsers().keys()].sort();
      expect(keys).toEqual(
        ["guest", "registered"]
          .flatMap((account) =>
            ["cbt", "meditation", "gratitude", "act"].map((m) => `${account}/${m}`),
          )
          .sort(),
      );
    });
  });

  describe("reports split their population by account type", () => {
    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUser({ id: userId(20), createdAtSql: "now() - interval '40 days'" });
      insertAuthUser({
        id: userId(21),
        createdAtSql: "now() - interval '40 days'",
        isAnonymous: true,
      });
      insertAuthUser({
        id: userId(22),
        createdAtSql: "now() - interval '40 days'",
        isAnonymous: true,
      });
    });

    afterAll(deleteSuiteUsers);

    for (const name of REPORTS) {
      it(`analytics-${name}.sql labels guests apart from registered users`, () => {
        const rows = queryWithin(
          name,
          `select account, count(*) from accounts
            where user_id::text like '${TEST_UUID_PREFIX}-%' group by 1 order by 1;`,
        );
        expect(rows).toEqual([
          ["guest", "2"],
          ["registered", "1"],
        ]);
      });
    }
  });
});
