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
import { SHIPPED_SFX_CLIPS, VOICE_CUES, VOICES, outputSpecFor, voiceSlotSpec } from "./catalog.mjs";

/**
 * The round whose voice half the app ships — all of it, both voices.
 *
 * #1136 routed the voice pick into Round B and that is where the cues live; the
 * bells are Round A's. Named rather than inlined because `voiceSlotSpec("B")`
 * appearing in a file about the whole ship reads like a scoping mistake, and it is
 * the opposite: it is how this file avoids being a fourth opinion on round
 * membership.
 */
const VOICE_ROUND = "B";

/**
 * The ceiling #1138 fixed, in bytes.
 *
 * ☠️ MEBIBYTES, NOT MEGABYTES, and the difference is 194 KB of headroom on a set
 * with only ~840 KB of it. #1138 reports today's uncompressed set as "2.854 MB"
 * and the sixteen shipped `.wav` files total 2,992,420 bytes — which is 2.854
 * MiB and 2.992 MB, so the unit that ticket decided in is unambiguous.
 */
export const SHIP_BUDGET_BYTES = 4 * 1024 * 1024;

/**
 * How many finished files the set has, stated so a survey can disagree loudly.
 *
 * 27 since #1573: 19, plus the eight Bulgarian voice cues (4 cues x 2 voices).
 * The 19 was 21, plus `stream`, `fire`, `white-noise` and `pink-noise`, minus the
 * six breath textures the owner retired on 2026-08-30.
 *
 * ☠️ THIS BLOCK USED TO SAY "~12 KB OF HEADROOM AT 25 … DO NOT ADD ANOTHER CLIP",
 * AND ANYONE WHO TRUSTED IT CONCLUDED A SECOND LANGUAGE WAS IMPOSSIBLE. That was
 * the PRE-RETIREMENT 25-file set — the same block already said elsewhere that the
 * six textures were gone, so it contradicted itself and the stale half was the
 * scarier one. Measured 2026-08-31: the 19 files total 3,578,571 B (3.413 MiB)
 * against the 4.000 MiB ceiling, so real headroom is 615,733 B (601 KiB). The eight
 * English cues weigh 117,126 B, and Bulgarian is 57 characters of cue text against
 * English's 82 — so the second language costs ~19% of the headroom, not more of it
 * than exists.
 *
 * ⚠️ Still not a licence to add beds: one more 30s bed is 0.34 MiB, over half of
 * what is left. Re-measure before adding anything, and quote the ACTUAL survey
 * rather than PREDICTED — see {@link referenceClipFor} for why the prediction is
 * only ever a floor for the voice half.
 */
export const SHIP_FILE_COUNT = 27;

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
 * The eleven sound effects (2 bells + 9 beds; the six textures were retired on
 * 2026-08-30) plus one file per voice slot: 11 + 16 = 27. ⚠️ This block used to
 * read "13 + 4 x 2 = 21", which was wrong in both terms by the time anyone read it.
 *
 * `seconds` is the catalog's rendered length for a sound effect and **null** for a
 * voice cue, because how long a cue takes to say is not a decision anyone made —
 * it comes back from TTS.
 *
 * @returns {{id: string, clip: string, klass: string, voice: string|null, file: string,
 *            seconds: number|null, bitrate: string, channels: number}[]}
 */
