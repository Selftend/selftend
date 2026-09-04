/**
 * The release-thread renderer (#1950) — the third step of the r/Selftend
 * drafter decided on #1880 and mapped on #1873.
 *
 * From the picker's tiers the renderer produces the thread (title and body),
 * the prefilled submit link, and the body of the GitHub issue that hands both
 * to the owner. The two strings that say what Selftend is — the frame sentence
 * and the rotated supporting lines — are CONSTANTS in the drafter (#1880 §2:
 * no i18n key holds the full frame sentence), and the tests below pin each of
 * them to `docs/positioning.md`, dash-normalised, so a rewording of the doc
 * goes red here until the drafter follows. That pin is the gate the doc's
 * § *What binds this document* names for this surface.
 *
 * ☠️ THE COPY GATE DOES NOT REACH `scripts/`. `test/positioning-copy.test.ts`
 * scans i18n, the two static web files and the prose docs; a banned phrase in
 * the renderer's fixed strings would sail through it and land on Reddit. So
 * this file carries its own scan over the rendered output, with the English
 * rules the gate holds and the house-style tripwire the cleaner already uses.
 *
 * Everything else asserts over the 26-release corpus, for the reason the
 * picker's test gives: #1880 found its defects by rendering real releases.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import corpus from "./fixtures/github-releases.json";
import { AMERICAN_SPELLINGS } from "../scripts/release-thread/cleaner.mjs";
import { CAP, draft, type Draft, type Reason } from "../scripts/release-thread/picker.mjs";
import {
  FRAME_SENTENCE,
  SUPPORTING_LINES,
  ROTATION,
  LINKS,
  SUBMIT_URL,
  SUBMIT_URL_LIMIT,
  REASONS,
  hyphenate,
  rotationIndex,
  supportingLine,
  renderTitle,
  renderBody,
  renderThread,
  submitUrl,
  renderIssue,
  render,
} from "../scripts/release-thread/renderer.mjs";

const ROOT = path.resolve(__dirname, "..");
const releases = corpus.releases;
const byTag = (tag: string) => {
  const release = releases.find((r) => r.tag_name === tag);
  if (!release) throw new Error(`no release ${tag} in the fixture`);
  return release;
};
const postable = releases.map((r) => draft(r)).filter((d) => d.postable);

/**
 * `docs/positioning.md`, in the shape the drafter carries it: bold markers
 * dropped, em and en dashes hyphenated, whitespace collapsed. The frame
 * sentence is printed in the doc with `**` around its two halves.
 */
const positioningDoc = hyphenate(
  fs.readFileSync(path.join(ROOT, "docs/positioning.md"), "utf8").replace(/\*\*/g, ""),
).replace(/\s+/g, " ");

describe("the frame sentence and the supporting lines are pinned to docs/positioning.md", () => {
  test("the frame sentence appears in the doc, dash-normalised", () => {
    expect(positioningDoc).toContain(FRAME_SENTENCE);
  });

  test("every supporting line appears in the doc, dash-normalised", () => {
    expect(SUPPORTING_LINES.length).toBeGreaterThanOrEqual(4);
    for (const line of SUPPORTING_LINES) expect(positioningDoc).toContain(line.text);
  });

  test("the constants are the sub's hyphens-only shape: no em dash, en dash or arrow", () => {
    for (const text of [FRAME_SENTENCE, ...SUPPORTING_LINES.map((l) => l.text)]) {
      expect(text).not.toMatch(/[—–→←⇒]/);
    }
  });

  test("the frame sentence declares the category in the sanctioned shape (#1877 rule 5)", () => {
    expect(FRAME_SENTENCE).toMatch(/^Selftend is a free, private CBT self-help app - /);
    expect(FRAME_SENTENCE).toContain("cognitive behavioural therapy");
  });

  test("the tools line is pinned too, and is the one line kept out of the rotation", () => {
    const tools = SUPPORTING_LINES.find((line) => line.role === "tools");
    expect(tools).toBeDefined();
    expect(ROTATION).not.toContain(tools!.text);
    expect(ROTATION).toEqual(
      SUPPORTING_LINES.filter((line) => line.role !== "tools").map((line) => line.text),
    );
  });
});

