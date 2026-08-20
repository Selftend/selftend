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
 * Usage:
 *   node scripts/audio/render.mjs probe              # no credits, answers #1159's probes
 *   node scripts/audio/render.mjs plan --round A     # print prompts + cost, spend nothing
 *   node scripts/audio/render.mjs render --round A --go
 *
 * Requires ELEVENLABS_API_KEY. Per #1141 the key lives in the password manager
 * and is passed in for the run — it is deliberately not a CI or EAS secret.
 */

import { Buffer } from "node:buffer";
import { writeFile, mkdir, appendFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BELLS,
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
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = join(ROOT, "audio-masters");

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
  };
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

async function render(round, go) {
  const clips = clipsForRound(round);
  const { seconds, credits } = creditEstimate(clips);

  if (!go) {
    console.error(
      `Refusing to spend. Round ${round} is ${seconds}s ≈ ${credits} credits and CANNOT BE REPEATED.\n` +
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
  const runDir = join(OUT_DIR, `round-${round}`);
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, "manifest.jsonl");

  for (const clip of clips) {
    const classDir = join(runDir, clip.klass);
    await mkdir(classDir, { recursive: true });

    for (let n = 1; n <= clip.candidates; n += 1) {
      const name = `${clip.id}-c${String(n).padStart(2, "0")}.pcm`;
      const path = join(classDir, name);

      // Never overwrite. A generation that already exists cost real credits and
      // can never be reproduced; clobbering one is unrecoverable.
      if (await exists(path)) {
        console.log(`skip ${name} — already exists`);
        continue;
      }

      const prompt = composePrompt(clip.text);
      const { buffer, contentType } = await soundEffect(key, {
        text: prompt,
        durationSeconds: clip.durationSeconds,
        promptInfluence: clip.promptInfluence,
        loop: clip.loop,
      });
      await writeFile(path, buffer);

      const { channels, ratio } = derivePcmChannels(buffer.length, clip.durationSeconds, 48000);
      // Appended per clip, not written at the end: a crash mid-pass must not
      // lose the record of what has already been generated and paid for.
      await appendFile(
        manifestPath,
        `${JSON.stringify({
          clip: clip.id,
          klass: clip.klass,
          candidate: n,
          file: name,
          prompt,
          model: SFX_MODEL,
          outputFormat: SFX_OUTPUT_FORMAT,
          durationSeconds: clip.durationSeconds,
          promptInfluence: clip.promptInfluence,
          loop: clip.loop,
          loudnessTarget: clip.loudnessTarget,
          seed: null, // Sound Effects has none — this is why the masters are the source
          bytes: buffer.length,
          contentType,
          derivedChannels: channels,
          channelRatio: Number(ratio.toFixed(3)),
          // ☠️ 3.3/sec MEASURED on #1159, not the 40/sec #1134 assumed. Writing
          // the stale figure here put a number ~12x too high into the permanent record.
          creditsEstimate: Math.round(clip.durationSeconds * CREDITS_PER_SECOND),
        })}\n`,
      );
      console.log(`ok   ${name}  ${buffer.length} bytes  ~${channels}ch`);
    }
  }

  console.log(`\nDone. Masters in ${runDir}`);
  console.log(
    "Archive EVERY candidate — winners and rejects alike — to Drive\n" +
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
  case "render":
    await render(round, go);
    break;
  case "render-voices":
    await renderVoices(go);
    break;
  default:
    console.log(
      "usage:\n" +
        "  node scripts/audio/render.mjs probe\n" +
        "  node scripts/audio/render.mjs plan --round A|B\n" +
        "  node scripts/audio/render.mjs render --round A|B --go\n" +
        "  node scripts/audio/render.mjs render-voices --go",
    );
    process.exit(BELLS.length && command ? 1 : 0);
}
