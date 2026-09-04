#!/usr/bin/env node
/**
 * The release-thread renderer — step three of the r/Selftend drafter (#1950).
 *
 * From the picker's tiers (`picker.mjs`, #1948, with the cleaner of #1949 run
 * between parse and pick) this module produces the three things the owner is
 * handed: the thread (title and body), the prefilled Reddit submit link, and
 * the body of the GitHub issue that carries both. CI drafts, the owner posts
 * (#1884): nothing here touches the Reddit API.
 *
 *   node scripts/release-thread/renderer.mjs --tag v0.16.0                     # from the corpus, as JSON
 *   node scripts/release-thread/renderer.mjs --tag v0.16.0 --format thread     # the title and body only
 *   node scripts/release-thread/renderer.mjs --tag v0.16.0 --format issue      # the issue body only
 *   RELEASE_BODY="..." node scripts/release-thread/renderer.mjs --tag v0.18.0  # from the workflow
 *
 * **This module decides nothing.** The template is #1880's (§1 the title, §2 the
 * body, §5 the flair, §7 what the issue carries), the truth rules are #1877's
 * seven, the container is #1878's (decisions 3 and 7), and the frame strings
 * follow #1942's correction. If a value looks wrong, the argument belongs on
 * that ticket.
 *
 * ☠️ THE FRAME SENTENCE AND THE SUPPORTING LINES ARE CONSTANTS, PINNED TO
 * `docs/positioning.md` BY A TEST. #1880 tried to source the frame sentence
 * from i18n and the render falsified it: `auth:landing.subtitle` drops
 * "Selftend is" because the wordmark above it supplies the subject, and no
 * i18n key holds the full sentence. So the drafter carries the strings, and
 * `test/release-thread-renderer.test.ts` fails the moment either the frame
 * sentence or any supporting line no longer appears in the doc, dash-
 * normalised — the doc's § *What binds this document* names that test as this
 * surface's gate. The strings below are the doc's text as of 2026-09-05, the
 * repositioning of #1813/#1819; a rewording of the doc goes red here until
 * these follow. Never "fix" the frame sentence's "you": it is the sanctioned
 * shape, and #1877 rule 7 bans addressing the reader's INSTALLED APP ("you
 * can now…"), not the generic reader.
 *
 * The sub is hyphens-only, so the doc's em dashes are carried as ` - `. That
 * is the shipped shape already (`auth:landing.subtitle`, `public/index.html`),
 * not a third variant (#1627).
 *
 * ☠️ THE TOOLS LINE STAYS OUT OF THE ROTATION (#1880 §2, reaffirmed by #1950).
 * Directly under a frame sentence that already names "everyday tools", the
 * tools line restates the opening in a two-line shell; every other approved
 * line rotates, by `(major + minor + patch) mod <line count>`, which over the
 * 26 corpus tags spreads 6/7/6/7. #1880 numbered the tools line "theme 3" —
 * the repositioning reordered the doc's list and it is theme 1 there now; the
 * line, not the number, is what is excluded. The rotation is the doc's order
 * minus that line, so nothing here chooses an order of its own.
 *
 * ☠️ THE LEAD IS STRUCTURALLY THE LEAST NEWSWORTHY LINE (#1880 §1). The
 * round-robin walks scopes in changelog order and release-please sorts them
 * alphabetically, so pick 1 is always drawn from `a11y`/`act`/`app`. The issue
 * therefore NUMBERS the picks so swapping the lead is one edit in the composer.
 * The picks are also commit imperatives that read as instructions once
 * capitalised; rewriting them is authoring, which CI may not do (#1876
 * decision 1) — the owner rewrites in the composer or does not post.
 *
 * What the thread may claim (#1877): time-invariant (no "live now", no dates),
 * no per-platform availability claim (the version sits in the title and the
 * `In <version>:` line only; the store links carry what is installable, which
 * is what keeps the structural App Store lag honest), third-person, the
 * category declared in the frame shape, four fixed links with no version label.
 *
 * The submit link carries `title` and `text` only — no flair parameter is
 * verified to exist (#1880 §5), so "App update" is an explicit step in the
 * issue. #1878 verified that a 3.5 KB URL still returns 200; the corpus tops
 * out well under that, and the test asserts the limit.
 *
 * A draft with nothing picked has no thread (#1876 decision 8): `render`
 * returns `{ postable: false }` and the workflow (#1951) skips; `renderThread`
 * and `renderIssue` throw, because rendering half a thread is what gets pasted
 * at 1am. A render failure is a red run and creates no issue (#1878 decision 6).
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { draft, releaseFromCorpus } from "./picker.mjs";

/**
 * @typedef {import("./picker.mjs").Draft} Draft
 * @typedef {import("./picker.mjs").Reason} Reason
 *
 * @typedef {object} Thread
 * @property {string} title
 * @property {string} body
 *
 * @typedef {object} Issue
 * @property {string} title
 * @property {string} body
 *
 * @typedef {{ tag: string, version: string, postable: false }} Skipped
 * @typedef {{ tag: string, version: string, postable: true, title: string, body: string, submitUrl: string, issue: Issue }} Rendered
 */

