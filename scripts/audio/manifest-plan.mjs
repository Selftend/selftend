/**
 * The repo-side manifest, minus the I/O (#1210).
 *
 * Kept apart from `manifest.mjs` for the reason `audition-plan.mjs` is kept apart
 * from `audition.mjs` and `take-gate.mjs` from `render.mjs`: everything here is a
 * pure function of manifest rows, so the record can be driven from jest without
 * ffmpeg, without a key, and without a single rendered byte. The file that reads
 * the disk and calls `process.exit` is the other one.
 */

import { STATUS, choiceKey, statusOf, statusOfVoice } from "./audition-plan.mjs";

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
export function drivePath(klass, file) {
  if (!isDriveClass(klass)) {
    throw new Error(
      `unknown class "${klass}" — Drive holds ${DRIVE_FOLDERS.join(", ")} (#1141), and a ` +
        `master filed outside them is a master nobody will find`,
    );
  }
  return `${DRIVE_ROOT}/${klass}/${file}`;
}

/** Whether a take's class is one of the four folders the Drive layout has. */
function isDriveClass(klass) {
  return DRIVE_FOLDERS.includes(klass);
}

/** Same path, or null when the class is not one this layout has. */
function drivePathOrNull(klass, file) {
  return isDriveClass(klass) ? drivePath(klass, file) : null;
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
export function archiveRow({ klass, file, at, note = null }) {
  return { record: "archived", klass, file, path: drivePath(klass, file), note, at };
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
function takeRecord(row, { status, archived, measured }) {
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
  // ⚠️ #1136 sets each voice's `introMs` from the MEASURED duration of the chosen
  // `guide_intro`, never an estimate — and `postprocess run` is the only place that
  // number is produced. It lived solely in the audition page, which is rebuilt and
  // thrown away; the record is what has to outlive the pass, so it is joined here.
  // Absent until an audition has been built, which is honest rather than zero.
  record.measured = measured ?? null;
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
 *   measurements?: Map<string, Record<string, any>>,
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
  measurements = new Map(),
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
      takeRecord(row, {
        status: spec.grade(row),
        archived: archives.get(takeKey(row)),
        measured: measurements.get(takeKey(row)),
      }),
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
        measured: measurements.get(takeKey(row)),
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
    // ⚠️ Said inside the artifact, not only in the README, because the file is what
    // outlives the session that wrote it: `archived` counts ATTESTATIONS. Nothing in
    // this repo can read Drive, so a complete record means every take was claimed to
    // be uploaded — never that anyone verified it was.
    archivedMeans: "attested by a person; nothing here reads Drive (#1141)",
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
