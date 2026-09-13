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
 * between that `\echo` heading and the next one, with every `\echo` line
 * dropped. Running it through `queryWithin` executes the shipped section
 * verbatim against the report's own views.
 *
 * ⚠️ A section heading is followed by any number of further `\echo` legend
 * lines - what `<5` means, which columns are deliberately not suppressed - so
 * only the NEXT `=== n)` heading ends a section. Breaking at the first `\echo`
 * instead would silently return an empty body the moment a legend is added,
 * and an empty body asserts nothing.
 */
function section(name: string, number: number): string {
  const lines = reportSql(name).split("\n");
  const isHeading = (line: string) => /^\\echo '=== /.test(line);
  const start = lines.findIndex((line) => line.startsWith(`\\echo '=== ${number})`));
  if (start === -1) throw new Error(`analytics-${name}.sql has no section ${number}`);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (isHeading(line)) break;
    if (line.startsWith("\\echo")) continue;
    body.push(line);
  }
  if (body.join("").trim() === "") {
    throw new Error(`analytics-${name}.sql section ${number} has no statements`);
  }
  return body.join("\n");
}

/**
 * The body of one `-- >>> shared:<name>` block, as the reports carry it. Used
 * to run a shared block that is not a numbered section, and to rewrite one
 * without copying it.
 */
function sharedBlock(name: string, block: string): string {
  const source = reportSql(name);
  const start = source.indexOf(`-- >>> shared:${block}`);
  const end = source.indexOf(`-- <<< shared:${block}`);
  if (start === -1 || end === -1) throw new Error(`analytics-${name}.sql has no shared:${block}`);
  return source.slice(start, end);
}

// psql prints a command tag (CREATE VIEW, CREATE FUNCTION) for every statement
// in the definitions block, so the rows we want are whatever follows this.
const ROW_MARKER = "__rows_below__";

function rowsAfterMarker(prelude: string, sql: string, name: string): string[][] {
  const output = runSql(`${prelude}select '${ROW_MARKER}';\n${sql}\n`);
  const lines = output.split("\n");
  const start = lines.indexOf(ROW_MARKER);
  if (start === -1) throw new Error(`analytics-${name}.sql definitions did not run:\n${output}`);
  return lines
    .slice(start + 1)
    .filter((line) => line !== "")
    .map((line) => line.split("|"));
}

/** Runs a query against the named report's own temp views and helper functions. */
function queryWithin(name: string, sql: string): string[][] {
  return rowsAfterMarker(definitions(name), sql, name);
}

/**
 * The report's definitions, with the shipped `accounts` view narrowed to this
 * suite's own users — so a shipped section, run verbatim, sees a population
 * these fixtures control exactly.
 *
 * ☠️ Why this exists. Every printed section counts the whole database, so the
 * assertions below used to read a section before and after seeding and subtract.
 * k=5 cell suppression (#2373) ends that: `<5` carries no arithmetic, and the
 * difference between two suppressed readings is not a number. Narrowing the
 * population is also the stricter option — the fixtures become the whole
 * population, so a claim is asserted outright rather than as a delta, and a cell
 * of one to four users can be pinned at `<5` instead of being unobservable.
 *
 * The narrowed view is a REWRITE of the shipped shared block, never a copy of
 * it, so it cannot drift from the view the reports actually run.
 */
function cohortDefinitions(name: string): string {
  const view = sharedBlock(name, "accounts")
    .slice(0, sharedBlock(name, "accounts").indexOf("-- Both labels,"))
    .replace("create temp view accounts as", "create or replace temp view accounts as")
    .replace(
      "  from auth.users;",
      `  from auth.users where id::text like '${TEST_UUID_PREFIX}-%';`,
    );
  if (!view.includes("where id::text like")) {
    throw new Error(`analytics-${name}.sql: the accounts view no longer ends in auth.users`);
  }
  return `${definitions(name)}\n${view}\n`;
}

/** Runs a query with this suite's fixtures as the report's entire population. */
function queryWithinCohort(name: string, sql: string): string[][] {
  return rowsAfterMarker(cohortDefinitions(name), sql, name);
}

/**
 * The population-provenance block's statement, as shipped: its `\set` kept (the
 * owner address is the thing under test) and its `\echo` legend dropped, since
 * psql would print those lines straight into the rows being parsed.
 */
