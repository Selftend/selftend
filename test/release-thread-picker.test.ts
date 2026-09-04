/**
 * The release-thread picker (#1948) — the first step of the r/Selftend drafter
 * decided on #1876 and mapped on #1873.
 *
 * The picker turns a release-please changelog body into three tiers: denied
 * (never shown), spares (shown, never auto-picked) and up to eight picks, chosen
 * one-per-scope round-robin. Nothing is authored: the text of every entry passes
 * through untouched, and the cleaner (#1949) is a separate step.
 *
 * ☠️ WHY THE CORPUS IS A COMMITTED FIXTURE. #1880 rendered the template against
 * every real release and caught defects the reasoning had missed (links mid-
 * sentence, HTML entities, a 383-character entry). Every drafter ticket asserts
 * over the same 26 bodies, frozen from the releases API on 2026-09-05, so a rule
 * that holds on a hand-written example but breaks on a real promotion release
 * goes red here rather than on the owner's screen.
 *
 * The rules pinned here are #1876's decisions 3 to 8 — see the docblock on
 * `scripts/release-thread/picker.mjs` for the reasoning behind each.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import corpus from "./fixtures/github-releases.json";
import {
  CAP,
  DENIED_SCOPES,
  parseChangelog,
  pick,
  draft,
  type Entry,
} from "../scripts/release-thread/picker.mjs";

const releases = corpus.releases;
const byTag = (tag: string) => {
  const release = releases.find((r) => r.tag_name === tag);
  if (!release) throw new Error(`no release ${tag} in the fixture`);
  return release;
};

/** Every changelog entry, as parsed — the number #1876 and #1880 measured over. */
const everyEntry = (): Entry[] => releases.flatMap((r) => parseChangelog(r.body));

/** Scoped entries that survive the section and denylist filters, and so compete for a slot. */
const contenders = (entries: Entry[]) =>
  entries.filter((e) => e.kind !== null && e.scope !== null && !e.denied);

describe("the committed release corpus", () => {
  test("holds all 26 published releases, none of them a pre-release", () => {
    expect(releases).toHaveLength(26);
    expect(releases[0].tag_name).toBe("v0.2.0");
    expect(releases.at(-1)?.tag_name).toBe("v0.17.0");
    expect(releases.every((r) => r.prerelease === false)).toBe(true);
  });

  test("parses to the 413 entries #1876 counted, of which #1880's 379 reach the draft", () => {
    const entries = everyEntry();
    // 415 bullets: the 413 under Features / Bug Fixes / Performance Improvements
    // that #1876 and #1880 measured, plus v0.2.0's breaking-change note and
    // v0.4.2's release chore, which sit under sections that feed nothing.
    expect(entries).toHaveLength(415);
    const sectioned = entries.filter((e) => e.kind !== null);
    expect(sectioned).toHaveLength(413);
    expect(sectioned.filter((e) => e.denied)).toHaveLength(34);
    // 379 = picks + spares, the number #1880 simulated the template over.
    expect(sectioned.filter((e) => !e.denied)).toHaveLength(379);
    expect(sectioned.filter((e) => e.scope === null)).toHaveLength(48);
  });

  test("22 of 26 releases are postable; the four that are not are #1880's three plus v0.4.1", () => {
    // v0.4.1 is the release #1880's simulation still led with ("Run wrangler on
    // Node 22 so _headers applies") — that line is UNSCOPED, so #1876 decision 3
    // makes it a spare, and its only other entry is a denied `deps` bump.
    const silent = releases.filter((r) => !draft(r).postable).map((r) => r.tag_name);
    expect(silent).toEqual(["v0.2.1", "v0.3.2", "v0.4.1", "v0.4.2"]);
  });
});

