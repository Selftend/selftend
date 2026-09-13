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
// decided on #1605, re-based on #2365/#2377): which arm a user lands in on each
// of its two axes, the signup-anchored W4 window, the axis-coverage
// precondition, and k=5 cell suppression. Those are read as evidence about who
// Selftend is for, so getting a user into the wrong arm is worse than a crash.
//
// ☠️ The axis-coverage suite is the one to read first if you are changing that
// report. It pins a FALSE GREEN, not a crash: the gate counts retention across
// the whole population, so it can open while every retained user sits in a
// single arm, and the cross-tab would then be declared readable over an empty
// table. That is what the retired concern axis did for a year.
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
function definitionsWithPopulation(name: string, whereSql: string): string {
  const block = sharedBlock(name, "accounts");
  const view = block
    .slice(0, block.indexOf("-- Both labels,"))
    .replace("create temp view accounts as", "create or replace temp view accounts as")
    .replace("  from auth.users;", `  from auth.users where ${whereSql};`);
  if (!view.includes(`where ${whereSql}`)) {
    throw new Error(`analytics-${name}.sql: the accounts view no longer ends in auth.users`);
  }
  return `${definitions(name)}\n${view}\n`;
}

function cohortDefinitions(name: string): string {
  return definitionsWithPopulation(name, `id::text like '${TEST_UUID_PREFIX}-%'`);
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

/**
 * `user_preferences` rows carrying a language — the segment report's locale
 * axis (#2377).
 *
 * ☠️ `language` is NOT NULL DEFAULT 'en', so a preferences row written without
 * one does not carry an absent locale, it carries an `en` one. The only way an
 * account holds no locale at all is to have no preferences row, which is why
 * some fixtures below deliberately get none.
 */
function insertLanguages(rows: { id: string; languageSql: string }[]) {
  const values = rows.map((row) => `('${row.id}', ${row.languageSql})`).join(",\n");
  runSql(`insert into public.user_preferences (user_id, language) values ${values};`);
}

/** A content row at a chosen moment; mood_logs is written through its INSTEAD OF trigger. */
function insertMoodLog(id: string, createdAtSql: string) {
  insertMoodLogs([{ id, createdAtSql }]);
}

/**
 * Many mood logs in one round trip. Every runSql call is a `docker exec`, and
 * the axis-coverage fixtures below need thirty of these to push the gate open.
 * A multi-row insert still fires the INSTEAD OF trigger once per row.
 */
function insertMoodLogs(rows: { id: string; createdAtSql: string }[]) {
  const values = rows
    .map((row) => `('${row.id}', 3, ${row.createdAtSql}, ${row.createdAtSql})`)
    .join(",\n");
  runSql(`
    insert into public.mood_logs (user_id, mood_score, created_at, logged_at)
    values ${values};
  `);
}

/**
 * One content row in a chosen MODULE at a chosen moment — the segment report's
 * module-usage axis (#2377). The three tables below are the cheapest row in
 * their module: every other column is nullable or defaulted.
 *
 * ☠️ `created_at` is passed explicitly on every one of them. The axis is
 * measured over the account's first 28 days, so a fixture that let the column
 * default to `now()` would be testing the window with a value that always sits
 * outside it for a backdated account.
 */
const MODULE_CONTENT: Record<string, (id: string, createdAtSql: string) => string> = {
  gratitude: (id, at) =>
    `insert into public.gratitude_entries (user_id, item_1, created_at) values ('${id}', 'a warm cup', ${at});`,
  meditation: (id, at) =>
    `insert into public.meditation_sessions (user_id, duration_minutes, created_at) values ('${id}', 10, ${at});`,
  act: (id, at) =>
    `insert into public.act_choice_points (user_id, created_at) values ('${id}', ${at});`,
};

function insertModuleContent(
  rows: { id: string; module: keyof typeof MODULE_CONTENT; createdAtSql: string }[],
) {
  runSql(rows.map((row) => MODULE_CONTENT[row.module](row.id, row.createdAtSql)).join("\n"));
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

/**
 * `user_preferences` rows carrying the programme and reminder columns the
 * engagement report's sections 7 and 8 read (#2375).
 *
 * ☠️ `startedAtSql` and `phaseIndex` are separate on purpose, so a fixture can
 * hold the shape the funnel must ignore: a phase index with NO start. That
 * shape is not exotic - `phase_index` defaults to 0 for every account, so every
 * account that never opened a programme has one.
 */
function insertProgrammeRows(
  rows: {
    id: string;
    programme?: "cbt" | "act" | "dbt";
    startedAtSql?: string;
    phaseIndex?: number;
    completedAtSql?: string;
    graduationDismissedAtSql?: string;
    reminderConsentSql?: string;
    notificationsGlobalSql?: string;
  }[],
) {
  for (const row of rows) {
    // ⚠️ `user_id` is the primary key, so a second row for the same person
    // would throw rather than add a programme. Upserting instead means a
    // fixture can be put into two programmes by calling this twice, which the
    // signature otherwise invites and could not deliver.
    const programmeColumns = row.programme
      ? `
        ${row.programme}_program_started_at = ${row.startedAtSql ?? "null"},
        ${row.programme}_program_phase_index = ${row.phaseIndex ?? 0},
        ${row.programme}_program_completed_at = ${row.completedAtSql ?? "null"},
        ${row.programme}_graduation_dismissed_at = ${row.graduationDismissedAtSql ?? "null"},`
      : "";
    runSql(`
      insert into public.user_preferences (user_id) values ('${row.id}')
      on conflict (user_id) do nothing;
      update public.user_preferences set${programmeColumns}
        reminder_consent = ${row.reminderConsentSql ?? "false"},
        notifications_enabled_global = ${row.notificationsGlobalSql ?? "true"}
      where user_id = '${row.id}';
    `);
  }
}

/** A gratitude record, the module content row the #1672 drift was first seen on. */
function insertGratitudeEntry(id: string) {
  runSql(`insert into public.gratitude_entries (user_id, item_1) values ('${id}', 'a warm cup');`);
}

/**
 * Sign-in identities, the clock the onboarding report's conversion section runs
 * on (#2376). `createdAtSql` is the instant the identity was ATTACHED, which is
 * the whole measurement: at the user row means the account was born registered,
 * later means somebody converted a guest.
 */
function insertIdentities(rows: { userId: string; createdAtSql: string; provider?: string }[]) {
  const values = rows
    .map(
      (row, index) =>
        `('${row.userId}-${index}', '${row.userId}', ` +
        `jsonb_build_object('sub', '${row.userId}'), '${row.provider ?? "email"}', ` +
        `${row.createdAtSql}, ${row.createdAtSql}, ${row.createdAtSql})`,
    )
    .join(",\n");
  runSql(`
    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values ${values};
  `);
}

/**
 * Section 4 of the onboarding report is two statements: the arm table, then the
 * rate. Both describes below need them apart — running the section whole folds
 * the rate row in among the arms.
 *
 * ⚠️ Split on `;`, which survives only because `section()` drops the `\echo`
 * lines, and those legends contain semicolons. Rewrite one legend as a `--`
 * comment and this silently returns the wrong statement, so the count is
 * asserted rather than assumed.
 */
function conversionStatements(): string[] {
  const statements = section("onboarding", 4)
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement !== "");
  expect(statements).toHaveLength(2);
  return statements.map((statement) => `${statement};`);
}

const conversionArmTable = () => conversionStatements()[0];
const conversionRate = () => conversionStatements()[1];

/** A pinned tool or module, as the favourites section reads them. */
function insertFavourites(rows: { userId: string; kind: string; key: string }[]) {
  const values = rows.map((row) => `('${row.userId}', '${row.kind}', '${row.key}')`).join(",\n");
  runSql(`insert into public.favorites (user_id, kind, key) values ${values};`);
}

function deleteSuiteUsers() {
  runSql(
    `delete from public.gratitude_entries_data where user_id::text like '${TEST_UUID_PREFIX}-%';`,
  );
  runSql(`delete from public.mood_logs_data where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  // The module-usage axis fixtures. act_choice_points is a decrypt-on-read view,
  // so its storage half is what deletes; meditation_sessions is a plain table.
  runSql(
    `delete from public.act_choice_points_data where user_id::text like '${TEST_UUID_PREFIX}-%';`,
  );
  runSql(
    `delete from public.meditation_sessions where user_id::text like '${TEST_UUID_PREFIX}-%';`,
  );
  runSql(`delete from public.user_preferences where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  runSql(`delete from public.favorites where user_id::text like '${TEST_UUID_PREFIX}-%';`);
  // Explicit rather than left to the cascade: an identity outliving its user
  // would put a stranger's row into this suite's next conversion fixture.
  runSql(`delete from auth.identities where user_id::text like '${TEST_UUID_PREFIX}-%';`);
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

  describe("segment report: the locale axis", () => {
    // #2377. Locale replaced concern-at-intake, which #2365 measured had never
    // held a value for a single account. Unlike the concern arms, these
    // PARTITION the population - every account lands in exactly one - so the
    // claim to police is not overlap but totality: nobody may be dropped.
    beforeAll(() => {
      deleteSuiteUsers();
      const createdAt = "now() - interval '40 days'";

      // 40, 41: English. 42, 43: Bulgarian, the arm carrying the only
      // unambiguous affirmative signal on this axis.
      // 44: a preferences row written without a language. ☠️ NOT an absent
      //     locale - the column is NOT NULL DEFAULT 'en', so this row reads as
      //     English, and it is the fixture that stops anyone believing the `en`
      //     arm means somebody chose English.
      // 45: NO preferences row at all, the only shape that carries no locale.
      // 46: a guest, so the account axis is exercised on real rows.
      insertAuthUsers(
        [40, 41, 42, 43, 44, 45, 46].map((n) => ({
          id: userId(n),
          createdAtSql: createdAt,
          isAnonymous: n === 46,
        })),
      );
      insertLanguages([
        { id: userId(40), languageSql: `'en'` },
        { id: userId(41), languageSql: `'en'` },
        { id: userId(42), languageSql: `'bg'` },
        { id: userId(43), languageSql: `'bg'` },
        { id: userId(46), languageSql: `'bg'` },
      ]);
      runSql(`insert into public.user_preferences (user_id) values ('${userId(44)}');`);
    });

    afterAll(deleteSuiteUsers);

    it("puts each account in the arm its preferences row earns", () => {
      const rows = queryWithin(
        "segment",
        `select account, arm, count(*) from user_locale
          where user_id::text like '${TEST_UUID_PREFIX}-%'
          group by 1, 2 order by 1, 2;`,
      );
      expect(rows).toEqual([
        ["guest", "bg", "1"],
        ["registered", "bg", "2"],
        // 40, 41 and 44 - the defaulted row is indistinguishable from a chosen one.
        ["registered", "en", "3"],
        ["registered", "no preferences row", "1"],
      ]);
    });

    it("never reads a defaulted language as a chosen one", () => {
      // ☠️ The #1672 shape on a newer column: `enabled_modules` gates nothing and
      // a report that read it measured a default and called it adoption. This
      // axis cannot avoid the default - `language` has no null state to
      // distinguish one - so what is asserted instead is that the report never
      // claims otherwise. User 44 wrote no language and is counted as English;
      // the legend on section 3 says so in as many words.
      const [row] = queryWithin(
        "segment",
        `select arm from user_locale where user_id = '${userId(44)}';`,
      );
      expect(row).toEqual(["en"]);
      const legend = reportSql("segment");
      expect(legend).toContain("NOT NULL DEFAULT en");
      expect(legend).toContain("bg-versus-the-rest");
    });

    it("gives an account with no preferences row its own arm, never English", () => {
      const [row] = queryWithin(
        "segment",
        `select arm from user_locale where user_id = '${userId(45)}';`,
      );
      expect(row).toEqual(["no preferences row"]);
    });

    it("partitions the population: every account in exactly one arm", () => {
      // ☠️ This is the structural guard that replaced the retired overlap check
      // and unknown-keys guard in one. The concern arms overlapped and could
      // also drop a user whose key was not in the label list; a partition can do
      // neither, and this is the assertion that says so rather than the comment.
      const [row] = queryWithin(
        "segment",
        `select (select count(*) from accounts where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(*) from user_locale where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(distinct user_id) from user_locale
                  where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(*) from user_locale ul
                  where ul.user_id::text like '${TEST_UUID_PREFIX}-%'
                    and not exists (select 1 from locale_labels ll where ll.arm = ul.arm));`,
      );
      // 7 accounts, 7 arm rows, 7 distinct people, 0 rows outside the label list.
      expect(row).toEqual(["7", "7", "7", "0"]);
    });

    it("names an arm for every language the check constraint allows", () => {
      // ☠️ The residue arm cannot be reached by a fixture - the CHECK constraint
      // refuses any value but en and bg - so what is testable is the agreement
      // between the two lists. Widening the constraint without widening
      // locale_labels is exactly how a locale would start falling through to
      // `other locale` and be read as a defect rather than a new language.
      const constraint = runSql(
        `select pg_get_constraintdef(oid) from pg_constraint
          where conrelid = 'public.user_preferences'::regclass
            and conname = 'user_preferences_language_check';`,
      ).trim();
      const allowed = [...constraint.matchAll(/'([a-z-]+)'/g)].map((match) => match[1]).sort();
      // Guards the guard, and nothing more: it says the constraint was parsed at
      // all. ☠️ It deliberately does NOT pin the list to a literal - doing that
      // would make the loop below check `locale_labels` against a literal
      // sitting beside it rather than against the schema, and adding a language
      // WITH its arm would then fail for the wrong reason.
      expect(allowed.length).toBeGreaterThanOrEqual(2);
      expect(allowed).toContain("bg");

      const arms = queryWithin("segment", `select arm from locale_labels order by arm_order;`).map(
        ([arm]) => arm,
      );
      for (const language of allowed) expect(arms).toContain(language);
    });
  });

  describe("segment report: the module-usage axis", () => {
    // #2377. The behavioural half of the re-based cross-tab, read from the
    // `content_events` view the report already builds, so it still collects
    // nothing new.
    beforeAll(() => {
      deleteSuiteUsers();
      const createdAt = "now() - interval '40 days'";
      const day5 = "now() - interval '35 days'";

      insertAuthUsers(
        [50, 51, 52, 53, 54, 55, 56].map((n) => ({ id: userId(n), createdAtSql: createdAt })),
      );

      // 50: one module. 51: two modules -> cannot be attributed to either.
      // 52: core tools only - `core` is the tools grid every account has, and it
      //     never counts toward breadth.
      // 53: nothing at all.
      // 54: a module row on day 30, INSIDE the W4 window. ☠️ The arm is measured
      //     over days 0..28, so this user is `no content` however much they did
      //     in week four - which is the whole point of the window: the axis must
      //     be prior to the outcome, not partly be it.
      // 55: a module row on day 27, one day inside the window's upper edge.
      // 56: core on day 5 and a module on day 30 - core-only at axis time.
      insertModuleContent([
        { id: userId(50), module: "gratitude", createdAtSql: day5 },
        { id: userId(51), module: "gratitude", createdAtSql: day5 },
        { id: userId(51), module: "meditation", createdAtSql: day5 },
        { id: userId(54), module: "act", createdAtSql: "now() - interval '10 days'" },
        { id: userId(55), module: "act", createdAtSql: "now() - interval '13 days'" },
        { id: userId(56), module: "act", createdAtSql: "now() - interval '10 days'" },
      ]);
      insertMoodLogs([
        { id: userId(52), createdAtSql: day5 },
        { id: userId(56), createdAtSql: day5 },
      ]);
    });

    afterAll(deleteSuiteUsers);

    function armOf(n: number): string {
      const [row] = queryWithin(
        "segment",
        `select arm from user_modules where user_id = '${userId(n)}';`,
      );
      return row[0];
    }

    it("files a single-module account under that module", () => {
      expect(armOf(50)).toBe("gratitude only");
    });

    it("refuses to attribute a two-module account to either of them", () => {
      // Picking the most-used would be a tie-break rule, and a tie-break is an
      // artefact rather than a stated priority - the reason #1605 rejected
      // first-pick-only on the axis this one replaced.
      expect(armOf(51)).toBe("several modules");
    });

    it("keeps core tools out of module breadth, on their own arm", () => {
      expect(armOf(52)).toBe("core tools only");
      expect(armOf(56)).toBe("core tools only");
    });

    it("gives an account with no content at all its own arm", () => {
      expect(armOf(53)).toBe("no content");
    });

    it("☠️ measures the arm over the first 28 days, never over the W4 window", () => {
      // User 54's only module row is on day 30 - inside the retention window.
      // Counting it would make the axis partly the outcome: module usage IS
      // content rows and retention IS a content row in days 28..35, so an
      // all-time axis would rank `several modules` above `no content` almost
      // mechanically. User 55, one day inside the upper edge, pins the boundary
      // in the other direction - without them, narrowing the window is invisible.
      expect(armOf(54)).toBe("no content");
      expect(armOf(55)).toBe("act only");
      expect(armOf(56)).toBe("core tools only");
    });

    it("partitions the population: every account in exactly one arm", () => {
      const [row] = queryWithin(
        "segment",
        `select (select count(*) from accounts where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(*) from user_modules where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(distinct user_id) from user_modules
                  where user_id::text like '${TEST_UUID_PREFIX}-%'),
                (select count(*) from user_modules um
                  where um.user_id::text like '${TEST_UUID_PREFIX}-%'
                    and not exists (select 1 from module_labels ml where ml.arm = um.arm));`,
      );
      expect(row).toEqual(["7", "7", "7", "0"]);
    });

    it("names an arm for every module content_events can emit", () => {
      // ☠️ `other module only` should always be empty, and it is empty only
      // while the two lists agree. Adding a module to content_events without
      // adding its arm would quietly file those people under a residue that
      // reads as a defect. The arm list is a literal on purpose (deriving it
      // from the data would make section 4 print nothing on an empty database),
      // so this is what keeps the literal honest.
      //
      // ☠️ The module list is read from the shipped BLOCK TEXT, never from
      // `select distinct module from content_events`. That query returns only
      // the modules some fixture happened to write, so a module with no rows
      // would be waved through by an assertion that looked identical - this
      // suite writes gratitude, meditation and act, and cbt and dbt would have
      // gone unchecked.
      const modules = [
        ...new Set(
          [
            ...sharedBlock("segment", "content_events").matchAll(
              /(?:created_at|completed_at), '(\w+)'/g,
            ),
          ]
            .map((match) => match[1])
            .filter((module) => module !== "core"),
        ),
      ].sort();
      expect(modules).toEqual(["act", "cbt", "dbt", "gratitude", "meditation"]);

      const arms = queryWithin("segment", `select arm from module_labels order by arm_order;`).map(
        ([arm]) => arm,
      );
      for (const module of modules) expect(arms).toContain(`${module} only`);
    });
  });

  describe("segment report: the axis-coverage precondition", () => {
    // ☠️☠️ #2377, and the reason the retired concern axis was worse than an
    // unreadable report. Section 1's gate counts W4-retained users across the
    // WHOLE population, never across axis-bearing ones - so with the concern
    // column null on every row, every account sat in the `unknown` arm and the
    // gate could still open and declare the cross-tab readable OVER AN EMPTY
    // TABLE. A FALSE GREEN. An unreachable gate is at least honestly silent.
    //
    // The fixture below is that exact shape, minimised: thirty accounts, all
    // retained, all mature, and every one of them in a single arm of both axes.
    const FALSE_GREEN = Array.from({ length: 30 }, (_, index) => 60 + index);

    beforeAll(() => {
      deleteSuiteUsers();
      // No preferences row for any of them, so all thirty share the locale arm
      // `no preferences row`; their only content is a mood log on day 30, which
      // is inside the W4 window and therefore outside the module axis's own
      // window, so all thirty also share the module arm `no content`.
      insertAuthUsers(
        FALSE_GREEN.map((n) => ({ id: userId(n), createdAtSql: "now() - interval '40 days'" })),
      );
      insertMoodLogs(
        FALSE_GREEN.map((n) => ({ id: userId(n), createdAtSql: "now() - interval '10 days'" })),
      );
    });

    afterAll(deleteSuiteUsers);

    it("opens the gate — this is the green that was false", () => {
      const [row] = queryWithinCohort(
        "segment",
        `select count(*) filter (where w4_mature and w4_retained) >= 30 from user_w4;`,
      );
      expect(row).toEqual(["t"]);
    });

    it("reports both axes as carrying no values, with the gate open", () => {
      const rows = queryWithinCohort("segment", section("segment", 2));
      expect(rows).toEqual([
        ["locale", "4", "1", "f"],
        ["module usage", "9", "1", "f"],
      ]);
    });

    it("☠️ withholds both orderings entirely rather than printing one arm", () => {
      // The shipped sections, run verbatim over a population these fixtures
      // control exactly. An ordering of one arm is not an ordering, and printing
      // it beside an open gate is what would be read as a segment finding.
      //
      // ⚠️ This assertion was `toEqual([])` when #2377 wrote it. #2378 changed
      // the BEHAVIOUR deliberately - silence is never allowed to mean anything,
      // so a withheld ordering now prints one row saying it was withheld rather
      // than nothing at all. The assertion is updated to match a change that was
      // intended, and it is STRICTER than the one it replaces: it pins the row
      // count AND the marker AND the reason, where `[]` pinned only emptiness.
      for (const number of [3, 4]) {
        const rows = queryWithinCohort("segment", section("segment", number));
        expect(rows).toHaveLength(1);
        expect(rows[0][0]).toBe("(ordering withheld)");
        expect(rows[0][1]).toContain("fewer than two arms");
        // No arm of either axis may appear: the point is that nothing rankable
        // was printed, not merely that the row count is one.
        expect(rows[0][0]).not.toMatch(/^(en|bg|no preferences row|cbt only|no content)$/);
      }
    });

    it("prints the orderings again as soon as a second arm holds a mature user", () => {
      // Guards the guard: a precondition that never opens would satisfy the
      // assertions above just as well, and would be the other way to lose the
      // report. One Bulgarian account and one gratitude record are the whole
      // difference between withheld and readable.
      insertAuthUser({ id: userId(99), createdAtSql: "now() - interval '40 days'" });
      insertLanguages([{ id: userId(99), languageSql: `'bg'` }]);
      insertModuleContent([
        { id: userId(99), module: "gratitude", createdAtSql: "now() - interval '35 days'" },
      ]);
      try {
        expect(queryWithinCohort("segment", section("segment", 2))).toEqual([
          ["locale", "4", "2", "t"],
          ["module usage", "9", "2", "t"],
        ]);
        expect(queryWithinCohort("segment", section("segment", 3)).length).toBeGreaterThan(0);
        expect(queryWithinCohort("segment", section("segment", 4)).length).toBeGreaterThan(0);
      } finally {
        runSql(
          `delete from public.gratitude_entries_data where user_id = '${userId(99)}';
           delete from public.user_preferences where user_id = '${userId(99)}';
           delete from auth.users where id = '${userId(99)}';`,
        );
      }
    });
  });

  describe("segment report: the retired concern axis stays retired", () => {
    it("☠️ carries the schema comment production supports, not the one it disproved", () => {
      // #2377. The old comment said the column is "written once by
      // apply_widget_recommendations". Production has never held a value in it,
      // and a report believed the comment for a year. The correction is a
      // migration, so nothing else in the repo would notice it being reverted.
      const comment = runSql(
        `select col_description('public.user_preferences'::regclass, attnum)
           from pg_attribute
          where attrelid = 'public.user_preferences'::regclass
            and attname = 'initial_concerns';`,
      ).trim();
      expect(comment).toContain("MEASURED EMPTY IN PRODUCTION");
      expect(comment).toContain("DO NOT COHORT ANYTHING BY THIS COLUMN");
      expect(comment).not.toMatch(/written once by apply_widget_recommendations/);
    });

    it("keeps the column, which is not the same as reading it", () => {
      // Dropping it changes nothing observable and would cost an
      // INTENTIONALLY_DROPPED entry in the export gate, so the decision was to
      // keep it and stop cohorting by it. ⚠️ Only the KEEPING half is asserted
      // here. The other half - that no report re-adopts the column as an axis -
      // is a source ban in test/analytics-shared-sql.test.ts, and this test
      // would pass just as well if it were removed.
      const [row] = runSql(
        `select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'user_preferences'
            and column_name = 'initial_concerns';`,
      )
        .trim()
        .split("\n");
      expect(row).toBe("1");
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

  describe("engagement report: the programme funnel", () => {
    // #2375. Every cell asserted below is seeded at five or more, so the counts
    // print their real values - k=5 would otherwise flatten the whole funnel
    // into `<5` and there would be nothing to read.
    const STARTED_ONLY = [80, 81, 82, 83, 84, 85]; // started, sitting on phase 2
    const NEVER_STARTED = [86, 87, 88, 89, 90]; // ☠️ phase index, no start
    const COMPLETED = [91, 92, 93, 94, 95]; // ran the whole thing
    // ☠️ Guests, running a DIFFERENT programme from the registered fixtures.
    // Without them every fixture is registered, and the account axis is
    // asserted only for row presence and zeros - so breaking the join on
    // `pp.account` would leave every other test in this suite passing.
    const GUESTS_ON_ACT = [96, 97, 98, 99, 110];

    /** Section 7 as shipped, over this suite's fixtures, keyed `account/programme/step`. */
    function funnel(): Map<string, { users: string; pct: string }> {
      return new Map(
        queryWithinCohort("engagement", section("engagement", 7)).map(
          ([account, programme, step, users, pct]) => [
            `${account}/${programme}/${step}`,
            { users, pct },
          ],
        ),
      );
    }

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        ...[...STARTED_ONLY, ...NEVER_STARTED, ...COMPLETED].map((n) => ({
          id: userId(n),
          createdAtSql: "now() - interval '40 days'",
        })),
        ...GUESTS_ON_ACT.map((n) => ({
          id: userId(n),
          createdAtSql: "now() - interval '40 days'",
          isAnonymous: true,
        })),
      ]);
      insertProgrammeRows([
        // Five guests on ACT, so the account axis carries real progress on both
        // arms and on two different programmes at once.
        ...GUESTS_ON_ACT.map((n) => ({
          id: userId(n),
          programme: "act" as const,
          startedAtSql: "now() - interval '10 days'",
          phaseIndex: 1,
        })),
        // Started and on phase 2 of 5.
        ...STARTED_ONLY.map((n) => ({
          id: userId(n),
          programme: "cbt" as const,
          startedAtSql: "now() - interval '20 days'",
          phaseIndex: 1,
        })),
        // ☠️ THE SHAPE THE FUNNEL MUST IGNORE. A phase index as high as it goes
        // and no start date, which is what every account that never opened the
        // programme looks like once the column default is read as progress.
        // These five must appear at NO step; if the `started_at is not null`
        // condition is ever dropped they appear at all four phase steps.
        ...NEVER_STARTED.map((n) => ({
          id: userId(n),
          programme: "cbt" as const,
          phaseIndex: 4,
        })),
        // Started, reached the last phase, and finished.
        ...COMPLETED.map((n) => ({
          id: userId(n),
          programme: "cbt" as const,
          startedAtSql: "now() - interval '30 days'",
          phaseIndex: 4,
          completedAtSql: "now() - interval '2 days'",
        })),
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("counts a person at every step they have reached, and no further", () => {
      const rows = funnel();
      // 11 started; 11 are on phase 2 or past it; only the 5 finishers went on.
      expect(rows.get("registered/cbt/started")?.users).toBe("11");
      expect(rows.get("registered/cbt/reached phase 2")?.users).toBe("11");
      expect(rows.get("registered/cbt/reached phase 3")?.users).toBe("5");
      expect(rows.get("registered/cbt/reached phase 4")?.users).toBe("5");
      expect(rows.get("registered/cbt/reached phase 5")?.users).toBe("5");
      expect(rows.get("registered/cbt/completed")?.users).toBe("5");
    });

    it("☠️ never counts a phase index that no start date supports", () => {
      // The five NEVER_STARTED fixtures sit on the last phase with no start.
      // Dropping the condition would put them into all four phase steps, so
      // these numbers are exactly the ones that move: 11 -> 16 and 5 -> 10.
      const rows = funnel();
      expect(rows.get("registered/cbt/started")?.users).toBe("11");
      expect(rows.get("registered/cbt/reached phase 2")?.users).toBe("11");
      expect(rows.get("registered/cbt/reached phase 5")?.users).toBe("5");
    });

    it("reads the drop-off as a share of starters, not of the population", () => {
      // 5 of 11 starters reached the last phase. Read against the 16 accounts
      // this suite creates it would be 31.3%, and against every account on the
      // database something else again.
      const rows = funnel();
      expect(rows.get("registered/cbt/started")?.pct).toBe("100.0%");
      expect(rows.get("registered/cbt/reached phase 5")?.pct).toBe("45.5%");
    });

    it("prints a zero step rather than dropping it, and never leaks across programmes", () => {
      // ⚠️ The zeros are the point: they are the watch list the first
      // occurrences section reads, so the month somebody first completes a
      // programme it stops being zero. Nobody dismissed a graduation here, and
      // no registered fixture touched act or dbt.
      const rows = funnel();
      expect(rows.get("registered/cbt/graduation dismissed")?.users).toBe("0");
      expect(rows.get("registered/act/started")?.users).toBe("0");
      expect(rows.get("registered/dbt/started")?.users).toBe("0");
    });

    it("☠️ keeps each account type's progress on its own arm", () => {
      // Five guests started ACT; eleven registered accounts started CBT, and
      // nobody did both. So each arm's progress must appear only against its
      // own account type - a join that lost `pp.account` would show all sixteen
      // people under both, and every other assertion here would still pass.
      const rows = funnel();
      expect(rows.get("guest/act/started")?.users).toBe("5");
      expect(rows.get("guest/act/reached phase 2")?.users).toBe("5");
      expect(rows.get("guest/cbt/started")?.users).toBe("0");
      expect(rows.get("registered/act/started")?.users).toBe("0");
      expect(rows.get("registered/cbt/started")?.users).toBe("11");
    });

    it("☠️ keeps its full shape when nobody exists at all", () => {
      // The steps come from `programme_labels`, which is independent of
      // `accounts`, and this is why. Derived from the progress view instead -
      // the obvious way to write it - the step list collapses to nothing on an
      // empty population and section 7 prints ZERO ROWS. A fixed-shape table
      // that prints nothing is the one outcome docs/analytics.md rules out:
      // silence then means either "no data" or "broken", and a reader cannot
      // tell which.
      const empty = rowsAfterMarker(
        definitionsWithPopulation("engagement", "false"),
        section("engagement", 7),
        "engagement",
      );
      expect(empty).toHaveLength(2 * (7 + 6 + 6));
      for (const row of empty) expect(row[3]).toBe("0");
    });

    it("prints every step for every programme and both account types", () => {
      // Fixed shape. CBT has five phases and ACT and DBT four, so the step
      // count differs per programme by design - keep this in step with the
      // programme definitions, which test/analytics-programme-phases.test.ts
      // holds the report's own numbers equal to.
      const steps = [...funnel().keys()];
      expect(steps).toHaveLength(2 * (7 + 6 + 6));
      for (const account of ["guest", "registered"]) {
        expect(steps).toContain(`${account}/cbt/reached phase 5`);
        expect(steps).toContain(`${account}/act/graduation dismissed`);
        expect(steps).toContain(`${account}/dbt/completed`);
      }
    });
  });

  describe("onboarding report: guest-to-registered conversion", () => {
    // ☠️ #2376, on #2366's finding. This is CONTEXT.md's own definition
    // executed, not a proxy: conversion is attaching the first sign-in identity,
    // and `auth.identities.created_at` is the instant that happened.
    //
    // ☠️ THE ONE-SECOND THRESHOLD separates "same transaction" from "a separate
    // act", not "fast" from "slow" - a born-registered identity lands within
    // 0.080s of its user row, and a conversion needs a human decision first. The
    // fixtures straddle it exactly, at +1s and +1.5s, because a threshold whose
    // fixtures do not sit either side of it survives being moved.
    // ☠️ A FIXED INSTANT, not `now() - interval '40 days'`. The accounts and
    // their identities are inserted by separate statements, and `now()` is
    // evaluated afresh in each - so a "+1 second" identity actually landed a
    // second PLUS the drift between the two round trips, and the fixture that
    // exists to sit exactly ON the threshold sat past it. A literal makes the
    // two inserts agree to the microsecond. It is far enough in the past to be
    // mature, and being in the past it stays that way.
    const SIGNUP = "timestamptz '2026-08-04T12:00:00Z'";
    const UNCONVERTED = [120, 121, 122, 123, 124];
    const CONVERTED_IN_WINDOW = [125, 126, 127, 128, 129];
    const CONVERTED_LATE = 130; // day 9 - a real conversion, outside the window
    const AT_MINT = 131;
    const AT_MINT_RELINKED = 132; // linked a second provider much later
    const AT_MINT_EDGE = 133; // identity exactly 1s later: still the same act
    const CONVERTED_EDGE = 134; // 1.5s later: a separate act

    /** One row per user from the shipped view, keyed by user id. */
    function armsByUser(): Map<string, string> {
      return new Map(
        queryWithinCohort(
          "onboarding",
          `select user_id, arm from conversion_arms order by user_id;`,
        ).map(([user, arm]) => [user, arm]),
      );
    }

    /** Section 4's printed arm table. */
    function printedArms(): Map<string, string> {
      return new Map(
        queryWithinCohort("onboarding", conversionArmTable()).map(([arm, users]) => [arm, users]),
      );
    }

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        // Guests who never converted keep is_anonymous true and have no identity.
        ...UNCONVERTED.map((n) => ({
          id: userId(n),
          createdAtSql: SIGNUP,
          isAnonymous: true,
        })),
        // Everyone below holds an identity, so they are registered now.
        ...[
          ...CONVERTED_IN_WINDOW,
          CONVERTED_LATE,
          AT_MINT,
          AT_MINT_RELINKED,
          AT_MINT_EDGE,
          CONVERTED_EDGE,
        ].map((n) => ({ id: userId(n), createdAtSql: SIGNUP })),
      ]);
      insertIdentities([
        ...CONVERTED_IN_WINDOW.map((n) => ({
          userId: userId(n),
          createdAtSql: `${SIGNUP} + interval '2 days'`,
        })),
        { userId: userId(CONVERTED_LATE), createdAtSql: `${SIGNUP} + interval '9 days'` },
        { userId: userId(AT_MINT), createdAtSql: SIGNUP },
        // ☠️ min(), not any: a provider linked three months later must not read
        // as a conversion on an account that was registered from the start.
        { userId: userId(AT_MINT_RELINKED), createdAtSql: SIGNUP },
        {
          userId: userId(AT_MINT_RELINKED),
          createdAtSql: `${SIGNUP} + interval '90 days'`,
          provider: "google",
        },
        { userId: userId(AT_MINT_EDGE), createdAtSql: `${SIGNUP} + interval '1 second'` },
        { userId: userId(CONVERTED_EDGE), createdAtSql: `${SIGNUP} + interval '1.5 seconds'` },
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("puts each account in the arm its identity record earns", () => {
      const arms = armsByUser();
      expect(arms.get(userId(UNCONVERTED[0]))).toBe("guest (unconverted)");
      expect(arms.get(userId(CONVERTED_IN_WINDOW[0]))).toBe("converted guest");
      expect(arms.get(userId(CONVERTED_LATE))).toBe("converted guest");
      expect(arms.get(userId(AT_MINT))).toBe("registered at mint");
    });

    it("☠️ reads the earliest identity, so a later provider link is not a conversion", () => {
      expect(armsByUser().get(userId(AT_MINT_RELINKED))).toBe("registered at mint");
    });

    it("☠️ puts the one-second threshold between the same act and a separate one", () => {
      // Exactly one second is still the signup transaction; half a second later
      // is a decision somebody made. Moving the threshold either way breaks one
      // of these two.
      const arms = armsByUser();
      expect(arms.get(userId(AT_MINT_EDGE))).toBe("registered at mint");
      expect(arms.get(userId(CONVERTED_EDGE))).toBe("converted guest");
    });

    it("partitions the whole population, leaving nobody in no arm", () => {
      // The acceptance criterion the contradiction arm depends on: if the arms
      // did not cover everyone, an account could go missing rather than turning
      // up in the arm that exists to catch disagreement.
      const [row] = queryWithinCohort(
        "onboarding",
        `select count(*), count(arm), count(distinct user_id) from conversion_arms;`,
      );
      // Fifteen accounts, fifteen arms, nobody counted twice and nobody null.
      expect(row).toEqual(["15", "15", "15"]);
      expect(armsByUser().size).toBe(15);
    });

    it("prints all four arms, with the contradiction arm empty on well-formed data", () => {
      // ⚠️ Fixed shape. The contradiction arm has to print its zero, or its
      // absence and its emptiness look the same.
      const arms = printedArms();
      expect([...arms.keys()]).toEqual([
        "guest (unconverted)",
        "converted guest",
        "registered at mint",
        "is_anonymous disagrees with the identity record (CONTRADICTION)",
      ]);
      expect(arms.get("guest (unconverted)")).toBe("5");
      expect(arms.get("converted guest")).toBe("7");
      expect(arms.get("is_anonymous disagrees with the identity record (CONTRADICTION)")).toBe("0");
    });

    it("rates conversion over mature guest-origin accounts, and excludes a late one", () => {
      // Twelve guest-origin accounts, all past seven days. Six converted inside
      // the window; the day-nine conversion is real and is deliberately not in
      // the numerator, because the window asks about the first week.
      const [row] = queryWithinCohort("onboarding", conversionRate());
      expect(row).toEqual(["12", "6", "50.0%"]);
    });
  });

  describe("onboarding report: the contradiction arm", () => {
    // ☠️ The arm exists to catch `is_anonymous` and the identity record
    // disagreeing about who is a guest. This makes them disagree on purpose: an
    // account that says it is registered while holding no identity at all.
    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        // Two accounts that say they are registered and hold no identity.
        { id: userId(140), createdAtSql: "now() - interval '40 days'" },
        { id: userId(141), createdAtSql: "now() - interval '40 days'" },
        // ☠️ And one of the MIRROR shape: a guest that holds an identity. An
        // earlier version of the arms filed this as `converted guest` - a
        // disagreement absorbed into a plausible-looking neighbour, which is
        // the failure this arm exists to prevent.
        {
          id: userId(142),
          createdAtSql: "now() - interval '40 days'",
          isAnonymous: true,
        },
      ]);
      insertIdentities([{ userId: userId(142), createdAtSql: "now() - interval '38 days'" }]);
    });

    afterAll(deleteSuiteUsers);

    it("catches a guest that holds an identity, not only the reverse", () => {
      const arms = new Map(
        queryWithinCohort(
          "onboarding",
          `select user_id, arm from conversion_arms order by user_id;`,
        ).map(([user, arm]) => [user, arm]),
      );
      expect(arms.get(userId(142))).toBe(
        "is_anonymous disagrees with the identity record (CONTRADICTION)",
      );
      expect(arms.get(userId(140))).toBe(
        "is_anonymous disagrees with the identity record (CONTRADICTION)",
      );
    });

    it("fills when the two definitions of guest drift apart", () => {
      // Only the arm table, not the rate statement that follows it in the
      // section - running both would fold the rate row in among the arms.
      const rows = new Map(
        queryWithinCohort("onboarding", conversionArmTable()).map(([arm, users]) => [arm, users]),
      );
      expect(rows.get("is_anonymous disagrees with the identity record (CONTRADICTION)")).toBe(
        "<5",
      );
      // And nobody is quietly filed elsewhere to make the total look right.
      expect(rows.get("guest (unconverted)")).toBe("0");
      expect(rows.get("converted guest")).toBe("0");
      expect(rows.get("registered at mint")).toBe("0");
    });
  });

  describe("onboarding report: favourites", () => {
    // #2376. Favourites took the slot the retired widget-picks section held.
    // Open shape - kinds and keys come and go with the product - so only what
    // exists prints, and a key nobody pinned is simply absent rather than a row
    // of zero.
    const PINNED_MOOD = [150, 151, 152, 153, 154];

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        ...PINNED_MOOD.map((n) => ({ id: userId(n), createdAtSql: "now() - interval '40 days'" })),
        { id: userId(155), createdAtSql: "now() - interval '40 days'", isAnonymous: true },
      ]);
      insertFavourites([
        ...PINNED_MOOD.map((n) => ({ userId: userId(n), kind: "tool", key: "mood" })),
        // One person pinning twice is still one person.
        { userId: userId(PINNED_MOOD[0]), kind: "module", key: "cbt" },
        // A guest pins too, so the account axis carries something on both arms.
        { userId: userId(155), kind: "tool", key: "journal" },
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("counts distinct people per kind and key, split by account type", () => {
      const rows = new Map(
        queryWithinCohort("onboarding", section("onboarding", 5)).map(
          ([account, kind, key, users]) => [`${account}/${kind}/${key}`, users],
        ),
      );
      expect(rows.get("registered/tool/mood")).toBe("5");
      expect(rows.get("registered/module/cbt")).toBe("<5");
      expect(rows.get("guest/tool/journal")).toBe("<5");
      // ☠️ Exactly these three rows and no others. Asserting only that an
      // unpinned key is absent would assert nothing - section 5 has no label
      // table, so a key nobody pinned can never appear and the check could not
      // fail. The claim worth making is that the section emits one row per
      // (account, kind, key) that exists and invents none.
      expect([...rows.keys()].sort()).toEqual([
        "guest/tool/journal",
        "registered/module/cbt",
        "registered/tool/mood",
      ]);
    });
  });

  describe("engagement report: reminder adoption", () => {
    // ☠️ #2375. The claim is not just that a number is printed, but that it is
    // the number that VARIES. `notifications_enabled_global` defaults to true
    // and would read as near-universal adoption; `reminder_consent` defaults to
    // false and moves only when somebody chooses it.
    const CONSENTED = [100, 101, 102, 103, 104];
    const DECLINED = [105, 106, 107];
    // ☠️ Exactly two guests, one of whom consented. This arm is the only one
    // that can show the k=5 rule doing anything: `k_count(0)` prints "0" and
    // `k_count(5)` prints "5", both identical to the raw number, so a guest arm
    // of zero would assert the suppression and the absence of it alike.
    const GUESTS = [108, 109];

    function reminders(): Map<string, string[]> {
      return new Map(
        queryWithinCohort("engagement", section("engagement", 8)).map(([account, ...rest]) => [
          account,
          rest,
        ]),
      );
    }

    beforeAll(() => {
      deleteSuiteUsers();
      insertAuthUsers([
        ...[...CONSENTED, ...DECLINED].map((n) => ({
          id: userId(n),
          createdAtSql: "now() - interval '40 days'",
        })),
        ...GUESTS.map((n) => ({
          id: userId(n),
          createdAtSql: "now() - interval '40 days'",
          isAnonymous: true,
        })),
      ]);
      insertProgrammeRows([
        // Two guests, one consenting: an arm small enough for k=5 to bite.
        { id: userId(GUESTS[0]), reminderConsentSql: "true" },
        { id: userId(GUESTS[1]), reminderConsentSql: "false" },
        // ☠️ Consented, with the global switch OFF. If this section ever reads
        // `notifications_enabled_global` these five vanish and the count reads
        // zero - which is the failure the column choice exists to prevent, made
        // visible rather than argued about.
        ...CONSENTED.map((n) => ({
          id: userId(n),
          programme: "cbt" as const,
          reminderConsentSql: "true",
          notificationsGlobalSql: "false",
        })),
        // Not consented, with the global switch ON - the default shape, and the
        // one that would be counted by mistake.
        ...DECLINED.map((n) => ({
          id: userId(n),
          programme: "cbt" as const,
          reminderConsentSql: "false",
          notificationsGlobalSql: "true",
        })),
      ]);
    });

    afterAll(deleteSuiteUsers);

    it("counts consent, and is unmoved by the global switch that defaults to true", () => {
      // 8 accounts, 5 of whom consented - all five with the global switch off,
      // and the three who did not consent have it on.
      expect(reminders().get("registered")).toEqual(["8", "5", "62.5%"]);
    });

    it("prints the account count raw and the consent count through k=5", () => {
      // ☠️ The whole claim of the title, in one row: two guest accounts print
      // as 2 because a population count is never suppressed, while the one who
      // consented prints `<5` because that is a slice. A guest arm of zero
      // would have asserted nothing - `k_count(0)` is "0" either way.
      expect(reminders().get("guest")).toEqual(["2", "<5", "-"]);
    });
  });

  describe("silence is never allowed to mean anything", () => {
    // ☠️ #2378, and it is a pass over all three reports rather than one feature.
    // Fixed-shape tables print their zeros, because an empty arm is information.
    // Open-shape tables print only what exists - so a section that printed
    // nothing could be NO DATA, CORRECTLY EMPTY, or BROKEN, and a reader could
    // not tell which. Every open-shape section now prints an explicit marker, so
    // a section printing literally nothing is proof of a bug rather than a
    // reading (docs/analytics.md, "Silence is never allowed to mean anything").
    //
    // ⚠️ psql's own "(0 rows)" footer is NOT this marker and cannot replace it:
    // it vanishes under `-t` (which this suite uses), and the monthly digest
    // renders rows into Markdown tables, so a footer is not carried at all. The
    // marker is a ROW, which survives every rendering that shows rows.

    /** An open-shape section: prints only what exists, so it must mark emptiness. */
    const OPEN = "OPEN";
    /**
     * A fixed-shape section whose ordering #2377 withholds entirely when the
     * axis-coverage precondition fails. ☠️ Not part of the open-shape pass - it
     * is here because that withholding is a SECOND kind of deliberate silence,
     * and this rule reaches it too. A withheld ordering must say it was withheld.
     */
    const WITHHELD = "WITHHELD";

    const NO_ROWS = "(no rows)";
    const ORDERING_WITHHELD = "(ordering withheld)";

    /**
     * Every printed section of every report, classified. A value other than
     * OPEN/WITHHELD is the reason the section is fixed-shape, and that reason is
     * TESTED rather than trusted: a fixed-shape section must still print rows
     * over an empty population, so a misclassification fails below instead of
     * quietly exempting a section from the rule.
     *
     * ☠️ A section missing from this registry fails the enumeration test. That
     * is the point - #2378 exists because sections were added over time and the
     * open-shape ones were never swept.
     */
    const SECTIONS: Record<string, Record<string, string>> = {
      engagement: {
        provenance: "one aggregate row over the whole population, always exactly one",
        "0": "cross-joins account_labels, so both account types print",
        "1": "cross-joins account_labels",
        "2": OPEN, // weeks
        "3": OPEN, // signup-week cohorts
        "4": "cross-joins a literal module list with account_labels",
        "5": OPEN, // core tool feature names
        "6": "cross-joins account_labels",
        "7": "cross-joins a literal programme_labels list (#2375)",
        "8": "cross-joins account_labels",
      },
      onboarding: {
        provenance: "one aggregate row over the whole population, always exactly one",
        "0": "cross-joins account_labels, so both account types print",
        "1": OPEN, // weeks
        "2": OPEN, // weeks
        "3": OPEN, // completion modes, which come and go with the product
        "4": "cross-joins a literal conversion arm list; the rate is one aggregate row (#2376)",
        "5": OPEN, // favourite kinds and keys
      },
      segment: {
        provenance: "one aggregate row over the whole population, always exactly one",
        "0": "cross-joins account_labels, so both account types print",
        "1": "cross-joins account_labels; the gate row is one aggregate row",
        "2": "one row per axis, from a literal list of two",
        "3": WITHHELD,
        "4": WITHHELD,
      },
    };

    /** The section labels a report actually prints, read from its `\\echo` headings. */
    function printedSections(name: string): string[] {
      return reportSql(name)
        .split("\n")
        .filter((line) => line.startsWith("\\echo '=== "))
        .map((line) => {
          const numbered = /^\\echo '=== (\d+)\)/.exec(line);
          if (numbered) return numbered[1];
          if (line.startsWith("\\echo '=== Population provenance")) return "provenance";
          throw new Error(`${name}: unrecognised section heading ${line}`);
        })
        .sort();
    }

    /**
     * One section's statements, run with the report's population narrowed to
     * NOBODY. That is the state every open-shape section must survive, and the
     * state in which a fixed-shape section must still print its zeros.
     */
    function queryWithNoPopulation(name: string, sql: string): string[][] {
      return rowsAfterMarker(definitionsWithPopulation(name, "false"), sql, name);
    }

    function statementsOf(name: string, label: string): string {
      return label === "provenance" ? provenanceStatement(name) : section(name, Number(label));
    }

    for (const [name, registry] of Object.entries(SECTIONS)) {
      it(`analytics-${name}.sql: every printed section is classified`, () => {
        // Guards the guard. A section added later is invisible to this rule
        // until somebody says which kind it is, which is exactly how the
        // open-shape sections went unswept until #2378.
        expect(printedSections(name)).toEqual(Object.keys(registry).sort());
      });

      for (const [label, kind] of Object.entries(registry)) {
        const title = label === "provenance" ? "the provenance block" : `section ${label}`;

        if (kind === OPEN) {
          it(`analytics-${name}.sql: ${title} says so when it has no rows`, () => {
            const rows = queryWithNoPopulation(name, statementsOf(name, label));
            expect(rows).toHaveLength(1);
            expect(rows[0][0]).toBe(NO_ROWS);
          });
          continue;
        }

        if (kind === WITHHELD) {
          it(`analytics-${name}.sql: ${title} says its ordering was withheld`, () => {
            // Zero accounts means zero arms hold a mature user, so section 2
            // withholds - and the section must say that rather than print
            // nothing, which would be indistinguishable from a broken query.
            const rows = queryWithNoPopulation(name, statementsOf(name, label));
            expect(rows).toHaveLength(1);
            expect(rows[0][0]).toBe(ORDERING_WITHHELD);
            expect(rows[0][1]).toContain("section 2");
          });
          continue;
        }

        it(`analytics-${name}.sql: ${title} prints its zeros (${kind})`, () => {
          // ☠️ This is what makes the registry's reasons real rather than
          // decorative: a section claimed fixed-shape must actually print rows
          // when nobody exists. Misclassifying an open-shape section as fixed
          // would otherwise exempt it from the rule silently.
          const rows = queryWithNoPopulation(name, statementsOf(name, label));
          expect(rows.length).toBeGreaterThan(0);
          expect(rows.map((row) => row[0])).not.toContain(NO_ROWS);
          expect(rows.map((row) => row[0])).not.toContain(ORDERING_WITHHELD);
        });
      }
    }

    /** Everything the report PRINTS: from its first heading to the end of the file. */
    function printedPart(name: string): string {
      const source = reportSql(name);
      return source.slice(source.indexOf("\n\\echo"));
    }

    it("every report still executes end to end against a population of nobody", () => {
      // The acceptance criterion in as many words: all three reports run green
      // over a cohort with no data. The per-section tests above run statements
      // in isolation; this runs the shipped files whole.
      for (const name of REPORTS) {
        expect(() =>
          runSql(`${definitionsWithPopulation(name, "false")}\n${printedPart(name)}`),
        ).not.toThrow();
      }
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
