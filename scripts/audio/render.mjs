#!/usr/bin/env node
/**
 * The ElevenLabs render pass for the app's meditation and breathing audio.
 *
 * Decided across map #1130. This script does not decide anything — it executes
 * `catalog.mjs` and records exactly what came back.
 *
 * ☠️ SOUND EFFECTS IS NON-DETERMINISTIC AND HAS NO SEED. Every generation is
 * unrepeatable: a clip you delete can never be recovered in a matching style.
 * That single fact shapes every safety decision below — the script refuses to
 * overwrite, defaults to a dry run, and writes the manifest incrementally so a
 * crash never loses the record of credits already spent.
 *
 * ☠️ AND IT DRAWS FROM A DISTRIBUTION WITH A SILENT TAIL. The same prompt varies
 * 16-26 dB run to run, so good prompts still throw unusable takes. `render`
 * therefore measures every take as it lands and draws again when one comes back
 * too quiet, up to a bound — see take-gate.mjs (#1320). Nothing here grades
 * whether a take is *good*; that stays a human audition call (#1210).
 *
 * Usage:
 *   node scripts/audio/render.mjs probe              # no credits, answers #1159's probes
 *   node scripts/audio/render.mjs plan --round A     # print prompts + cost, spend nothing
 *   node scripts/audio/render.mjs render --round A --go
 *
 * Requires ELEVENLABS_API_KEY. Per #1141 the key lives in the password manager
 * and is passed in for the run — it is deliberately not a CI or EAS secret.
 */

import { Buffer } from "node:buffer";
import { writeFile, readFile, mkdir, appendFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  measure,
  assertFfmpeg,
  decodeToFloatWav,
  edgeSilence,
  seamMetrics,
  SEAM_LIMITS,
} from "./postprocess.mjs";
import {
  SFX_MAX_DURATION_SECONDS,
  channelReading,
  creditHypotheses,
  creditVerdict,
  describeReturn,
  zeroCrossingsPerSecond,
} from "./loop-probe.mjs";
import {
  MAX_ATTEMPTS,
  SILENT_DBTP,
  USABLE_DBTP,
  attemptFile,
  classifyTake,
  planSlot,
  rowsBySlot,
  slotKey,
} from "./take-gate.mjs";
import {
  BELLS,
  SFX_CLIPS,
  SFX_MASTER_PCM,
  SFX_MODEL,
  SFX_OUTPUT_FORMAT,
  TTS_MODEL,
  TTS_VOICE_SETTINGS,
  VOICES,
  VOICE_CUES,
  TTS_OUTPUT_FORMATS,
  TTS_CANDIDATE_SEEDS,
  CREDITS_PER_SECOND,
  clipsForRound,
  composePrompt,
  creditEstimate,
} from "./catalog.mjs";

const API = "https://api.elevenlabs.io/v1";
/**
 * Where masters land. Overridable only so `test/audio-render-reroll.test.ts` can
 * drive the real spending loop into a scratch directory — the re-roll and the
 * attempt bound are the two things in this file that decide how much money a run
 * costs, and neither can be exercised against the live path without either real
 * credits or clobbering the archive.
 *
 * ☠️ The repo-relative fallback sits on the right of `??` on purpose, so it is
 * never evaluated when the override is set: babel's CJS transform leaves
 * `import.meta.url` as `null`, and eagerly resolving it would throw at import
 * time and make this module unloadable from jest.
 */
const OUT_DIR =
  process.env.AUDIO_MASTERS_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), "../../audio-masters");

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error(
      "ELEVENLABS_API_KEY is not set.\n" +
        "Per #1141 it lives in the password manager and is passed in for the run:\n" +
        "  ELEVENLABS_API_KEY=... node scripts/audio/render.mjs probe",
    );
    process.exit(1);
  }
  return key;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Raw PCM carries no header, so channel count has to be derived. This is what
 * answers #1159's second probe without needing a decoder: at a known sample
 * rate and duration, the byte count only fits one channel count.
 */
function derivePcmChannels(bytes, durationSeconds, sampleRate) {
  const bytesPerChannelSecond = sampleRate * 2; // 16-bit
  const ratio = bytes / (durationSeconds * bytesPerChannelSecond);
  return { ratio, channels: Math.round(ratio) };
}

/** WAV does carry a header — channels live at byte offset 22. */
function readWavHeader(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  return {
    channels: buffer.readUInt16LE(22),
    sampleRate: buffer.readUInt32LE(24),
    bitsPerSample: buffer.readUInt16LE(34),
  };
}

async function soundEffect(key, { text, durationSeconds, promptInfluence, loop, outputFormat }) {
  const url = `${API}/sound-generation?output_format=${outputFormat ?? SFX_OUTPUT_FORMAT}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: SFX_MODEL,
      duration_seconds: durationSeconds, // always explicit — auto-duration cost is unconfirmed
      prompt_influence: promptInfluence,
      loop,
    }),
  });
  if (!response.ok) {
    throw new Error(`sound-generation ${response.status}: ${await response.text()}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
    headers: allHeaders(response),
  };
}

/**
 * Every response header, or null where the caller stubbed a bare `get()`.
 *
 * ☠️ #1347's fourth question — is a generation billed on the seconds requested or
 * the seconds returned? — is normally answered by reading the balance either side
 * of the call, and the key on hand lacks `user_read` and 401s on that endpoint.
 * Some of this API's cost accounting rides in response headers, and headers cost
 * nothing to keep. The probe that opened #1347 recorded a byte count and threw
 * everything else away; a week later that was the missing evidence. Keep it all.
 */
