#!/usr/bin/env node
"use strict";

// One scripted pass that creates the Weblate components for every i18n namespace
// that is not tracked yet (#1105, part of #1091). Read-only by default: it prints
// the plan and exits. Pass --apply to actually POST.
//
//   node scripts/weblate-create-components.js            # dry run (no token needed)
//   WEBLATE_API_TOKEN=... node scripts/weblate-create-components.js --apply
//   WEBLATE_API_TOKEN=... node scripts/weblate-create-components.js --verify
//   WEBLATE_API_TOKEN=... node scripts/weblate-create-components.js --fix-indent
//
// --apply does the creations AND the indent repair below, so the owner's token
// sitting is one command; --fix-indent runs just the repair.
//
// The token is minted by the owner (Weblate profile -> API access) and revoked
// right after the pass; nothing here persists it.
//
// Traps this script exists to not step on, all sourced in the #1094 research doc:
//   - hosted.weblate.org sits behind an anti-bot gate that 403s browser
//     User-Agents. We send an explicit non-browser UA.
//   - Component creation is ASYNC: a 201 only means the task was queued, so each
//     response's `task_url` is polled before the component counts as created.
//   - `is_glossary` components share the slug namespace and must be filtered out
//     of any "does it already exist" check.
//   - Deleting `auth` cascades to every component linked via weblate://selftend/auth.
//     This script never issues DELETE - there is deliberately no delete path in it.
//   - `i18next` is the legacy v3 format; ours is `i18nextv4`.
//   - Translation propagation must stay OFF: 135 key paths are reused across
//     namespaces with deliberately different translations.

const fs = require("fs");
const path = require("path");

const API_ROOT = "https://hosted.weblate.org/api";
const PROJECT = "selftend";
// Linked components inherit VCS, repo URL, branch and push settings from `auth`,
// which is the only component configured with the GitHub pull-request VCS (#1104).
const ROOT_COMPONENT = "auth";
const LINKED_REPO = `weblate://${PROJECT}/${ROOT_COMPONENT}`;
const CHECK_FLAGS = "ignore-ellipsis, ignore-reused";
const LOCALES_DIR = path.join(__dirname, "..", "src", "i18n", "locales", "en");
// Weblate guesses JSON indentation from the file and gets it wrong on deeply
// nested namespaces (it guessed 5 for cbt and 3 for common). Every file in the
// repo is Prettier-formatted at 2, and a write-back at any other width reformats
// the whole file, so pin it explicitly.
const JSON_INDENT = 2;
const ACRONYMS = { act: "ACT", cbt: "CBT" };
const DEFAULT_MAX_POLLS = 60;
const POLL_INTERVAL_MS = 2000;
// Not a browser UA on purpose - see the anti-bot note above.
const USER_AGENT = "selftend-weblate-script/1.0";

// Pure: locale filenames -> sorted namespace slugs.
function namespacesFromFilenames(filenames) {
  return filenames
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.basename(f, ".json"))
    .sort();
}

// Pure: the component display name for a namespace.
function componentName(ns) {
  return ACRONYMS[ns] || ns.charAt(0).toUpperCase() + ns.slice(1);
}

// Pure: which namespaces have no component yet. Glossary components are excluded
// because they share the slug namespace but never track a locale file.
function selectMissing(namespaces, components) {
  const tracked = new Set(
    components.filter((c) => !c.is_glossary).map((c) => String(c.slug).toLowerCase()),
  );
  return namespaces.filter((ns) => !tracked.has(ns.toLowerCase())).sort();
}

// Pure: the creation payload for one namespace. Everything not listed here
// (vcs, repo URL, branch, push branch, commit messages, license) is inherited
// through the link to `auth` - re-declaring it would fork the settings.
function buildPayload(ns) {
  return {
    name: componentName(ns),
    slug: ns,
    repo: LINKED_REPO,
    file_format: "i18nextv4",
    filemask: `src/i18n/locales/*/${ns}.json`,
    template: `src/i18n/locales/en/${ns}.json`,
    check_flags: CHECK_FLAGS,
    allow_translation_propagation: false,
    // Matches the seven components that already exist.
    new_lang: "add",
    language_regex: "^[^.]+$",
    edit_template: false,
    file_format_params: {
      json_indent: JSON_INDENT,
      json_indent_style: "spaces",
      json_sort_keys: false,
      json_use_compact_separators: false,
      dos_eol: false,
    },
  };
}

