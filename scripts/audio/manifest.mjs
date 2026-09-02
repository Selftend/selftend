#!/usr/bin/env node
/**
 * The repo-side manifest — the half of #1141's split that lives in git (#1210).
 *
 * ☠️ WHY THIS EXISTS. #1141 decided the pass is stored in two places: the masters
 * go to Drive `Selftend/app-audio-masters/`, and the repo keeps the prompts and
 * the record, because Sound Effects is seedless and a prompt is the only
 * reproducible artifact there will ever be. The Drive half had an instruction.
 * The repo half had nothing at all: `manifest.jsonl` and `choices.jsonl` both sit
 * inside `audio-masters/`, which is **gitignored**, so the record of an
 * unrepeatable spend was one deleted directory from gone, and no row in either
 * file has ever had a field for where a master was archived. `render` prints
 * "archive every take" and nothing recorded that anyone did.
 *
 * ☠️ That is not paperwork, and Round A is the proof: `write --round A` reports two
 * units and ZERO takes. #1159's bell gate passed and spent 120 credits, but
 * `audio-masters/` is per-worktree and the worktree that rendered them is gone.
 * Whether those two seedless bells still exist anywhere depends entirely on
 * whether someone uploaded them, and nothing recorded it.
 *
 *   node scripts/audio/manifest.mjs write   --round A|B --out <path> [--check]
 *   node scripts/audio/manifest.mjs archive --round A|B --all [--note "..."]
 *   node scripts/audio/manifest.mjs archive --round A|B --file <name> [--note "..."]
 *
 * Spends nothing, needs no ffmpeg and no API key. The logic lives in
 * `manifest-plan.mjs`; this file is the disk and the exit codes.
 *
 * ⚠️ THE COMMITTED FILE CANNOT BE VERIFIED IN CI. Everything it is derived from
 * is gitignored and local to the machine that ran the pass, so `--check` answers
 * "is the committed manifest current *here*" and nothing more. There is no gate
 * that can catch a stale one on a clean checkout, which is the price of the split
 * #1141 chose and is worth saying out loud rather than implying a guard exists.
 *
 * ☠️ AND THAT IS WHY THERE IS NO COMMITTED FILE ANY MORE (#1702). The one this
 * tool wrote, `round-B.manifest.json`, was generated once on 2026-08-21 before a
 * single take was picked and never rewritten, so it said `chosen: 0`, five beds
 * and six textures while nineteen clips shipped with no textures. Nothing could
 * contradict it. `write` therefore no longer has a default target: without
 * `--out` it exits 1 and says where the truthful record lives — the closing
 * comment of #1210, with the masters in `Downloads` per the owner's ruling on
 * #1159. Regenerating the file truthfully is possible (copy the masters in, rule
 * on the attestation wording, adopt the library and synthesised beds and Round
 * A's composer-rendered bells) but was not the route #1702 took.
 */

import { readFile, writeFile, appendFile, mkdir, access } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { clipsForRound, composePrompt, voiceSlotSpec } from "./catalog.mjs";
import { currentChoices, voiceIdentity, voiceSlots } from "./audition-plan.mjs";
import {
  DRIVE_ROOT,
  archiveRow,
  buildManifest,
  currentArchives,
  takeKey,
} from "./manifest-plan.mjs";

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/**
 * ☠️ EVERY PATH HERE IS RESOLVED LAZILY, and that is not a style choice. Babel's
 * CJS transform leaves `import.meta.url` as `null`, so a module-scope
 * `fileURLToPath(import.meta.url)` throws the moment jest imports this file and
 * the whole suite dies before a single test runs. `render.mjs` survives it only
 * by keeping its fallback on the right of `??` and being handed
 * `AUDIO_MASTERS_DIR`; a function is the version that cannot be got wrong.
 */
const moduleDir = () => (import.meta.url ? dirname(fileURLToPath(import.meta.url)) : null);