function allHeaders(response) {
  try {
    return Object.fromEntries(response.headers);
  } catch {
    return null;
  }
}

async function textToSpeech(key, { voiceId, text, outputFormat, seed }) {
  const url = `${API}/text-to-speech/${voiceId}?output_format=${outputFormat}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL,
      voice_settings: TTS_VOICE_SETTINGS,
      ...(seed == null ? {} : { seed }),
    }),
  });
  if (!response.ok) {
    throw new Error(`text-to-speech ${response.status}: ${await response.text()}`);
  }
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
}

/**
 * #1159's probes, plus the plan check #1141 left open. Costs a handful of
 * credits — a 1s effect is 40 — rather than the ~24,600 of the real pass.
 */
async function probe() {
  const key = apiKey();
  const results = [];

  // The plan and the live credit balance, which #1141 could only take from a
  // 16-day-old note in docs/campaign/assets.md.
  const subscription = await fetch(`${API}/user/subscription`, {
    headers: { "xi-api-key": key },
  });
  if (subscription.ok) {
    const sub = await subscription.json();
    results.push({
      probe: "plan and credit balance",
      tier: sub.tier,
      status: sub.status,
      used: sub.character_count,
      limit: sub.character_limit,
      remaining: sub.character_limit - sub.character_count,
    });
  } else {
    results.push({ probe: "plan", error: `${subscription.status} ${await subscription.text()}` });
  }

  // Probe 1 (reframed by #1141): the reachable lossless SFX format on Creator.
  // `pcm_44100` needs Pro; 48kHz is what docs/campaign/assets.md:20 shows
  // working. Also answers probe 2 — channel count — from the byte count.
  for (const format of ["pcm_48000", "pcm_44100"]) {
    try {
      const { buffer, contentType } = await soundEffect(key, {
        text: "A soft low wooden knock, one strike only.",
        durationSeconds: 1,
        promptInfluence: 0.6,
        loop: false,
        outputFormat: format,
      });
      const rate = format === "pcm_48000" ? 48000 : 44100;
      const { ratio, channels } = derivePcmChannels(buffer.length, 1, rate);
      results.push({
        probe: `SFX output_format=${format}`,
        ok: true,
        contentType,
        bytes: buffer.length,
        derivedChannels: channels,
        channelRatio: Number(ratio.toFixed(3)),
      });
    } catch (error) {
      results.push({
        probe: `SFX output_format=${format}`,
        ok: false,
        error: String(error.message),
      });
    }
  }

  // Probe 3: does `loop: true` accept a lossless format, or force MP3?
  // #1138 already made this moot for the render path (non-looping + seamless()
  // fold is the default), so this is for the record rather than a dependency.
  try {
    const { buffer, contentType } = await soundEffect(key, {
      text: "A smooth continuous band of low air, unchanging.",
      durationSeconds: 1,
      promptInfluence: 0.6,
      loop: true,
      outputFormat: "pcm_48000",
    });
    results.push({
      probe: "SFX loop:true + pcm_48000",
      ok: true,
      contentType,
      bytes: buffer.length,
    });
  } catch (error) {
    results.push({ probe: "SFX loop:true + pcm_48000", ok: false, error: String(error.message) });
  }

  // The highest-value probe: if TTS accepts wav_48000 on Creator, all 21
  // masters are lossless and Pro is dead as a question permanently.
  const voiceId = process.env.ELEVENLABS_PROBE_VOICE_ID;
  if (voiceId) {
    for (const format of ["wav_48000", "wav_44100"]) {
      try {
        const { buffer, contentType } = await textToSpeech(key, {
          voiceId,
          text: "Breathe in",
          outputFormat: format,
        });
        results.push({
          probe: `TTS output_format=${format}`,
          ok: true,
          contentType,
          bytes: buffer.length,
          header: readWavHeader(buffer),
        });
      } catch (error) {
        results.push({
          probe: `TTS output_format=${format}`,
          ok: false,
          error: String(error.message),
        });
      }
    }
  } else {
    results.push({
      probe: "TTS wav_48000",
      skipped: "set ELEVENLABS_PROBE_VOICE_ID to a Voice Library voice to run this",
    });
  }

  console.log(JSON.stringify(results, null, 2));
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, "probe-results.json"), JSON.stringify(results, null, 2));
  console.log(`\nWritten to ${join(OUT_DIR, "probe-results.json")}`);
}

/** Print exactly what would be sent and what it would cost. Spends nothing. */
function plan(round) {
  const clips = clipsForRound(round);
  const { seconds, credits } = creditEstimate(clips);

  for (const clip of clips) {
    console.log(`\n=== ${clip.id} (${clip.klass}) ${clip.draft ? "  ⚠️ DRAFT PROMPT" : ""}`);
    console.log(
      `${clip.durationSeconds}s x ${clip.candidates} candidates · prompt_influence ${clip.promptInfluence} · loop ${clip.loop}`,
    );
    console.log(`target: ${clip.loudnessTarget}`);
    console.log(composePrompt(clip.text));
  }

  console.log(`\n--- Round ${round}: ${clips.length} clips, ${seconds}s, ~${credits} credits`);
  // ⚠️ That figure is one draw per candidate. Since #1320 `render` re-rolls a take
  // that comes back below the level gate, so the ceiling is a multiple of it — and
  // `render` itself quotes the real best/worst for what is still unfilled.
  console.log(
    `    re-roll bound is ${MAX_ATTEMPTS} attempts per candidate, so at most ` +
      `~${Math.round(credits * MAX_ATTEMPTS)} credits from empty.`,
  );

  const drafts = clips.filter((clip) => clip.draft);
  if (drafts.length > 0) {
    console.log(
      `\n⚠️ ${drafts.length} prompt(s) are DRAFT and unapproved: ${drafts
        .map((clip) => clip.id)
        .join(", ")}`,
    );
    console.log("   The pass is unrepeatable — get these signed off before spending on them.");
  }
  if (round === "B") {
    const missingVoice = VOICES.filter((voice) => !voice.voiceId).map((voice) => voice.id);
    const missingText = VOICE_CUES.filter((cue) => !cue.text).map((cue) => cue.id);
    if (missingVoice.length)
      console.log(`\n⚠️ No voice chosen yet for: ${missingVoice.join(", ")}`);
    if (missingText.length) console.log(`⚠️ No wording decided for: ${missingText.join(", ")}`);
  }
}

/** The run's own record of what has already been generated and paid for. */
async function readManifest(path) {
  try {
    return (await readFile(path, "utf8"))
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

/**
 * Work out what is left to do for every candidate slot in the round.
 *
 * Deliberately separate from the spending loop and run BEFORE the `--go` gate:
 * the cost quoted to the human has to be the cost of the run they are actually
 * approving, which after #1320 is neither the full round (some slots are done)
 * nor one generation per slot (some will be re-rolled).
 */
async function surveyRound(round, maxAttempts) {
  const clips = clipsForRound(round);
  const manifestPath = join(OUT_DIR, `round-${round}`, "manifest.jsonl");
  const history = rowsBySlot(await readManifest(manifestPath));

  const slots = [];
  for (const clip of clips) {
    const prompt = composePrompt(clip.text);
    for (let candidate = 1; candidate <= clip.candidates; candidate += 1) {
      const rows = history.get(slotKey(clip.id, candidate)) ?? [];
      slots.push({ clip, prompt, candidate, ...planSlot({ rows, prompt, maxAttempts }) });
    }
  }
  return { clips, manifestPath, slots, open: slots.filter((slot) => !slot.accepted) };
}

async function render(round, go, maxAttempts = MAX_ATTEMPTS) {
  const { clips, manifestPath, slots, open } = await surveyRound(round, maxAttempts);
  const superseded = slots.reduce((total, slot) => total + slot.superseded, 0);
  const runDir = join(OUT_DIR, `round-${round}`);

  if (superseded > 0) {
    console.log(
      `${superseded} take(s) already on disk were generated from a prompt this catalog no\n` +
        "longer composes, or before the level gate existed. They are NOT reused and NOT\n" +
        "deleted — they stay where they are, and the slots they filled are rendered again.\n" +
        `Audition them by hand if you want to salvage one: node scripts/audio/postprocess.mjs measure <file>\n`,
    );
  }

  if (open.length === 0) {
    console.log(`Nothing to render — every candidate slot in round ${round} has an accepted take.`);
    console.log(`Masters in ${runDir}`);
    return;
  }

  // Best case is one draw per open slot; worst is every open slot exhausting its
  // remaining attempts. ⚠️ The bound is what makes the worst case a number at all.
  const bestSeconds = open.reduce((total, slot) => total + slot.clip.durationSeconds, 0);
  const worstSeconds = open.reduce(
    (total, slot) => total + slot.clip.durationSeconds * slot.remaining,
    0,
  );
  const cost = (secs) => Math.round(secs * CREDITS_PER_SECOND);

  if (!go) {
    console.error(
      `Refusing to spend. ${open.length} of ${slots.length} candidate slots in round ${round}\n` +
        `still need a take, and every generation CANNOT BE REPEATED.\n\n` +
        `  best case  ${bestSeconds}s ≈ ${cost(bestSeconds)} credits (every slot passes first draw)\n` +
        `  worst case ${worstSeconds}s ≈ ${cost(worstSeconds)} credits (every slot re-rolls to the bound of ${maxAttempts})\n\n` +
        `Review with:  node scripts/audio/render.mjs plan --round ${round}\n` +
        `Then re-run with --go.`,
    );
    process.exit(1);
  }

  const drafts = clips.filter((clip) => clip.draft);
  if (drafts.length > 0) {
    console.error(
      `Refusing to spend: ${drafts.map((c) => c.id).join(", ")} still carry DRAFT prompts.\n` +
        "Sound Effects has no seed — a clip rendered from an unapproved prompt cannot be\n" +
        "re-rendered in matching style later. Get sign-off first.",
    );
    process.exit(1);
  }

  const key = apiKey();
  // ⚠️ Before the first generation, never after: the pass now grades every take,
  // so a missing ffmpeg discovered mid-run means paying for takes nothing can read.
  await assertFfmpeg();
  await mkdir(runDir, { recursive: true });

  console.log(
    `${open.length} slot(s) to fill, bound ${maxAttempts} attempts each ` +
      `(≤ ${cost(worstSeconds)} credits).\n`,
  );

  const exhausted = [];
  let generated = 0;
  let rerolled = 0;
  let recovered = 0;

  for (const slot of open) {
    const { clip, prompt, candidate } = slot;
    const classDir = join(runDir, clip.klass);
    await mkdir(classDir, { recursive: true });

    let index = slot.nextIndex;
    let spent = slot.spent;
    let accepted = null;

    while (!accepted && spent < maxAttempts) {
      const name = attemptFile(clip.id, candidate, index);
      const path = join(classDir, name);

      // Never overwrite. A generation that already exists cost real credits and
      // can never be reproduced. A file sitting at this index with no manifest
      // row is a crash between the write and the append — grade those bytes
      // rather than paying for them a second time.
      let buffer;
      let contentType = null;
      let fromDisk = false;
      if (await exists(path)) {
        buffer = await readFile(path);
        fromDisk = true;
        recovered += 1;
      } else {
        ({ buffer, contentType } = await soundEffect(key, {
          text: prompt,
          durationSeconds: clip.durationSeconds,
          promptInfluence: clip.promptInfluence,
          loop: clip.loop,
        }));
        await writeFile(path, buffer);
        generated += 1;
        if (spent > 0) rerolled += 1;
      }

      const measured = await measure(path);
      const verdict = classifyTake(measured.dbtp);
      const { channels, ratio } = derivePcmChannels(buffer.length, clip.durationSeconds, 48000);

      // Appended per take, not written at the end: a crash mid-pass must not lose
      // the record of what has already been generated and paid for.
      //
      // ⚠️ REJECTED TAKES ARE RECORDED TOO. One cost exactly as many credits as a
      // kept one and is exactly as unreproducible, so omitting it would understate
      // the spend — and a clip's rejection rate is the signal that separates a
      // broken prompt from an unlucky one.
      await appendFile(
        manifestPath,
        `${JSON.stringify({
          clip: clip.id,
          klass: clip.klass,
          candidate,
          attempt: index,
          file: name,
          prompt,
          model: SFX_MODEL,
          outputFormat: SFX_OUTPUT_FORMAT,
          durationSeconds: clip.durationSeconds,
          promptInfluence: clip.promptInfluence,
          loop: clip.loop,
          loudnessTarget: clip.loudnessTarget,
          seed: null, // Sound Effects has none — this is why the masters are the source
          // ☠️ null, not a number, when the take is digitally silent: loudnorm
          // prints -inf and Number() makes that NaN. `classifyTake` reads the raw
          // value; the manifest records the honest absence.
          dbtp: Number.isFinite(measured.dbtp) ? measured.dbtp : null,
          lufs: Number.isFinite(measured.lufs) ? measured.lufs : null,
          accepted: verdict.accepted,
          rejectedFor: verdict.rejectedFor,
          recovered: fromDisk,
          bytes: buffer.length,
          contentType,
          derivedChannels: channels,
          channelRatio: Number(ratio.toFixed(3)),
          // ☠️ 3.3/sec MEASURED on #1159, not the 40/sec #1134 assumed. Writing
          // the stale figure here put a number ~12x too high into the permanent record.
          creditsEstimate: Math.round(clip.durationSeconds * CREDITS_PER_SECOND),
        })}\n`,
      );

      const level = Number.isFinite(measured.dbtp) ? `${measured.dbtp} dBTP` : "silent";
      console.log(
        `${verdict.accepted ? "keep" : "roll"} ${name.padEnd(34)} ${level.padStart(11)}  ` +
          `${verdict.rejectedFor ?? "ok"}${fromDisk ? "  (recovered from disk, no credits)" : ""}`,
      );

      spent += 1;
      index += 1;
      if (verdict.accepted) accepted = name;
    }

    if (!accepted) exhausted.push({ id: clip.id, candidate, attempts: spent });
  }

  console.log(
    `\n${generated} generation(s), of which ${rerolled} were re-rolls` +
      `${recovered ? `; ${recovered} take(s) recovered from disk unpaid` : ""}.`,
  );
  console.log(`Masters in ${runDir}`);
  console.log(
    "Archive EVERY take — kept and rejected alike — to Drive\n" +
      "Selftend/app-audio-masters/ per #1141. A rejected take is exactly as\n" +
      "unreproducible as a chosen one.",
  );

  // ☠️ This command renders SOUND EFFECTS only. `clipsForRound` filters
  // SFX_CLIPS, so the eight voice cues are not in it and never were — Round B
  // is 11 clips here and 8 more from `render-voices`. Saying so out loud is the
  // point: a silent 11 reads as a finished 19.
  if (round === "B") {
    const missing = VOICES.filter((voice) => !voice.voiceId).map((voice) => voice.id);
    console.log(
      `\nThis rendered SOUND EFFECTS only — ${clips.length} clips. The 8 voice cues are separate:\n` +
        (missing.length
          ? `  still need a voiceId in catalog.mjs: ${missing.join(", ")}\n` +
            "  then:  ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render-voices --go"
          : "  ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render-voices --go"),
    );
  }

  // ☠️ A slot that burned its whole attempt bound is not unlucky, it is broken.
  // The run fails so this cannot be mistaken for a finished pass — the previous
  // version's silence about exactly this is what let 20 unusable masters through.
  if (exhausted.length > 0) {
    console.error(
      `\n${exhausted.length} candidate slot(s) exhausted ${maxAttempts} attempts without a\n` +
        "usable take:\n" +
        exhausted.map((e) => `  ${e.id} candidate ${e.candidate}`).join("\n") +
        "\n\nThose prompts are broken, not unlucky. Take them back to #1316 — every\n" +
        "attempt is in the manifest with its measured level. Re-running will NOT\n" +
        "retry them: the bound is per slot and it is spent.",
    );
    process.exitCode = 1;
  }
}

/**
 * Generate a short take of every prompt and measure it, BEFORE the real pass.
 *
 * ☠️ This exists because Round B was rendered and came back mostly silent
 * (#1316). Negation suppresses output level in Sound Effects and it compounds:
 * the `night` prompt measured -47.4 dBFS peak with the full shared tail, -4.7
 * without it, and "No sudden events." alone cost ~17 dB. Twenty of 27 masters
 * were unusable and ~1,881 credits went with them.
 *
 * A 4s take of each clip costs about a seventh of a full pass, so there is no
 * reason ever to discover this again after spending. Run it after ANY prompt
 * change.
 */
const PREFLIGHT_SECONDS = 4;
const PREFLIGHT_TAKES = 2;
// The thresholds live in take-gate.mjs now, because `render` grades every take
// against them too (#1320) — a prompt that clears preflight faces the same bar.

/**
 * ☠️ One take proves nothing, and finding that out was the whole point.
 *
 * The first preflight scored `night` at -3.79 dBTP and `ocean` at -7.44 — both
 * "ok" — when those exact prompts had just come back SILENT across all three
 * candidates of the real pass. The failure is STOCHASTIC: negation biases a
 * prompt toward silence, it does not doom it. So a prompt is only condemned when
 * EVERY take fails, and a prompt whose takes disagree is reported separately,
 * because that is a different defect with a different fix:
 *
 *   every take bad  -> the prompt is broken, rewrite it (#1316)
 *   takes disagree  -> the prompt is a coin flip, so the RENDER needs a
 *                      per-candidate level gate and a re-roll, not new words
 */
async function preflight(round, takes = PREFLIGHT_TAKES) {
  const key = apiKey();
  const clips = clipsForRound(round);
  const dir = join(OUT_DIR, "preflight", `round-${round}`);
  await mkdir(dir, { recursive: true });

  console.log(
    `Probing ${clips.length} prompts x ${takes} takes at ${PREFLIGHT_SECONDS}s ` +
      `(~${Math.round(clips.length * takes * PREFLIGHT_SECONDS * CREDITS_PER_SECOND)} credits).\n`,
  );
  console.log(
    `Gate: usable at >= ${USABLE_DBTP} dBTP, silent below ${SILENT_DBTP} — the same bar ` +
      "`render` applies to every take.\n",
  );
  console.log("clip                          dBTP per take        verdict");

  const broken = [];
  const flaky = [];
  for (const clip of clips) {
    const peaks = [];
    for (let take = 1; take <= takes; take += 1) {
      const path = join(dir, `${clip.id}-t${take}.pcm`);
      if (!(await exists(path))) {
        const { buffer } = await soundEffect(key, {
          text: composePrompt(clip.text),
          durationSeconds: PREFLIGHT_SECONDS,
          promptInfluence: clip.promptInfluence,
          loop: clip.loop,
        });
        await writeFile(path, buffer);
      }
      peaks.push((await measure(path)).dbtp);
    }

    const usable = peaks.filter((p) => classifyTake(p).accepted).length;
    const anySilent = peaks.some((p) => classifyTake(p).rejectedFor === "silent");
    let verdict;
    if (usable === 0) {
      verdict = "BROKEN";
      broken.push({ id: clip.id, peaks });
    } else if (usable < peaks.length) {
      verdict = anySilent ? "FLAKY (a take was silent)" : "FLAKY";
      flaky.push({ id: clip.id, peaks });
    } else {
      verdict = "ok";
    }
    console.log(
      clip.id.padEnd(26) + peaks.map((p) => String(p).padStart(8)).join("") + "   " + verdict,
    );
  }

  console.log("");
  if (flaky.length) {
    console.log(
      `${flaky.length} prompt(s) are a coin flip - some takes usable, some not:\n` +
        flaky.map((f) => `  ${f.id} - ${f.peaks.join(", ")} dBTP`).join("\n") +
        `\n  These do not need new words. \`render\` grades every take against the same\n` +
        `  two thresholds and re-rolls a failure up to ${MAX_ATTEMPTS} times per slot (#1320),\n` +
        "  so a coin-flip prompt costs extra credits rather than a silent master.\n",
    );
  }
  if (broken.length) {
    console.error(
      `${broken.length} prompt(s) produced NO usable take:\n` +
        broken.map((b) => `  ${b.id} - ${b.peaks.join(", ")} dBTP`).join("\n") +
        "\n\nFix these before spending on the full pass. Negation is the usual cause\n" +
        "- describe what the sound IS, not what it is not (#1316).",
    );
    process.exit(1);
  }
  console.log("Every prompt produced at least one usable take.");
}

