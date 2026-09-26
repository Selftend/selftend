#!/usr/bin/env node
/**
 * The release-thread renderer — step three of the r/Selftend drafter (#1950).
 *
 * ☠️ SINCE 2026-09-26 THE THREAD IS A LINK POST, NOT A TEXT POST. By the
 * owner's decision the sub gets what the Discord `#changelog` channel gets: the
 * GitHub Release itself. The post is titled `Selftend <version>` and links to
 * `https://github.com/Selftend/selftend/releases/tag/<tag>`; there is no body.
 *
 * Why it changed: the text thread was the release's commit messages, picked one
 * per scope and cleaned (#1873's map). The v0.24.0 draft showed the cost — five
 * of its eight lines were internal plumbing (the capture job's allowlist, the
 * hold-out register, the App Review seed), the two changes a user would notice
 * sat in the spares, and every line needed rewriting by hand. A link carries no
 * authored text, so there is nothing to vet, nothing to rewrite, and nothing
 * that exists only on Reddit (#2632): the words live on the Release page, in
 * this repository's history.
 *
 * ⚠️ What the link does NOT filter: the Release page is release-please's full
 * changelog, internal lines included — exactly what Discord already shows. The
 * picker and the cleaner still run upstream (`draft()` supplies the tag and the
 * version), but nothing they tier reaches the post any more.
 *
 *   node scripts/release-thread/renderer.mjs --tag v0.24.0                  # as JSON
 *   node scripts/release-thread/renderer.mjs --tag v0.24.0 --format thread  # the title and the link
 *   node scripts/release-thread/renderer.mjs --tag v0.24.0 --format issue   # the issue body only
 *   RELEASE_BODY="..." node scripts/release-thread/renderer.mjs --tag v0.24.0
 *
 * Every published release gets one: a link post has no copy that can be empty,
 * so the old "nothing picked, no thread" skip (#1876 decision 8) no longer
 * applies. The flair is still set by hand — no submit parameter sets it
 * (#1880 §5).
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { CORPUS_PATH, draft, releaseFromCorpus } from "./picker.mjs";

/**
 * @typedef {import("./picker.mjs").Draft} Draft
 *
 * @typedef {object} Thread
 * @property {string} title
 * @property {string} url
 *
 * @typedef {object} Issue
 * @property {string} title
 * @property {string} body
 *
 * @typedef {{ tag: string, version: string, postable: false }} Skipped
 * @typedef {{ tag: string, version: string, postable: true, title: string, url: string, submitUrl: string, issue: Issue }} Rendered
 */

/** The GitHub Release for a tag - what the post links to, and what Discord shows. */
export const RELEASES_URL = "https://github.com/Selftend/selftend/releases/tag/";

/** The sub's submit page. */
export const SUBMIT_URL = "https://www.reddit.com/r/Selftend/submit";

/** @param {Draft} draft */
export function renderTitle(draft) {
  return `Selftend ${draft.version}`;
}

/** @param {Draft} draft */
export function releaseUrl(draft) {
  return `${RELEASES_URL}${draft.tag}`;
}

/**
 * @param {Draft} draft
 * @returns {Thread}
 */
export function renderThread(draft) {
  return { title: renderTitle(draft), url: releaseUrl(draft) };
}

/**
 * `encodeURIComponent`, plus the five characters it leaves alone that a
 * markdown link cannot carry: `(` and `)` end a link URL on GitHub, and `!`,
 * `'` and `*` are safer encoded than not.
 * @param {string} value
 */
function encode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * The prefilled composer for a link post: `type=LINK`, the release URL and the
 * title. Nothing else - there is no body, and no parameter sets the flair.
 * @param {Thread} thread
 */
export function submitUrl(thread) {
  return `${SUBMIT_URL}?type=LINK&url=${encode(thread.url)}&title=${encode(thread.title)}`;
}

/**
 * The GitHub issue that hands the post to the owner. The tag is in the title
 * because #1878 decision 5 keys idempotency on label plus tag.
 *
 * @param {Draft} draft
 * @returns {Issue}
 */
export function renderIssue(draft) {
  const thread = renderThread(draft);
  const body = [
    `This r/Selftend post for ${draft.tag} is **not yet posted**. It is a link post to the GitHub Release, the same thing Discord's \`#changelog\` shows. Closing without posting is a valid outcome: a closed issue is never re-drafted.`,
    "",
    `**[Open the prefilled link post on r/Selftend](${submitUrl(thread)})**`,
    "",
    "If the composer arrives empty, choose **Link** and paste these:",
    "",
    "Title:",
    "",
    "```text",
    thread.title,
    "```",
    "",
    "URL:",
    "",
    "```text",
    thread.url,
    "```",
    "",
    "## Steps",
    "",
    "1. Select the **App update** flair. No link parameter sets it, so this is by hand.",
    "2. Post.",
    "3. Paste the post's permalink as a comment here, then close this issue as **Completed**.",
    "",
  ].join("\n");
  return { title: `r/Selftend thread for ${draft.tag}`, body };
}

/**
 * The whole step: a draft to everything the workflow files. Every release is
 * postable - a link post has no copy that can come out empty.
 * @param {Draft} draft
 * @returns {Rendered}
 */
export function render(draft) {
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

  --tag        the release tag, e.g. v0.24.0 (the version is derived from it)
  --body-file  the release's changelog body, as release-please wrote it
  --format     json (default: everything, the workflow's shape), thread (title,
               a blank line, the release URL), or issue (the issue body alone)
  RELEASE_BODY the same body via the environment, the shape the workflow uses
               (\`\${{ github.event.release.body }}\` must never be interpolated
               into a shell line - pass it as env)

With neither a file nor RELEASE_BODY, the tag is looked up in the committed
corpus at ${CORPUS_PATH}, so any past release can be rendered for a look.
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
  } else {
    process.stdout.write(
      format === "thread" ? `${rendered.title}\n\n${rendered.url}\n` : rendered.issue.body,
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