function provenanceStatement(name: string): string {
  return sharedBlock(name, "population_provenance")
    .split("\n")
    .filter((line) => !line.startsWith("\\echo") && !line.trim().startsWith("--"))
    .join("\n");
}

interface AuthUserFixture {
  id: string;
  isAnonymous?: boolean;
  createdAtSql: string;
  /** SQL for the email column; `null` unless a test is about provenance. */
  emailSql?: string;
}

/**
 * Any number of accounts in one round trip. Every runSql call is a `docker
 * exec`, so seeding a dozen fixtures one at a time is most of a suite's clock.
 */
function insertAuthUsers(fixtures: AuthUserFixture[]) {
  // Mirrors supabase/seed.sql: the empty-string token columns are set
  // explicitly because GoTrue's schema scan fails if they end up NULL on a
  // direct insert.
  const values = fixtures
    .map(
      (options) => `(
      '${options.id}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${options.emailSql ?? "null"},
      '{"provider": "anonymous", "providers": ["anonymous"]}', '{}', null, false, ${options.isAnonymous ?? false},
      '', '', '', '', '', 0, '', '', '',
      ${options.createdAtSql}, ${options.createdAtSql}
    )`,
    )
    .join(",\n");
  runSql(`
    insert into auth.users (
      id, instance_id, aud, role, email,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
      email_change, email_change_confirm_status, phone_change, phone_change_token,
      reauthentication_token, created_at, updated_at
    ) values ${values};
  `);
}