/**
 * The same directory, for the two callers that genuinely cannot do without it.
 *
 * ☠️ Says which knob to turn instead of dying inside `node:path` as
 * `The "path" argument must be of type string ... Received null`, which is what
 * a bare `fileURLToPath(null)` gives you and which names neither the cause nor
 * the fix.
 */
function requireModuleDir() {
  const dir = moduleDir();
  if (dir) return dir;
  throw new Error(
    "cannot resolve this module's own directory (import.meta.url is null under " +
      "babel/jest) — pass AUDIO_MASTERS_DIR and --out",
  );
}

/** Same `AUDIO_MASTERS_DIR` override and repo-relative fallback as `render.mjs`. */
const outDir = () =>
  process.env.AUDIO_MASTERS_DIR ?? join(requireModuleDir(), "../../audio-masters");

/**
 * A repo-relative path when the target is inside the repo, the full path when it
 * is not — and the full path when the repo root cannot be resolved at all, since
 * a cosmetic shortening is never worth failing a command over.
 */
const showPath = (target) => {
  const root = moduleDir();
  if (!root) return target;
  const rel = relative(join(root, "../.."), target);
  return rel.startsWith("..") ? target : rel;
};

const roundDir = (round) => join(outDir(), `round-${round}`);
const archivePath = (round) => join(roundDir(round), "archive.jsonl");

/**
 * Where the record lives now that the repo no longer carries one (#1702).
 *
 * `write` used to default to `scripts/audio/round-<R>.manifest.json` beside the
 * prompts. That file is gone — see the docblock — and a default target is exactly
 * how a stale one would come back, so the pointer is what a bare `write` prints.
 */
export const RECORD_POINTER =
  "the repo carries no committed manifest since #1702: the stale round-B.manifest.json " +
  "was deleted. The truthful record is the closing comment of #1210 " +
  "(https://github.com/Selftend/selftend/issues/1210), with the masters in " +
  "Downloads per the owner's ruling on #1159. Pass --out <path> to build a record " +
  "from audio-masters/ on this disk.";