// Pure: config drift between what we asked for and what the server reports.
// Returns a list of human-readable problems - empty means the component is good.
function verifyComponent(ns, component) {
  const want = buildPayload(ns);
  const problems = [];
  if (component.file_format !== want.file_format) {
    problems.push(`file_format is "${component.file_format}", expected "${want.file_format}"`);
  }
  if (component.filemask !== want.filemask) {
    problems.push(`filemask is "${component.filemask}", expected "${want.filemask}"`);
  }
  if (component.template !== want.template) {
    problems.push(`template is "${component.template}", expected "${want.template}"`);
  }
  if (component.check_flags !== want.check_flags) {
    problems.push(`check_flags is "${component.check_flags}", expected "${want.check_flags}"`);
  }
  if (component.allow_translation_propagation !== false) {
    problems.push("translation propagation is ON, expected OFF");
  }
  // `auth` is the root: it is the one component that legitimately carries its own
  // VCS settings, and everything else links to it.
  if (ns !== ROOT_COMPONENT && !component.linked_component) {
    problems.push(`not linked to ${LINKED_REPO} (it carries its own repo settings)`);
  }
  const indent = (component.file_format_params || {}).json_indent;
  if (indent !== JSON_INDENT) {
    problems.push(
      `json_indent is ${indent}, expected ${JSON_INDENT} - a write-back would reformat`,
    );
  }
  return problems;
}

// Pure: the components whose JSON indentation would reformat their file on the
// first write-back. Weblate auto-detected the indent for the components created
// before this script existed and guessed wrong (5 for cbt, 3 for common). The
// glossary is skipped: it tracks no locale file, so its indent reformats nothing.
function componentsNeedingIndentFix(components) {
  return components
    .filter((c) => !c.is_glossary)
    .filter((c) => (c.file_format_params || {}).json_indent !== JSON_INDENT);
}

// Pure: the PATCH body that repairs one component's indentation. The server's own
// format params are resent with only json_indent changed, so it does not matter
// whether Weblate merges the dict or replaces it wholesale.
function indentFixPayload(component) {
  return {
    file_format_params: {
      ...(component.file_format_params || {}),
      json_indent: JSON_INDENT,
    },
  };
}

// Repairs one component's indentation, then re-reads it to confirm the value took.
// The API docs list `file_format_params` as writable under PUT but not under PATCH,
// so a 2xx is not proof of anything - without the re-read a silently ignored field
// would leave the pass reporting a fix it never made.
async function fixComponentIndent(component, deps) {
  const { request, log = () => {} } = deps;
  const slug = component.slug;
  const url = `${API_ROOT}/components/${PROJECT}/${slug}/`;

  const patched = await request("PATCH", url, indentFixPayload(component));
  if (patched.status < 200 || patched.status >= 300) {
    throw new Error(
      `patching "${slug}" failed (HTTP ${patched.status}): ${describeBody(patched.body)}`,
    );
  }

  const after = await request("GET", url);
  const indent = ((after.body || {}).file_format_params || {}).json_indent;
  if (indent !== JSON_INDENT) {
    throw new Error(
      `"${slug}" still reports json_indent ${indent} after the PATCH - the API ignored ` +
        `file_format_params. Set it by hand instead: Component -> Manage -> Settings -> ` +
        `Files -> JSON indentation -> ${JSON_INDENT}.`,
    );
  }
  log(`fixed json_indent on ${slug}`);
  return { slug, json_indent: indent };
}

