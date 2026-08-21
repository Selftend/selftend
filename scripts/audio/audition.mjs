#!/usr/bin/env node
/**
 * The audition — turning a finished render into something a person can hear (#1346).
 *
 * `render` writes headerless raw PCM, so the output of the pass this whole map
 * exists to run is, as it stands, unplayable. This builds the listening side:
 * every candidate through the real #1138 chain, beds also tiled for the 10x seam
 * listen #1137 requires, an index page with the measurements beside each player,
 * and a command that records the winner.
 *
 *   node scripts/audio/audition.mjs build  --round B [--repeats 10] [--all]
 *   node scripts/audio/audition.mjs choose <clip> <candidate> --round B [--note "..."]
 *   node scripts/audio/audition.mjs status --round B
 *
 * Spends nothing. Requires ffmpeg on PATH (#1138).
 *
 * ☠️ This file imports `postprocess.mjs` deliberately — the preview must be the
 * file the app would ship, not a lookalike, or the pick is made on a sound that
 * never exists. The cost is that `postprocess.mjs` runs its CLI at module top
 * level, so this file inherits a top-level `await` and cannot be imported from
 * jest. Everything worth testing therefore lives in `audition-plan.mjs`.
 */

import { readFile, appendFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  clipsForRound,
  composePrompt,
  OUTPUT_CLIPS,
  VOICES,
  VOICE_CUES,
  voiceSlotSpec,
} from "./catalog.mjs";
import { rowsBySlot } from "./take-gate.mjs";
import { assertFfmpeg, postprocess, repeatLoop } from "./postprocess.mjs";
import {
  DEFAULT_REPEATS,
  STATUS,
  planAudition,
  planVoiceAudition,
  previewName,
  renderIndexHtml,
  choiceKey,
  choiceRow,
  currentChoices,
  outstanding,
  voiceIdentity,
  voiceRowsBySlot,
  voiceSlots,
} from "./audition-plan.mjs";

/** The cue ids the voice half owns, for telling a `guide_*` argument from a bed. */
const VOICE_CUE_IDS = new Set(VOICE_CUES.map((cue) => cue.id));

/** Same override and same repo-relative fallback rule as `render.mjs` (#1320). */
const OUT_DIR =
  process.env.AUDIO_MASTERS_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), "../../audio-masters");

const roundDir = (round) => join(OUT_DIR, `round-${round}`);
const auditionDir = (round) => join(OUT_DIR, "audition", `round-${round}`);
const choicesPath = (round) => join(roundDir(round), "choices.jsonl");

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

function assertRound(round) {
  if (round !== "A" && round !== "B") throw new Error(`--round must be A or B, got ${round ?? ""}`);
  return round;
}

/**
 * Both halves of the round, in one list.
 *
 * ☠️ THE VOICE HALF WAS MISSING ENTIRELY. This function used to return
 * `clipsForRound(round)` alone, which filters `SFX_CLIPS` — so Round B's eight
 * voice cues were never surveyed, never previewed, never choosable, and never
 * counted by `status`. Eleven clips of twenty-one, reported as the whole round.
 *
 * The two halves are planned separately rather than forced through one function
 * because they supersede on different things: a sound effect on its composed
 * prompt, a voice cue on the pair (voiceId, text). One prompt-shaped comparison
 * over both would either miss a swapped voice or invent a level gate for TTS.
 */
