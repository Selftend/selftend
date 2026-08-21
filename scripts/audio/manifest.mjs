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
 * unrepeatable spend was one `rm -rf` from gone, and no row in either file has
 * ever had a field for where a master was archived. `render` prints "archive
 * every take" and nothing recorded that anyone did.
 *
 *   node scripts/audio/manifest.mjs write   --round A|B [--out <path>] [--check]
 *   node scripts/audio/manifest.mjs archive --round A|B --all [--note "..."]
 *   node scripts/audio/manifest.mjs archive --round A|B --file <name> [--note "..."]
 *
 * Spends nothing, needs no ffmpeg and no API key.
 *
 * ⚠️ THE COMMITTED FILE CANNOT BE VERIFIED IN CI. Everything it is derived from
 * is gitignored and local to the machine that ran the pass, so `--check` answers
 * "is the committed manifest current *here*" and nothing more. There is no gate
 * that can catch a stale one on a clean checkout, which is the price of the split
 * #1141 chose and is worth saying out loud rather than implying a guard exists.
 */

import { readFile, writeFile, appendFile, mkdir, access } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { clipsForRound, composePrompt, voiceSlotSpec } from "./catalog.mjs";
import {
  STATUS,
  choiceKey,
  currentChoices,
  statusOf,
  statusOfVoice,
  voiceIdentity,
  voiceSlots,
} from "./audition-plan.mjs";

/** The Drive layout #1141 accepted, a sibling of the Premiere folder. */
export const DRIVE_ROOT = "Selftend/app-audio-masters";

/**
 * The four folders that layout has, and the only classes a take can be filed
 * under. A fifth would be a typo, and a typo here records a path to a master that
 * cannot be re-made in a folder nobody will look in.
 */
export const DRIVE_FOLDERS = ["bells", "beds", "textures", "voice"];

/**
 * Fields copied from a manifest row onto its record, when the row carries them.
 *
 * A whitelist rather than a spread: the two halves of the pass write different
 * row shapes (a sound effect has an attempt index and a measurement, a voice cue
 * has a voiceId and a seed), and both shapes have grown fields across five
 * tickets. Naming them keeps the committed artifact stable when a new internal
 * field appears, and keeps `record: "chosen"` rows from ever being mistaken for
 * takes if one is read in by accident.
 */
const TAKE_FIELDS = [
  "candidate",
  "attempt",
  "file",
  "klass",
  "voice",
  "axis",
  "voiceId",
  "prompt",
  "text",
  "model",
  "voiceSettings",
  "outputFormat",
  "durationSeconds",
  "promptInfluence",
  "loop",
  "loudnessTarget",
  "seed",
  "bytes",
  "contentType",
  "derivedChannels",
  "channelRatio",
  "dbtp",
  "lufs",
  "accepted",
  "creditsCharged",
  "creditsEstimate",
];

/**
 * Where one take lives in Drive.
 *
 * @param {string} klass one of {@link DRIVE_FOLDERS}
 * @param {string} file the master's filename, as `render` wrote it
 * @param {{root?: string}} [options]
 * @returns {string}
 */
export function drivePath(klass, file, { root = DRIVE_ROOT } = {}) {
  if (!DRIVE_FOLDERS.includes(klass)) {
    throw new Error(
      `unknown class "${klass}" — Drive holds ${DRIVE_FOLDERS.join(", ")} (#1141), and a ` +
        `master filed outside them is a master nobody will find`,
    );
  }
  return `${root}/${klass}/${file}`;
}

/** Same path, or null when the class is not one this layout has. */
function drivePathOrNull(klass, file) {
  try {
    return drivePath(klass, file);
  } catch {
    return null;
  }
}

/** The key one take is filed under, in both the archive log and the record. */
export function takeKey({ klass, file }) {
  return `${klass}/${file}`;
}