const sleepMs = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function describeBody(body) {
  if (!body) return "(empty response)";
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

// Creates one component and waits for the async task to finish.
// `request(method, url, body?) -> { status, body }` is injected so the whole
// path is testable without touching the network.
async function createComponent(ns, deps) {
  const { request, sleep = sleepMs, maxPolls = DEFAULT_MAX_POLLS, log = () => {} } = deps;
  const created = await request("POST", `${API_ROOT}/projects/${PROJECT}/components/`, {
    ...buildPayload(ns),
  });
  if (created.status < 200 || created.status >= 300) {
    throw new Error(
      `creating "${ns}" failed (HTTP ${created.status}): ${describeBody(created.body)}`,
    );
  }

  const taskUrl = created.body && created.body.task_url;
  if (!taskUrl) return { slug: ns, created: true };

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const task = await request("GET", taskUrl);
    const body = task.body || {};
    if (body.completed) {
      const error = body.result && body.result.error;
      if (error) throw new Error(`creating "${ns}" failed: ${error}`);
      return { slug: ns, created: true };
    }
    log(`  ...still building "${ns}" (poll ${attempt + 1}/${maxPolls})`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`creating "${ns}" did not complete after ${maxPolls} polls (${taskUrl})`);
}

async function httpRequest(method, url, body) {
  const token = process.env.WEBLATE_API_TOKEN;
  const headers = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
  if (token) headers.Authorization = `Token ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Anubis (the anti-bot gate) answers with HTML, not JSON - keep the raw text.
  }
  return { status: response.status, body: parsed };
}

async function fetchAllComponents(request) {
  const components = [];
  let url = `${API_ROOT}/projects/${PROJECT}/components/?format=json`;
  while (url) {
    const page = await request("GET", url);
    if (page.status !== 200) {
      throw new Error(
        `listing components failed (HTTP ${page.status}): ${describeBody(page.body)}`,
      );
    }
    components.push(...(page.body.results || []));
    url = page.body.next;
  }
  return components;
}

// Repairs every drifted component, keeping going after a failure so one rejected
// PATCH does not strand the rest. Returns the failures for the caller to report.
async function repairIndents(components, request) {
  const failures = [];
  for (const component of components) {
    try {
      await fixComponentIndent(component, { request, log: console.log });
    } catch (error) {
      failures.push(`${component.slug}: ${error.message}`);
      console.error(`FAILED ${component.slug}: ${error.message}`);
    }
  }
  return failures;
}

function requireToken() {
  if (!process.env.WEBLATE_API_TOKEN) {
    console.error("WEBLATE_API_TOKEN is not set - refusing to run the pass.");
    process.exit(2);
  }
}

async function main(argv) {
  const apply = argv.includes("--apply");
  const verifyOnly = argv.includes("--verify");
  const fixIndentOnly = argv.includes("--fix-indent");
  const request = httpRequest;

  // Refuse before the first network call: exiting mid-fetch aborts an in-flight
  // request and Node on Windows turns that into a libuv assertion, which replaces
  // this exit code with a crash.
  if (apply || fixIndentOnly) requireToken();

  const namespaces = namespacesFromFilenames(fs.readdirSync(LOCALES_DIR));
  const components = await fetchAllComponents(request);
  const tracked = components.filter((c) => !c.is_glossary);
  const missing = selectMissing(namespaces, components);

  console.log(`Namespaces in the repo: ${namespaces.length}`);
  console.log(
    `Components on Weblate:  ${tracked.length} (+${components.length - tracked.length} glossary)`,
  );

  if (verifyOnly) {
    let bad = 0;
    for (const component of tracked) {
      const problems = verifyComponent(component.slug, component);
      if (problems.length) {
        bad += 1;
        console.error(`${component.slug}:`);
        for (const p of problems) console.error(`  - ${p}`);
      }
    }
    if (missing.length) console.error(`Untracked namespaces: ${missing.join(", ")}`);
    console.log(
      bad
        ? `${bad} component(s) drifted from the expected config.`
        : "All components match the expected config.",
    );
    process.exitCode = bad || missing.length ? 1 : 0;
    return;
  }

  const needIndentFix = componentsNeedingIndentFix(tracked);

  if (fixIndentOnly) {
    if (!needIndentFix.length) {
      console.log("Every component already indents at 2 - nothing to repair.");
      return;
    }
    const failed = await repairIndents(needIndentFix, request);
    if (failed.length) process.exit(1);
    return;
  }

  if (!missing.length && !needIndentFix.length) {
    console.log("Every namespace already has a component - nothing to do.");
    return;
  }
  if (missing.length) console.log(`Missing (${missing.length}): ${missing.join(", ")}`);
  if (needIndentFix.length) {
    console.log(
      `Indent to repair (${needIndentFix.length}): ` +
        needIndentFix
          .map((c) => `${c.slug} (${(c.file_format_params || {}).json_indent})`)
          .join(", "),
    );
  }

  if (!apply) {
    if (missing.length) {
      console.log("\nDry run. Payload for the first one:");
      console.log(JSON.stringify(buildPayload(missing[0]), null, 2));
    }
    console.log("\nRe-run with --apply and WEBLATE_API_TOKEN set to create them.");
    return;
  }

  const failures = [];
  for (const ns of missing) {
    try {
      await createComponent(ns, { request, log: console.log });
      console.log(`created ${ns}`);
    } catch (error) {
      failures.push(`${ns}: ${error.message}`);
      console.error(`FAILED ${ns}: ${error.message}`);
    }
  }

  // Repair the pre-existing components in the same pass, so the whole sitting is
  // one command and the ephemeral token is only needed once.
  failures.push(...(await repairIndents(needIndentFix, request)));

  // Re-read the server's view rather than trusting the create responses.
  const after = (await fetchAllComponents(request)).filter((c) => !c.is_glossary);
  for (const component of after) {
    const problems = verifyComponent(component.slug, component);
    for (const p of problems) console.error(`drift ${component.slug}: ${p}`);
  }
  console.log(`\n${after.length} components now tracked.`);
  if (failures.length) {
    console.error(`${failures.length} step(s) failed:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("Next: run a repository Update on the project, confirm 0 errors and 0 failing");
  console.log("checks across all components, spot-check one namespace's bg strings, then");
  console.log("revoke the API token.");
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  API_ROOT,
  CHECK_FLAGS,
  JSON_INDENT,
  LINKED_REPO,
  buildPayload,
  componentName,
  componentsNeedingIndentFix,
  createComponent,
  fixComponentIndent,
  indentFixPayload,
  namespacesFromFilenames,
  selectMissing,
  verifyComponent,
};