describe("parseChangelog", () => {
  const body = [
    "## [0.99.0](https://example.test/compare/v0.98.0...v0.99.0) (2026-09-05)",
    "",
    "",
    "### ⚠ BREAKING CHANGES",
    "",
    "* **widgets:** previously placed launcher widgets are orphaned by the provider swap.",
    "",
    "### Features",
    "",
    "* **auth:** a guest signing in over data gets one calm warning ([#1444](https://x/1444))",
    "* a dismissed modal on web unmounts instead of lingering as a focus trap ([#1054](https://x/1054))",
    "",
    "### Bug Fixes",
    "",
    "* **deps:** bump expo to 57.0.4",
    "* **auth:** the header menu no longer swallows a failed sign-out",
    "",
    "### Performance Improvements",
    "",
    "* **charts:** the mood chart renders in one pass",
    "",
    "### Miscellaneous Chores",
    "",
    "* release selftend 0.99.0 ([#143](https://x/143))",
    "* **ci:** pin the supabase cli",
  ].join("\n");

  test("keeps the raw entry text, the scope and the section kind", () => {
    const entries = parseChangelog(body);
    expect(entries.map((e) => [e.kind, e.scope])).toEqual([
      [null, "widgets"],
      ["feat", "auth"],
      ["feat", null],
      ["fix", "deps"],
      ["fix", "auth"],
      ["perf", "charts"],
      [null, null],
      [null, "ci"],
    ]);
    // Untouched: the scope prefix and the links are still in the text. Cleaning
    // is #1949's job, and the ticket's "text is the raw entry for now" is the
    // contract the cleaner starts from.
    expect(entries[1].text).toBe(
      "**auth:** a guest signing in over data gets one calm warning ([#1444](https://x/1444))",
    );
  });

  test("denies a scope by exact match, so a compound scope stays visible to a human", () => {
    const entries = parseChangelog(
      [
        "### Bug Fixes",
        "* **deps:** bump",
        "* **ci,deps:** pin and bump",
        "* **ci,auth:** the sign-in flow is exercised in CI",
        "* **auth:** a real fix",
      ].join("\n"),
    );
    expect(entries.map((e) => e.denied)).toEqual([true, false, false, false]);
  });

  test("lower-cases the scope key while leaving the text alone", () => {
    const [entry] = parseChangelog("### Features\n* **Auth:** a Capitalised commit");
    expect(entry.scope).toBe("auth");
    expect(entry.text).toBe("**Auth:** a Capitalised commit");
    expect(parseChangelog("### Bug Fixes\n* **Deps:** bump")[0].denied).toBe(true);
  });

  test("ignores an empty body and a body with no sections", () => {
    expect(parseChangelog("")).toEqual([]);
    expect(parseChangelog("nothing here\n\njust prose")).toEqual([]);
  });
});