export function shippingUnits() {
  // ☠️ SHIPPED_SFX_CLIPS, not SFX_CLIPS: the budget counts what lands in `assets/`,
  // and the three synth noise beds ship without ever being rendered.
  const sfx = SHIPPED_SFX_CLIPS.map((clip) => {
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

  // ☠️ Built FROM `voiceSlotSpec`'s SLOTS, not from `VOICE_CUES` x `VOICES` beside
  // it. Its docblock says in as many words that "a third consumer cannot disagree
  // with the first two" — and this is the third consumer. A test asserting the two
  // agree is weaker than not being able to disagree: the assertion catches a drift
  // after someone writes it, construction makes the drift unwritable.
  //
  // ☠️☠️ THIS USED TO REBUILD THE PRODUCT ITSELF (`cues.flatMap(… voices.map(…))`)
  // and that was safe only while there was one language. With two it would count 32
  // units where 16 ship, every one of them with a unique `shipFileName` — so the
  // budget gate would pass a set that is half mis-paired renders. Mapping the
  // already-joined slots is the difference between a correct measurement and a
  // correct measurement of the wrong thing.
  const { slots } = voiceSlotSpec(VOICE_ROUND);
  const voice = slots.map(({ cue, voice: v }) => {
    const spec = outputSpecFor(cue.id);
    return {
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
    };
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
 * How far below its predicted size a finished file may land before it is not a
 * finished file.
 *
 * ☠️ WITHOUT THIS THE INSTRUMENT PASSES AN EMPTY SET. `/code-review` ran the
 * command against twenty-one ZERO-BYTE files named exactly right and it printed
 * "21/21 files · the set is complete and fits" and exited **0** — because presence
 * was `Boolean(found)` and nothing asked whether the bytes could be audio. That is
 * the same green-light-on-a-half-done-pass as `manifest --check` exiting 0 against
 * 65 gaps, in the one artifact where it would be permanent, and this file's own
 * docblock claimed the opposite in as many words.
 *
 * Half is deliberately loose. `postprocess` encodes at a fixed `-b:a`, so a healthy
 * file lands near its prediction and the slack is only there to absorb the
 * container, VBR wobble and — for the sixteen cues — a spoken length that differs from
 * the clip saying the same words today. The job here is catching a truncated or
 * failed encode, not grading one: anything this catches is broken by a wide margin.
 */
export const PLAUSIBLE_SIZE_FRACTION = 0.5;

/**
 * The smallest a unit's finished file can be and still be that unit, or null when
 * the unit's length is not known yet and no floor can be honest.
 *
 * ⚠️ Only the sound effects have a floor. A voice cue's length comes back
 * from TTS, so the only number available is an estimate off a different rendering
 * of the same words — too soft to fail a file on. An empty file is still caught,
 * because zero is below every floor including the smallest one this can return.
 *
 * @param {{seconds: number|null, bitrate: string}} unit
 * @returns {number|null}
 */
export function plausibleFloorBytes(unit) {
  if (unit.seconds === null || !Number.isFinite(unit.seconds)) return 0;
  return bytesForSeconds(unit.seconds, unit.bitrate) * PLAUSIBLE_SIZE_FRACTION;
}

/**
 * The clip shipping today that says the same words as this unit — the only measured
 * source for a voice cue's length before the pass has run.
 *
 * Lives here rather than in the command for the reason the rest of this file does:
 * "a cue's length is estimated from the clip shipping today" is a rule about a
 * shipping unit, not about reading a disk, and the command should not be the only
 * place it can be read.
 *
 * ☠️ IN A CLEAN CHECKOUT THIS PATH NEVER EXISTS, SO **PREDICTED IS ALWAYS A FLOOR
 * FOR THE VOICE HALF** — quote the ACTUAL survey instead. There is no `.wav`
 * anywhere in this repo: the masters live in the separate `app-audio-masters` repo
 * and `audio-masters/` is gitignored. Every voice unit therefore probes to null and
 * is counted UNKNOWN rather than zero, which is why `budget` prints "N unit(s) have
 * no length — the total above is a FLOOR". Pre-existing and not the second
 * language's doing; Bulgarian only makes it sixteen unknowns instead of eight.
 *
 * @param {{voice: string|null, clip: string}} unit
 * @returns {string[]|null} path segments, or null when the unit needs no estimate
 */
export function referenceClipFor(unit) {
  return unit.voice ? ["assets", "sounds", "breathing", `${unit.clip}.wav`] : null;
}

/**
 * What the set is predicted to weigh, before any of it has been rendered.
 *
 * `secondsFor` fills in the lengths the catalog does not fix — in practice the
 * sixteen voice slots, measured off the clips shipping today, which say the same
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
 * a named gap rather than a count that happens to add up. Anything in `files` that
 * no unit claims is reported too, and its bytes still count: a stray file is either
 * a unit misnamed — in which case its real unit reads as missing — or weight in the
 * directory that the ceiling has to see.
 *
 * ☠️ EVERY FILE, not every `.m4a`. The caller used to hand over a filtered list, so
 * a 5 MB stray `.wav` was neither counted nor reported and the set still read
 * "fits" — while #1138 justifies the ceiling on precisely that case, a single
 * uncompressed bed blowing it instantly. It also made an uppercase `.M4A` vanish
 * from the total while its unit reported missing. Case and extension are the
 * caller's to get right; this counts what it is given.
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
    const bytes = found ? found.bytes : null;
    const floor = plausibleFloorBytes(unit);
    return {
      ...unit,
      present: Boolean(found),
      bytes,
      // A file can be present and still not be a clip. Kept as its own field rather
      // than folded into `present` so the report can say which of the two it is.
      //
      // ☠️ `bytes === 0` is its own clause, not a case of `bytes < floor`. A voice
      // cue's floor is 0 — no honest number exists for it before TTS — and `0 < 0`
      // is false, so an empty cue slipped through the very check written to stop
      // empty files, in exactly the half of the set that has been invisible to a
      // subsystem twice before (#1317, #1393). The docblock claimed otherwise and
      // the test proved it wrong.
      undersized: bytes !== null && (bytes === 0 || (floor !== null && bytes < floor)),
      floorBytes: floor,
    };
  });

  const missing = rows.filter((row) => !row.present);
  const undersized = rows.filter((row) => row.undersized);
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
  for (const row of undersized) {
    gaps.push({
      kind: "undersized",
      unit: row.id,
      file: row.file,
      detail:
        row.bytes === 0
          ? "the file is empty — a failed encode, not a clip"
          : `${row.bytes} bytes is far under the ${Math.round(
              /** @type {number} */ (row.floorBytes),
            )} this unit cannot plausibly encode below`,
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
    undersized,
    unexpected,
    gaps,
    ...verdict,
    // The set is finished only when every unit has a file, every file is big enough
    // to be one, nothing else is in the directory, and the whole thing fits.
    complete: missing.length === 0 && undersized.length === 0 && unexpected.length === 0 && !over,
  };
}