/**
 * An attestation that one master reached Drive.
 *
 * ☠️ THIS IS A THIRD FILE, NOT A MANIFEST ROW. `planSlot` classifies any row
 * without an `attempt` and a `dbtp` as a superseded take of its slot, so an
 * `archived` row appended to `manifest.jsonl` would be counted against the slot
 * and quietly corrupt the survey that quotes the cost of a spend nobody can
 * repeat — the same reason `choices.jsonl` is its own file (#1346). Archive rows
 * go in `archive.jsonl` and nothing else reads them.
 *
 * ⚠️ It is a CLAIM, not a check. Nothing here talks to Drive; the row records
 * that a person said the upload happened, and when.
 *
 * @param {{klass: string, file: string, at: string, note?: string|null, root?: string}} args
 * @returns {{record: string, klass: string, file: string, path: string, note: string|null, at: string}}
 */
export function archiveRow({ klass, file, at, note = null, root = DRIVE_ROOT }) {
  return { record: "archived", klass, file, path: drivePath(klass, file, { root }), note, at };
}

/**
 * The live attestation per take — last write wins, so re-uploading simply
 * supersedes. Append-only for the same reason choices are: the trail of what was
 * archived when is worth as much as the final state if a master ever goes missing.
 *
 * @param {Record<string, any>[]} rows
 * @returns {Map<string, Record<string, any>>}
 */
export function currentArchives(rows) {
  const byTake = new Map();
  for (const row of rows) {
    if (row.record !== "archived") continue;
    byTake.set(takeKey(row), row);
  }
  return byTake;
}

/** Total of one numeric field across takes, ignoring the rows that lack it. */
function sumField(placed, field) {
  return placed.reduce(
    (total, { take }) => total + (Number.isFinite(take[field]) ? take[field] : 0),
    0,
  );
}

/** One take, as the committed record holds it. */
function takeRecord(row, { status, archived }) {
  /** @type {Record<string, any>} */
  const record = {};
  for (const field of TAKE_FIELDS) {
    // `in` rather than a truthiness test: `seed: null` and `dbtp: null` both mean
    // something specific here — no seed exists for Sound Effects at all, and a
    // null measurement is #1320's honest record of a digitally silent take.
    if (field in row) record[field] = row[field];
  }
  record.status = status;
  record.drivePath = drivePathOrNull(row.klass, row.file);
  record.archivedAt = archived?.at ?? null;
  return record;
}

/**
 * The whole round as one document, plus everything still owed on it.
 *
 * ☠️ THE ROUND IS BOTH HALVES. `clipsForRound` filters `SFX_CLIPS`, so a list
 * built from it alone is eleven units of nineteen — the omission that has now hit
 * `render` (#1317), the audition and its `status` meter (#1393), and would hit the
 * definition-of-done artifact here, which is the one place it would be permanent.
 * The voice cues are passed in as `slots` and counted the same as any bed.
 *
 * ⚠️ Nothing is dropped for being unusable. Superseded takes, takes below the
 * level gate and takes whose unit has left the catalog are all recorded, because
 * every one of them cost the same credits and none of them can be drawn again.
 *
 * @param {{
 *   round: string,
 *   clips: Record<string, any>[],
 *   slots: Record<string, any>[],
 *   promptFor: (clip: any) => string,
 *   identityFor: (slot: any) => string,
 *   rows: Record<string, any>[],
 *   choices: Map<string, Record<string, any>>,
 *   archives: Map<string, Record<string, any>>,
 *   at: string,
 * }} args
 */