describe("the rotation", () => {
  test("index is (major + minor + patch) mod the line count", () => {
    expect(rotationIndex("0.16.0")).toBe(16 % ROTATION.length);
    expect(rotationIndex("0.11.1")).toBe(12 % ROTATION.length);
    expect(rotationIndex("1.2.3")).toBe(6 % ROTATION.length);
    expect(supportingLine("0.16.0")).toBe(ROTATION[16 % ROTATION.length]);
  });

  test("over the 26 corpus tags it spreads evenly and never selects the tools line", () => {
    const tools = SUPPORTING_LINES.find((line) => line.role === "tools")!.text;
    const counts = new Map<number, number>();
    for (const release of releases) {
      const version = release.tag_name.slice(1);
      const index = rotationIndex(version);
      counts.set(index, (counts.get(index) ?? 0) + 1);
      expect(supportingLine(version)).not.toBe(tools);
    }
    // 26 tags over n lines: every line within one of every other - for four
    // lines that is #1880's 6/7/6/7.
    const spread = [...counts.values()].sort((a, b) => a - b);
    expect(spread).toHaveLength(ROTATION.length);
    expect(spread.at(-1)! - spread[0]).toBeLessThanOrEqual(1);
    expect(spread.reduce((a, b) => a + b, 0)).toBe(26);
  });
});

describe("the thread", () => {
  test("v0.16.0 renders #1880 §4's eight-highlight example line for line", () => {
    const result = draft(byTag("v0.16.0"));
    expect(renderTitle(result)).toBe(
      "Selftend 0.16.0 - ACT overview gets real headings and three lifetime stats",
    );
    expect(renderBody(result)).toBe(
      [
        FRAME_SENTENCE,
        "",
        supportingLine("0.16.0"),
        "",
        "In 0.16.0:",
        "",
        "- ACT overview gets real headings and three lifetime stats",
        "- Every visible modal reports into one overlay-count registry",
        "- Round B gets an audition, a zero-lead gate, and a record in the repo",
        "- A guest signing in over data gets one calm warning",
        "- A thought record rates the same belief twice",
        "- Dormant guests are purged after 12 months of inactivity",
        "- Errors raised inside a native modal go inline",
        "- Shared components record where they were reached from",
        "",
        "Web: https://selftend.org",
        "Google Play: https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend",
        "App Store: https://apps.apple.com/app/selftend/id6796318929",
        "Full changelog: https://github.com/Selftend/selftend/releases/tag/v0.16.0",
      ].join("\n"),
    );
  });

  test("v0.11.1 renders the two-highlight case", () => {
    const result = draft(byTag("v0.11.1"));
    const { title, body } = renderThread(result);
    expect(title).toBe("Selftend 0.11.1 - Match arbitrary destructive opacity in the wash gate");
    expect(body).toContain(
      [
        "In 0.11.1:",
        "",
        "- Match arbitrary destructive opacity in the wash gate",
        "- Stop pairing destructive text with a wash of its own red",
        "",
        "Web: ",
      ].join("\n"),
    );
    expect(body.match(/^- /gm)).toHaveLength(2);
  });

  test("the footer is the four fixed links with no version label (#1877 rule 6)", () => {
    expect(Object.keys(LINKS)).toEqual(["web", "play", "appStore"]);
    const { body } = renderThread(draft(byTag("v0.10.0")));
    const footer = body.split("\n").slice(-4);
    expect(footer.map((line) => line.split(":")[0])).toEqual([
      "Web",
      "Google Play",
      "App Store",
      "Full changelog",
    ]);
    // The version is in the title only (#1877 rule 2): the body names it once,
    // in the `In <version>:` line, and the changelog URL carries the tag.
    const mentions = body.match(/0\.10\.0/g) ?? [];
    expect(mentions).toHaveLength(2);
    expect(body).toContain("In 0.10.0:");
    expect(body).toContain("/releases/tag/v0.10.0");
  });

  test("nothing picked means no thread (#1876 decision 8)", () => {
    const silent = draft(byTag("v0.4.2"));
    expect(silent.postable).toBe(false);
    expect(() => renderThread(silent)).toThrow(/nothing picked/);
    expect(() => renderIssue(silent)).toThrow(/nothing picked/);
    expect(render(silent)).toEqual({ tag: "v0.4.2", version: "0.4.2", postable: false });
  });

  test("across the corpus: time-invariant, third-person, hyphens only, under Reddit's caps", () => {
    for (const result of postable) {
      const { title, body } = renderThread(result);
      expect(title.length).toBeLessThanOrEqual(300);
      expect(title).toMatch(/^Selftend \d+\.\d+\.\d+ - \S/);
      expect(body).not.toMatch(/[—–→←⇒]/);
      // #1877's rules bind the template - the shell around the bullets. A
      // changelog line is the owner's to judge in the composer (v0.4.0 ships a
      // "routines-today widget", which is a feature name, not a decaying claim).
      const shell = body
        .split("\n")
        .filter((line) => !line.startsWith("- "))
        .join("\n");
      // Rule 1: no clause whose truth decays.
      expect(shell).not.toMatch(/\b(?:live now|just shipped|now available|today|yesterday)\b/i);
      // Rule 7: never the reader's installed app.
      expect(shell).not.toMatch(/\byou can now\b/i);
      // Rule 2: no per-platform availability claim.
      expect(shell).not.toMatch(/\b(?:available on|rolling out|is out on)\b/i);
      expect(body.match(/^- /gm)?.length).toBe(Math.min(CAP, result.picked.length));
    }
  });
});

