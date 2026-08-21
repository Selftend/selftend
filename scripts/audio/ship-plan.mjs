/**
 * The shipping set and its size budget, minus the I/O (#1210).
 *
 * #1210's fifth acceptance check is "**Budget**: 21 files, ~3.21 MB, under the
 * 4.0 MB ceiling", and until this file existed it was the one check on that list
 * with no instrument behind it. Every other check had one: loudness and true peak
 * are gated by `postprocess run`, leading silence by `edgeSilence` on the finished
 * file (#1393), the seam by `seamcheck`. The budget was a number in a ticket body
 * that nobody could evaluate, on a pass that cannot be re-run.
 *
 * Kept apart from the script that reads the disk for the reason `take-gate.mjs`,
 * `audition-plan.mjs` and `manifest-plan.mjs` are: everything here is a pure
 * function of the catalog and of file sizes, so the whole decision surface tests
 * without ffmpeg, without a key, and without a rendered byte.
 *
 * ☠️ THE SHIPPING SET SPANS BOTH ROUNDS. It is not `clipsForRound(round)` — the
 * two bells are Round A's (#1159) and everything else is Round B's, and the app
 * ships all of them together. A budget answered per round would always report a
 * set comfortably under a ceiling that the whole set is what has to fit.
 */

import { choiceKey } from "./audition-plan.mjs";
import { SFX_CLIPS, VOICE_CUES, VOICES, outputSpecFor } from "./catalog.mjs";

/**
 * The ceiling #1138 fixed, in bytes.
 *
 * ☠️ MEBIBYTES, NOT MEGABYTES, and the difference is 194 KB of headroom on a set
 * with only ~840 KB of it. #1138 reports today's uncompressed set as "2.854 MB"
 * and the sixteen shipped `.wav` files total 2,992,420 bytes — which is 2.854
 * MiB and 2.992 MB, so the unit that ticket decided in is unambiguous.
 */
export const SHIP_BUDGET_BYTES = 4 * 1024 * 1024;

/** How many finished files the set has, stated so a survey can disagree loudly. */
export const SHIP_FILE_COUNT = 21;

/**
 * The finished file one shipping unit is written to.
 *
 * ☠️ A VOICE CUE'S NAME MUST CARRY ITS VOICE. `postprocess run --clip guide_inhale`
 * used to default its output to `guide_inhale.m4a` whichever voice the master came
 * from, so post-processing the male take wrote over the female's finished file and
 * the pass ended with twenty files where it needs twenty-one — silently, because
 * nothing counted them. That is the same shape as `render` producing eleven clips
 * of nineteen (#1317) and the audition's own status meter reporting a settled set
 * with the voice half untouched (#1393), one subsystem further along.
 *
 * The separator is a dot rather than `_` or `-` because both of those already
 * appear inside the ids this joins (`guide_inhale`, `guided-male`), and a name
 * that can be parsed two ways is a name that will be.
 *
 * ⚠️ Both voices carry the suffix, including the female one that ships today as a
 * bare `guide_inhale.wav`. An asymmetric scheme — the default voice bare, the new
 * one suffixed — is how "the default voice" quietly becomes "the only voice", and
 * these are intermediate files anyway: the app-side names are #1210's handover to
 * `/to-tickets`, not this file's call.
 *
 * @param {{clip: string, voice?: string|null}} unit
 * @returns {string}
 */
export function shipFileName({ clip, voice = null }) {
  const isVoiceCue = VOICE_CUES.some((cue) => cue.id === clip);
  if (isVoiceCue && !voice) {
    throw new Error(
      `"${clip}" is a voice cue and ships once per voice — name the voice ` +
        `(${VOICES.map((v) => v.id).join(", ")}), or the two takes overwrite each other`,
    );
  }
  if (!isVoiceCue && voice) {
    throw new Error(`"${clip}" is a sound effect and ships once — it has no voice`);
  }
  return voice ? `${clip}.${voice}.m4a` : `${clip}.m4a`;
}

/**
 * Every finished file the app ships, as units.
 *
 * The thirteen sound effects plus one file per cue per voice: 13 + 4 x 2 = 21,
 * which is the count #1138 and #1210 both quote. `seconds` is the catalog's
 * rendered length for a sound effect and **null** for a voice cue, because how
 * long a cue takes to say is not a decision anyone made — it comes back from TTS.
 *
 * @returns {{id: string, clip: string, klass: string, voice: string|null, file: string,
 *            seconds: number|null, bitrate: string, channels: number}[]}
 */
export function shippingUnits() {
  const sfx = SFX_CLIPS.map((clip) => {
    const spec = outputSpecFor(clip.id);
    return {
      id: choiceKey({ clip: clip.id, voice: null }),
      clip: clip.id,
      klass: spec.klass,
      voice: null,
      file: shipFileName({ clip: clip.id }),
      seconds: clip.durationSeconds,
      bitrate: spec.bitrate,
      channels: spec.channels,
    };
  });

  const voice = VOICE_CUES.flatMap((cue) => {
    const spec = outputSpecFor(cue.id);
    return VOICES.map((v) => ({
      id: choiceKey({ clip: cue.id, voice: v.id }),
      clip: cue.id,
      klass: spec.klass,
      voice: v.id,
      file: shipFileName({ clip: cue.id, voice: v.id }),
      // Not zero. A cue whose length nobody knows yet must not weigh nothing in a
      // budget — `predictShipping` reports it as unknown instead of adding 0.
      seconds: null,
      bitrate: spec.bitrate,
      channels: spec.channels,
    }));
  });

  return [...sfx, ...voice];
}