export function buildManifest({
  round,
  clips,
  slots,
  promptFor,
  identityFor,
  rows,
  choices,
  archives,
  at,
}) {
  const specs = [
    ...clips.map((clip) => ({
      id: clip.id,
      clip: clip.id,
      klass: clip.klass,
      voice: null,
      voiceId: null,
      settledOn: promptFor(clip),
      candidates: clip.candidates ?? null,
      /** @param {Record<string, any>} row */
      grade: (row) => statusOf(row, promptFor(clip)),
    })),
    ...slots.map((slot) => ({
      id: slot.id,
      clip: slot.clipId,
      klass: slot.klass,
      voice: slot.voice,
      voiceId: slot.voiceId ?? null,
      settledOn: identityFor(slot),
      candidates: slot.candidates ?? null,
      /** @param {Record<string, any>} row */
      grade: (row) => statusOfVoice(row, identityFor(slot)),
    })),
  ];

  const byUnit = new Map();
  for (const row of rows) {
    const key = choiceKey({ clip: row.clip, voice: row.voice ?? null });
    byUnit.set(key, [...(byUnit.get(key) ?? []), row]);
  }

  /** @type {{kind: string, unit: string|null, file?: string, detail?: string}[]} */
  const gaps = [];
  const units = specs.map((spec) => {
    const takes = (byUnit.get(spec.id) ?? []).map((row) =>
      takeRecord(row, { status: spec.grade(row), archived: archives.get(takeKey(row)) }),
    );
    const pick = choices.get(spec.id) ?? null;
    const chosen = pick
      ? {
          candidate: pick.candidate,
          file: pick.file,
          // The prompt the chosen take came FROM, not the catalog's current one —
          // that difference is the whole point of `superseded` below (#1346).
          prompt: pick.prompt,
          note: pick.note ?? null,
          at: pick.at,
          superseded: pick.prompt !== spec.settledOn,
          drivePath: drivePathOrNull(spec.klass, pick.file),
        }
      : null;

    if (!takes.some((take) => take.status !== STATUS.superseded)) {
      gaps.push({
        kind: "no-take",
        unit: spec.id,
        detail: "no take of the prompt asked for today",
      });
    }
    if (!chosen) {
      gaps.push({ kind: "no-pick", unit: spec.id, detail: "nobody has chosen a candidate" });
    } else if (chosen.superseded) {
      gaps.push({
        kind: "stale-pick",
        unit: spec.id,
        detail: "the pick names a prompt the catalog has since rewritten",
      });
    }

    return {
      id: spec.id,
      clip: spec.clip,
      klass: spec.klass,
      voice: spec.voice,
      voiceId: spec.voiceId,
      candidates: spec.candidates,
      settledOn: spec.settledOn,
      chosen,
      takes,
    };
  });

  // ☠️ A take whose unit is no longer in the catalog — a voice swapped out after a
  // shortlist was heard, a clip renamed — is kept, not dropped. It was really
  // rendered and really paid for, and the one thing this artifact exists to
  // prevent is a spend disappearing from the record.
  const known = new Set(specs.map((spec) => spec.id));
  const orphanTakes = [];
  /** @type {{unit: string, take: Record<string, any>}[]} */
  const placed = units.flatMap((unit) => unit.takes.map((take) => ({ unit: unit.id, take })));
  for (const [key, group] of byUnit) {
    if (known.has(key)) continue;
    for (const row of group) {
      const take = takeRecord(row, {
        status: STATUS.superseded,
        archived: archives.get(takeKey(row)),
      });
      orphanTakes.push(take);
      placed.push({ unit: key, take });
    }
    gaps.push({
      kind: "orphan-take",
      unit: key,
      detail: "takes on file for a unit this round no longer has",
    });
  }

  for (const { unit, take } of placed) {
    if (take.archivedAt) continue;
    // #1141: EVERY take is archived, kept and rejected alike — a rejected take is
    // exactly as unreproducible as a chosen one (#1133).
    gaps.push({
      kind: "unarchived",
      unit,
      file: take.file,
      detail: take.drivePath
        ? `never attested to ${take.drivePath}`
        : `no Drive folder for class "${take.klass}"`,
    });
  }

  return {
    round,
    generatedAt: at,
    driveRoot: DRIVE_ROOT,
    totals: {
      units: units.length,
      chosen: units.filter((unit) => unit.chosen && !unit.chosen.superseded).length,
      takes: placed.length,
      archived: placed.filter(({ take }) => take.archivedAt).length,
      // ☠️ CHARGED AND ESTIMATED ARE NOT INTERCHANGEABLE, and this record must
      // never let one stand in for the other. What a take cost is read off the
      // response's `character-cost` header (#1359); `creditsEstimate` is what the
      // plan guessed beforehand, and the twenty-seven takes already on disk carry
      // only the guess because they predate the header being read at all. Summing
      // them together would report a measured spend the pass never measured.
      credits: {
        charged: sumField(placed, "creditsCharged"),
        estimated: sumField(placed, "creditsEstimate"),
      },
    },
    units,
    orphanTakes,
    gaps,
    complete: gaps.length === 0,
  };
}

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
const moduleDir = () => dirname(fileURLToPath(import.meta.url));

