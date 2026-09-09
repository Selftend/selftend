/**
 * The Codex quota alarm (#2221).
 *
 * The failure this guards is a reviewer that stops reviewing and says so in a
 * comment instead of a red check: from 2026-08-14, every PR carried "You have
 * reached your Codex usage limits for code reviews" and zero reviews, and four
 * releases shipped believing they had a second opinion. Every assertion below
 * is one half of that signal, or one of the rules that keeps the alarm from
 * becoming either mute or noise.
 *
 * `decide` and `isStarved` are pure so every branch is asserted without a
 * network; `run` takes the `gh` executor as an argument so the calls it would
 * make are asserted verbatim — the same shape as
 * `test/release-thread-filer.test.ts`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CODEX_LOGIN,
  ISSUE_TITLE,
  LABELS,
  QUOTA_NOTICE,
  decide,
  isCodexAccount,
  isStarved,
  issueBody,
  run,
  starvedPullRequests,
  summaryOf,
  windowStart,
  type GhExecutor,
  type InspectedPullRequest,
  type IssueRef,
} from "../scripts/codex-quota-alarm.mjs";

/** The exact sentence the reviewer posts instead of reviewing. */
const NOTICE =
  "You have reached your Codex usage limits for code reviews. You can see your limits in the ChatGPT app.";

function pr(overrides: Partial<InspectedPullRequest> = {}): InspectedPullRequest {
  const number = overrides.number ?? 2250;
  return {
    number,
    title: `PR ${number}`,
    url: `https://github.com/Selftend/selftend/pull/${number}`,
    mergedAt: "2026-09-09T06:00:00Z",
    comments: [],
    reviews: [],
    ...overrides,
  };
}

function issue(overrides: Partial<IssueRef> & Pick<IssueRef, "state">): IssueRef {
  const number = overrides.number ?? 1;
  return {
    number,
    title: ISSUE_TITLE,
    url: `https://github.com/Selftend/selftend/issues/${number}`,
    closedAt: null,
    ...overrides,
  };
}

/** A `gh` that records every call and answers from a script of stdout values. */
function fakeGh(replies: Record<string, string> = {}) {
  const calls: { args: string[]; input?: string }[] = [];
  const gh: GhExecutor = (args, input) => {
    calls.push({ args, input });
    const command = args.slice(0, 2).join(" ");
    if (args[0] === "api") {
      const endpoint = args[1];
      if (endpoint in replies) return replies[endpoint];
      return "[]";
    }
    if (command in replies) return replies[command];
    if (command === "pr list") return "[]";
    if (command === "issue list") return "[]";
    // `gh issue edit` prints the issue URL and nothing this module reads.
    if (command === "issue edit") return "";
    throw new Error(`unexpected gh call: ${args.join(" ")}`);
  };
  return { gh, calls };
}

describe("the signal (#2221): a quota notice AND no review", () => {
  it("matches the reviewer under either login spelling", () => {
    expect(isCodexAccount(CODEX_LOGIN)).toBe(true);
    expect(isCodexAccount(`${CODEX_LOGIN}[bot]`)).toBe(true);
    expect(isCodexAccount("vasilyoshev")).toBe(false);
    expect(isCodexAccount("codex")).toBe(false);
  });

  it("matches the quota sentence as posted", () => {
    expect(QUOTA_NOTICE.test(NOTICE)).toBe(true);
  });

  it("is starved when the only Codex activity is the quota notice", () => {
    expect(isStarved(pr({ comments: [{ login: `${CODEX_LOGIN}[bot]`, body: NOTICE }] }))).toBe(
      true,
    );
  });

  it("is NOT starved when Codex also recorded a review", () => {
    // PR #910 (2026-08-12) is the last genuine review; a re-run that both
    // notices and reviews is a working reviewer, not an outage.
    expect(
      isStarved(
        pr({
          comments: [{ login: `${CODEX_LOGIN}[bot]`, body: NOTICE }],
          reviews: [{ login: `${CODEX_LOGIN}[bot]` }],
        }),
      ),
    ).toBe(false);
  });

  it("is NOT starved on silence: no notice and no review is not this failure", () => {
    // Zero reviews alone would fire on every PR the reviewer was never asked
    // to look at, which is how an alarm earns being ignored.
    expect(isStarved(pr({ reviews: [] }))).toBe(false);
    expect(isStarved(pr({ comments: [{ login: "vasilyoshev", body: "looks good" }] }))).toBe(false);
  });

  it("ignores a human review and a human quoting the notice", () => {
    // A person's review is not the second opinion Codex was supposed to give,
    // and a person pasting the sentence is not the reviewer posting it.
    expect(
      isStarved(
        pr({
          comments: [{ login: `${CODEX_LOGIN}[bot]`, body: NOTICE }],
          reviews: [{ login: "vasilyoshev" }],
        }),
      ),
    ).toBe(true);
    expect(isStarved(pr({ comments: [{ login: "vasilyoshev", body: NOTICE }] }))).toBe(false);
  });

  it("picks the starved PRs out of a mixed window", () => {
    const starved = starvedPullRequests([
      pr({ number: 2250, comments: [{ login: `${CODEX_LOGIN}[bot]`, body: NOTICE }] }),
      pr({ number: 2251, reviews: [{ login: `${CODEX_LOGIN}[bot]` }] }),
      pr({ number: 2252, comments: [{ login: `${CODEX_LOGIN}[bot]`, body: NOTICE }] }),
    ]);
    expect(starved.map((entry) => entry.number)).toEqual([2250, 2252]);
  });
});