describe("pick", () => {
  test("v0.16.0 yields eight picks from eight distinct scopes", () => {
    const result = draft(byTag("v0.16.0"));
    expect(result.tag).toBe("v0.16.0");
    expect(result.version).toBe("0.16.0");
    expect(result.postable).toBe(true);
    expect(result.picked).toHaveLength(8);
    expect(new Set(result.picked.map((p) => p.scope)).size).toBe(8);
    // The eight areas #1880 §4 rendered, in the order its example shows them.
    expect(result.picked.map((p) => p.scope)).toEqual([
      "act",
      "app",
      "audio",
      "auth",
      "cbt",
      "db",
      "errors",
      "escape",
    ]);
  });

  test("v0.11.1 yields #1880's two-highlight case", () => {
    const { picked } = draft(byTag("v0.11.1"));
    expect(picked.map((p) => p.text.replace(/\s*\(\[.*$/, ""))).toEqual([
      "**a11y:** match arbitrary destructive opacity in the wash gate",
      "**a11y:** stop pairing destructive text with a wash of its own red",
    ]);
  });

  test("v0.4.2 yields nothing picked, and says so", () => {
    const result = draft(byTag("v0.4.2"));
    expect(result.postable).toBe(false);
    expect(result.picked).toEqual([]);
    expect(result.spares).toEqual([]);
  });

  test("across the whole corpus, no unscoped and no denied entry is ever picked", () => {
    for (const release of releases) {
      const { picked } = draft(release);
      expect(picked.length).toBeLessThanOrEqual(CAP);
      for (const entry of picked) {
        expect(entry.scope).not.toBeNull();
        expect(DENIED_SCOPES.has(entry.scope!)).toBe(false);
        expect(["feat", "fix", "perf"]).toContain(entry.kind);
      }
    }
  });

  test("round-robin: no scope repeats before every eligible scope has appeared once", () => {
    let releasesOverCap = 0;
    for (const release of releases) {
      const entries = parseChangelog(release.body);
      const distinctScopes = new Set(contenders(entries).map((e) => e.scope)).size;
      const { picked } = draft(release);
      if (contenders(entries).length > CAP) releasesOverCap += 1;

      // The first min(CAP, distinct) picks are all different scopes ...
      const firstRound = picked.slice(0, Math.min(CAP, distinctScopes));
      expect(new Set(firstRound.map((p) => p.scope)).size).toBe(firstRound.length);
      // ... and only after that may a scope come round again.
      expect(picked.length).toBe(Math.min(CAP, contenders(entries).length));
    }
    // The assertion above is vacuous unless the corpus actually has releases
    // whose eligible entries overflow the cap - the three promotion releases do.
    expect(releasesOverCap).toBeGreaterThanOrEqual(3);
  });

  test("round-robin walks scopes in changelog order and fills from the second round", () => {
    const body = [
      "### Features",
      "* **b:** b1",
      "* **b:** b2",
      "* **b:** b3",
      "* **a:** a1",
      "* **a:** a2",
      "### Bug Fixes",
      "* **c:** c1",
    ].join("\n");
    const { picked, spares } = pick(parseChangelog(body), { cap: 5 });
    expect(picked.map((p) => p.text)).toEqual([
      "**b:** b1",
      "**a:** a1",
      "**c:** c1",
      "**b:** b2",
      "**a:** a2",
    ]);
    expect(spares).toEqual([expect.objectContaining({ text: "**b:** b3", reason: "overflow" })]);
  });

  test("a chores entry and a breaking-changes note reach neither picks nor spares", () => {
    const body = [
      "### ⚠ BREAKING CHANGES",
      "* **widgets:** previously placed launcher widgets are orphaned",
      "### Features",
      "* **auth:** a real feature",
      "### Miscellaneous Chores",
      "* release selftend 0.99.0",
      "* **auth:** tidy the auth folder",
    ].join("\n");
    const { picked, spares } = pick(parseChangelog(body));
    expect(picked.map((p) => p.text)).toEqual(["**auth:** a real feature"]);
    expect(spares).toEqual([]);
  });

  test("a denied-scope entry reaches neither picks nor spares", () => {
    const { picked, spares } = pick(
      parseChangelog(["### Bug Fixes", "* **deps:** bump expo", "* **ci:** pin"].join("\n")),
    );
    expect(picked).toEqual([]);
    expect(spares).toEqual([]);
  });

  test("an unscoped entry is a spare with reason 'unscoped', in changelog order", () => {
    const body = [
      "### Features",
      "* run wrangler on Node 22 so `_headers` applies",
      "* **auth:** a real feature",
      "### Bug Fixes",
      "* unmount dismissed dialogs on web",
    ].join("\n");
    const { picked, spares } = pick(parseChangelog(body));
    expect(picked.map((p) => p.text)).toEqual(["**auth:** a real feature"]);
    expect(spares.map((s) => [s.text, s.reason])).toEqual([
      ["run wrangler on Node 22 so `_headers` applies", "unscoped"],
      ["unmount dismissed dialogs on web", "unscoped"],
    ]);
  });

  test("an entry arriving with a reason already set is a spare and frees its slot (#1949's seam)", () => {
    const entries = parseChangelog(
      [
        "### Features",
        "* **a:** the gratitude favorites breadcrumb",
        "* **a:** a second a",
        "* **b:** b1",
      ].join("\n"),
    );
    entries[0].reason = "spelling";
    const { picked, spares } = pick(entries, { cap: 2 });
    expect(picked.map((p) => p.text)).toEqual(["**a:** a second a", "**b:** b1"]);
    expect(spares).toEqual([
      expect.objectContaining({
        text: "**a:** the gratitude favorites breadcrumb",
        reason: "spelling",
      }),
    ]);
  });

  test("the output carries only the contract fields", () => {
    const result = draft(byTag("v0.11.1"));
    expect(Object.keys(result).sort()).toEqual(["picked", "postable", "spares", "tag", "version"]);
    for (const p of result.picked) expect(Object.keys(p).sort()).toEqual(["kind", "scope", "text"]);
    for (const s of result.spares)
      expect(Object.keys(s).sort()).toEqual(["kind", "reason", "scope", "text"]);
  });

  test("the version is the tag without its v, and a malformed tag is refused", () => {
    expect(draft({ tag_name: "v1.2.3", body: "" }).version).toBe("1.2.3");
    expect(() => draft({ tag_name: "nightly", body: "" })).toThrow(/tag/);
  });
});

describe("the command line", () => {
  const script = join(__dirname, "..", "scripts", "release-thread", "picker.mjs");
  const run = (args: string[], env: Record<string, string> = {}) =>
    JSON.parse(
      execFileSync(process.execPath, [script, ...args], {
        encoding: "utf8",
        env: { ...process.env, ...env },
        cwd: join(__dirname, ".."),
      }),
    );

  test("--tag alone reads the committed corpus", () => {
    const out = run(["--tag", "v0.16.0"]);
    expect(out.picked).toHaveLength(8);
    expect(out.postable).toBe(true);
    expect(run(["--tag", "v0.4.2"])).toMatchObject({ postable: false, picked: [] });
  });

  test("--body-file and RELEASE_BODY carry a body the workflow hands over", () => {
    const dir = mkdtempSync(join(tmpdir(), "picker-"));
    const file = join(dir, "body.md");
    writeFileSync(file, "### Features\n* **auth:** from a file\n");
    expect(run(["--tag", "v9.9.9", "--body-file", file]).picked.map((p: Entry) => p.text)).toEqual([
      "**auth:** from a file",
    ]);
    expect(
      run(["--tag", "v9.9.9"], {
        RELEASE_BODY: "### Bug Fixes\n* **web:** from the env\n",
      }).picked.map((p: Entry) => p.text),
    ).toEqual(["**web:** from the env"]);
  });

  test("exits 1 on a tag the corpus does not hold, and without a tag", () => {
    expect(() => run(["--tag", "v0.0.1"])).toThrow(/v0\.0\.1/);
    expect(() => run([])).toThrow();
  });
});
