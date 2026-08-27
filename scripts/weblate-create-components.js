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
//   WEBLATE_API_TOKEN=... node scripts/weblate-create-components.js --finish
//
// --apply screens the namespaces, does the creations AND the indent repair below
// AND the closing repository update, so the owner's token sitting is one command;
// --fix-indent and --finish run those steps on their own.
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
//   - Weblate tracks `main`, and this repo develops on `dev`. A namespace is
//     screened against the tracked branch before it is created - see the
//     screening block further down for why creating one early is destructive.

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
// The CLDR plural categories i18next v4 appends to a key. A bare key next to any
// of these is the shape that breaks - see pluralCollisions.
const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"];

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
  const indent = indentOf(component);
  if (indent !== JSON_INDENT) {
    problems.push(
      `json_indent is ${indent}, expected ${JSON_INDENT} - a write-back would reformat`,
    );
  }
  return problems;
}

// Pure: the JSON indent a component reports, or undefined if it reports none.
function indentOf(component) {
  return ((component || {}).file_format_params || {}).json_indent;
}

// Pure: the components whose JSON indentation would reformat their file on the
// first write-back. Weblate auto-detected the indent for the components created
// before this script existed and guessed wrong (5 for cbt, 3 for common).
//
// Two exclusions, both deliberate:
//   - the glossary tracks no locale file, so its indent reformats nothing;
//   - a component reporting no indent at all is unknown, not wrong. Writing to it
//     would be an unasked-for change to a component this pass did not create -
//     possibly `auth`, the root every other one inherits from. `--verify` still
//     reports it, so it reaches a human either way.
function componentsNeedingIndentFix(components) {
  return components
    .filter((c) => !c.is_glossary)
    .filter((c) => typeof indentOf(c) === "number" && indentOf(c) !== JSON_INDENT);
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

// ---------------------------------------------------------------------------
// Tracked-branch screening
//
// Weblate pulls `main`; this repo develops on `dev`. Creating a component whose
// file on `main` is still in a shape Weblate reads as broken raises error-level
// alerts immediately, and #1103 established that Libre approval is gated on zero
// of those - so an early creation does not just look untidy, it costs the plan
// this whole effort is waiting on. That precondition has lived in a human's head
// across four sittings; this screens for it instead.
//
// The one shape known to do it is i18next v4 plurals: a bare `key` beside
// `key_other`. v4 wants `key_one`/`key_other`, and the bare form makes Weblate
// read two units for one string. Four keys in `act` are in that state on `main`
// today, and no other namespace is.
// ---------------------------------------------------------------------------

// Pure: every dotted key path where a bare key sits next to a plural form of
// itself. Arrays are leaves - policy screens load them whole through
// `returnObjects`, and their indices are not keys.
function pluralCollisions(json) {
  const paths = [];
  const walk = (node, prefix) => {
    for (const [key, value] of Object.entries(node)) {
      const dotted = prefix ? `${prefix}.${key}` : key;
      paths.push(dotted);
      if (value && typeof value === "object" && !Array.isArray(value)) walk(value, dotted);
    }
  };
  walk(json, "");
  const all = new Set(paths);
  return paths.filter((p) => PLURAL_SUFFIXES.some((s) => all.has(`${p}_${s}`))).sort();
}

// Pure: where to read a namespace's file as the tracked branch has it, given the
// root component's own `repo` and `branch`. Reading GitHub rather than the local
// checkout is deliberate - a local `origin/main` can be stale, and a stale read
// here would clear a namespace that is not actually clean.
function rawFileUrl(root, ns) {
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(root.repo);
  if (!match) {
    throw new Error(
      `cannot screen against "${root.repo}": only a GitHub HTTPS repo URL can be read without a clone`,
    );
  }
  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${root.branch}/src/i18n/locales/en/${ns}.json`;
}

// Pure: the component the others link to, which carries the real repo and branch.
function rootComponent(components) {
  const root = components.find((c) => !c.is_glossary && c.slug === ROOT_COMPONENT);
  if (!root) {
    throw new Error(
      `no "${ROOT_COMPONENT}" component on the project - cannot tell which branch Weblate tracks`,
    );
  }
  return root;
}

// Splits the namespaces into the ones safe to create now and the ones to leave
// for a later sitting, each with the reason. An unreadable or unparseable file
// throws: reading a transient failure as "clean" is the single outcome that would
// defeat the screen, so it stops the pass instead of guessing.
async function screenNamespaces(namespaces, root, deps) {
  const { fetchText } = deps;
  const ready = [];
  const withheld = [];
  for (const ns of namespaces) {
    const url = rawFileUrl(root, ns);
    const response = await fetchText(url);
    if (response.status === 404) {
      withheld.push({
        ns,
        reason: `not on ${root.branch} yet - the filemask would match no file and the creation would fail`,
      });
      continue;
    }
    if (response.status !== 200) {
      throw new Error(`reading ${url} failed (HTTP ${response.status}) - cannot screen "${ns}"`);
    }
    let parsed;
    try {
      parsed = JSON.parse(response.text);
    } catch {
      throw new Error(`could not parse ${url} as JSON - cannot screen "${ns}"`);
    }
    const collisions = pluralCollisions(parsed);
    if (collisions.length) {
      withheld.push({
        ns,
        reason:
          `${collisions.length} key(s) have both a bare and a plural form on ${root.branch} ` +
          `(${collisions.join(", ")}) - creating it now would raise error-level alerts`,
      });
      continue;
    }
    ready.push(ns);
  }
  return { ready, withheld };
}

// ---------------------------------------------------------------------------
// Post-pass health (run-order step 4)
// ---------------------------------------------------------------------------

// Pure: what is still wrong after the pass. The glossary tracks no locale file,
// so it can never stand in as a namespace's component.
function healthProblems({ statistics, namespaces, components }) {
  const problems = [];
  const failing = (statistics || {}).failing || 0;
  if (failing) problems.push(`${failing} failing check(s) across the project`);
  const untracked = selectMissing(namespaces, components);
  if (untracked.length) {
    problems.push(`${untracked.length} namespace(s) still untracked: ${untracked.join(", ")}`);
  }
  return problems;
}

// Pulls the project's repository so the new components read the current branch.
// Returns a problem string instead of throwing: a failed pull is worth reporting
// but must not bury creations that already succeeded, and the owner can always
// press Update in the UI.
//
// The status read first is not a formality. The standing instruction for this
// project is to pull only while outgoing commits are zero - Weblate pushes
// through a pull request (#1104) whose path is still untested live, and pulling
// over uncommitted or unpushed work is how a component gets wedged. A status we
// cannot read is treated the same as a dirty one: this does not blind-pull.
async function updateRepository(deps) {
  const { request } = deps;
  const url = `${API_ROOT}/projects/${PROJECT}/repository/`;

  const status = await request("GET", url);
  if (!isOk(status) || !status.body || typeof status.body !== "object") {
    return `repository status unreadable (HTTP ${status.status}) - not pulling blind; run Update in the UI once you have checked outgoing commits are 0`;
  }
  const pending = ["needs_commit", "needs_push"].filter((flag) => status.body[flag]);
  if (pending.length) {
    return `repository has pending local work (${pending.join(", ")}) - not pulling; resolve it in the UI first, then re-run --finish`;
  }

  const response = await request("POST", url, { operation: "update" });
  if (!isOk(response)) {
    return `repository update failed (HTTP ${response.status}): ${describeBody(response.body)}`;
  }
  return null;
}

// The alert names on one component, or null when the endpoint cannot be read -
// alerts need the token, and the API exposes no severity field, so this reports
// names for a human to judge rather than deciding what counts as an error.
async function fetchAlerts(slug, deps) {
  const { request } = deps;
  const response = await request("GET", `${API_ROOT}/components/${PROJECT}/${slug}/alerts/`);
  if (response.status !== 200 || !response.body || !Array.isArray(response.body.results)) {
    return null;
  }
  return response.body.results.map((alert) => alert.name);
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
  if (!isOk(patched)) {
    throw new Error(
      `patching "${slug}" failed (HTTP ${patched.status}): ${describeBody(patched.body)}`,
    );
  }

  const after = await request("GET", url);
  const indent = indentOf(after.body);
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

// Pure: did the API accept the call? Every writing path in this file asks this.
function isOk(response) {
  return response.status >= 200 && response.status < 300;
}

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
  if (!isOk(created)) {
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

// Plain text over HTTP, for reading locale files off the tracked branch. No token
// goes anywhere near this - it is a public read from GitHub, not the Weblate API.
async function httpText(url) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  return { status: response.status, text: await response.text() };
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

// Runs `step` over every item, collecting failures instead of stopping at the
// first one: one rejected component should not strand the rest of the queue.
// Returns the failures, each already labelled, for the caller to report.
async function runEach(items, label, step, logError) {
  const failures = [];
  for (const item of items) {
    try {
      await step(item);
    } catch (error) {
      failures.push(`${label(item)}: ${error.message}`);
      logError(`FAILED ${label(item)}: ${error.message}`);
    }
  }
  return failures;
}

// Repairs every drifted component. The console is injected rather than reached
// for, so the whole path stays testable without capturing global output.
async function repairIndents(components, deps) {
  const { request, log = () => {}, logError = () => {} } = deps;
  return runEach(
    components,
    (c) => c.slug,
    (c) => fixComponentIndent(c, { request, log }),
    logError,
  );
}

function hasToken() {
  if (process.env.WEBLATE_API_TOKEN) return true;
  console.error("WEBLATE_API_TOKEN is not set - refusing to run the pass.");
  return false;
}

// Runs the closing step: pull the repository, then report what the project looks
// like afterwards. Returns the problems found, so --apply and --finish agree on
// what "clean" means. The console is injected rather than reached for, matching
// the rest of the file.
async function finishPass(namespaces, deps) {
  const { request, log = () => {}, logError = () => {} } = deps;
  log("\nUpdating the project repository...");
  const updateProblem = await updateRepository({ request });
  if (updateProblem) logError(updateProblem);

  const components = (await fetchAllComponents(request)).filter((c) => !c.is_glossary);
  const stats = await request("GET", `${API_ROOT}/projects/${PROJECT}/statistics/`);
  const statistics = stats.status === 200 ? stats.body : {};

  // The API exposes no severity on alerts, so this lists them rather than
  // pretending to sort errors from warnings - #1103's "zero error-level
  // diagnostics" bar is still a human call, just no longer a 20-click one.
  let anyAlerts = false;
  const unreadable = [];
  for (const component of components) {
    const alerts = await fetchAlerts(component.slug, { request });
    // An unreadable component is NOT a quiet one. Alerts need a token with
    // component-manage rights, and silently folding a 403 into "nothing to
    // report" would hand back a clean bill of health on the exact check the
    // Libre approval is gated on (#1103).
    if (alerts === null) {
      unreadable.push(component.slug);
      log(`  ${component.slug}: alerts unreadable`);
      continue;
    }
    if (alerts.length) {
      anyAlerts = true;
      log(`  ${component.slug}: ${alerts.join(", ")}`);
    }
  }
  if (anyAlerts) log("  ^ the API exposes no severity - check these read as warnings, not errors.");
  else if (!unreadable.length) log("  no alerts reported on any component");

  const problems = healthProblems({ statistics, namespaces, components });
  if (unreadable.length) {
    problems.push(
      `alerts could not be read on ${unreadable.length} component(s) (${unreadable.join(", ")}) - ` +
        `the zero-errors confirmation was NOT made; check the project page before revoking the token`,
    );
  }
  for (const p of problems) logError(p);
  if (updateProblem) problems.push(updateProblem);
  if (!problems.length) {
    log(
      `\n${components.length} components tracked, 0 failing checks. Spot-check one namespace's ` +
        `bg strings, then revoke the API token.`,
    );
  }
  return problems;
}