describe("what the alarm does about it", () => {
  const starved = [pr({ number: 2250, comments: [{ login: CODEX_LOGIN, body: NOTICE }] })];

  it("does nothing when the reviewer is working", () => {
    expect(decide([], [])).toEqual({ action: "none", reason: "no-starved-prs" });
  });

  it("files one issue when nothing is open", () => {
    expect(decide(starved, [])).toEqual({ action: "create" });
  });

  it("updates the open issue in place rather than filing a second one", () => {
    const open = issue({ state: "OPEN", number: 7 });
    expect(decide(starved, [open])).toEqual({ action: "update", issue: open });
  });

  it("stays quiet while a close is newer than every starved PR", () => {
    // Acknowledged: the owner closed it knowing about these merges.
    const closed = issue({ state: "CLOSED", number: 7, closedAt: "2026-09-09T09:00:00Z" });
    expect(decide(starved, [closed])).toEqual({
      action: "none",
      reason: "acknowledged",
      issue: closed,
    });
  });

  it("☠️ speaks again when PRs were starved AFTER the last close", () => {
    // The muted-guard outcome this whole issue is about: an alarm a single
    // close silences forever is not an alarm.
    const closed = issue({ state: "CLOSED", number: 7, closedAt: "2026-09-09T05:00:00Z" });
    expect(decide(starved, [closed])).toEqual({ action: "create" });
  });

  it("prefers the open issue even when a closed one exists", () => {
    const open = issue({ state: "OPEN", number: 9 });
    const closed = issue({ state: "CLOSED", number: 7, closedAt: "2026-09-09T09:00:00Z" });
    expect(decide(starved, [closed, open])).toEqual({ action: "update", issue: open });
  });

  it("ignores an issue with a different title", () => {
    const other = issue({ state: "OPEN", number: 8, title: "Something else entirely" });
    expect(decide(starved, [other])).toEqual({ action: "create" });
  });
});

describe("the issue it files", () => {
  const starved = [
    pr({ number: 2250, comments: [{ login: CODEX_LOGIN, body: NOTICE }] }),
    pr({ number: 2251, comments: [{ login: CODEX_LOGIN, body: NOTICE }] }),
  ];

  it("is filed for a person to judge, under the canonical triage label", () => {
    // Never `ready-for-agent`: restoring the quota is a billing action.
    expect(LABELS).toEqual(["needs-triage"]);
    expect(ISSUE_TITLE).toBe("Codex reviewer is out of quota");
  });

  it("lists every starved PR and says what the notice means", () => {
    const body = issueBody(starved, { windowHours: 24, checkedAt: "2026-09-09T07:17:00Z" });
    expect(body).toContain("https://github.com/Selftend/selftend/pull/2250");
    expect(body).toContain("https://github.com/Selftend/selftend/pull/2251");
    expect(body).toContain("2 pull requests");
    expect(body).toContain("0 reviews");
    // The ruling it must not contradict (#2178): not a blocking check.
    expect(body).toContain("not** a blocking check");
    expect(body).toContain("closes nothing");
  });
});

