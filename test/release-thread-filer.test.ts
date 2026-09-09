/**
 * The release-thread filer (#1951) — the last step of the r/Selftend drafter
 * mapped on #1873: the rendered draft to exactly one GitHub issue, or to a
 * one-line trace and nothing else.
 *
 * The decisions under test are #1878's: one issue per release, keyed by label
 * plus tag (decision 5); a CLOSED issue means already posted and is never
 * resurrected (decision 5); "nothing picked" is a green skip with a trace on
 * the run, never an issue (decision 6, re-homing #1876 decision 9); a failure
 * creates no issue (decision 6). `decide` is pure so every branch is asserted
 * without a network; `file` takes the `gh` executor as an argument so the calls
 * it would make are asserted verbatim.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import corpus from "./fixtures/github-releases.json";
import {
  KEY_LABEL,
  LABELS,
  decide,
  file,
  summaryOf,
  type GhExecutor,
  type IssueRef,
} from "../scripts/release-thread/filer.mjs";
import { draft } from "../scripts/release-thread/picker.mjs";
import { render, type Rendered, type Skipped } from "../scripts/release-thread/renderer.mjs";

const REPO_ROOT = path.resolve(__dirname, "..");
const FILER = path.join(REPO_ROOT, "scripts", "release-thread", "filer.mjs");

function rendered(tag: string): Rendered | Skipped {
  const release = corpus.releases.find((r) => r.tag_name === tag);
  if (!release) throw new Error(`${tag} is not in the corpus`);
  return render(draft(release));
}

function postable(tag: string): Rendered {
  const result = rendered(tag);
  if (!result.postable) throw new Error(`${tag} is not postable`);
  return result;
}

function issue(overrides: Partial<IssueRef> & Pick<IssueRef, "title" | "state">): IssueRef {
  return {
    number: 1,
    url: `https://github.com/Selftend/selftend/issues/${overrides.number ?? 1}`,
    ...overrides,
  };
}

/** A `gh` that records every call and answers from a script of stdout values. */
function fakeGh(replies: Record<string, string> = {}) {
  const calls: { args: string[]; input?: string }[] = [];
  const gh: GhExecutor = (args, input) => {
    calls.push({ args, input });
    const command = args.slice(0, 2).join(" ");
    if (command in replies) return replies[command];
    if (command === "issue list") return "[]";
    throw new Error(`unexpected gh call: ${args.join(" ")}`);
  };
  return { gh, calls };
}

describe("the labels (#1878 decision 5)", () => {
  it("keys idempotency on `reddit-draft` and files with `ready-for-human` too", () => {
    expect(KEY_LABEL).toBe("reddit-draft");
    expect(LABELS).toEqual(["reddit-draft", "ready-for-human"]);
  });
});

describe("decide", () => {
  const v17 = postable("v0.17.0");

  it("skips a release with nothing picked, before looking at any issue", () => {
    const skipped = rendered("v0.4.2");
    expect(skipped.postable).toBe(false);
    expect(decide(skipped, [issue({ title: v17.issue.title, state: "OPEN" })])).toEqual({
      action: "skip",
      reason: "nothing-picked",
    });
  });

  it("creates when no issue carries the tag", () => {
    expect(decide(v17, [])).toEqual({ action: "create" });
  });

  it("updates an open issue in place", () => {
    const open = issue({ number: 42, title: v17.issue.title, state: "OPEN" });
    expect(decide(v17, [open])).toEqual({ action: "update", issue: open });
  });

  it("does nothing when the issue is closed: already posted, never resurrected", () => {
    const closed = issue({ number: 42, title: v17.issue.title, state: "CLOSED" });
    expect(decide(v17, [closed])).toEqual({
      action: "skip",
      reason: "already-handled",
      issue: closed,
    });
  });

  it("lets a closed issue win over an open duplicate: never hand over a second copy", () => {
    const closed = issue({ number: 42, title: v17.issue.title, state: "CLOSED" });
    const open = issue({ number: 43, title: v17.issue.title, state: "OPEN" });
    expect(decide(v17, [open, closed])).toEqual({
      action: "skip",
      reason: "already-handled",
      issue: closed,
    });
  });

  it("matches the title exactly, so another tag's issue is not this one", () => {
    const other = postable("v0.16.0");
    const nearMiss = [
      issue({ number: 1, title: other.issue.title, state: "CLOSED" }),
      issue({ number: 2, title: `${v17.issue.title} (old)`, state: "CLOSED" }),
      issue({ number: 3, title: v17.issue.title.toLowerCase(), state: "OPEN" }),
    ];
    expect(decide(v17, nearMiss)).toEqual({ action: "create" });
  });

  it("over the corpus with no issues yet: 22 creates, 4 skips, never anything else", () => {
    const outcomes = corpus.releases.map((release) => ({
      tag: release.tag_name,
      outcome: decide(render(draft(release)), []),
    }));
    const skipped = outcomes.filter((o) => o.outcome.action === "skip").map((o) => o.tag);
    expect(skipped).toEqual(["v0.2.1", "v0.3.2", "v0.4.1", "v0.4.2"]);
    expect(outcomes.filter((o) => o.outcome.action === "create")).toHaveLength(22);
  });
});