async function survey(round, { all = false } = {}) {
  const clips = clipsForRound(round);
  const promptFor = (clip) => composePrompt(clip.text);
  const rows = await readJsonl(join(roundDir(round), "manifest.jsonl"));
  const choices = currentChoices(await readJsonl(choicesPath(round)));

  const sfx = planAudition({ clips, promptFor, history: rowsBySlot(rows), all });

  // Which units a round has at all is `voiceSlotSpec`'s answer and no longer
  // this file's — the manifest (#1210) asks the same question, and three
  // subsystems each deciding for themselves is how the voice half went missing
  // from two of them.
  const slots = voiceSlots(voiceSlotSpec(round));
  const voice = planVoiceAudition({ slots, history: voiceRowsBySlot(rows), all });

  return {
    clips,
    slots,
    promptFor,
    choices,
    entries: [...sfx.entries, ...voice.entries],
    missing: [...sfx.missing, ...voice.missing],
  };
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

async function build(round, { repeats, all }) {
  await assertFfmpeg();
  const { choices, entries, missing } = await survey(round, { all });
  const outDir = auditionDir(round);

  if (!entries.length) {
    console.log(
      `Nothing to audition for round ${round}.\n` +
        `No manifest row carries an accepted take of the prompt the catalog composes today.\n` +
        (missing.length
          ? `${missing.reduce((n, m) => n + m.drawn, 0)} row(s) on file are of superseded prompts — ` +
            `re-run \`render --round ${round} --go\`, or pass --all to hear them anyway.\n`
          : `Run \`render --round ${round} --go\` first.\n`),
    );
    return false;
  }

  console.log(`Auditioning ${entries.length} take(s) into ${outDir}\n`);
  await mkdir(outDir, { recursive: true });

  const results = [];
  for (const entry of entries) {
    const source = join(roundDir(round), entry.klass, entry.file);
    const preview = previewName(entry);
    const outPath = join(outDir, preview);
    process.stderr.write(`=== ${entry.clipId} c${entry.candidate} (${entry.status})\n`);

    try {
      const result = await postprocess(source, entry.clipId, outPath);
      let loopPreview = null;
      // Only beds loop. Textures never do (#1137: the longest phase they must
      // cover is the 4-7-8 exhale at 8s, and they render 10s), and bells are
      // one-shots — tiling either would stage a defect the app cannot produce.
      if (entry.klass === "beds" && repeats > 1) {
        loopPreview = previewName(entry, { repeats });
        await repeatLoop(outPath, join(outDir, loopPreview), repeats, entry.clipId);
      }
      results.push({
        ...entry,
        preview,
        loopPreview,
        post: result.post,
        gain: result.gain,
        ceilingBound: result.ceilingBound,
        seam: result.seam,
        // #1134's hard rule, measured on the finished file. It is in practice a
        // voice-clip rule (#1138), which is the half that had no audition at all.
        edges: result.edges,
        // ⚠️ #1136 sets `introMs` from the MEASURED duration of the chosen
        // `guide_intro`, never from an estimate — this page is where that number
        // becomes readable next to the take it belongs to.
        durationSeconds: result.durationSeconds,
        sizeKb: result.size / 1024,
        error: null,
      });
    } catch (error) {
      // ⚠️ One bad take must not cost the audition. A candidate that will not go
      // through the chain is itself a finding — it is reported on the page and in
      // the JSON, and the remaining candidates stay listenable.
      //
      // Keep the first two lines rather than one: an ffmpeg failure puts its
      // reason on the line *after* "ffmpeg failed:", so a one-line slice reports
      // a bare header that says nothing at all.
      const reason = error.message.split("\n").slice(0, 2).join(" ").trim();
      console.error(`   FAILED: ${reason}`);
      results.push({ ...entry, preview: null, loopPreview: null, error: reason });
    }
  }

  const html = renderIndexHtml({ round, repeats, results, missing, choices });
  await writeFile(join(outDir, "index.html"), html);
  await writeFile(join(outDir, "audition.json"), `${JSON.stringify(results, null, 2)}\n`);

  const failed = results.filter((r) => r.error);
  const rejected = results.filter((r) => r.status !== STATUS.accepted);
  console.log(`\n${results.length - failed.length} preview(s) written to ${outDir}`);
  if (rejected.length) console.log(`${rejected.length} are below the level gate or superseded.`);
  if (failed.length) console.log(`⚠️ ${failed.length} could not be post-processed — see the page.`);
  if (missing.length) {
    console.log(`⚠️ ${missing.length} candidate slot(s) have no take of the current prompt.`);
  }
  console.log(`\nOpen:  ${pathToFileURL(join(outDir, "index.html")).href}`);
  console.log(
    `Then:  node scripts/audio/audition.mjs choose <clip> <candidate> --round ${round}\n` +
      `⚠️ Listen on a phone speaker at low volume too, not only headphones (#1134).`,
  );
  return failed.length === 0;
}

// ---------------------------------------------------------------------------
// choose
// ---------------------------------------------------------------------------

async function choose(round, clipId, candidate, note, voice) {
  if (!OUTPUT_CLIPS.has(clipId)) {
    throw new Error(
      `unknown clip id "${clipId}" — expected one of: ${[...OUTPUT_CLIPS.keys()].join(", ")}`,
    );
  }
  // ☠️ A voice cue needs BOTH voices picked. Both ship (#1136 makes the male voice
  // purely additive), so `choose guide_inhale 1` on its own is ambiguous — and
  // filing it under the clip alone would mark the other voice settled and ship
  // half the voice set unheard.
  if (VOICE_CUE_IDS.has(clipId)) {
    if (!voice) {
      throw new Error(
        `${clipId} is said by both voices, so a pick needs --voice: ` +
          `${VOICES.map((v) => `${v.id} (${v.axis})`).join(", ")}`,
      );
    }
    if (!VOICES.some((v) => v.id === voice)) {
      throw new Error(
        `unknown voice "${voice}" — expected ${VOICES.map((v) => v.id).join(" or ")}`,
      );
    }
  } else if (voice) {
    throw new Error(`--voice does not apply to ${clipId}, which is a sound effect`);
  }

  const { entries } = await survey(round, { all: true });
  const forClip = entries.filter(
    (entry) => entry.clipId === clipId && (entry.voice ?? null) === (voice ?? null),
  );
  const label = voice ? `${clipId} (${voice})` : clipId;
  if (!forClip.length) throw new Error(`${label} has no rendered take in round ${round}`);

  const match = forClip.find((entry) => entry.candidate === candidate);
  if (!match) {
    throw new Error(
      `${label} has no candidate ${candidate} on file — available: ` +
        forClip.map((e) => `${e.candidate} (${e.status})`).join(", "),
    );
  }
  // ⚠️ Not a hard refusal. A take the level gate rejected as *quiet* may still be
  // the right character, and it cost the same unreproducible credits — but the
  // record has to say plainly that the pick was made against the gate.
  if (match.status !== STATUS.accepted) {
    console.log(`⚠️ candidate ${candidate} of ${label} is ${match.status}, not an accepted take.`);
  }

  const row = choiceRow({
    clipId,
    voice: voice ?? null,
    candidate,
    file: match.file,
    prompt: match.prompt,
    note,
    at: new Date().toISOString(),
  });
  await mkdir(roundDir(round), { recursive: true });
  await appendFile(choicesPath(round), `${JSON.stringify(row)}\n`);
  console.log(`Recorded: ${label} candidate ${candidate} (${match.file}) -> ${choicesPath(round)}`);
  // ⚠️ #1136 corrected #1134 on exactly this: `introMs` is per-sound data measured
  // from the rendered clip, not a hardcoded constant. Today's 3.08s file against a
  // hardcoded 3300 is 220 ms of slop that this pass exists to remove.
  if (clipId === "guide_intro") {
    console.log(
      "⚠️ Set this voice's introMs from the MEASURED duration of this clip — the\n" +
        "   audition page prints it beside the player. Never from an estimate (#1136).",
    );
  }
  return true;
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

/**
 * ☠️ THIS IS #1210's PROGRESS METER, AND IT COUNTED 11 OF 21.
 *
 * It surveyed `clipsForRound` alone, so once the sound-effect half was picked it
 * printed "Every clip in round B has a pick" and exited 0 with all eight voice
 * cues untouched — a green light on a half-finished pass, which is the same shape
 * as #1317's `render --round B` producing 11 clips and saying nothing.
 */
async function status(round) {
  const { clips, slots, promptFor, choices, entries, missing } = await survey(round, { all: true });
  const line = (unit, id, settledOn, detail = "") => {
    const chosen = choices.get(id);
    const stale = chosen && chosen.prompt !== settledOn;
    const mark = !chosen ? "· not chosen" : stale ? "⚠️ chosen against a SUPERSEDED prompt" : "✓";
    const picked = chosen ? ` candidate ${chosen.candidate} (${chosen.file})` : "";
    console.log(`  ${mark.padEnd(38)} ${unit}${detail}${picked}`);
  };

  const left = [
    ...outstanding({ clips, promptFor, choices }),
    ...outstanding({ clips: slots, promptFor: voiceIdentity, choices }),
  ];
  const units = clips.length + slots.length;

  console.log(`Round ${round}: ${units} clips, ${entries.length} take(s) on file\n`);
  for (const clip of clips) line(clip.id, choiceKey({ clip: clip.id }), promptFor(clip));
  if (slots.length) {
    // Named apart so the two halves are legible as halves — they are rendered by
    // different commands (`render` and `render-voices`) and can be finished on
    // different days.
    console.log(`\n  voice (#1136 — both voices ship, so each cue is owed two picks)`);
    for (const slot of slots) {
      line(slot.clipId, slot.id, voiceIdentity(slot), `  ${slot.voice}`);
    }
  }
  if (missing.length) {
    console.log(`\n⚠️ ${missing.length} candidate slot(s) have no take of the current prompt.`);
  }
  console.log(
    left.length
      ? `\n${left.length} clip(s) still need a pick: ${left.join(", ")}`
      : `\nEvery clip in round ${round} has a pick against its current prompt.`,
  );
  return left.length === 0;
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
  node scripts/audio/audition.mjs build  --round A|B [--repeats N] [--all]
  node scripts/audio/audition.mjs choose <clip> <candidate> --round A|B [--voice V] [--note "..."]
  node scripts/audio/audition.mjs status --round A|B

  --all      also preview takes below the level gate and takes of superseded
             prompts. Both cost the same unreproducible credits.
  --repeats  how many times a bed is tiled for the seam listen (default ${DEFAULT_REPEATS}).
  --voice    required for a guide_* cue, which both voices say: ${VOICES.map((v) => v.id).join(" | ")}.

Spends nothing. Requires ffmpeg on PATH (#1138).
`.trim();

/**
 * ☠️ Wrapped in `main()` rather than run at the top level, so this module has no
 * top-level `await` of its own to add to the one it already inherits.
 */
async function main() {
  const command = process.argv[2];
  if (command === "build") {
    const repeats = Number(flag("repeats", DEFAULT_REPEATS));
    if (!Number.isInteger(repeats) || repeats < 1) throw new Error("--repeats must be an integer");
    const ok = await build(assertRound(flag("round")), {
      repeats,
      all: process.argv.includes("--all"),
    });
    process.exit(ok ? 0 : 1);
  } else if (command === "choose") {
    const candidate = Number(process.argv[4]);
    if (!process.argv[3] || !Number.isInteger(candidate)) throw new Error(USAGE);
    await choose(
      assertRound(flag("round")),
      process.argv[3],
      candidate,
      flag("note"),
      flag("voice"),
    );
  } else if (command === "status") {
    const ok = await status(assertRound(flag("round")));
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