/** Extension for a TTS output_format id, so masters are not all called .wav. */
function formatExtension(format) {
  return format.startsWith("mp3") ? "mp3" : "wav";
}

/**
 * The eight voice cues: 4 cues x 2 voices, 2 candidates each (#1136, #1210).
 *
 * Separate from `render` because the voice PICK is Round B's own first task and
 * needs a human ear, while the thirteen sound effects do not — so the sound
 * effects must not sit blocked behind it.
 *
 * Unlike Sound Effects this is re-renderable: TTS takes a seed and the Voice
 * Library voice persists, so a bad take here is recoverable in a way a bad bed
 * never is.
 */
async function renderVoices(go) {
  const missingVoice = VOICES.filter((voice) => !voice.voiceId);
  const missingText = VOICE_CUES.filter((cue) => !cue.text);
  if (missingVoice.length || missingText.length) {
    console.error(
      "Refusing to render voices.\n" +
        (missingVoice.length
          ? `  no voiceId for: ${missingVoice.map((v) => v.id).join(", ")}\n` +
            "  #1136 fixed the criteria: Voice Library only (defaults expire 2026-12-31),\n" +
            "  a matched female/male pair, auditioned on the shipping words.\n"
          : "") +
        (missingText.length ? `  no text for: ${missingText.map((c) => c.id).join(", ")}\n` : ""),
    );
    process.exit(1);
  }

  const total = VOICES.length * VOICE_CUES.length * TTS_CANDIDATE_SEEDS.length;
  if (!go) {
    console.error(
      `Refusing to spend. ${total} generations (${VOICES.length} voices x ` +
        `${VOICE_CUES.length} cues x ${TTS_CANDIDATE_SEEDS.length} candidates).\n` +
        "Re-run with --go.",
    );
    process.exit(1);
  }

  const key = apiKey();
  const runDir = join(OUT_DIR, "round-B");
  const classDir = join(runDir, "voice");
  await mkdir(classDir, { recursive: true });
  const manifestPath = join(runDir, "manifest.jsonl");

  for (const voice of VOICES) {
    for (const cue of VOICE_CUES) {
      for (const [index, seed] of TTS_CANDIDATE_SEEDS.entries()) {
        const candidate = index + 1;
        const stem = `${cue.id}-${voice.id}-c${String(candidate).padStart(2, "0")}`;

        // The format is asked, not assumed: try lossless, fall back on rejection.
        let rendered = null;
        let usedFormat = null;
        let lastError = null;
        for (const format of TTS_OUTPUT_FORMATS) {
          const path = join(classDir, `${stem}.${formatExtension(format)}`);
          if (await exists(path)) {
            console.log(`skip ${stem} — already exists`);
            rendered = "skipped";
            break;
          }
          try {
            rendered = await textToSpeech(key, {
              voiceId: voice.voiceId,
              text: cue.text,
              outputFormat: format,
              seed,
            });
            usedFormat = format;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (rendered === "skipped") continue;
        if (!usedFormat) throw lastError;

        const name = `${stem}.${formatExtension(usedFormat)}`;
        await writeFile(join(classDir, name), rendered.buffer);
        await appendFile(
          manifestPath,
          `${JSON.stringify({
            clip: cue.id,
            klass: "voice",
            voice: voice.id,
            axis: voice.axis,
            voiceId: voice.voiceId,
            candidate,
            file: name,
            text: cue.text,
            model: TTS_MODEL,
            voiceSettings: TTS_VOICE_SETTINGS,
            outputFormat: usedFormat,
            // TTS has one, which is why this class alone is re-renderable.
            seed,
            bytes: rendered.buffer.length,
            contentType: rendered.contentType,
          })}\n`,
        );
        console.log(`ok   ${name}  ${rendered.buffer.length} bytes  ${usedFormat}`);
      }
    }
  }

  console.log(`\nDone. Voice masters in ${classDir}`);
  console.log(
    "⚠️ Set each voice's introMs from the MEASURED duration of its chosen\n" +
      "guide_intro clip (#1136) — never from an estimate.",
  );
}

// ---------------------------------------------------------------------------
// the loop probe (#1347)
// ---------------------------------------------------------------------------

/** The live balance, or the reason it could not be read. */
async function readSubscription(key) {
  const response = await fetch(`${API}/user/subscription`, { headers: { "xi-api-key": key } });
  if (!response.ok) {
    return { ok: false, error: `${response.status} ${await response.text()}` };
  }
  const sub = await response.json();
  return {
    ok: true,
    tier: sub.tier,
    used: sub.character_count,
    limit: sub.character_limit,
    remaining: sub.character_limit - sub.character_count,
  };
}

/**
 * Everything measurable about one returned buffer, both ways it can be read.
 *
 * ☠️ THE MONO READING IS NOT A DOWNMIX. The bytes are headerless, so "stereo" and
 * "mono" are two different signals cut from the same buffer, not one signal at two
 * widths — which is exactly why `decodeToFloatWav` had to grow an input-side
 * override. Writing both out as playable WAVs is deliberate: the crossing-rate
 * ratio is the machine's answer and it is allowed to come back `unclear`, and when
 * it does, one listen settles it.
 */
async function analyseTake({ pcmPath, wavStem, bytes, requestedSeconds }) {
  const shape = describeReturn({ bytes, requestedSeconds, sampleRate: SFX_MASTER_PCM.sampleRate });

  const asStereoWav = `${wavStem}-as-stereo.wav`;
  const asMonoWav = `${wavStem}-as-mono.wav`;
  const stereo = await decodeToFloatWav(pcmPath, asStereoWav, {
    channels: 2,
    sampleRate: SFX_MASTER_PCM.sampleRate,
  });
  const mono = await decodeToFloatWav(pcmPath, asMonoWav, {
    channels: 1,
    sampleRate: SFX_MASTER_PCM.sampleRate,
    inputPcm: { ...SFX_MASTER_PCM, channels: 1 },
  });

  return {
    shape,
    asStereoWav,
    asMonoWav,
    // Every judgement below reads the buffer the way the pass ships it (#1159).
    level: await measure(pcmPath),
    seam: seamMetrics(stereo.samples, stereo.channels, stereo.sampleRate),
    edges: edgeSilence(stereo.samples, stereo.channels, stereo.sampleRate),
    zcrAsStereo: zeroCrossingsPerSecond(stereo.samples, stereo.channels, stereo.sampleRate),
    zcrAsMono: zeroCrossingsPerSecond(mono.samples, mono.channels, mono.sampleRate),
  };
}

/**
 * Ask one bed prompt for a natively looping render, and measure what comes back.
 *
 * ⚠️ A PROBE, NOT A PASS. It renders one clip twice — once `loop: true`, once
 * `loop: false` as the paired control — because Sound Effects is seedless, so the
 * only honest comparison for a stochastic draw is another draw of the same prompt
 * at the same duration. At 3.3 credits/second that is ~198 credits against the
 * 93,179 the plan carries; what it protects is 450s of unrepeatable bed render
 * committed to a path chosen on a premise the repo already contradicts.
 */
async function loopProbe({ clipId, seconds, go, withControl }) {
  const clip = SFX_CLIPS.find((candidate) => candidate.id === clipId);
  if (!clip) {
    console.error(
      `unknown clip "${clipId}" — expected one of: ${SFX_CLIPS.map((c) => c.id).join(", ")}`,
    );
    process.exit(1);
  }
  if (clip.klass !== "beds") {
    console.error(
      `"${clipId}" is a ${clip.klass} clip. #1137 established that only beds ever loop at\n` +
        "runtime, so a texture or a bell answers a question nobody is asking.",
    );
    process.exit(1);
  }
  if (seconds > SFX_MAX_DURATION_SECONDS) {
    console.error(`--seconds ${seconds} is over the API's ${SFX_MAX_DURATION_SECONDS}s cap`);
    process.exit(1);
  }

  const prompt = composePrompt(clip.text);
  const calls = withControl ? 2 : 1;
  const quoted = seconds * CREDITS_PER_SECOND * calls;

  console.log(`\n#1347 loop probe — ${clipId} at ${seconds}s, ${calls} call(s)`);
  console.log(`prompt (${prompt.length} chars): ${prompt}\n`);
  console.log(`cost if charged on the REQUESTED seconds: ~${Math.round(quoted)} credits`);
  console.log(
    `cost if loop mode returns 1.5x and bills on what it RETURNS: ~${Math.round(
      quoted + seconds * 0.5 * CREDITS_PER_SECOND,
    )} credits`,
  );
  if (!go) {
    console.log("\nDry run. Re-run with --go to spend.");
    return;
  }

  await assertFfmpeg();
  const key = apiKey();
  const dir = join(OUT_DIR, "loop-probe");
  await mkdir(dir, { recursive: true });

  const takes = [
    { label: "loop", loop: true },
    ...(withControl ? [{ label: "control", loop: false }] : []),
  ];
  for (const take of takes) {
    take.pcmPath = join(dir, `${clipId}-${take.label}-${seconds}s.pcm`);
    // The same refusal every other spending path here carries: a seedless render
    // that overwrites an archived one destroys evidence that cannot be re-made.
    if (await exists(take.pcmPath)) {
      console.error(`refusing to overwrite ${take.pcmPath} — move it aside first`);
      process.exit(1);
    }
  }

  const before = await readSubscription(key);
  if (!before.ok) console.log(`⚠️ balance unavailable: ${before.error}`);

  for (const take of takes) {
    const { buffer, contentType, headers } = await soundEffect(key, {
      text: prompt,
      durationSeconds: seconds,
      promptInfluence: clip.promptInfluence,
      loop: take.loop,
      outputFormat: SFX_OUTPUT_FORMAT,
    });
    await writeFile(take.pcmPath, buffer);
    take.bytes = buffer.length;
    take.contentType = contentType;
    take.responseHeaders = headers;
    console.log(`ok   ${take.label}  loop=${take.loop}  ${buffer.length} bytes  ${contentType}`);
  }

  const after = await readSubscription(key);
  const spent = before.ok && after.ok ? after.used - before.used : NaN;

  for (const take of takes) {
    Object.assign(
      take,
      await analyseTake({
        pcmPath: take.pcmPath,
        wavStem: join(dir, `${clipId}-${take.label}`),
        bytes: take.bytes,
        requestedSeconds: seconds,
      }),
    );
  }

  const loopTake = takes.find((take) => take.label === "loop");
  const controlTake = takes.find((take) => take.label === "control");
  const reading = controlTake
    ? channelReading({ probeZcr: loopTake.zcrAsStereo, controlZcr: controlTake.zcrAsStereo })
    : { reading: "unclear", ratio: null };
  const hypotheses = creditHypotheses({
    requestedSeconds: seconds * takes.length,
    returnedSeconds: takes.reduce((total, take) => total + take.shape.secondsIfStereo, 0),
    creditsPerSecond: CREDITS_PER_SECOND,
  });

  for (const take of takes) {
    console.log(`\n=== ${clipId} ${take.label} (loop=${take.loop})`);
    console.log(
      `   bytes     ${take.bytes} = ${take.shape.secondsIfStereo.toFixed(3)}s stereo ` +
        `or ${take.shape.secondsIfMono.toFixed(3)}s mono (asked ${seconds}s)`,
    );
    console.log(
      `   duration  ${take.shape.durationRatioIfStereo.toFixed(3)}x the request read as stereo · ` +
        `mono reading ${take.shape.monoExceedsApiCap ? "EXCEEDS the 30s cap" : "is within the cap"}`,
    );
    console.log(`   level     ${take.level.lufs} LUFS-I · ${take.level.dbtp} dBTP`);
    console.log(
      `   seam      wrap step ${take.seam.wrapStepRatio.toFixed(2)}x median · ` +
        `head/tail ${take.seam.energyDeltaRatio.toFixed(2)}x natural · ` +
        (take.seam.wrapStepRatio <= SEAM_LIMITS.wrapStepRatio &&
        take.seam.energyDeltaRatio <= SEAM_LIMITS.energyDeltaRatio
          ? "PASS"
          : "FAIL"),
    );
    console.log(
      `   edges     lead ${take.edges.leadMs.toFixed(1)} ms · tail ${take.edges.tailMs.toFixed(1)} ms`,
    );
    console.log(`   crossings ${Math.round(take.zcrAsStereo)}/s read as stereo`);
    console.log(`   listen    ${take.asStereoWav}\n             ${take.asMonoWav}`);
  }

  console.log(
    `\nchannel reading: ${reading.reading}${reading.ratio ? ` (${reading.ratio.toFixed(2)}x the control's crossing rate)` : ""}`,
  );
  console.log(`credits spent:   ${creditVerdict({ spent, hypotheses })}`);

  const results = {
    ticket: 1347,
    clip: clipId,
    prompt,
    requestedSeconds: seconds,
    outputFormat: SFX_OUTPUT_FORMAT,
    balanceBefore: before,
    balanceAfter: after,
    creditsSpent: Number.isFinite(spent) ? spent : null,
    creditHypotheses: hypotheses,
    creditVerdict: creditVerdict({ spent, hypotheses }),
    channelReading: reading,
    takes: takes.map(({ pcmPath, ...rest }) => ({ file: pcmPath, ...rest })),
  };
  const resultsPath = join(dir, `${clipId}-${seconds}s-results.json`);
  await writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nwrote ${resultsPath}`);
  console.log(
    "\n⚠️ The numbers say where to be suspicious; they cannot say a bed loops well.\n" +
      "Listen to the tiled loop before ruling (#1346's audition, then #1210).",
  );
}

// `render` is exported so test/audio-render-reroll.test.ts can drive the actual
// spending loop — the re-roll and the attempt bound decide what a run costs, and
// neither is provable from the outside. `loopProbe` is exported for the same
// reason: it spends, and #1347's whole point is that an unverified belief about
// this API already shaped the bed pipeline once.
export { render, loopProbe };

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const roundFlag = rest.indexOf("--round");
  const round = roundFlag === -1 ? "A" : rest[roundFlag + 1];
  const go = rest.includes("--go");

  switch (command) {
    case "probe":
      await probe();
      break;
    case "plan":
      plan(round);
      break;
    case "preflight": {
      const takesFlag = rest.indexOf("--takes");
      await preflight(round, takesFlag === -1 ? PREFLIGHT_TAKES : Number(rest[takesFlag + 1]));
      break;
    }
    case "render": {
      const attemptsFlag = rest.indexOf("--attempts");
      const attempts = attemptsFlag === -1 ? MAX_ATTEMPTS : Number(rest[attemptsFlag + 1]);
      if (!Number.isInteger(attempts) || attempts < 1) {
        console.error(`--attempts must be a positive integer, got: ${rest[attemptsFlag + 1]}`);
        process.exit(1);
      }
      await render(round, go, attempts);
      break;
    }
    case "render-voices":
      await renderVoices(go);
      break;
    case "loopprobe": {
      const clipFlag = rest.indexOf("--clip");
      const secondsFlag = rest.indexOf("--seconds");
      const seconds = secondsFlag === -1 ? SFX_MAX_DURATION_SECONDS : Number(rest[secondsFlag + 1]);
      if (!Number.isFinite(seconds) || seconds < 0.5) {
        console.error(`--seconds must be at least 0.5, got: ${rest[secondsFlag + 1]}`);
        process.exit(1);
      }
      await loopProbe({
        // brown-noise by default: it was the only bed of the failed pass whose
        // every take cleared the level gate, and a dud take answers nothing about
        // looping. It is also the worst seam case measured (8.6-19.1x hard-cut).
        clipId: clipFlag === -1 ? "brown-noise" : rest[clipFlag + 1],
        seconds,
        go,
        withControl: !rest.includes("--no-control"),
      });
      break;
    }
    default:
      console.log(
        "usage:\n" +
          "  node scripts/audio/render.mjs probe\n" +
          "  node scripts/audio/render.mjs plan --round A|B\n" +
          "  node scripts/audio/render.mjs preflight --round A|B\n" +
          "  node scripts/audio/render.mjs render --round A|B --go [--attempts N]\n" +
          "  node scripts/audio/render.mjs render-voices --go\n" +
          "  node scripts/audio/render.mjs loopprobe [--clip <bed>] [--seconds 30] --go",
      );
      process.exit(BELLS.length && command ? 1 : 0);
  }
}

// Only run the CLI when invoked directly, the same guard postprocess.mjs carries
// so calibrate-seam.mjs can import it. Without this, importing `render` to test it
// would run the argv-driven switch instead.
//
// ☠️ Wrapped in `main()` rather than left as top-level `await`: babel's CJS
// transform cannot compile top-level await, so a bare `await probe()` here makes
// the whole module unimportable from jest and the loop untestable.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
