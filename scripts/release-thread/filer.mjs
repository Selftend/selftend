#!/usr/bin/env node
/**
 * The release-thread filer — the last step of the r/Selftend drafter (#1951).
 *
 * From the renderer's output (`renderer.mjs`, #1950) this module files exactly
 * one GitHub issue per release, or leaves a one-line trace on the run and
 * files nothing. CI drafts, the owner posts (#1884): the issue is how the
 * draft REACHES the owner and how it HOLDS A DONE STATE (#1878 decision 1) —
 * open means not yet posted, closed means done, and the open count is the
 * backlog.
 *
 *   node scripts/release-thread/filer.mjs --rendered rendered.json
 *
 * **This module decides nothing.** The container is #1878's, and every branch
 * below cites the decision it carries out:
 *
 * - **Nothing picked ⇒ no issue, a green run, a trace** (#1878 decision 6,
 *   which re-homes #1876 decision 9 onto the workflow run). The trace is one
 *   line on the step summary: "nothing picked, no post for <tag>". No `gh`
 *   call is made at all on this path.
 * - **Idempotent by label plus tag** (#1878 decision 5): the issue's title is
 *   the renderer's `r/Selftend thread for <tag>`, and the lookup is every
 *   issue under the `reddit-draft` label, open and closed, matched on that
 *   exact title. A listing, not a search: GitHub's search index lags, and a
 *   re-dispatch a minute after the first run would otherwise file a second
 *   copy.
 * - ☠️ **A CLOSED issue means already posted ⇒ do nothing** (#1878 decision
 *   5). Never resurrect it, never hand over a second copy of something that
 *   may be live on Reddit. A closed issue wins even over an open duplicate.
 * - **An open issue ⇒ replace its body in place**; **none ⇒ create one**,
 *   labelled `reddit-draft` + `ready-for-human`, the tag in the title.
 * - **Any failure ⇒ throw**, so the run goes red and no half-filed state
 *   survives. The renderer has already run to completion in an earlier
 *   workflow step, so a render failure never reaches this module.
 *
 * The `gh` executor is an argument so that every call is asserted verbatim in
 * `test/release-thread-filer.test.ts` without a network. The default shells
 * out to the `gh` on PATH under the workflow's own `GITHUB_TOKEN`, the only
 * credential this pipeline has (#1878 decision 5).
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * @typedef {import("./renderer.mjs").Rendered} Rendered
 * @typedef {import("./renderer.mjs").Skipped} Skipped
 *
 * @typedef {object} IssueRef
 * @property {number} number
 * @property {"OPEN" | "CLOSED"} state
 * @property {string} title
 * @property {string} url
 *
 * @typedef {{ action: "skip", reason: "nothing-picked" }} SkipNothingPicked
 * @typedef {{ action: "skip", reason: "already-handled", issue: IssueRef }} SkipAlreadyHandled
 * @typedef {{ action: "create", issue?: IssueRef }} Create
 * @typedef {{ action: "update", issue: IssueRef }} Update
 * @typedef {SkipNothingPicked | SkipAlreadyHandled | Create | Update} Outcome
 *
 * @typedef {(args: string[], input?: string) => string} GhExecutor
 */

/** The label the lookup is keyed on (#1878 decision 5). */
export const KEY_LABEL = "reddit-draft";

/** The labels a new issue carries: the key, plus the one that says a human acts. */
export const LABELS = [KEY_LABEL, "ready-for-human"];

/**
 * How many issues the lookup reads. At roughly 150 drafts a year (#1880) this
 * covers several years; the lookup must see every closed one, or a closed
 * issue could fall off the end and a posted thread be re-drafted.
 */
export const LIST_LIMIT = 1000;

/**
 * The pure decision: what to do given the render and the issues that exist.
 *
 * @param {Rendered | Skipped} rendered
 * @param {IssueRef[]} issues   every issue under the key label, open and closed
 * @returns {Outcome}
 */
export function decide(rendered, issues) {
  if (!rendered.postable) return { action: "skip", reason: "nothing-picked" };
  const matching = issues.filter((issue) => issue.title === rendered.issue.title);
  const closed = matching.find((issue) => issue.state === "CLOSED");
  if (closed) return { action: "skip", reason: "already-handled", issue: closed };
  const open = matching.find((issue) => issue.state === "OPEN");
  if (open) return { action: "update", issue: open };
  return { action: "create" };
}

/**
 * The one-line trace on the run (#1878 decision 6): green + "nothing picked"
 * is a skip, an issue is something to post, and a red run is a broken drafter.
 *
 * @param {Rendered | Skipped} rendered
 * @param {Outcome} outcome
 */