async function readJsonl(path) {
  try {
    return (await readFile(path, "utf8"))
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertRound(round) {
  if (round !== "A" && round !== "B") throw new Error(`--round must be A or B, got ${round ?? ""}`);
  return round;
}

/** Every unit of the round, both halves, from the one definition each has. */
function unitsOf(round) {
  return {
    clips: clipsForRound(round),
    slots: voiceSlots(voiceSlotSpec(round)),
  };
}

async function readRound(round) {
  const rows = await readJsonl(join(roundDir(round), "manifest.jsonl"));
  const choices = currentChoices(await readJsonl(join(roundDir(round), "choices.jsonl")));
  const archives = currentArchives(await readJsonl(archivePath(round)));
  const measurements = await readMeasurements(round);
  return { rows, choices, archives, measurements };
}

/**
 * What each take measured once it had been through the shipping chain.
 *
 * ⚠️ #1136 sets each voice's `introMs` from the MEASURED duration of the chosen
 * `guide_intro`, never from an estimate — and `postprocess run` is the only place
 * that number is produced. Until now it existed solely on the audition page,
 * which `build` overwrites on every run: the one measurement required to outlive
 * the pass lived only in the artifact most likely to be thrown away.
 *
 * The lead silence rides along for the same reason. It is #1134's one hard rule
 * and the four `guide_*` clips are the only files in the app that have ever
 * carried any (#1138), so the record should say what the shipped file measured
 * rather than only that it passed on the day.
 *
 * Absent until an audition has been built, which is honest — a take nobody has
 * run through the chain has no measurement, and a zero would claim otherwise.
 */
async function readMeasurements(round) {
  const path = join(outDir(), "audition", `round-${round}`, "audition.json");
  const results = await readFile(path, "utf8")
    .then(JSON.parse)
    .catch(() => []);
  const byTake = new Map();
  for (const result of results) {
    if (!result?.file || !result.klass || result.error) continue;
    byTake.set(takeKey({ klass: result.klass, file: result.file }), {
      durationSeconds: result.durationSeconds ?? null,
      leadMs: result.edges?.leadMs ?? null,
      tailMs: result.edges?.tailMs ?? null,
    });
  }
  return byTake;
}

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------

/**
 * Rebuild the committed record, or check the committed one against the disk.
 *
 * ⚠️ The options are typed rather than left to inference: `out = null` infers the
 * type `null`, which then rejects the string every real caller passes. Same trap
 * the voice pick hit one ticket ago — type the API, never cast at the call site.
 *
 * @param {string} round
 * @param {{out?: string|null, check?: boolean}} [options]
 * @returns {Promise<boolean>} whether the round is current AND finished
 * @throws when `out` is missing — there is no committed file to default to (#1702)
 */
export async function write(round, { out = null, check = false } = {}) {
  // ☠️ Loudly, and before a byte is read: a default target is how the stale
  // record came to exist, and a quiet fallback would let it come back.
  if (!out) throw new Error(`write needs --out: ${RECORD_POINTER}`);
  const { clips, slots } = unitsOf(round);
  const { rows, choices, archives, measurements } = await readRound(round);
  const doc = buildManifest({
    round,
    clips,
    slots,
    promptFor: (clip) => composePrompt(clip.text),
    identityFor: voiceIdentity,
    rows,
    choices,
    archives,
    measurements,
    at: new Date().toISOString(),
  });

  const target = out;
  const body = `${JSON.stringify(doc, null, 2)}\n`;

  if (check) {
    // ⚠️ `generatedAt` moves every run, so compare everything else. A committed
    // file that differs anywhere else means the pass moved on and nobody re-wrote
    // the record — which on a seedless pass is how a decision gets lost.
    const previous = await readFile(target, "utf8").catch(() => null);
    const current =
      previous !== null &&
      JSON.stringify({ ...JSON.parse(previous), generatedAt: null }) ===
        JSON.stringify({ ...doc, generatedAt: null });
    if (previous === null) console.log(`⚠️ ${showPath(target)} has never been written.`);
    else if (current) console.log(`${showPath(target)} is current.`);
    else console.log(`⚠️ ${showPath(target)} is STALE — re-run without --check.`);
    reportGaps(doc, round);
    // ☠️ BOTH CONDITIONS, AND DROPPING THE SECOND WAS A REAL BUG: `--check` exited 0
    // against 65 gaps on a pass nobody had started. It is the obvious way to assert
    // the gate without dirtying the tree, and USAGE and the README both promise
    // `write` fails "while any unit is unpicked or any take unarchived" — a mode of
    // `write` that quietly keeps half that contract is the same green light on a
    // half-done pass this record exists to refuse (#1317, #1393).
    return current && doc.complete;
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);

  const { units, takes, chosen, archived, credits } = doc.totals;
  console.log(`Round ${round}: ${units} units, ${takes} take(s) on file`);
  console.log(`  chosen    ${chosen}/${units}`);
  console.log(`  archived  ${archived}/${takes} attested to ${DRIVE_ROOT}/`);
  console.log(
    `  credits   ${credits.charged} charged (character-cost header), ` +
      `${credits.estimated} only ever estimated`,
  );
  console.log(`\nWritten: ${showPath(target)}`);

  reportGaps(doc, round);
  return doc.complete;
}

/** What #1210 still owes on this round, counted by kind. Shared by both branches. */
function reportGaps(doc, round) {
  if (doc.complete) {
    console.log(`\nEvery unit of round ${round} is picked and every take is archived.`);
    return;
  }
  const byKind = new Map();
  for (const gap of doc.gaps) byKind.set(gap.kind, (byKind.get(gap.kind) ?? 0) + 1);
  console.log(`\n⚠️ ${doc.gaps.length} gap(s) — #1210's definition of done is not met:`);
  for (const [kind, count] of byKind) console.log(`  ${String(count).padStart(4)}  ${kind}`);
  console.log(
    `\nnext: node scripts/audio/audition.mjs status --round ${round}\n` +
      `      node scripts/audio/manifest.mjs archive --round ${round} --all`,
  );
}

// ---------------------------------------------------------------------------
// archive
// ---------------------------------------------------------------------------

/**
 * Record that masters reached Drive.
 *
 * ⚠️ THIS ATTESTS, IT DOES NOT UPLOAD. Nothing in this repo talks to Drive — the
 * upload is a human action per #1141, and this is where they say it happened so
 * that the committed record can stop calling the take missing.
 *
 * A take whose master is not on this disk is refused rather than attested: it
 * cannot have been uploaded from here, and an attestation is only worth anything
 * if it is never given for free.
 *
 * @param {string} round
 * @param {{file?: string|null, note?: string|null, all?: boolean}} [options]
 * @returns {Promise<boolean>} whether every wanted take is now attested
 */
export async function archive(round, { file = null, note = null, all = false } = {}) {
  const { rows, archives } = await readRound(round);
  if (!rows.length) throw new Error(`no takes on file for round ${round} — nothing to archive`);

  const wanted = all ? rows : rows.filter((row) => row.file === file);
  if (!wanted.length) {
    throw new Error(
      `no take named "${file}" in round ${round} — pass --all, or one of: ` +
        `${rows
          .slice(0, 5)
          .map((row) => row.file)
          .join(", ")}${rows.length > 5 ? ", ..." : ""}`,
    );
  }

  const at = new Date().toISOString();
  let attested = 0;
  let already = 0;
  let absent = 0;
  for (const row of wanted) {
    if (archives.has(takeKey(row))) {
      already += 1;
      continue;
    }
    if (!(await exists(join(roundDir(round), row.klass, row.file)))) {
      console.log(`  skipped  ${row.file} — not on this disk, so it was not uploaded from here`);
      absent += 1;
      continue;
    }
    await appendFile(
      archivePath(round),
      `${JSON.stringify(archiveRow({ klass: row.klass, file: row.file, at, note }))}\n`,
    );
    attested += 1;
  }

  console.log(
    `Attested ${attested} take(s) to ${DRIVE_ROOT}/` +
      `${already ? `, ${already} already recorded` : ""}` +
      `${absent ? `, ${absent} missing locally` : ""}.`,
  );
  console.log(
    `⚠️ This records YOUR claim that the upload happened — nothing here reads Drive.\n` +
      `next: node scripts/audio/manifest.mjs write --round ${round}`,
  );
  return absent === 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function flag(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const USAGE = `
Usage:
  node scripts/audio/manifest.mjs write   --round A|B --out <path> [--check]
  node scripts/audio/manifest.mjs archive --round A|B --all [--note "..."]
  node scripts/audio/manifest.mjs archive --round A|B --file <name> [--note "..."]

  write    builds the record from audio-masters/ into --out, and exits 1 while
           any unit is unpicked or any take unarchived (#1210's definition of done).
           --out is required: the repo carries no committed manifest since #1702
           (the record is the closing comment of #1210; masters in Downloads, #1159).
  --check  compares instead of writing. Local only — everything it reads is
           gitignored, so no CI gate can catch a stale manifest.
  archive  records that masters reached Drive ${DRIVE_ROOT}/ (#1141).
           An attestation, not an upload: nothing here reads Drive.

Spends nothing. Needs no ffmpeg and no API key.
`.trim();

async function main() {
  const command = process.argv[2];
  if (command === "write") {
    const ok = await write(assertRound(flag("round")), {
      out: flag("out"),
      check: process.argv.includes("--check"),
    });
    process.exit(ok ? 0 : 1);
  } else if (command === "archive") {
    const all = process.argv.includes("--all");
    const file = flag("file");
    if (all === Boolean(file)) throw new Error("pass exactly one of --all or --file <name>");
    const ok = await archive(assertRound(flag("round")), { file, note: flag("note"), all });
    process.exit(ok ? 0 : 1);
  } else {
    console.log(USAGE);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