function insertAuthUser(options: AuthUserFixture) {
  insertAuthUsers([options]);
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

/**
 * Several `user_preferences` rows in one round trip, covering every column the
 * suite's fixtures set. Anything not named is left at the shape that means
 * "never happened": not completed, no mode, no verdict, no policy accepted.
 *
 * ☠️ `age_floor_met` and `policy_version_accepted` are three-state (#1978):
 * `null` on `age_floor_met` means *never asked*, never *refused*, which is the
 * whole reason section 6 needs a cutoff.
 */
function insertPreferencesRows(
  rows: {
    id: string;
    completedSql?: string;
    viaSql?: string;
    ageFloorMetSql?: string;
    policyVersionSql?: string;
  }[],
) {
  const values = rows
    .map(
      (row) =>
        `('${row.id}', ${row.completedSql ?? "false"}, ${row.viaSql ?? "null"}, ` +
        `${row.ageFloorMetSql ?? "null"}, ${row.policyVersionSql ?? "null"})`,
    )
    .join(",\n");
  runSql(`
    insert into public.user_preferences (
      user_id, app_onboarding_completed, app_onboarding_completed_via,
      age_floor_met, policy_version_accepted
    ) values ${values};
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

  describe("content_events is complete against the live schema", () => {
    // ☠️ #2374. `content_events` decides who counts as ACTIVATED and who counts
    // as RETAINED - the two numbers the whole Phase 1 instrument exists to read.
    // Nothing checked it against the database: test/analytics-shared-sql.test.ts
    // holds the two copies byte-identical to EACH OTHER, so a new user-content
    // table joined the reports only if whoever added it remembered. Three had
    // not (goals, milestones, act_bulls_eye_snapshots).
    //
    // This is an integration test because it needs a live schema;
    // test/export-user-data-monotonic.test.ts says in as many words that it
    // cannot do this from migration files alone.
    //
    // The registry below follows that file's INTENTIONALLY_DROPPED pattern,
    // including its second half: an entry that has stopped being necessary
    // fails too, so this list cannot quietly absorb a real omission.

    /**
     * Relations carrying a `user_id` that `content_events` deliberately does
     * not read, each with the reason it is not activation.
     *
     * ☠️ The governing ruling (#2374, extending #1672's _setup is not
     * adoption_): **authored configuration is not activation.** A routine, a
     * habit or a saved breathing pattern is a promise to act, not an act -
     * and running one writes a covered row anyway, so no signal is lost, it is
     * only located correctly. The alternative was rejected for a specific
     * reason: favourites, emotion preferences and widget picks press on the
     * same boundary with the identical argument, and admitting authored
     * configuration admits them next.
     */
    const NOT_CONTENT: Record<string, string> = {
      // Identity, settings and delivery plumbing. None of it is a self-help act.
      profiles: "who the person is, not something they did",
      user_preferences: "settings, including the onboarding and consent flags",
      device_push_tokens: "notification delivery plumbing",
      web_push_subscriptions: "notification delivery plumbing",

      // Authored configuration - the ruling above, applied.
      routines: "authored configuration: a routine is a promise to act, not an act",
      routine_steps: "authored configuration: the steps of a routine definition",
      habits: "authored configuration: the habit definition; habit_logs is the act",
      breathing_exercises:
        "authored configuration: SAVED CUSTOM PATTERNS, not sessions - the pattern " +
        "is the definition, and practising writes mindfulness_sessions",
      favorites: "authored configuration: which tools the person pinned",
      emotion_preferences: "authored configuration: which emotions the grid offers",
      widget_preferences: "authored configuration: Home widget picks (#1958 stopped writing it)",

      // Progress bookkeeping the app derives from acts that are themselves covered.
      act_program_state: "programme progress state; the practice writes an act_* row",
      meditation_program_state: "programme progress state; the practice writes meditation_sessions",

      // Not a use of a tool at all.
      feedback_submissions: "a message to the project, not use of a self-help tool",

      // ☠️ CHILD ROWS OF AN ACT THAT IS ALREADY COUNTED. Not a second rule -
      // the same one, applied one level down. The parent row records that the
      // person did the exercise; counting its children would count a single act
      // as many times as it happened to have parts, so someone who broke a task
      // into nine steps would read as nine times as engaged as someone who
      // broke it into one.
      task_steps: "child rows of procrastination_tasks, which is counted",
      exposure_items: "child rows of exposure_hierarchies, which is counted",
      act_action_steps: "child rows of act_committed_actions, which is counted",
    };

    /**
     * Every `public` relation carrying a `user_id`, as the app sees it.
     *
     * ☠️ Content tables are decrypt-on-read views over `*_data` base tables, so
     * both halves carry `user_id` and a naive list double-counts every one of
     * them. The storage half is dropped only when its view actually exists -
     * never by name alone - so a `_data` table that lost its view shows up here
     * rather than vanishing.
     */
    function relationsCarryingUserId(): string[] {
      return runSql(`
        with carrying as (
          select c.relname::text as relname, c.relkind
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          join pg_attribute a on a.attrelid = c.oid
          where n.nspname = 'public'
            and a.attname = 'user_id'
            and a.attnum > 0
            and not a.attisdropped
            and c.relkind in ('r', 'v', 'm', 'p')
          group by 1, 2
        )
        select relname
        from carrying t
        where not (
          t.relkind = 'r'
          and t.relname like '%\\_data'
          and exists (
            select 1 from carrying v
            where v.relname = left(t.relname, length(t.relname) - 5)
          )
        )
        order by 1;
      `)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    }

    /** The tables `content_events` actually reads, from the shipped block. */
    function contentEventTables(): string[] {
      const block = sharedBlock("engagement", "content_events");
      return [...block.matchAll(/from public\.(\w+)/g)].map((match) => match[1]).sort();
    }

    const surface = relationsCarryingUserId();
    const covered = contentEventTables();

    it("finds a schema and a block big enough to police", () => {
      // Guards the guard. If either query stopped matching, every assertion
      // below would pass by comparing two empty lists.
      expect(surface.length).toBeGreaterThan(40);
      expect(covered.length).toBeGreaterThan(25);
      expect(surface).toContain("mood_logs");
      expect(covered).toContain("mood_logs");
      // The storage half must be collapsed into its view, or the surface is
      // double the size it should be and every `_data` table reads as missing.
      expect(surface).not.toContain("mood_logs_data");
    });

    it("reads the three tables #2374 found missing", () => {
      // Pins the arrival, which the completeness check below cannot: a table
      // absent from BOTH the block and the registry is what fails there, and
      // these could have been waved through by an exemption instead.
      expect(covered).toContain("goals");
      expect(covered).toContain("milestones");
      expect(covered).toContain("act_bulls_eye_snapshots");
    });

    it("reads every user-content table, or names why not", () => {
      // A table that reaches here is one the reports will silently not count.
      // Add it to BOTH copies of the shared content_events block, or add it to
      // NOT_CONTENT above with the reason it is not a self-help act.
      const unaccounted = surface
        .filter((table) => !covered.includes(table) && !(table in NOT_CONTENT))
        .sort();
      expect(unaccounted).toEqual([]);
    });

    it("carries no exemption that defers the question instead of answering it", () => {
      // ☠️ An exemption that says "undecided" is not an exemption, it is the
      // silence this gate exists to end: the completeness check above would
      // treat the table as accounted for while no report reads it, so
      // activation, retention and module usage would undercount the moment
      // somebody used the feature - and nothing would say so.
      //
      // ⚠️ Deferring cannot be made safe by asserting the tables stay empty,
      // which was tried: the demo seed writes to every one of them, so that
      // assertion can never pass locally or in CI. Either a table is read, or
      // its reason is real.
      const deferred = Object.entries(NOT_CONTENT)
        .filter(([, reason]) => /undecided|unclear|tbd|for now/i.test(reason))
        .map(([table]) => table)
        .sort();
      expect(deferred).toEqual([]);
    });

    it("keeps no exemption that has stopped being needed", () => {
      // A stale exemption is indistinguishable from a real omission being waved
      // through. An entry fails here if its relation is gone from the schema,
      // or if content_events has since started reading it - in which case the
      // registry now contradicts the block.
      const unnecessary = Object.keys(NOT_CONTENT)
        .filter((table) => !surface.includes(table) || covered.includes(table))
        .sort();
      expect(unnecessary).toEqual([]);
    });
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
    // with at least one record in the module's tables. §4 runs as shipped over
    // this suite's fixtures as its whole population, so every cell below is an
    // outright claim about the printed row.
    const AT_THE_FLOOR = 5;

    /** `account/module` -> the cell §4 prints, verbatim (`<5` included). */
    function moduleUsers(): Map<string, string> {
      return new Map(
        queryWithinCohort("engagement", section("engagement", 4)).map(
          ([account, module, users]) => [`${account}/${module}`, users],
        ),
      );
    }

    /** `account/module` -> the percentage §4 prints. */
    function modulePct(): Map<string, string> {
      return new Map(
        queryWithinCohort("engagement", section("engagement", 4)).map(
          ([account, module, , pct]) => [`${account}/${module}`, pct],
        ),
      );
    }

    beforeAll(() => {
      deleteSuiteUsers();

      // 30 and 32..35: exactly five registered people with a gratitude record,
      // so the cell sits ON the k=5 floor and prints its real value. 32 has two
      // records, so distinct counting is what is being read.
      //
      // 30 carries an EMPTY enabled_modules - the row shape that surfaced the
      // #1672 drift (gratitude used, never "enabled").
      //
      // 31: enabled_modules lists act and cbt, and there is no record of
      // anything. 36: a guest with a gratitude record, one person, so the same
      // shipped section prints a suppressed cell beside an unsuppressed one.
      insertAuthUsers(
        [30, 31, 32, 33, 34, 35, 36].map((n) => ({
          id: userId(n),
          createdAtSql: "now() - interval '40 days'",
          isAnonymous: n === 36,
        })),
      );
      insertEnabledModules(userId(30), "'{}'");
      insertEnabledModules(userId(31), "'{cbt,act}'");
      insertEnabledModules(userId(32), "'{cbt,gratitude}'");
      for (const n of [30, 32, 33, 34, 35, 36]) insertGratitudeEntry(userId(n));
      insertGratitudeEntry(userId(32));
    });

    afterAll(deleteSuiteUsers);

    it("counts a person with a record once, whether or not enabled_modules lists the module", () => {
      // Five people, six records: 32 wrote twice and is still one person.
      expect(moduleUsers().get("registered/gratitude")).toBe(String(AT_THE_FLOOR));
    });

    it("never counts a person enabled_modules lists who has no record", () => {
      // 31 has act and cbt enabled and nothing written. A zero prints as a zero:
      // an empty arm is information, and it discloses nothing.
      expect(moduleUsers().get("registered/act")).toBe("0");
      expect(moduleUsers().get("registered/cbt")).toBe("0");
    });

    it("suppresses a module cell resting on fewer than five users", () => {
      // ☠️ The whole point of #2373 in this report: one guest wrote a gratitude
      // record, and the cell says so without saying how many.
      expect(moduleUsers().get("guest/gratitude")).toBe("<5");
      expect(modulePct().get("guest/gratitude")).toBe("-");
    });

    it("prints every module for every account type, zeros included", () => {
      // ☠️ The module list is the REPORT's, and it grows: `dbt` joined it with
      // the DBT module (#1980). The claim is that every module prints for every
      // account type even at zero, so a module missing here is a row the report
      // silently stopped emitting - keep this list in step with the `mods(module)`
      // VALUES list in scripts/analytics-engagement.sql.
      const keys = [...moduleUsers().keys()].sort();
      expect(keys).toEqual(
        ["guest", "registered"]
          .flatMap((account) =>
            ["cbt", "meditation", "gratitude", "act", "dbt"].map((m) => `${account}/${m}`),
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

  describe("engagement report: asked, never attested", () => {
    // #1978, the evidence #1936 reopens the age gate's placement on. Counted:
    // an account created at or after the instant the gate scopes itself on,
    // with no age verdict written - someone who met the first screen and
    // stopped there, whatever the consent column says (#2241, after #2227: an
    // account that consented on 0.17.0 is asked on updating, and is counted).
    //
    // ☠️ THE CUTOFF IS THE WHOLE FIGURE. `age_floor_met` is null for every
    // account that predates the gate, and null means *never asked*, so without
    // the created-after cutoff this number is the entire pre-gate install base.
    // Fixture 44 sits an hour BELOW the cutoff, 46 exactly ON it, and 40..43
    // above it, because a window assertion whose fixtures do not straddle both
    // edges survives a mutation that moves the edge - and the gate's own edge is
    // `created_at < instant` exempt, so ON the instant is asked.
    //
    // The shipped section cannot be filtered to this suite's cohort, so it is
    // read before and after seeding and the assertions are on the deltas.
    // ☠️ Every registered cell below is deliberately seeded at five or more, so
    // the counts print their real values and an edge that moves by one stays
    // visible. k=5 suppression (#2373) would otherwise flatten "four" and
    // "three" into the same `<5` and make the cutoff edges unobservable. The
    // guest row is the opposite case, seeded at one, and is asserted as `<5`.
    const CUTOFF = "2026-09-06T00:00:00Z";
    const LATER = "2026-09-06T00:00:01Z";
    const WIDE = "2026-01-01T00:00:00Z";
    const AFTER = `timestamptz '2026-09-06T01:00:00Z'`;
    const ON = `timestamptz '${CUTOFF}'`;
    const BELOW = `timestamptz '2026-09-05T23:00:00Z'`;

    interface Row {
      accountsSinceCutoff: string;
      askedNeverAttested: string;
      askedNeverAttestedPct: string;
    }

    /** Section 6 as shipped, over this suite's fixtures, with the cutoff overridden. */
    function askedNeverAttested(cutoff = CUTOFF): Map<string, Row> {
      const rows = queryWithinCohort(
        "engagement",
        `\\set age_gate_cutoff '${cutoff}'\n${section("engagement", 6)}`,
      );
      return new Map(
        rows.map(([account, , , accounts, asked, pct]) => [
          account,
          { accountsSinceCutoff: accounts, askedNeverAttested: asked, askedNeverAttestedPct: pct },
        ]),
      );
    }

    function gateRow(account: string, cutoff = CUTOFF): Row {
      return askedNeverAttested(cutoff).get(account)!;
    }

    beforeAll(() => {
      deleteSuiteUsers();

      // 40: above the cutoff with NO preferences row at all. This is the person
      // the figure is about - stopping at the gate can mean the row was never
      // written - so the left join is load-bearing, not defensive.
      //
      // 41, 47, 48: above the cutoff, preferences row present, both columns null.
      //
      // 42: answered the gate. Not counted, whatever the consent gate did next.
      //
      // 43: consented, never attested - the #2227 cohort. An account created
      // on 0.17.0 has a policy version on record and meets the age gate on
      // updating; the gate asks it, so the report counts it (#2241).
      //
      // 44: the pre-gate install base, one hour BELOW the cutoff, with exactly
      // the null/null shape 41 has. Only the cutoff can tell them apart.
      //
      // 45: a guest above the cutoff. Guests pass through the same gate and
      // abandon for different reasons, so they are counted on their own row.
      //
      // 46: created exactly ON the instant. The gate exempts strictly-before,
      // so this account is asked; a `>` window would drop it.
      insertAuthUsers([
        ...[40, 41, 42, 43, 47, 48].map((n) => ({ id: userId(n), createdAtSql: AFTER })),
        { id: userId(44), createdAtSql: BELOW },
        { id: userId(45), createdAtSql: AFTER, isAnonymous: true },
        { id: userId(46), createdAtSql: ON },
      ]);
      insertPreferencesRows([
        ...[41, 44, 46, 47, 48].map((n) => ({ id: userId(n) })),
        { id: userId(42), ageFloorMetSql: "true" },
        { id: userId(43), policyVersionSql: `'2026-09-04-teen-floor'` },
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("counts the account that never answered, whether or not it has a preferences row", () => {
      // 40 (no row), 41/47/48 (null/null), 43 (consented, never attested),
      // 46 (on the instant).
      expect(gateRow("registered").askedNeverAttested).toBe("6");
    });

    it("excludes an account that answered, and counts one that consented before the gate", () => {
      // Seven registered fixtures are in the window; six of them stopped. The
      // window size is asserted beside the count, so a predicate that lets 42
      // in or drops 43 cannot hide behind a matching total.
      expect(gateRow("registered")).toEqual({
        accountsSinceCutoff: "7",
        askedNeverAttested: "6",
        askedNeverAttestedPct: "85.7%",
      });
    });

    it("excludes the pre-gate install base, which has the identical null/null shape", () => {
      // Fixture 44 is null/null exactly as 41 is, and differs from it only by
      // sitting an hour below the cutoff. So it is invisible at the shipped
      // cutoff and appears the moment the cutoff is moved below it - which is
      // the only thing separating "asked and stopped" from "never asked".
      expect(gateRow("registered").askedNeverAttested).toBe("6");
      expect(gateRow("registered", WIDE)).toEqual({
        accountsSinceCutoff: "8",
        askedNeverAttested: "7",
        askedNeverAttestedPct: "87.5%",
      });
    });

    it("asks on the instant itself - the gate exempts strictly-before (#2241)", () => {
      // Fixture 46 sits exactly on the cutoff. Moving the cutoff one second
      // later drops it from both the window and the count.
      expect(gateRow("registered", LATER)).toEqual({
        accountsSinceCutoff: "6",
        askedNeverAttested: "5",
        askedNeverAttestedPct: "83.3%",
      });
    });

    it("splits guests from registered accounts, and suppresses the guest cell (#2373)", () => {
      // One guest stopped at the gate. How many accounts the window holds is a
      // whole-population count and prints raw; how many of them stopped is a
      // slice, and one person is not a number this report will print.
      expect(gateRow("guest")).toEqual({
        accountsSinceCutoff: "1",
        askedNeverAttested: "<5",
        askedNeverAttestedPct: "-",
      });
    });

    it("prints the cutoff release and instant on every row, so a zero can be read", () => {
      // The acceptance #1978 names: a reader must never mistake a pre-cutoff
      // zero for a measured one, so the cutoff travels with the numbers.
      const rows = queryWithin(
        "engagement",
        `\\set age_gate_cutoff '${CUTOFF}'\n${section("engagement", 6)}`,
      );
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row).toHaveLength(6);
        expect(row[2]).toBe(CUTOFF);
      }
    });

    it("ships keyed on the gate's own instant, and says so on every row (#2241)", () => {
      // The shipped cutoff is AGE_GATE_INTRODUCED_AT - the migration instant,
      // not a release date - and test/analytics-age-gate-cutoff.test.ts holds
      // it equal to the client constant. Here: the shipped section runs as-is,
      // and the row names the constant beside the instant, so a reader knows
      // which edge the window is keyed on.
      const source = reportSql("engagement");
      expect(source).toContain(`\\set age_gate_cutoff '2026-09-05T00:00:00Z'`);
      expect(source).toContain(`\\set age_gate_cutoff_source 'AGE_GATE_INTRODUCED_AT'`);
      const rows = queryWithin("engagement", section("engagement", 6));
      expect(rows.map((row) => row.slice(0, 3))).toEqual([
        ["guest", "AGE_GATE_INTRODUCED_AT", "2026-09-05T00:00:00Z"],
        ["registered", "AGE_GATE_INTRODUCED_AT", "2026-09-05T00:00:00Z"],
      ]);
    });
  });

  describe("onboarding report: k=5 suppression, and what it deliberately spares", () => {
    // #2373. The rule used to live in the segment report alone. Two shipped
    // sections are read here over this suite's fixtures as the whole
    // population, and the pair of weeks is the point: one week's slice is small
    // and vanishes, the other is not and prints.
    //
    // ☠️ `signups` is never suppressed, in either week. It is a
    // whole-population count - how many people arrived - and suppressing it
    // would print `<5` over the very trend the monthly digest exists to show.
    const RECENT = "now() - interval '2 days'";
    const OLDER = "now() - interval '30 days'";
    const SMALL_WEEK = [50, 51, 52, 53, 54, 55, 56, 57];
    const LARGE_WEEK = [58, 59, 60, 61, 62, 63];

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        ...SMALL_WEEK.map((n) => ({ id: userId(n), createdAtSql: RECENT })),
        ...LARGE_WEEK.map((n) => ({ id: userId(n), createdAtSql: OLDER })),
      ]);
      // The recent week: eight arrivals, three of whom finished onboarding.
      // The older week: six arrivals, all six of whom did.
      insertPreferencesRows([
        { id: userId(50), completedSql: "true", viaSql: `'finish'` },
        { id: userId(51), completedSql: "true", viaSql: `'finish'` },
        { id: userId(52), completedSql: "true", viaSql: `'skip'` },
        ...[53, 54, 55, 56, 57].map((n) => ({ id: userId(n) })),
        ...LARGE_WEEK.map((n) => ({ id: userId(n), completedSql: "true", viaSql: `'skip'` })),
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("suppresses a completion cell of fewer than five people, and prints the arrivals anyway", () => {
      // Weeks come back newest first, so the recent week leads.
      const rows = queryWithinCohort("onboarding", section("onboarding", 2));
      expect(
        rows.map(([account, , signups, completed, pct]) => [account, signups, completed, pct]),
      ).toEqual([
        ["registered", "8", "<5", "-"],
        ["registered", "6", "6", "100.0%"],
      ]);
    });

    it("suppresses the completion mode only where the cell is small", () => {
      // Seven people skipped and two finished, so the same table carries both
      // states at once: one cell prints, the other says only that it is small.
      const rows = queryWithinCohort("onboarding", section("onboarding", 3));
      expect(rows).toEqual([
        ["registered", "skip", "7"],
        ["registered", "finish", "<5"],
      ]);
    });
  });

  describe("every report states who is in its population before its first table", () => {
    // ☠️ #2373, and docs/analytics.md "Who is in the population". The project's
    // own accounts are NOT excluded from any figure - that was refused - so
    // what ships instead is a measurement of how many of them there are, and
    // this block is exempt from k=5 in both directions: it counts the project's
    // own accounts, so the privacy rationale is void, and a bound is already
    // the anti-false-precision form, so that rationale is inverted.
    //
    // Signup date is irrelevant here, so every fixture shares one.
    const OLD = "now() - interval '40 days'";

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        // Two on the owner's address, one of them plus-tagged. Exactly
        // identifiable: a stranger cannot hold this address.
        { id: userId(70), createdAtSql: OLD, emailSql: `'vasil.yoshev@gmail.com'` },
        { id: userId(71), createdAtSql: OLD, emailSql: `'vasil.yoshev+alpha@gmail.com'` },
        // A real person who plus-tags their own mail, and two ordinary words.
        // These are why the wider count is a bound and never an estimate.
        { id: userId(72), createdAtSql: OLD, emailSql: `'someone+news@example.com'` },
        { id: userId(73), createdAtSql: OLD, emailSql: `'demo@example.com'` },
        { id: userId(74), createdAtSql: OLD, emailSql: `'qa-TEST@example.com'` },
        // Nothing to go on, which is the normal case.
        { id: userId(75), createdAtSql: OLD, emailSql: `'stranger@example.com'` },
        // ☠️ A guest has no email at all, so it can never be classified either
        // way - not as ours, not as theirs.
        { id: userId(76), createdAtSql: OLD, isAnonymous: true },
      ]);
    });

    afterAll(deleteSuiteUsers);

    for (const name of REPORTS) {
      it(`analytics-${name}.sql counts the owner exactly and the rest as an upper bound`, () => {
        const [row] = queryWithinCohort(name, provenanceStatement(name));
        expect(row).toEqual([
          // owner_exact: 70 and 71. A plus-tag of the owner address is still
          // the owner address.
          "2",
          // internal_upper_bound: those two, plus the stranger who plus-tags
          // and the two accounts carrying an ordinary word. It over-counts on
          // purpose; that is what makes it a bound.
          "5",
          "6",
          // The guest arm, stated separately because it is not identifiable.
          "1",
        ]);
      });

      it(`analytics-${name}.sql prints the block raw, never through k=5`, () => {
        // A count of two would be `<5` under the rule. It is not, and that is
        // the exemption working: the number has to stay readable precisely as
        // cleanup succeeds and it becomes small.
        const [row] = queryWithinCohort(name, provenanceStatement(name));
        expect(row).not.toContain("<5");
        expect(row).not.toContain("-");
      });
    }
  });
});