// Pure: the exit code for a completed --apply. Withheld namespaces are a correct
// outcome but not a finished pass, so they still exit non-zero - nothing should
// be able to read a green run as "all 20 tracked".
function passExitCode({ failures, problems, withheld }) {
  return failures.length || problems.length || withheld.length ? 1 : 0;
}

async function main(argv) {
  const apply = argv.includes("--apply");
  const verifyOnly = argv.includes("--verify");
  const fixIndent = argv.includes("--fix-indent");
  const finish = argv.includes("--finish");
  // --apply already includes the repair and the finish, so combining them is a no-op.
  const repairOnly = fixIndent && !apply;
  const finishOnly = finish && !apply;
  const request = httpRequest;

  // Refuse before the first network call: exiting mid-fetch aborts an in-flight
  // request and Node on Windows turns that into a libuv assertion, which replaces
  // this exit code with a crash.
  if ((apply || fixIndent || finish) && !hasToken()) {
    process.exitCode = 2;
    return;
  }

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

  if (finishOnly) {
    const problems = await finishPass(namespaces, { request });
    process.exitCode = problems.length ? 1 : 0;
    return;
  }

  const needIndentFix = componentsNeedingIndentFix(tracked);

  if (repairOnly) {
    if (!needIndentFix.length) {
      console.log(`Every component already indents at ${JSON_INDENT} - nothing to repair.`);
      return;
    }
    const failed = await repairIndents(needIndentFix, {
      request,
      log: console.log,
      logError: console.error,
    });
    process.exitCode = failed.length ? 1 : 0;
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
        needIndentFix.map((c) => `${c.slug} (${indentOf(c)})`).join(", "),
    );
  }

  // Screen against the branch Weblate tracks before anything is created. This
  // needs no token, so a plain dry run answers the "is it safe to run yet?"
  // question that has held this pass across four sittings.
  const { ready, withheld } = missing.length
    ? await screenNamespaces(missing, rootComponent(components), { fetchText: httpText })
    : { ready: [], withheld: [] };
  for (const { ns, reason } of withheld) {
    console.log(`Withheld: ${ns} - ${reason}`);
  }
  if (withheld.length) {
    console.log(
      `${withheld.length} namespace(s) wait for a dev->main release. The rest are created now; ` +
        `finishing them costs a second token sitting after that release.`,
    );
  }

  if (!apply) {
    if (ready.length) {
      console.log("\nDry run. Payload for the first one:");
      console.log(JSON.stringify(buildPayload(ready[0]), null, 2));
    }
    const work = [
      ready.length ? `create ${ready.length} of them` : null,
      needIndentFix.length ? "repair the indents" : null,
    ]
      .filter(Boolean)
      .join(" and ");
    console.log(
      work
        ? `\nRe-run with --apply and WEBLATE_API_TOKEN set to ${work}.`
        : `\nNothing can be created yet.`,
    );
    return;
  }

  const failures = await runEach(
    ready,
    (ns) => ns,
    async (ns) => {
      await createComponent(ns, { request, log: console.log });
      console.log(`created ${ns}`);
    },
    console.error,
  );

  // Repair the pre-existing components in the same pass, so the whole sitting is
  // one command and the ephemeral token is only needed once.
  failures.push(
    ...(await repairIndents(needIndentFix, {
      request,
      log: console.log,
      logError: console.error,
    })),
  );

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
  }

  // Same sitting, same token: pull the repository and report the project's health
  // rather than leaving it as a printed to-do the owner does by hand. This runs
  // even after a failed creation - a partly-finished pass is exactly when the
  // owner most needs to see where the project actually stands.
  const problems = await finishPass(namespaces, {
    request,
    log: console.log,
    logError: console.error,
  });
  process.exitCode = passExitCode({ failures, problems, withheld });
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
  fetchAlerts,
  finishPass,
  fixComponentIndent,
  healthProblems,
  passExitCode,
  indentFixPayload,
  indentOf,
  namespacesFromFilenames,
  pluralCollisions,
  rawFileUrl,
  repairIndents,
  rootComponent,
  screenNamespaces,
  selectMissing,
  updateRepository,
  verifyComponent,
};
