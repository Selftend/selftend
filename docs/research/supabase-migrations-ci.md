# Applying Supabase Migrations in CI/CD (staging on `dev`, production on release)

## Question

How should Supabase database migrations be applied automatically in CI — to a
**separate staging Supabase project** when code lands on `dev`, then promoted to
**production** on release? Specifically: which CLI commands/flags to use
non-interactively on GitHub-hosted runners, which secrets/tokens are required and
how they are passed, how to target two different projects from one repo, how to
order the migration step relative to app deploy, how the "staging first, then
promote" flow is expressed with the Supabase CLI, and what pitfalls to watch for.

---

## Findings

### 1. Which CLI command applies migrations to a remote project — `supabase db push`

The canonical remote-deploy command is **`supabase db push`**. It reads the SQL
files in `supabase/migrations/`, compares them against the remote project's
`supabase_migrations.schema_migrations` tracking table, and applies only the
migrations that are missing from remote history, in timestamp order. This is the
command Supabase's own CI/CD docs use for both staging and production jobs.
[[managing-environments]](https://supabase.com/docs/guides/deployment/managing-environments)
[[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

The two setup + deploy commands, verbatim from the docs, are:

```bash
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase db push
```

- `supabase link` associates the working directory with a specific remote project
  ref. After linking, `db push` targets the linked project by default (no
  `--linked` flag strictly required, though it is accepted).
- `supabase migration up` is **not** the remote-deploy command in this model —
  by default it applies pending migrations to the **local** database (used during
  local dev / `supabase db reset`). `db push` is what the official staging and
  production workflows run. [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

**Relevant `supabase db push` flags** (from the CLI reference):
[[cli/supabase-db-push]](https://supabase.com/docs/reference/cli/supabase-db-push)

| Flag                | Meaning                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--linked`          | Pushes to the linked project (default target after `supabase link`).                                                                           |
| `--db-url <string>` | Push to the DB at an explicit (percent-encoded) connection string — useful to force the IPv4 session pooler on GitHub runners (see pitfall 6). |
| `--dry-run`         | "Print the migrations that would be applied, but don't actually apply them." Good for a PR preview / gate.                                     |
| `--include-all`     | "Include all migrations not found on remote history table."                                                                                    |
| `--include-seed`    | Also apply seed data from config.                                                                                                              |
| `--include-roles`   | Also apply custom roles from `supabase/roles.sql`.                                                                                             |
| `-p, --password`    | Remote Postgres password (normally supplied via `SUPABASE_DB_PASSWORD` env instead).                                                           |

### 2. Required secrets / tokens and how they are passed non-interactively

The official workflows pass everything via GitHub Actions `env:` (encrypted
secrets), so the CLI never prompts:
[[managing-environments]](https://supabase.com/docs/guides/deployment/managing-environments)

| Env var                 | Purpose                                                                                                                                                       | Source                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Personal access token authenticating the CLI to the Supabase Management API (replaces `supabase login`). One token works for all projects in the account/org. | Supabase Dashboard → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD`  | The project's Postgres database password; `db push` reads it automatically so it runs non-interactively. Distinct per project.                                | Project DB settings                          |
| `SUPABASE_PROJECT_ID`   | The project ref, consumed by `supabase link --project-ref`. Distinct per project.                                                                             | Project ref (e.g. `abcdefgh…`)               |

These are the three names the CLI recognizes by convention (`SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`), which is why the docs' `run:` steps
need no extra flags. The CLI is installed with the official
`supabase/setup-cli` action.
[[setup-cli]](https://github.com/supabase/setup-cli)

### 3. Targeting two projects (staging vs production) from one repo

Use **two separate GitHub Actions workflows (or two jobs/environments)**, each
linking a different project ref with its own DB password. The access token is
shared; the project ref and DB password differ. The docs model this exactly with
`STAGING_PROJECT_ID` / `STAGING_DB_PASSWORD` vs `PRODUCTION_PROJECT_ID` /
`PRODUCTION_DB_PASSWORD`, selected by branch.
[[managing-environments]](https://supabase.com/docs/guides/deployment/managing-environments)

**Staging (`staging.yaml`), triggered on the integration branch:**

```yaml
name: Deploy Migrations to Staging
on:
  push:
    branches: [develop] # <-- Selftend: use `dev`
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.STAGING_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push
```

**Production (`production.yaml`), triggered on release/`main`:**

```yaml
name: Deploy Migrations to Production
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.PRODUCTION_DB_PASSWORD }}
      SUPABASE_PROJECT_ID: ${{ secrets.PRODUCTION_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref $SUPABASE_PROJECT_ID
      - run: supabase db push
```

The two files are byte-for-byte identical except the trigger branch and the two
project-specific secrets — the natural way to target two projects from one repo.
[[managing-environments]](https://supabase.com/docs/guides/deployment/managing-environments)

### 4. Ordering: migrate BEFORE the app deploy, and gate the deploy on migration success

Migrations should run and succeed **before** the application (web/Android/edge
functions) is deployed, because new app code typically depends on the new schema.
Make the migration a prerequisite job so a failed `db push` blocks the deploy —
in GitHub Actions this is a `needs:` dependency (deploy job `needs: [migrate]`),
so a non-zero exit from `supabase db push` fails the pipeline and the app is never
shipped against an un-migrated database. The CLI returns a non-zero exit code on
failure, which naturally fails the step. (This ordering is the standard "migrate
first, then release" convention; Supabase's docs put the DB migration workflow on
its own, ahead of function/app deploys.)
[[managing-environments]](https://supabase.com/docs/guides/deployment/managing-environments)

Caveat: for genuinely breaking schema changes, prefer the **expand/contract**
(backward-compatible) pattern — deploy additive schema, then app, then a later
cleanup migration — so that in-flight old app code still works during the rollout.

### 5. "Staging first, then promote to production" — there is no `promote`; you re-run the same migration files

The Supabase CLI has **no literal `promote` command**. Promotion is simply
running `supabase db push` again — this time linked to the **production** project —
against the _same committed migration files_ that were already validated on
staging. Because each project has its own `supabase_migrations.schema_migrations`
tracking table, `db push` on production only applies migrations that production
hasn't seen yet, and skips the ones already present. Applying the identical
timestamped files to a second database is inherently idempotent at the
file/tracking level.
[[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

The safe promotion pattern:

1. Merge feature work into `dev` → `staging.yaml` runs `db push` on the **staging**
   project. Validate the app against staging.
2. Promote `dev → main` (release) → `production.yaml` runs `db push` on the
   **production** project, applying the _same_ migration files.
3. Optionally, before pushing to prod, run **`supabase migration list`** (which
   shows Local vs Remote migration versions side by side) or **`supabase db push
--dry-run`** to confirm exactly which migrations will apply and detect drift.
   [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)
   [[cli/supabase-db-push]](https://supabase.com/docs/reference/cli/supabase-db-push)

Drift recovery, if the remote tracking table ever diverges from the files:

- `supabase migration list` reveals the misalignment (Local vs Remote columns).
- `supabase db pull` captures untracked remote changes into a new migration file.
- `supabase migration repair --status <applied|reverted> <timestamp>` corrects the
  remote tracking table without re-running SQL.
  [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

### 6. Notable pitfalls

- **IPv4 / pooler on GitHub runners.** GitHub-hosted runners are **IPv4-only**,
  while a Supabase project's _direct_ database connection is IPv6. Old CLI versions
  fail to connect from Actions. Fix: use a **recent CLI** (≥ 1.136.3), which routes
  through **Supavisor** (the IPv4-compatible session pooler) automatically after
  `supabase link` — this is why `setup-cli` with `version: latest` is recommended.
  If a connection still fails, pass the **Session pooler** connection string
  (`...pooler.supabase.com`, IPv4-capable) explicitly via `db push --db-url`, or
  add the paid Dedicated IPv4 add-on. Do **not** rely on the direct `db.<ref>...`
  host from a runner.
  [[supabase discussion #20955]](https://github.com/orgs/supabase/discussions/20955)
  [[ipv4-address]](https://supabase.com/docs/guides/platform/ipv4-address)
  [[network ipv4/ipv6 troubleshooting]](https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP)

- **Never change the remote DB directly.** Editing schema through the Dashboard/SQL
  editor bypasses migration history and makes a later `db push` fail with sync
  errors. All schema changes must go through committed migration files.
  [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

- **Destructive migrations are not reversible by the CLI.** `db push` applies
  whatever SQL is in the files, including `DROP`/`ALTER ... DROP COLUMN`. There is
  no automatic rollback. Review with `--dry-run` first, prefer additive /
  expand-contract changes, and ensure the production project has PITR/backups
  before shipping destructive DDL.

- **`db push` (migration files) vs declarative schemas.** Supabase also supports a
  _declarative_ schema workflow (`supabase/schemas/*.sql` + `supabase db diff` to
  generate migrations). CI should still deploy the **generated migration files**
  via `db push`; do not try to "push" declarative schema files directly. Keep one
  source of truth. [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

- **Serialize `db push`.** Concurrent pushes can create timestamp/ordering
  conflicts. Coordinate so only one deploy runs at a time (GitHub Actions
  `concurrency:` group per environment). [[database-migrations]](https://supabase.com/docs/guides/deployment/database-migrations)

- **Password in logs.** Pass the DB password only via `SUPABASE_DB_PASSWORD` env
  (a masked secret), never on the command line, to avoid leaking it into Actions
  logs.

---

## Recommended approach for Selftend

Adopt Supabase's documented three-tier model, mapped onto Selftend's new
`dev → main` promotion flow, using **two provisioned Supabase projects** (staging
and production):

1. **Two workflows, two projects.** Create `.github/workflows/db-migrate-staging.yml`
   (trigger: `push` to **`dev`**) and `.github/workflows/db-migrate-production.yml`
   (trigger: the **release** event / `push` to `main`). Each does exactly:
   `supabase/setup-cli@v1` (`version: latest`) → `supabase link --project-ref
$SUPABASE_PROJECT_ID` → `supabase db push`. Keep them identical except the
   trigger and the project-specific secrets.

2. **Secrets.** One shared `SUPABASE_ACCESS_TOKEN`; per-environment
   `STAGING_PROJECT_ID` / `STAGING_DB_PASSWORD` and `PRODUCTION_PROJECT_ID` /
   `PRODUCTION_DB_PASSWORD`, ideally scoped to GitHub _Environments_ (`staging`,
   `production`) so production can require a manual approval gate.

3. **Order & gating.** Run the migration job first and make the app-deploy jobs
   (Netlify web, EAS Android, any edge functions) `needs:` the migration job, so a
   failed `db push` aborts the release. Migrate before deploy; use expand/contract
   for breaking changes.

4. **Promotion = re-push, not a special command.** There is no `promote`. When
   `dev → main` lands, `production.yaml` re-runs `supabase db push` against the
   prod project with the same committed migration files; per-project tracking
   tables make this idempotent. Optionally add a `supabase db push --dry-run` (or
   `supabase migration list`) pre-step in the production job to surface exactly
   what will change and catch drift before applying.

5. **Runner connectivity.** Pin `setup-cli` to a current CLI so Supavisor/IPv4
   pooler is used automatically on the IPv4-only GitHub runners; if a direct
   connection ever fails, switch to the Session pooler string via `db push
--db-url`. Add a `concurrency:` group per environment to serialize pushes, and
   confirm PITR/backups on prod before any destructive DDL.

This keeps migrations as the single source of truth in `supabase/migrations/`,
validates them on staging via the `dev` branch, and safely re-applies the identical
files to production on release — with the deploy gated on migration success.

---

## Sources

- Supabase Docs — Managing environments (CI/CD workflow, staging/production
  workflow YAML, secrets, branch model):
  https://supabase.com/docs/guides/deployment/managing-environments
- Supabase Docs — Database migrations (how migrations & tracking table work,
  `db push`, `migration list`, `db pull`, `migration repair`, drift/idempotency,
  "never change the remote directly"):
  https://supabase.com/docs/guides/deployment/database-migrations
- Supabase CLI reference — `supabase db push` flags (`--linked`, `--db-url`,
  `--dry-run`, `--include-all`, `--include-seed`, `--include-roles`, `-p`):
  https://supabase.com/docs/reference/cli/supabase-db-push
- Supabase `setup-cli` GitHub Action (installs CLI on runners; `version` input;
  db push example):
  https://github.com/supabase/setup-cli
- Supabase Discussion #20955 — GitHub Action link with IPv6 issue / upgrade CLI to
  use Supavisor from IPv4-only runners:
  https://github.com/orgs/supabase/discussions/20955
- Supabase Docs — Dedicated IPv4 address for ingress:
  https://supabase.com/docs/guides/platform/ipv4-address
- Supabase Docs — Network IPv4/IPv6 compatibility troubleshooting (Session pooler
  is IPv4-compatible):
  https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP
