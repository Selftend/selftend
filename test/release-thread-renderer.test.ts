/**
 * The release-thread renderer (#1950), since 2026-09-26 a LINK post: the
 * r/Selftend post is `Selftend <version>` linking to the GitHub Release, the
 * same thing Discord's `#changelog` shows. There is no body, so there is no
 * authored copy for a test here to pin - the words live on the Release page.
 *
 * Asserted over the 26-release corpus so a shape that holds for one tag holds
 * for all of them.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

import corpus from "./fixtures/github-releases.json";
import { draft } from "../scripts/release-thread/picker.mjs";
import {
  RELEASES_URL,
  SUBMIT_URL,
  render,
  renderIssue,
  renderThread,
  submitUrl,
} from "../scripts/release-thread/renderer.mjs";

const ROOT = path.resolve(__dirname, "..");
const releases = corpus.releases;
const byTag = (tag: string) => {
  const release = releases.find((r) => r.tag_name === tag);
  if (!release) throw new Error(`no release ${tag} in the fixture`);
  return release;
};

describe("the post", () => {
  test("is titled 'Selftend <version>' and links to the tag's GitHub Release", () => {
    expect(renderThread(draft(byTag("v0.16.0")))).toEqual({
      title: "Selftend 0.16.0",
      url: "https://github.com/Selftend/selftend/releases/tag/v0.16.0",
    });
  });

  test("every corpus release is postable - including one whose picks were empty", () => {
    for (const release of releases) {
      const rendered = render(draft(release));
      expect(rendered.postable).toBe(true);
      expect(rendered.url).toBe(`${RELEASES_URL}${release.tag_name}`);
      expect(rendered).not.toHaveProperty("body");
    }
    // v0.4.2 picked nothing, which used to mean no thread at all (#1876 decision 8).
    expect(draft(byTag("v0.4.2")).postable).toBe(false);
    expect(render(draft(byTag("v0.4.2"))).postable).toBe(true);
  });
});

describe("the submit link", () => {
  test("is a LINK post carrying the release URL and the title, and nothing else", () => {
    const thread = renderThread(draft(byTag("v0.16.0")));
    const url = new URL(submitUrl(thread));
    expect(`${url.origin}${url.pathname}`).toBe(SUBMIT_URL);
    expect([...url.searchParams.keys()]).toEqual(["type", "url", "title"]);
    expect(url.searchParams.get("type")).toBe("LINK");
    expect(url.searchParams.get("url")).toBe(thread.url);
    expect(url.searchParams.get("title")).toBe(thread.title);
  });

  test("keeps no raw parenthesis, so GitHub renders the whole markdown link", () => {
    for (const release of releases) {
      expect(submitUrl(renderThread(draft(release)))).not.toMatch(/[()]/);
    }
  });
});

describe("the issue", () => {
  test("carries the unposted line, the link before any fence, the title and URL fenced, and the steps", () => {
    const issue = renderIssue(draft(byTag("v0.16.0")));
    expect(issue.title).toBe("r/Selftend thread for v0.16.0");
    const body = issue.body;
    expect(body.startsWith("This r/Selftend post for v0.16.0 is **not yet posted**.")).toBe(true);
    const link = body.indexOf("**[Open the prefilled link post on r/Selftend](");
    expect(link).toBeGreaterThan(0);
    expect(link).toBeLessThan(body.indexOf("```"));
    expect(body).toContain("```text\nSelftend 0.16.0\n```");
    expect(body).toContain(
      "```text\nhttps://github.com/Selftend/selftend/releases/tag/v0.16.0\n```",
    );
    expect(body).toContain("**App update** flair");
    expect(body).toContain("close this issue as **Completed**");
  });
});

describe("the command line", () => {
  const script = path.join(ROOT, "scripts", "release-thread", "renderer.mjs");
  const run = (args: string[], env: Record<string, string> = {}) =>
    execFileSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      cwd: ROOT,
    });

  test("--tag alone renders a corpus release as JSON", () => {
    const out = JSON.parse(run(["--tag", "v0.16.0"]));
    expect(out).toMatchObject({
      tag: "v0.16.0",
      version: "0.16.0",
      postable: true,
      title: "Selftend 0.16.0",
      url: "https://github.com/Selftend/selftend/releases/tag/v0.16.0",
    });
    expect(out.submitUrl.startsWith(`${SUBMIT_URL}?type=LINK&url=`)).toBe(true);
    expect(out.issue.title).toBe("r/Selftend thread for v0.16.0");
  });

  test("--format thread prints the title and the URL; --format issue the issue body alone", () => {
    expect(run(["--tag", "v0.11.1", "--format", "thread"])).toBe(
      "Selftend 0.11.1\n\nhttps://github.com/Selftend/selftend/releases/tag/v0.11.1\n",
    );
    expect(run(["--tag", "v0.11.1", "--format", "issue"])).toBe(
      renderIssue(draft(byTag("v0.11.1"))).body,
    );
  });

  test("RELEASE_BODY is accepted from the workflow, and the tag still decides the post", () => {
    const out = JSON.parse(
      run(["--tag", "v9.9.9"], { RELEASE_BODY: "### Features\n* **auth:** from the env\n" }),
    );
    expect(out.title).toBe("Selftend 9.9.9");
    expect(out.url).toBe(`${RELEASES_URL}v9.9.9`);
  });

  test("exits 1 on a tag the corpus does not hold, and on an unknown format", () => {
    expect(() => run(["--tag", "v0.0.1"])).toThrow(/v0\.0\.1/);
    expect(() => run(["--tag", "v0.16.0", "--format", "pdf"])).toThrow(/format/);
  });
});