/**
 * The frame sentence, `docs/positioning.md` § *The frame sentence*, in the
 * sub's hyphens-only shape. Pinned to the doc by test.
 */
export const FRAME_SENTENCE =
  "Selftend is a free, private CBT self-help app - cognitive behavioural therapy - with everyday tools for right now and a programme to work through when you want one.";

/**
 * `docs/positioning.md` § *Approved supporting lines*, in the doc's order and
 * the sub's hyphens-only shape, each with the role the doc names. Every one is
 * pinned to the doc by test; only the tools line is kept out of the rotation.
 * @type {ReadonlyArray<{ role: "tools" | "programme" | "honesty" | "no-gatekeeper" | "catch", text: string }>}
 */
export const SUPPORTING_LINES = [
  {
    role: "tools",
    text: "Eight everyday tools that ask nothing of you - not even an account. Open one, use it, and you're done.",
  },
  { role: "programme", text: "Work through something, don't just track how you feel." },
  {
    role: "honesty",
    text: "Anything you write for an audience stops being useful to you. Yours is encrypted at rest, the key is held outside the database, the source is public, and no AI is reading it.",
  },
  {
    role: "no-gatekeeper",
    text: "You run it yourself - nothing to be assigned, nobody to wait for.",
  },
  {
    role: "catch",
    text: "Free because it is a non-profit, not because it is a trial. Your data exports whenever you want, and the source is public.",
  },
];

/** The lines that rotate: every approved line but the tools line (#1880 §2). */
export const ROTATION = SUPPORTING_LINES.filter((line) => line.role !== "tools").map(
  (line) => line.text,
);

/** The three fixed store links (#1877 rule 6). The fourth, the changelog, is per release. */
export const LINKS = {
  web: "https://selftend.org",
  play: "https://play.google.com/store/apps/details?id=org.vasilyoshev.selftend",
  appStore: "https://apps.apple.com/app/selftend/id6796318929",
};

/** Where the "Full changelog" link points: the GitHub release for the tag. */
export const RELEASES_URL = "https://github.com/Selftend/selftend/releases/tag/";

/** The sub's submit page; `title` and `text` are the only parameters (#1878, #1880 §5). */
export const SUBMIT_URL = "https://www.reddit.com/r/Selftend/submit";

/** The longest submit URL #1878 verified returns 200, in bytes. */
export const SUBMIT_URL_LIMIT = 3500;

/**
 * Why a spare was not picked, in the owner's words — one per reason the picker
 * (#1876 decision 3) and the cleaner (#1949 step 8) can emit.
 * @type {Record<Reason, string>}
 */