describe("the calls it makes", () => {
  const NOW = new Date("2026-09-09T07:17:00Z");
  const merged = JSON.stringify([
    {
      number: 2250,
      title: "test(guards)",
      url: "https://github.com/Selftend/selftend/pull/2250",
      mergedAt: "2026-09-09T06:00:00Z",
    },
    {
      number: 1030,
      title: "old one, outside the window",
      url: "https://github.com/Selftend/selftend/pull/1030",
      mergedAt: "2026-08-14T06:00:00Z",
    },
  ]);
  const comments = JSON.stringify([{ user: { login: `${CODEX_LOGIN}[bot]` }, body: NOTICE }]);

  it("reads merges into dev, then each PR's comments and reviews, then files", () => {
    const { gh, calls } = fakeGh({
      "pr list": merged,
      "repos/Selftend/selftend/issues/2250/comments": comments,
      "issue create": "https://github.com/Selftend/selftend/issues/2300",
    });

    const { outcome, starved } = run(gh, {
      repo: "Selftend/selftend",
      windowHours: 24,
      now: NOW,
    });

    const list = calls[0].args;
    expect(list.slice(0, 2)).toEqual(["pr", "list"]);
    expect(list).toContain("--base");
    expect(list[list.indexOf("--base") + 1]).toBe("dev");
    expect(list[list.indexOf("--state") + 1]).toBe("merged");

    // The stale PR is outside the 24h window and is never inspected.
    const inspected = calls.filter((call) => call.args[0] === "api").map((call) => call.args[1]);
    expect(inspected).toEqual([
      "repos/Selftend/selftend/issues/2250/comments",
      "repos/Selftend/selftend/pulls/2250/reviews",
    ]);

    expect(starved.map((entry) => entry.number)).toEqual([2250]);
    expect(outcome).toEqual({
      action: "create",
      issue: {
        number: 2300,
        state: "OPEN",
        title: ISSUE_TITLE,
        url: "https://github.com/Selftend/selftend/issues/2300",
      },
    });

    const create = calls.find((call) => call.args.slice(0, 2).join(" ") === "issue create");
    expect(create?.args).toContain("--label");
    expect(create?.args[create.args.indexOf("--label") + 1]).toBe("needs-triage");
    expect(create?.args[create.args.indexOf("--title") + 1]).toBe(ISSUE_TITLE);
    expect(create?.input).toContain("https://github.com/Selftend/selftend/pull/2250");
  });

  it("edits the open issue instead of creating a second one", () => {
    const { gh, calls } = fakeGh({
      "pr list": merged,
      "repos/Selftend/selftend/issues/2250/comments": comments,
      "issue list": JSON.stringify([
        {
          number: 7,
          state: "OPEN",
          title: ISSUE_TITLE,
          url: "https://github.com/Selftend/selftend/issues/7",
          closedAt: null,
        },
      ]),
    });

    const { outcome } = run(gh, { repo: "Selftend/selftend", windowHours: 24, now: NOW });

    expect(outcome.action).toBe("update");
    expect(calls.some((call) => call.args.slice(0, 2).join(" ") === "issue create")).toBe(false);
    const edit = calls.find((call) => call.args.slice(0, 2).join(" ") === "issue edit");
    expect(edit?.args[2]).toBe("7");
    expect(edit?.input).toContain("Codex usage limits");
  });

  it("touches no issue endpoint at all when nothing is starved", () => {
    // A quiet day must not even LOOK at the issue list, let alone write.
    const { gh, calls } = fakeGh({ "pr list": merged });
    const { outcome } = run(gh, { repo: "Selftend/selftend", windowHours: 24, now: NOW });

    expect(outcome).toEqual({ action: "none", reason: "no-starved-prs" });
    expect(calls.some((call) => call.args[0] === "issue")).toBe(false);
    expect(summaryOf(outcome, [])).toContain("nothing to report");
  });

  it("computes the window backwards from now", () => {
    expect(windowStart(NOW, 24)).toBe("2026-09-08T07:17:00.000Z");
  });
});

describe("the workflow that runs it", () => {
  const WORKFLOW = readFileSync(
    join(__dirname, "../.github/workflows/codex-quota-alarm.yml"),
    "utf8",
  );

  it("runs on a daily schedule and by hand", () => {
    expect(WORKFLOW).toMatch(/^\s+- cron: "[^"]+"/m);
    expect(WORKFLOW).toContain("workflow_dispatch:");
  });

  it("asks for issues: write and contents: read, nothing more", () => {
    // The lines of the top-level `permissions:` block only - same helper shape
    // as test/release-thread-workflow.test.ts, which stops at the first line
    // that is neither blank nor indented.
    const lines = WORKFLOW.split(/\r?\n/);
    const start = lines.indexOf("permissions:");
    expect(start).toBeGreaterThan(-1);
    let end = start + 1;
    while (end < lines.length && (lines[end].trim() === "" || /^\s/.test(lines[end]))) end++;
    const permissions = lines
      .slice(start + 1, end)
      .map((line) => line.trim())
      .filter((line) => line !== "");
    expect(permissions.sort()).toEqual(["contents: read", "issues: write"]);
  });

  it("uses the workflow's own token and no secret (no new credential)", () => {
    expect(WORKFLOW).not.toMatch(/secrets\./);
    expect(WORKFLOW).toContain("GH_TOKEN: ${{ github.token }}");
  });

  it("makes every issue call through the tested script", () => {
    // `gh issue` in the YAML would be an issue call no unit test can see.
    expect(WORKFLOW).not.toMatch(/gh issue/);
    expect(WORKFLOW).toContain("node scripts/codex-quota-alarm.mjs");
  });

  it("is not a merge gate: nothing here blocks or closes", () => {
    // The owner's ruling on #2178 - the alarm only.
    expect(WORKFLOW).not.toMatch(/pull_request/);
    expect(WORKFLOW).not.toMatch(/gh pr merge/);
    expect(WORKFLOW).not.toMatch(/--state closed|issue close/);
  });
});