export function summaryOf(rendered, outcome) {
  switch (outcome.action) {
    case "skip":
      return outcome.reason === "nothing-picked"
        ? `nothing picked, no post for ${rendered.tag}`
        : `skipped: the r/Selftend thread for ${rendered.tag} is already handled (#${outcome.issue.number} is closed)`;
    case "update":
      return `updated the r/Selftend thread for ${rendered.tag} in place: #${outcome.issue.number} ${outcome.issue.url}`;
    case "create":
      return outcome.issue
        ? `filed the r/Selftend thread for ${rendered.tag}: #${outcome.issue.number} ${outcome.issue.url}`
        : `filed the r/Selftend thread for ${rendered.tag}`;
    default:
      throw new Error(`unknown outcome ${JSON.stringify(outcome)}`);
  }
}

/** The default executor: `gh` on PATH, stdout captured, stderr through. */
export const runGh = (args, input) =>
  execFileSync("gh", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

/**
 * `https://github.com/<owner>/<repo>/issues/<n>`, as `gh issue create` and
 * `gh issue edit` print it, to an issue reference.
 * @param {string} stdout
 * @param {string} title
 * @returns {IssueRef}
 */
function issueFromUrl(stdout, title) {
  const match = /\S+\/issues\/(\d+)$/m.exec(stdout.trim());
  if (!match)
    throw new Error(
      `gh printed no issue URL, so the issue's number is unknown: ${JSON.stringify(stdout)}`,
    );
  return { number: Number(match[1]), state: "OPEN", title, url: match[0] };
}

/**
 * The whole step: look up, decide, act. Returns the outcome; throws on any
 * failure so the run goes red.
 *
 * @param {Rendered | Skipped} rendered
 * @param {GhExecutor} [gh]
 * @param {{ repo?: string }} [options]   the repository, `owner/name`; defaults
 *   to `GITHUB_REPOSITORY`, and to gh's own inference from the checkout when
 *   neither is set
 * @returns {Outcome}
 */
export function file(rendered, gh = runGh, { repo = process.env.GITHUB_REPOSITORY } = {}) {
  if (!rendered.postable) return decide(rendered, []);
  const repoFlag = repo ? ["--repo", repo] : [];

  /** @type {IssueRef[]} */
  const issues = JSON.parse(
    gh([
      "issue",
      "list",
      "--label",
      KEY_LABEL,
      "--state",
      "all",
      "--limit",
      String(LIST_LIMIT),
      "--json",
      "number,state,title,url",
      ...repoFlag,
    ]),
  );

  const outcome = decide(rendered, issues);
  const { title, body } = rendered.issue;
  switch (outcome.action) {
    case "create": {
      const labels = LABELS.flatMap((label) => ["--label", label]);
      const stdout = gh(
        ["issue", "create", "--title", title, "--body-file", "-", ...labels, ...repoFlag],
        body,
      );
      return { action: "create", issue: issueFromUrl(stdout, title) };
    }
    case "update":
      gh(["issue", "edit", String(outcome.issue.number), "--body-file", "-", ...repoFlag], body);
      return outcome;
    default:
      return outcome;
  }
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const USAGE = `
usage:
  node scripts/release-thread/filer.mjs --rendered <path>

  --rendered   the renderer's JSON output (\`renderer.mjs --format json\`)

Reads GITHUB_REPOSITORY for the repository (gh infers it from the checkout
otherwise) and GH_TOKEN for the credential. Appends the one-line trace to
GITHUB_STEP_SUMMARY and \`action=<skip|create|update>\` plus \`issue_url=\` to
GITHUB_OUTPUT when either is set.

Exit 0 on a skip, a create or an update; a non-zero exit means the filer or
gh broke, and no issue was left half-written.
`.trim();

/** @param {string} name */
function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

/**
 * @param {unknown} value
 * @returns {Rendered | Skipped}
 */
function requireRendered(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.tag !== "string" ||
    typeof value.postable !== "boolean" ||
    (value.postable &&
      (typeof value.issue?.title !== "string" || typeof value.issue?.body !== "string"))
  ) {
    throw new Error(
      "the rendered file is not the renderer's shape: expected tag, postable and, when postable, issue.title and issue.body",
    );
  }
  return value;
}

function main() {
  const renderedPath = flag("rendered");
  if (!renderedPath) {
    console.error(USAGE);
    process.exit(1);
  }
  const rendered = requireRendered(JSON.parse(readFileSync(renderedPath, "utf8")));
  const outcome = file(rendered);
  const line = summaryOf(rendered, outcome);
  process.stdout.write(`${line}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    const url = "issue" in outcome && outcome.issue ? outcome.issue.url : "";
    appendFileSync(process.env.GITHUB_OUTPUT, `action=${outcome.action}\nissue_url=${url}\n`);
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
