#!/usr/bin/env node
/**
 * The Codex quota alarm (#2221) — the thing that complains when the PR
 * reviewer stops reviewing without ever going red.
 *
 * ☠️ **A gate that fails by posting a friendly comment and letting the merge
 * through is not a gate.** From 2026-08-14 to 2026-09-08 the Codex reviewer
 * posted exactly one comment on every PR — "You have reached your Codex usage
 * limits for code reviews" — and recorded zero reviews. From the timeline it
 * LOOKED reviewed. Four releases shipped in those 27 days believing they had a
 * second opinion, and nothing in the repository could tell the difference.
 *
 * What this module does, and deliberately no more (owner ruling on #2178):
 * Codex is **not** restored here and is **not** made a blocking check. This is
 * the alarm only. It reads the PRs merged into `dev` in the last day, marks
 * the ones whose only Codex activity is the quota notice, and files ONE issue.
 * It closes nothing and it blocks nothing.
 *
 *   node scripts/codex-quota-alarm.mjs --window-hours 24
 *
 * Every decision below is pure and unit-tested in
 * `test/codex-quota-alarm.test.ts`; the `gh` executor is an argument so the
 * calls this would make are asserted verbatim without a network, the same
 * shape as `scripts/release-thread/filer.mjs`.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * @typedef {object} PullRequest
 * @property {number} number
 * @property {string} title
 * @property {string} url
 * @property {string} mergedAt   ISO 8601
 *
 * @typedef {object} Activity
 * @property {{ login: string, body: string }[]} comments
 * @property {{ login: string }[]} reviews
 *
 * @typedef {PullRequest & Activity} InspectedPullRequest
 *
 * @typedef {object} IssueRef
 * @property {number} number
 * @property {"OPEN" | "CLOSED"} state
 * @property {string} title
 * @property {string} url
 * @property {string | null} [closedAt]
 *
 * @typedef {{ action: "none", reason: "no-starved-prs" | "acknowledged", issue?: IssueRef }} NoAction
 * @typedef {{ action: "create", issue?: IssueRef }} Create
 * @typedef {{ action: "update", issue: IssueRef }} Update
 * @typedef {NoAction | Create | Update} Outcome
 *
 * @typedef {(args: string[], input?: string) => string} GhExecutor
 */

/** The reviewer account, as GitHub reports it (`[bot]` suffix included on some endpoints). */
export const CODEX_LOGIN = "chatgpt-codex-connector";

/** The sentence the reviewer posts INSTEAD of reviewing. */
export const QUOTA_NOTICE = /usage limits for code reviews/i;

/** The alarm's one title. The lookup is keyed on it, so it must never be templated. */
export const ISSUE_TITLE = "Codex reviewer is out of quota";

/** Filed for a person to judge — never `ready-for-agent`: restoring the quota is a billing action. */
export const LABELS = ["needs-triage"];

/** How many issues the lookup reads when matching the title. */
export const LIST_LIMIT = 200;

/** `chatgpt-codex-connector` and `chatgpt-codex-connector[bot]` are the same account. */
export function isCodexAccount(login) {
  return typeof login === "string" && login.replace(/\[bot\]$/, "") === CODEX_LOGIN;
}

/**
 * Is this PR's Codex activity the quota notice and nothing else?
 *
 * BOTH halves matter. The notice alone is not enough (a PR can carry the
 * notice and a real review from a re-run), and zero reviews alone is not
 * enough (a PR the reviewer was never asked to look at has zero reviews and no
 * notice — silence is not the failure this alarm is about).
 *
 * @param {Activity} pr
 */
export function isStarved(pr) {
  const noticed = pr.comments.some(
    (comment) => isCodexAccount(comment.login) && QUOTA_NOTICE.test(comment.body ?? ""),
  );
  const reviews = pr.reviews.filter((review) => isCodexAccount(review.login)).length;
  return noticed && reviews === 0;
}

/**
 * @param {InspectedPullRequest[]} prs
 * @returns {InspectedPullRequest[]}
 */
export function starvedPullRequests(prs) {
  return prs.filter(isStarved);
}