export const REASONS = {
  unscoped: "unscoped, so a human decides whether it is user-visible",
  overflow: "over the cap of eight",
  spelling: "non-British spelling, never auto-corrected",
  underscore: "carries an underscore, which Reddit reads as italics",
  empty: "the bullet was only a link",
};

/**
 * The sub's hyphens-only shape: em and en dashes become a spaced hyphen. The
 * test applies the same map to `docs/positioning.md` before pinning.
 * @param {string} text
 */
export function hyphenate(text) {
  return text.replace(/\s*[—–]\s*/g, " - ");
}

/**
 * `(major + minor + patch) mod <line count>` (#1880 §2).
 * @param {string} version   a dotted triple, without its `v`
 */
export function rotationIndex(version) {
  const parts = version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`not a version: ${JSON.stringify(version)}`);
  }
  return parts.reduce((sum, n) => sum + n, 0) % ROTATION.length;
}

/** @param {string} version */
export function supportingLine(version) {
  return ROTATION[rotationIndex(version)];
}

/** @param {Draft} draft */
function requirePostable(draft) {
  if (!draft.postable || draft.picked.length === 0) {
    throw new Error(`${draft.tag}: nothing picked, so there is no thread (#1876 decision 8)`);
  }
}

/**
 * `Selftend <version> - <lead>` (#1880 §1): the version without its `v`, the
 * first pick as the lead, a hyphen between.
 * @param {Draft} draft
 */
export function renderTitle(draft) {
  requirePostable(draft);
  return `Selftend ${draft.version} - ${draft.picked[0].text}`;
}

/**
 * The body (#1880 §2): the frame sentence, the rotated line, `In <version>:`,
 * the picks as hyphen bullets, the four-link footer.
 * @param {Draft} draft
 */
export function renderBody(draft) {
  requirePostable(draft);
  return [
    FRAME_SENTENCE,
    "",
    supportingLine(draft.version),
    "",
    `In ${draft.version}:`,
    "",
    ...draft.picked.map((pick) => `- ${pick.text}`),
    "",
    `Web: ${LINKS.web}`,
    `Google Play: ${LINKS.play}`,
    `App Store: ${LINKS.appStore}`,
    `Full changelog: ${RELEASES_URL}${draft.tag}`,
  ].join("\n");
}

/**
 * @param {Draft} draft
 * @returns {Thread}
 */
export function renderThread(draft) {
  return { title: renderTitle(draft), body: renderBody(draft) };
}

/**
 * `encodeURIComponent`, plus the five characters it leaves alone that a
 * markdown link cannot carry: `(` and `)` end a link URL on GitHub, and `!`,
 * `'` and `*` are safer encoded than not. `decodeURIComponent` reverses all of
 * it, so the composer receives the exact thread.
 * @param {string} value
 */