describe("the submit link", () => {
  test("carries the title and text URL-encoded, and nothing else (#1880 §5: no flair parameter)", () => {
    const thread = renderThread(draft(byTag("v0.16.0")));
    const url = new URL(submitUrl(thread));
    expect(url.origin + url.pathname).toBe(SUBMIT_URL);
    expect([...url.searchParams.keys()]).toEqual(["title", "text"]);
    expect(url.searchParams.get("title")).toBe(thread.title);
    expect(url.searchParams.get("text")).toBe(thread.body);
  });

  test("encodes the characters a markdown link cannot carry, so GitHub renders the whole URL", () => {
    const url = submitUrl({ title: "A (parenthetical) title!", body: "it's a *body*" });
    expect(url).not.toMatch(/[()!'*\s]/);
    expect(decodeURIComponent(new URL(url).searchParams.get("title")!)).toBe(
      "A (parenthetical) title!",
    );
  });

  test("across the corpus no URL exceeds 3.5 KB, and decoding gives back the exact thread", () => {
    let longest = 0;
    for (const result of postable) {
      const thread = renderThread(result);
      const url = submitUrl(thread);
      longest = Math.max(longest, url.length);
      expect(url.length).toBeLessThanOrEqual(SUBMIT_URL_LIMIT);
      const params = new URL(url).searchParams;
      expect(params.get("title")).toBe(thread.title);
      expect(params.get("text")).toBe(thread.body);
    }
    // #1878 verified 3.5 KB returns 200; #1880 measured 1595 under the old
    // frame and #1942 predicted under 1700 with the longer one.
    expect(longest).toBeLessThan(1800);
    expect(SUBMIT_URL_LIMIT).toBe(3500);
  });
});

describe("the issue body", () => {
  const ordered = (haystack: string, needles: (string | RegExp)[]) => {
    let cursor = -1;
    for (const needle of needles) {
      const index =
        typeof needle === "string"
          ? haystack.indexOf(needle, cursor + 1)
          : haystack.slice(cursor + 1).search(needle) + (cursor + 1);
      expect({ needle, found: index > cursor }).toEqual({ needle, found: true });
      cursor = index;
    }
  };

  test("v0.16.0: unposted line, link before the fence, fenced thread, numbered picks, spares with reasons, steps", () => {
    const result = draft(byTag("v0.16.0"));
    const thread = renderThread(result);
    const { title, body } = renderIssue(result);
    expect(title).toBe("r/Selftend thread for v0.16.0");
    ordered(body, [
      /not yet posted/i,
      submitUrl(thread),
      "```text\n" + thread.title + "\n```",
      "```text\n" + thread.body + "\n```",
      "## Picks",
      "1. ACT overview gets real headings and three lifetime stats (act, feat)",
      "2. Every visible modal reports into one overlay-count registry (app, feat)",
      "8. Shared components record where they were reached from (escape, feat)",
      "## Spares",
      "## Steps",
      /App update/,
      /submit/i,
      /close this issue/i,
    ]);
    // The link is the primary action and sits OUTSIDE any fence (#1878 decision 3).
    const firstFence = body.indexOf("```");
    expect(body.indexOf(submitUrl(thread))).toBeLessThan(firstFence);
    expect(body.slice(0, firstFence)).toContain(`[`);
    // Closing without posting is a valid outcome, said in so many words.
    expect(body).toMatch(/clos\w+ (?:this issue )?without posting/i);
    // Every spare carries the reason it was not picked.
    for (const spare of result.spares) {
      expect(body).toContain(`- ${spare.text} (${REASONS[spare.reason]})`);
    }
    expect(result.spares.length).toBeGreaterThan(8);
  });

  test("renders every reason the picker and the cleaner can emit", () => {
    expect(Object.keys(REASONS).sort()).toEqual([
      "empty",
      "overflow",
      "spelling",
      "underscore",
      "unscoped",
    ]);
    const synthetic: Draft = {
      tag: "v9.9.9",
      version: "9.9.9",
      postable: true,
      picked: [{ text: "A picked line", scope: "auth", kind: "feat" }],
      spares: [
        { text: "An unscoped line", scope: null, kind: "fix", reason: "unscoped" },
        { text: "An overflow line", scope: "cbt", kind: "feat", reason: "overflow" },
        { text: "The favorites route", scope: "gratitude", kind: "feat", reason: "spelling" },
        { text: "The habit_colors alias", scope: "db", kind: "fix", reason: "underscore" },
        { text: "", scope: "docs", kind: "fix", reason: "empty" },
      ],
    };
    const { body } = renderIssue(synthetic);
    for (const reason of Object.keys(REASONS) as Reason[])
      expect(body).toContain(`(${REASONS[reason]})`);
    // An emptied line has nothing to promote; it still says where it came from.
    expect(body).toMatch(/^- \(nothing left after cleaning, scope docs\) \(/m);
    expect(body).not.toContain("-  (");
  });

  test("a release with no spares says so rather than leaving a heading dangling", () => {
    const { body } = renderIssue({
      tag: "v9.9.9",
      version: "9.9.9",
      postable: true,
      picked: [{ text: "One line", scope: "auth", kind: "feat" }],
      spares: [],
    });
    expect(body).toMatch(/## Spares\n\nNone\./);
  });
});

describe("the fixed strings pass the copy rules the merge gate cannot reach here", () => {
  /**
   * The English rules `test/positioning-copy.test.ts` holds, restated: that
   * file exports nothing, and its scope is the surfaces it lists. Plus the two
   * rules this surface adds (#1877 rule 7, #1950).
   */
  const BANNED: [string, RegExp][] = [
    ["guided self-help", /\bguided\s+(?:[\w-]+\s+){0,1}self[-\s]help/i],
    [
      "management verb on a health object",
      /\b(?:manage|managing|treat|treating|cure|curing|fix|fixing|improve|improving|work\s+on|working\s+on)\s+your\s+(?:mental\s+health|wellbeing|well-being|anxiety|depression|panic|trauma|OCD|burnout|symptoms|condition)\b/i,
    ],
    ["end-to-end", /\bend[-\s]to[-\s]end\b/i],
    ["zero-knowledge", /\bzero[-\s]knowledge\b/i],
    ["even we cannot read them", /\beven we (?:can'?t|cannot|can not)\s+(?:read|see|access|open)/i],
    [
      "your/our AI <role>",
      /\b(?:your|our|my)\s+(?:own\s+)?\bAI\b\s+(?:therapist|counsell?or|coach|companion)/i,
    ],
    ["is an AI <role>", /\bis\s+an?\s+\bAI\b\s+(?:therapist|counsell?or|coach|companion)/i],
    ["AI-powered", /\bAI[-\s]powered\b/i],
    ["AI therapy", /\bAI\b\s+(?:therapy|counsell?ing|coaching)\b/i],
    ["talk to an AI", /\b(?:chat|talk|speak)\s+(?:to|with)\s+(?:an?|our|your|the)\s+\bAI\b/i],
    ["no streaks", /\bno\s+streaks?\b/i],
    ["no streak <noun>", /\bno\s+streak\s+\w+/i],
    ["without streaks", /\bwithout\s+(?:\S+\s+)?streaks?\b/i],
    ["streak-free", /\bstreak[-\s]free\b/i],
    ["cognitive behavioral", /\bcognitive\s+behavioral\b/i],
    ["behavior (plain noun)", /\bbehaviors?\b/i],
    ["you can now", /\byou can now\b/i],
    ["American spelling", AMERICAN_SPELLINGS],
  ];

  /**
   * Every fixed string the renderer can emit, with the changelog lines replaced
   * by a sentinel so that only the renderer's own words are scanned. Spares are
   * NOT scanned through the corpus: a `spelling` spare carries the American
   * form on purpose, and the issue shows it to a human for that reason.
   */
  const sentinel = "Sentinel";
  const fixedStrings = renderIssue({
    tag: "v9.9.9",
    version: "9.9.9",
    postable: true,
    picked: [{ text: sentinel, scope: "auth", kind: "feat" }],
    spares: (Object.keys(REASONS) as Reason[]).map((reason) => ({
      text: sentinel,
      scope: "auth",
      kind: "fix" as const,
      reason,
    })),
  }).body;

  test.each(BANNED)("the issue body's fixed strings carry no '%s'", (_, pattern) => {
    expect(fixedStrings).not.toMatch(pattern);
  });

  test.each(BANNED)("no rendered thread in the corpus carries '%s'", (_, pattern) => {
    for (const result of postable) {
      const { title, body } = renderThread(result);
      expect(`${title}\n${body}`).not.toMatch(pattern);
    }
  });

  test("each banned pattern still catches its probe, so the scan above is not vacuous", () => {
    const probes: Record<string, string> = {
      "guided self-help": "A guided CBT self-help app",
      "management verb on a health object": "helps you manage your mental health",
      "end-to-end": "end-to-end encrypted",
      "zero-knowledge": "a zero-knowledge design",
      "even we cannot read them": "even we can't read your entries",
      "your/our AI <role>": "meet your AI coach",
      "is an AI <role>": "Selftend is an AI therapist",
      "AI-powered": "AI-powered insights",
      "AI therapy": "AI therapy, free forever",
      "talk to an AI": "talk to our AI",
      "no streaks": "no streaks, no guilt",
      "no streak <noun>": "no streak pressure",
      "without streaks": "without any streaks",
      "streak-free": "streak-free by design",
      "cognitive behavioral": "cognitive behavioral therapy",
      "behavior (plain noun)": "schedule meaningful behavior",
      "you can now": "you can now sign in with Apple",
      "American spelling": "the gratitude favorites breadcrumb",
    };
    for (const [name, pattern] of BANNED) expect(probes[name]).toMatch(pattern);
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
    expect(out.postable).toBe(true);
    expect(out.title).toMatch(/^Selftend 0\.16\.0 - /);
    expect(out.submitUrl).toMatch(/^https:\/\/www\.reddit\.com\/r\/Selftend\/submit\?title=/);
    expect(out.issue.title).toBe("r/Selftend thread for v0.16.0");
    expect(out.issue.body).toContain("## Picks");
    expect(JSON.parse(run(["--tag", "v0.4.2"]))).toEqual({
      tag: "v0.4.2",
      version: "0.4.2",
      postable: false,
    });
  });

  test("--format issue prints the issue body alone, the shape the workflow files", () => {
    const out = run(["--tag", "v0.11.1", "--format", "issue"]);
    expect(out.startsWith("This r/Selftend thread for v0.11.1")).toBe(true);
    expect(out).toContain("## Steps");
    expect(run(["--tag", "v0.11.1", "--format", "thread"])).toBe(
      `${renderThread(draft(byTag("v0.11.1"))).title}\n\n${renderThread(draft(byTag("v0.11.1"))).body}\n`,
    );
  });

  test("RELEASE_BODY carries a body the workflow hands over", () => {
    const out = JSON.parse(
      run(["--tag", "v9.9.9"], { RELEASE_BODY: "### Features\n* **auth:** from the env\n" }),
    );
    expect(out.title).toBe("Selftend 9.9.9 - From the env");
    expect(out.body).toContain("In 9.9.9:\n\n- From the env\n");
  });

  test("exits 1 on a tag the corpus does not hold, and on an unknown format", () => {
    expect(() => run(["--tag", "v0.0.1"])).toThrow(/v0\.0\.1/);
    expect(() => run(["--tag", "v0.16.0", "--format", "pdf"])).toThrow(/format/);
  });
});