/**
 * What to do, given the starved PRs and the issues that already exist.
 *
 * ☠️ **An alarm that a close can silence forever is a muted alarm; one that
 * refiles every morning is noise the owner learns to skip.** So: an OPEN issue
 * is updated in place, never duplicated. A CLOSED one counts as acknowledged
 * only for what the owner could have seen — if it was closed AFTER the newest
 * starved PR merged, there is nothing new to say and the run is quiet; if
 * PRs have been starved SINCE that close, the alarm speaks again with a fresh
 * issue. Nothing here ever closes or reopens an issue.
 *
 * @param {InspectedPullRequest[]} starved
 * @param {IssueRef[]} issues   issues carrying {@link ISSUE_TITLE}, open and closed
 * @returns {Outcome}
 */
export function decide(starved, issues) {
  if (starved.length === 0) return { action: "none", reason: "no-starved-prs" };

  const matching = issues.filter((issue) => issue.title === ISSUE_TITLE);
  const open = matching.find((issue) => issue.state === "OPEN");
  if (open) return { action: "update", issue: open };

  const newestStarved = starved.reduce(
    (latest, pr) => (pr.mergedAt > latest ? pr.mergedAt : latest),
    "",
  );
  const acknowledged = matching
    .filter((issue) => issue.state === "CLOSED" && issue.closedAt)
    .find((issue) => issue.closedAt >= newestStarved);
  if (acknowledged) return { action: "none", reason: "acknowledged", issue: acknowledged };

  return { action: "create" };
}

/**
 * The issue body: what was measured, over what window, and what it means —
 * enough to act on without opening a single PR.
 *
 * @param {InspectedPullRequest[]} starved
 * @param {{ windowHours: number, checkedAt: string }} context
 */
export function issueBody(starved, { windowHours, checkedAt }) {
  const list = starved
    .map((pr) => `- ${pr.url} — merged ${pr.mergedAt}, quota notice, 0 reviews`)
    .join("\n");

  return [
    `**${starved.length} pull request${starved.length === 1 ? "" : "s"} merged into \`dev\` in the last ${windowHours}h carried a Codex quota notice and no review.**`,
    "",
    'The reviewer does not fail loudly: it posts one comment — _"You have reached your Codex usage limits for code reviews"_ — and records zero reviews, so the PR timeline looks reviewed and the merge proceeds (#2221).',
    "",
    list,
    "",
    "Restoring the quota is a billing action on the ChatGPT/Codex account; nothing in this repository can do it. Codex is **not** a blocking check (owner ruling on #2178), so this issue is a notice, not a gate — this workflow closes nothing.",
    "",
    `_Checked ${checkedAt} by \`.github/workflows/codex-quota-alarm.yml\`. This issue is updated in place while it stays open._`,
  ].join("\n");
}

/** The one-line trace on the run. @param {Outcome} outcome */
export function summaryOf(outcome, starved) {
  switch (outcome.action) {
    case "none":
      return outcome.reason === "no-starved-prs"
        ? "every PR merged in the window carries a Codex review or no quota notice - nothing to report"
        : `${starved.length} starved PR(s), but #${outcome.issue?.number} was closed after the newest of them - already acknowledged`;
    case "update":
      return `updated the Codex quota alarm in place: #${outcome.issue.number} ${outcome.issue.url} (${starved.length} starved PRs)`;
    case "create":
      return outcome.issue
        ? `filed the Codex quota alarm: #${outcome.issue.number} ${outcome.issue.url} (${starved.length} starved PRs)`
        : `filed the Codex quota alarm (${starved.length} starved PRs)`;
    default:
      throw new Error(`unknown outcome ${JSON.stringify(outcome)}`);
  }
}

