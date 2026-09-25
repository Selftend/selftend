// Where the demo seed is allowed to write, and whose rows it writes (#2730).
//
// ☠️ The seed's first act is `delete`. Pointed at the wrong project it wipes a
// real person's rows across every tool before it inserts a single fabricated one.
// So the target is an ALLOWLIST that fails closed: a local stack, or the one
// project named by `STAGING_PROJECT_ID`, and nothing else - anything unrecognised
// is refused before a client is even created.
//
// Keyed on the PROJECT, never on the account. An email- or id-keyed refusal
// protects one account; a project-keyed allowlist protects every account in
// production, including ones that do not exist yet. The production ref is ALSO
// refused by name, so a `STAGING_PROJECT_ID` pasted with the wrong value cannot
// turn the staging door into a production one.
//
// ⚠️ ONE EXCEPTION, and it is a person's, never a machine's (#2731, ruled on #2668).
// App Review signs into the shipped app, which points at production, so the
// reviewer account can only be a production account. A HUMAN may seed exactly that
// account by passing BOTH `--production-ref=<ref>` and `--reviewer-user-id=<uuid>`
// on the command line. Neither has a default, neither may appear in any workflow
// file (`test/seed-demo-target.test.ts` scans them), and the path refuses outright
// when `CI` or `GITHUB_ACTIONS` is set - so no automation can reach production with
// a delete-first script. The id is used as given: the account must already exist,
// and nothing here creates or changes a production login.
//
// Kept apart from `seed-demo-data.mjs`, which runs on import, so the refusal can
// be proved against fixtures (`test/seed-demo-target.test.ts`) without a database.

/** Production's Supabase ref. Public already (docs, app config); refused outright. */
export const PRODUCTION_PROJECT_REF = "isniauimshuomfqrikzo";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);
const PROJECT_REF = /^[a-z0-9]{20}$/;

export class SeedTargetRefused extends Error {
  constructor(message) {
    super(`Refusing to seed: ${message}`);
    this.name = "SeedTargetRefused";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Read `--name=value` / `--name value` pairs. Nothing is defaulted.
 *
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
export function parseSeedArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(argv[i]);
    if (!match) continue;
    out[match[1]] = match[2] ?? argv[++i] ?? "";
  }
  return out;
}

/**
 * Classify `url` as `local`, `staging` or - only on the owner's explicit say-so -
 * `production`, or throw `SeedTargetRefused`.
 *
 * @param {{ url: string | undefined, stagingProjectId: string | undefined,
 *   args?: Record<string, string>, env?: Record<string, string | undefined> }} input
 * @returns {{ kind: "local" | "staging" | "production", url: string, ref?: string, userId?: string }}
 */
export function resolveSeedTarget({ url, stagingProjectId, args = {}, env = {} }) {
  let parsed;
  try {
    parsed = new URL(url ?? "");
  } catch {
    throw new SeedTargetRefused(`the target is not a URL (${JSON.stringify(url ?? null)}).`);
  }

  if (LOCAL_HOSTS.has(parsed.hostname)) return { kind: "local", url: parsed.origin };

  const ref = /^([a-z0-9]{20})\.supabase\.co$/.exec(parsed.hostname)?.[1];
  if (ref === PRODUCTION_PROJECT_REF) return resolveProduction(parsed, args, env);
  if (args["production-ref"] !== undefined || args["reviewer-user-id"] !== undefined) {
    throw new SeedTargetRefused("--production-ref / --reviewer-user-id only apply to production.");
  }
  if (!stagingProjectId || !PROJECT_REF.test(stagingProjectId)) {
    throw new SeedTargetRefused(
      `${parsed.hostname} is not local, and STAGING_PROJECT_ID is unset or malformed, so no ` +
        "remote project is recognised.",
    );
  }
  if (stagingProjectId === PRODUCTION_PROJECT_REF) {
    throw new SeedTargetRefused("STAGING_PROJECT_ID names the PRODUCTION project.");
  }
  if (ref !== stagingProjectId || parsed.protocol !== "https:") {
    throw new SeedTargetRefused(
      `${parsed.origin} is neither a local stack nor https://<STAGING_PROJECT_ID>.supabase.co.`,
    );
  }
  return { kind: "staging", url: parsed.origin, ref };
}

function resolveProduction(parsed, args, env) {
  if (env.CI || env.GITHUB_ACTIONS) {
    throw new SeedTargetRefused(
      "the target is the PRODUCTION project and this is CI. Production is owner-run only.",
    );
  }
  if (args["production-ref"] === undefined || args["reviewer-user-id"] === undefined) {
    throw new SeedTargetRefused(
      "the target is the PRODUCTION project. This script deletes rows. Only the owner may seed " +
        "the App Review account there, by passing BOTH --production-ref and --reviewer-user-id.",
    );
  }
  if (args["production-ref"] !== PRODUCTION_PROJECT_REF) {
    throw new SeedTargetRefused("--production-ref does not name the production project.");
  }
  if (!UUID.test(args["reviewer-user-id"])) {
    throw new SeedTargetRefused("--reviewer-user-id is not a user id.");
  }
  if (parsed.protocol !== "https:") throw new SeedTargetRefused("production must be https.");
  return {
    kind: "production",
    url: parsed.origin,
    ref: PRODUCTION_PROJECT_REF,
    userId: args["reviewer-user-id"].toLowerCase(),
  };
}

/**
 * Create the capture account, or bring an existing one back to the known password,
 * pre-confirmed either way, and return its id.
 *
 * ☠️ Never through public signup: that sends a confirmation email, and an address
 * that bounces damages the project's sender reputation (AGENTS.md, email rule).
 * `email_confirm: true` through the admin API sends nothing.
 *
 * ⚠️ The password is written and never read back, logged or echoed - not into a
 * message, not into an error. Errors carry the admin API's message only.
 *
 * @param {{ listUsers: Function, createUser: Function, updateUserById: Function }} authAdmin
 * @param {{ email: string | undefined, password: string | undefined }} account
 * @returns {Promise<string>}
 */
export async function upsertSeedUser(authAdmin, { email, password }) {
  if (!email || !password) {
    throw new Error("The seed account needs SEED_ACCOUNT_EMAIL and SEED_ACCOUNT_PASSWORD.");
  }
  const wanted = email.trim().toLowerCase();

  for (let page = 1; page <= 100; page++) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listing users: ${error.message}`);
    const users = data?.users ?? [];
    const found = users.find((user) => (user.email ?? "").toLowerCase() === wanted);
    if (found) {
      const { error: updateError } = await authAdmin.updateUserById(found.id, {
        password,
        email_confirm: true,
      });
      if (updateError) throw new Error(`updating the seed account: ${updateError.message}`);
      return found.id;
    }
    if (users.length < 1000) break;
  }

  const { data, error } = await authAdmin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`creating the seed account: ${error.message}`);
  return data.user.id;
}