function encode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * The prefilled composer link (#1878 decision 3, #1880 §5): `title` and `text`,
 * URL-encoded, nothing else.
 * @param {Thread} thread
 */
export function submitUrl(thread) {
  return `${SUBMIT_URL}?title=${encode(thread.title)}&text=${encode(thread.body)}`;
}

/**
 * The GitHub issue that hands the thread to the owner (#1878 decisions 3, 5
 * and 7; #1880 §7). In order: the unposted line, the submit link outside any
 * fence, the thread fenced, the picks numbered, the spares with reasons, the
 * steps. The tag is in the title because #1878 decision 5 keys idempotency on
 * label plus tag.
 *
 * @param {Draft} draft
 * @returns {Issue}
 */
export function renderIssue(draft) {
  const thread = renderThread(draft);
  const spares =
    draft.spares.length === 0
      ? ["None."]
      : draft.spares.map((spare) => {
          const text =
            spare.text === "" ? `(nothing left after cleaning, scope ${spare.scope})` : spare.text;
          return `- ${text} (${REASONS[spare.reason]})`;
        });
  const body = [
    `This r/Selftend thread for ${draft.tag} is **not yet posted**. Open the composer from the link below, check every line, post it, and close this issue. Closing without posting is a valid outcome: a closed issue is never re-drafted.`,
    "",
    `**[Open the prefilled composer on r/Selftend](${submitUrl(thread)})**`,
    "",
    "## The thread",
    "",
    "The exact text the link prefills, for pasting by hand if the link does not populate the composer.",
    "",
    "Title:",
    "",
    "```text",
    thread.title,
    "```",
    "",
    "Body:",
    "",
    "```text",
    thread.body,
    "```",
    "",
    "## Picks",
    "",
    "Numbered so that swapping the lead into position 1 is one edit. The round-robin walks scopes in alphabetical order, so pick 1 is structurally the least newsworthy line. The lines are commit messages: rewrite or drop any that reads as an instruction, in the composer.",
    "",
    ...draft.picked.map(
      (pick, index) => `${index + 1}. ${pick.text} (${pick.scope}, ${pick.kind})`,
    ),
    "",
    "## Spares",
    "",
    ...spares,
    "",
    "## Steps",
    "",
    "1. Select the **App update** flair. No link parameter sets it, so this is by hand.",
    "2. Submit.",
    "3. Close this issue. Do not pin or highlight the thread: the feed's first row is already the newest one.",
    "",
  ].join("\n");
  return { title: `r/Selftend thread for ${draft.tag}`, body };
}

/**
 * The whole step: a draft to everything the workflow files, or a skip.
 * @param {Draft} draft
 * @returns {Rendered | Skipped}
 */
export function render(draft) {
  if (!draft.postable) return { tag: draft.tag, version: draft.version, postable: false };
  const thread = renderThread(draft);
  return {
    tag: draft.tag,
    version: draft.version,
    postable: true,
    ...thread,
    submitUrl: submitUrl(thread),
    issue: renderIssue(draft),
  };
}

// ---------------------------------------------------------------------------
// The command line
// ---------------------------------------------------------------------------

const FORMATS = new Set(["json", "thread", "issue"]);

const USAGE = `
usage:
  node scripts/release-thread/renderer.mjs --tag <tag> [--body-file <path>] [--format json|thread|issue]

  --tag        the release tag, e.g. v0.16.0 (the version is derived from it)
  --body-file  the release's changelog body, as release-please wrote it
  --format     json (default: everything, the workflow's shape), thread (title,
               a blank line, body), or issue (the issue body alone)
  RELEASE_BODY the same body via the environment, the shape the workflow uses
               (\`\${{ github.event.release.body }}\` must never be interpolated
               into a shell line - pass it as env)

With neither a file nor RELEASE_BODY, the tag is looked up in the committed
corpus at test/fixtures/github-releases.json, so any past release can be
rendered for a look.

Exit 0 whether or not anything was picked - json prints \`postable: false\`
and the other formats print nothing; only a non-zero exit means the renderer
broke.
`.trim();

/** @param {string} name */
function flag(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function main() {
  const tag = flag("tag");
  const format = flag("format") ?? "json";
  if (!tag) {
    console.error(USAGE);
    process.exit(1);
  }
  if (!FORMATS.has(format))
    throw new Error(`unknown --format ${format}; one of json, thread, issue`);
  const bodyFile = flag("body-file");
  const release = bodyFile
    ? { tag_name: tag, body: readFileSync(bodyFile, "utf8") }
    : process.env.RELEASE_BODY !== undefined
      ? { tag_name: tag, body: process.env.RELEASE_BODY }
      : releaseFromCorpus(tag);
  const rendered = render(draft(release));
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(rendered, null, 2)}\n`);
  } else if (rendered.postable) {
    process.stdout.write(
      format === "thread" ? `${rendered.title}\n\n${rendered.body}\n` : rendered.issue.body,
    );
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