/** The default executor: `gh` on PATH, stdout captured, stderr through. */
export const runGh = (args, input) =>
  execFileSync("gh", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

/** ISO 8601 for `hours` before `now`. */
export function windowStart(now, hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

/** @param {string} stdout @returns {IssueRef} */
function issueFromUrl(stdout) {
  const match = /\S+\/issues\/(\d+)$/m.exec(stdout.trim());
  if (!match)
    throw new Error(
      `gh printed no issue URL, so the issue's number is unknown: ${JSON.stringify(stdout)}`,
    );
  return { number: Number(match[1]), state: "OPEN", title: ISSUE_TITLE, url: match[0] };
}

/**
 * The PRs merged into `dev` since `since`, each with its Codex comments and reviews.
 *
 * `gh pr list` has no "merged after" filter, so the window is applied here over
 * a recent page — a day's merges are a handful and the limit is generous.
 *
 * @param {GhExecutor} gh
 * @param {{ repo: string | undefined, since: string, limit: number }} options
 * @returns {InspectedPullRequest[]}
 */
export function inspectMergedPullRequests(gh, { repo, since, limit }) {
  const repoFlag = repo ? ["--repo", repo] : [];
  /** @type {PullRequest[]} */
  const merged = JSON.parse(
    gh([
      "pr",
      "list",
      "--base",
      "dev",
      "--state",
      "merged",
      "--limit",
      String(limit),
      "--json",
      "number,title,url,mergedAt",
      ...repoFlag,
    ]),
  );

  return merged
    .filter((pr) => typeof pr.mergedAt === "string" && pr.mergedAt >= since)
    .map((pr) => {
      const apiRepo = repo ?? process.env.GITHUB_REPOSITORY;
      const comments = JSON.parse(
        gh(["api", `repos/${apiRepo}/issues/${pr.number}/comments`, "--paginate"]),
      ).map((comment) => ({ login: comment.user?.login ?? "", body: comment.body ?? "" }));
      const reviews = JSON.parse(
        gh(["api", `repos/${apiRepo}/pulls/${pr.number}/reviews`, "--paginate"]),
      ).map((review) => ({ login: review.user?.login ?? "" }));
      return { ...pr, comments, reviews };
    });
}

/**
 * The whole run: inspect, decide, act. Returns the outcome and what it saw;
 * throws on any failure so the run goes red.
 *
 * @param {GhExecutor} [gh]
 * @param {{ repo?: string, windowHours?: number, limit?: number, now?: Date }} [options]
 */
export function run(
  gh = runGh,
  { repo = process.env.GITHUB_REPOSITORY, windowHours = 24, limit = 50, now = new Date() } = {},
) {
  const since = windowStart(now, windowHours);
  const starved = starvedPullRequests(inspectMergedPullRequests(gh, { repo, since, limit }));
  const repoFlag = repo ? ["--repo", repo] : [];

  if (starved.length === 0) {
    return { outcome: decide(starved, []), starved };
  }

  /** @type {IssueRef[]} */
  const issues = JSON.parse(
    gh([
      "issue",
      "list",
      "--search",
      `"${ISSUE_TITLE}" in:title`,
      "--state",
      "all",
      "--limit",
      String(LIST_LIMIT),
      "--json",
      "number,state,title,url,closedAt",
      ...repoFlag,
    ]),
  );

  const outcome = decide(starved, issues);
  const body = issueBody(starved, { windowHours, checkedAt: now.toISOString() });

  switch (outcome.action) {
    case "create": {
      const labels = LABELS.flatMap((label) => ["--label", label]);
      const stdout = gh(
        ["issue", "create", "--title", ISSUE_TITLE, "--body-file", "-", ...labels, ...repoFlag],
        body,
      );
      /** @type {Outcome} */
      const created = { action: "create", issue: issueFromUrl(stdout) };
      return { outcome: created, starved };
    }
    case "update":
      gh(["issue", "edit", String(outcome.issue.number), "--body-file", "-", ...repoFlag], body);
      return { outcome, starved };
    default:
      return { outcome, starved };
  }
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const USAGE = `
usage:
  node scripts/codex-quota-alarm.mjs [--window-hours 24] [--limit 50]

Reads GITHUB_REPOSITORY for the repository (gh infers it from the checkout
otherwise) and GH_TOKEN for the credential. Appends the one-line trace to
GITHUB_STEP_SUMMARY when it is set.

Exit 0 whether or not an issue was filed; a non-zero exit means the alarm
itself broke.
`.trim();

function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  if (process.argv.includes("--help")) {
    console.error(USAGE);
    return;
  }
  const windowHours = Number(flag("window-hours") ?? 24);
  const limit = Number(flag("limit") ?? 50);
  if (!Number.isFinite(windowHours) || windowHours <= 0) {
    throw new Error("--window-hours must be a positive number of hours");
  }

  const { outcome, starved } = run(runGh, { windowHours, limit });
  const line = summaryOf(outcome, starved);
  process.stdout.write(`${line}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