describe("summaryOf: the one-line trace on the run (#1878 decision 6)", () => {
  it("says nothing was picked, in the words the ticket fixed", () => {
    expect(summaryOf(rendered("v0.4.2"), { action: "skip", reason: "nothing-picked" })).toBe(
      "nothing picked, no post for v0.4.2",
    );
  });

  it("says a closed issue was skipped as already handled", () => {
    const v17 = postable("v0.17.0");
    const closed = issue({ number: 42, title: v17.issue.title, state: "CLOSED" });
    const line = summaryOf(v17, { action: "skip", reason: "already-handled", issue: closed });
    expect(line).toContain("already handled");
    expect(line).toContain("v0.17.0");
    expect(line).toContain("#42");
  });

  it("names the issue it filed or updated", () => {
    const v17 = postable("v0.17.0");
    const filed = issue({ number: 42, title: v17.issue.title, state: "OPEN" });
    expect(summaryOf(v17, { action: "create", issue: filed })).toContain(filed.url);
    expect(summaryOf(v17, { action: "update", issue: filed })).toMatch(/updated .*#42/);
  });
});

describe("file: what it asks gh to do", () => {
  const v17 = postable("v0.17.0");
  const listCall = ["issue", "list", "--label", KEY_LABEL, "--state", "all"];

  it("makes no gh call at all when nothing was picked", () => {
    const { gh, calls } = fakeGh();
    const outcome = file(rendered("v0.4.2"), gh);
    expect(outcome).toEqual({ action: "skip", reason: "nothing-picked" });
    expect(calls).toEqual([]);
  });

  it("lists every issue under the key label, open and closed, before deciding", () => {
    const { gh, calls } = fakeGh({
      "issue create": "https://github.com/Selftend/selftend/issues/99\n",
    });
    file(v17, gh);
    expect(calls[0].args.slice(0, listCall.length)).toEqual(listCall);
    expect(calls[0].args).toContain("--json");
    expect(calls[0].args.join(" ")).toMatch(/--limit \d{3,}/);
  });

  it("creates with the renderer's title, both labels and the body on stdin", () => {
    const { gh, calls } = fakeGh({
      "issue create": "https://github.com/Selftend/selftend/issues/99\n",
    });
    const outcome = file(v17, gh);
    expect(outcome).toEqual({
      action: "create",
      issue: {
        number: 99,
        state: "OPEN",
        title: v17.issue.title,
        url: "https://github.com/Selftend/selftend/issues/99",
      },
    });
    expect(calls).toHaveLength(2);
    const create = calls[1];
    expect(create.args.slice(0, 2)).toEqual(["issue", "create"]);
    expect(create.args).toContain("--title");
    expect(create.args[create.args.indexOf("--title") + 1]).toBe(v17.issue.title);
    for (const label of LABELS) {
      const at = create.args.indexOf(label);
      expect(at).toBeGreaterThan(0);
      expect(create.args[at - 1]).toBe("--label");
    }
    expect(create.args).toContain("--body-file");
    expect(create.args[create.args.indexOf("--body-file") + 1]).toBe("-");
    expect(create.input).toBe(v17.issue.body);
  });

  it("edits the open issue's body in place and creates nothing", () => {
    const open = issue({ number: 42, title: v17.issue.title, state: "OPEN" });
    const { gh, calls } = fakeGh({
      "issue list": JSON.stringify([open]),
      "issue edit": `${open.url}\n`,
    });
    const outcome = file(v17, gh);
    expect(outcome).toEqual({ action: "update", issue: open });
    expect(calls).toHaveLength(2);
    const edit = calls[1];
    expect(edit.args.slice(0, 3)).toEqual(["issue", "edit", "42"]);
    expect(edit.args[edit.args.indexOf("--body-file") + 1]).toBe("-");
    expect(edit.input).toBe(v17.issue.body);
    expect(edit.args).not.toContain("--title");
  });

  it("stops at the list when the issue is closed", () => {
    const closed = issue({ number: 42, title: v17.issue.title, state: "CLOSED" });
    const { gh, calls } = fakeGh({ "issue list": JSON.stringify([closed]) });
    const outcome = file(v17, gh);
    expect(outcome).toEqual({ action: "skip", reason: "already-handled", issue: closed });
    expect(calls).toHaveLength(1);
  });

  it("addresses every call at the repository it is given", () => {
    const { gh, calls } = fakeGh({
      "issue create": "https://github.com/Selftend/selftend/issues/99\n",
    });
    file(v17, gh, { repo: "Selftend/selftend" });
    for (const call of calls) {
      expect(call.args[call.args.indexOf("--repo") + 1]).toBe("Selftend/selftend");
    }
  });

  it("refuses a create whose reply carries no issue number, rather than guessing", () => {
    const { gh } = fakeGh({ "issue create": "" });
    expect(() => file(v17, gh)).toThrow(/issue/);
  });
});

describe("the command line", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-thread-filer-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function runFiler(args: string[], env: Record<string, string> = {}) {
    try {
      const stdout = execFileSync(process.execPath, [FILER, ...args], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, stdout, stderr: "" };
    } catch (error) {
      const failed = error as { status: number; stdout: string; stderr: string };
      return { status: failed.status, stdout: failed.stdout, stderr: failed.stderr };
    }
  }

  it("on nothing picked: exit 0, the trace on stdout and in the step summary, no gh", () => {
    const renderedPath = path.join(dir, "rendered.json");
    fs.writeFileSync(renderedPath, JSON.stringify(rendered("v0.4.2")));
    const summary = path.join(dir, "summary.md");
    const output = path.join(dir, "output.txt");
    // PATH is emptied so that a real `gh`, if the filer reached for one, would
    // fail the run rather than file an issue from a unit test.
    const result = runFiler(["--rendered", renderedPath], {
      PATH: "",
      GITHUB_STEP_SUMMARY: summary,
      GITHUB_OUTPUT: output,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("nothing picked, no post for v0.4.2");
    expect(fs.readFileSync(summary, "utf8")).toContain("nothing picked, no post for v0.4.2");
    expect(fs.readFileSync(output, "utf8")).toContain("action=skip");
  });

  it("without --rendered: usage and exit 1", () => {
    const result = runFiler([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--rendered");
  });

  it("on a rendered file that is not the renderer's shape: exit 1 and no gh", () => {
    const renderedPath = path.join(dir, "rendered.json");
    fs.writeFileSync(renderedPath, JSON.stringify({ tag: "v0.17.0" }));
    const result = runFiler(["--rendered", renderedPath], { PATH: "" });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/postable/);
  });
});