/** Same `AUDIO_MASTERS_DIR` override and repo-relative fallback as `render.mjs`. */
const outDir = () => process.env.AUDIO_MASTERS_DIR ?? join(moduleDir(), "../../audio-masters");

/** A repo-relative path when the target is inside the repo, absolute when it is not. */
const showPath = (target) => {
  const rel = relative(join(moduleDir(), "../.."), target);
  return rel.startsWith("..") ? target : rel;
};

const roundDir = (round) => join(outDir(), `round-${round}`);
const archivePath = (round) => join(roundDir(round), "archive.jsonl");

/** Where the committed record lives — beside the prompts it is the record of. */
export const manifestPath = (round) => join(moduleDir(), `round-${round}.manifest.json`);

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
  return { rows, choices, archives };
}

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------

async function write(round, { out, check }) {
  const { clips, slots } = unitsOf(round);
  const { rows, choices, archives } = await readRound(round);
  const doc = buildManifest({
    round,
    clips,
    slots,
    promptFor: (clip) => composePrompt(clip.text),
    identityFor: voiceIdentity,
    rows,
    choices,
    archives,
    at: new Date().toISOString(),
  });

  const target = out ?? manifestPath(round);
  const body = `${JSON.stringify(doc, null, 2)}\n`;

  if (check) {
    // ⚠️ `generatedAt` moves every run, so compare everything else. A committed
    // file that differs anywhere else means the pass moved on and nobody re-wrote
    // the record — which on a seedless pass is how a decision gets lost.
    const previous = await readFile(target, "utf8").catch(() => null);
    const same =
      previous !== null &&
      JSON.stringify({ ...JSON.parse(previous), generatedAt: null }) ===
        JSON.stringify({ ...doc, generatedAt: null });
    console.log(
      same
        ? `${showPath(target)} is current.`
        : `⚠️ ${showPath(target)} is STALE — re-run without --check.`,
    );
    return same;
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

  if (doc.complete) {
    console.log(`\nEvery unit of round ${round} is picked and every take is archived.`);
    return true;
  }
  const byKind = new Map();
  for (const gap of doc.gaps) byKind.set(gap.kind, (byKind.get(gap.kind) ?? 0) + 1);
  console.log(`\n⚠️ ${doc.gaps.length} gap(s) — #1210's definition of done is not met:`);
  for (const [kind, count] of byKind) console.log(`  ${String(count).padStart(4)}  ${kind}`);
  console.log(
    `\nnext: node scripts/audio/audition.mjs status --round ${round}\n` +
      `      node scripts/audio/manifest.mjs archive --round ${round} --all`,
  );
  return false;
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
 */
async function archive(round, { file, note, all }) {
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
  node scripts/audio/manifest.mjs write   --round A|B [--out <path>] [--check]
  node scripts/audio/manifest.mjs archive --round A|B --all [--note "..."]
  node scripts/audio/manifest.mjs archive --round A|B --file <name> [--note "..."]

  write    rebuilds the committed record from audio-masters/, and exits 1 while
           any unit is unpicked or any take unarchived (#1210's definition of done).
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