/**
 * How a total stands against the ceiling — the one place that comparison lives.
 *
 * ⚠️ It was two places for one commit, once in the prediction and once in the
 * survey, and mutation-testing found the asymmetry immediately: only the survey's
 * copy had a boundary test, so flipping the prediction's `>` to `>=` changed the
 * verdict on an exactly-full set and nothing failed. A ceiling implemented twice is
 * a ceiling with two answers, which is the standards finding `/code-review` already
 * raised once on this map (#1359, the billing helpers).
 *
 * The rule is "under the ceiling", and a set landing exactly on it is under it.
 *
 * @param {number} totalBytes
 */
export function budgetVerdict(totalBytes) {
  return {
    totalBytes,
    budgetBytes: SHIP_BUDGET_BYTES,
    headroomBytes: SHIP_BUDGET_BYTES - totalBytes,
    over: totalBytes > SHIP_BUDGET_BYTES,
  };
}

/**
 * Bytes a constant-bitrate stream of this many seconds occupies.
 *
 * ⚠️ A LOWER BOUND, and the prediction says so. It counts the audio payload only;
 * the `.m4a` container adds a few KB of `moov` per file. #1138's published 3.21 MB
 * was computed the same way, so the two agree — but a prediction that lands within
 * a hair of the ceiling should be believed as "too close", never as "it fits".
 *
 * @param {number} seconds
 * @param {string} bitrate as the catalog writes it, e.g. "128k"
 * @returns {number}
 */
export function bytesForSeconds(seconds, bitrate) {
  const kbps = Number.parseFloat(bitrate);
  if (!Number.isFinite(kbps) || kbps <= 0) {
    throw new Error(`unreadable bitrate "${bitrate}" — expected something like "128k"`);
  }
  return (seconds * kbps * 1000) / 8;
}

/**
 * What the set is predicted to weigh, before any of it has been rendered.
 *
 * `secondsFor` fills in the lengths the catalog does not fix — in practice the
 * eight voice cues, measured off the clips shipping today, which say the same
 * words. Returning null for a unit leaves it counted as **unknown** rather than
 * as zero, and the total is then explicitly a floor.
 *
 * @param {ReturnType<typeof shippingUnits>} units
 * @param {(unit: ReturnType<typeof shippingUnits>[number]) => number|null} [secondsFor]
 */
export function predictShipping(units, secondsFor = () => null) {
  const rows = units.map((unit) => {
    const seconds = unit.seconds ?? secondsFor(unit);
    const known = Number.isFinite(seconds) && seconds !== null;
    return {
      ...unit,
      seconds: known ? seconds : null,
      bytes: known ? bytesForSeconds(/** @type {number} */ (seconds), unit.bitrate) : null,
    };
  });

  const unknown = rows.filter((row) => row.bytes === null);
  const totalBytes = rows.reduce((sum, row) => sum + (row.bytes ?? 0), 0);

  return {
    rows,
    unknown,
    ...budgetVerdict(totalBytes),
    // ☠️ A total with unknowns in it is a floor, and calling it anything else on a
    // set that sits at ~80% of its ceiling would be the whole point of the check
    // thrown away.
    complete: unknown.length === 0,
  };
}

/**
 * What the finished set on disk actually is.
 *
 * Matches by exact filename, so the two voices are two rows and a missing half is
 * a named gap rather than a count that happens to add up. Anything in the
 * directory that no unit claims is reported too: a stray file is either a unit
 * misnamed — in which case its real unit reads as missing — or bytes the app will
 * never ship being counted against a ceiling.
 *
 * @param {ReturnType<typeof shippingUnits>} units
 * @param {{name: string, bytes: number}[]} files
 */
export function surveyShipping(units, files) {
  const byName = new Map(files.map((file) => [file.name, file]));
  const claimed = new Set();

  const rows = units.map((unit) => {
    const found = byName.get(unit.file) ?? null;
    if (found) claimed.add(unit.file);
    return { ...unit, present: Boolean(found), bytes: found ? found.bytes : null };
  });

  const missing = rows.filter((row) => !row.present);
  const unexpected = files.filter((file) => !claimed.has(file.name));
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  /** @type {{kind: string, unit: string|null, file?: string, detail: string}[]} */
  const gaps = [];
  for (const row of missing) {
    gaps.push({
      kind: "missing",
      unit: row.id,
      file: row.file,
      detail: "no finished file for this unit",
    });
  }
  for (const file of unexpected) {
    gaps.push({
      kind: "unexpected",
      unit: null,
      file: file.name,
      detail: "a finished file no shipping unit claims",
    });
  }
  const verdict = budgetVerdict(totalBytes);
  const { over } = verdict;
  if (over) {
    gaps.push({
      kind: "over-budget",
      unit: null,
      detail: `${totalBytes} bytes against the ${SHIP_BUDGET_BYTES}-byte ceiling (#1138)`,
    });
  }

  return {
    rows,
    missing,
    unexpected,
    gaps,
    ...verdict,
    // The set is finished only when every unit has a file, nothing else is in the
    // directory, and the whole thing fits. Two of those three were previously
    // unasked.
    complete: missing.length === 0 && unexpected.length === 0 && !over,
  };
}
